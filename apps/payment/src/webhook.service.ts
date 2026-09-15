/** Webhook ingress — G06: HMAC-SHA512 verify → dedupe on event id → ack fast → process async. */

import { Inject, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, QueryFailedError, Repository } from 'typeorm';
import { verifyWebhookSignature } from '@ore/paystack';
import { EVENTS, CheckoutPaymentStatus } from '@ore/contracts';
import { ORE_BUS, ORE_ENV, ORE_SCHEDULER } from '@ore/core';
import { OreEnv } from '@ore/config';
import { Bus } from '@ore/bus';
import { Scheduler } from '@ore/jobs';
import { WebhookEvent } from './entities/webhook-event.entity';
import { CheckoutPayment } from './entities/checkout-payment.entity';
import { PaymentService } from './payment.service';

/** Attempts before a webhook is buried. Beyond this, retrying is noise, not recovery. */
const MAX_WEBHOOK_ATTEMPTS = Number(process.env.WEBHOOK_MAX_ATTEMPTS ?? 8);
/** How long a row must sit unprocessed before the sweeper assumes the original attempt is gone. */
const WEBHOOK_STUCK_AFTER_MS = Number(process.env.WEBHOOK_STUCK_AFTER_MS ?? 2 * 60_000);
/** Sweep cadence. */
const WEBHOOK_SWEEP_INTERVAL_MS = Number(process.env.WEBHOOK_SWEEP_INTERVAL_MS ?? 60_000);
/** Rows per sweep, so a large backlog drains steadily instead of in one thundering batch. */
const WEBHOOK_SWEEP_BATCH = Number(process.env.WEBHOOK_SWEEP_BATCH ?? 50);

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @InjectRepository(WebhookEvent) private readonly events: Repository<WebhookEvent>,
    private readonly payments: PaymentService,
    @Inject(ORE_BUS) private readonly bus: Bus,
    @Inject(ORE_ENV) private readonly env: OreEnv,
    @Inject(ORE_SCHEDULER) private readonly scheduler: Scheduler,
  ) {}

  /** @param rawBody the exact bytes Paystack POSTed — required for HMAC-SHA512. */
  async handleWebhook(rawBody: Buffer | string, signatureHeader: string | undefined): Promise<{ accepted: boolean }> {
    if (!verifyWebhookSignature(this.env.paystackSecretKey, rawBody, signatureHeader)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
    const payload = JSON.parse(rawBody.toString('utf8')) as { event: string; data: Record<string, unknown>; id?: string };
    const eventId = payload.id ?? `${payload.event}:${payload.data?.reference ?? Date.now()}`;

    // Dedupe on unique eventId. Insert first so two concurrent deliveries cannot both process.
    try {
      await this.events.save(this.events.create({
        eventId,
        event: payload.event,
        payloadJson: payload as unknown as Record<string, unknown>,
        processed: false,
      }));
    } catch (err) {
      if (isUniqueViolation(err)) return { accepted: true };
      throw err;
    }
    void this.processAsync(payload.event, payload.data, eventId);
    return { accepted: true };
  }

  private async processAsync(event: string, data: Record<string, unknown>, eventId: string): Promise<void> {
    try {
      if (event === 'charge.success') {
        await this.payments.handleChargeSuccess(String(data.reference), eventId, data.paid_at ? String(data.paid_at) : undefined);
      } else if (event === 'refund.success' || event === 'refund.processed' || event === 'refund.failed') {
        // Refund truth: confirm the refund row, and on failure let the ledger reverse its unwind.
        await this.payments.finalizeRefundFromWebhook(event, data);
      } else if (event === 'transfer.success' || event === 'transfer.failed') {
        // money-out truth (doc §5 withdrawals / doc §4 settlements): finalise on the ledger
        const metadata = (data.metadata ?? {}) as Record<string, unknown>;
        const name = event === 'transfer.success' ? EVENTS.PAYMENT_TRANSFER_SUCCEEDED : EVENTS.PAYMENT_TRANSFER_FAILED;
        await this.bus.publish(
          name,
          {
            reference: String(data.reference ?? ''),
            withdrawalId: metadata.withdrawalId ? String(metadata.withdrawalId) : undefined,
            vendorWithdrawalId: metadata.vendorWithdrawalId ? String(metadata.vendorWithdrawalId) : undefined,
            settlementId: metadata.settlementId ? String(metadata.settlementId) : undefined,
            pspFeePesewas: typeof data.fee_charged === 'number' ? data.fee_charged : undefined,
          },
          { envelopeId: `webhook:${eventId}` },
        );
      }
      // Marked here, once, for every branch. `charge.success` and `refund.*` — the two money
      // paths — previously fell out of this method without ever setting `processed`. Nothing
      // read the column, so the lie was invisible; the moment a sweeper trusts it, every
      // successful charge looks stuck and gets replayed until it is abandoned.
      await this.markEventProcessed(eventId);
    } catch (err) {
      this.logger.error(`[webhook] processing failed for ${event} ${eventId}`, err instanceof Error ? err.stack : err);
      // The row stays `processed = false` and the stuck-webhook sweeper retries it. Handlers are
      // idempotent (dedupe on eventId all the way down), so a retry of a partial success is safe.
      await this.recordFailure(eventId, err);
    }
  }

  /** Note an attempt that did not complete, and give up once attempts are exhausted. */
  private async recordFailure(eventId: string, err: unknown): Promise<void> {
    try {
      const row = await this.events.findOne({ where: { eventId } });
      if (!row) return;
      row.attempts = (row.attempts ?? 0) + 1;
      row.lastError = (err instanceof Error ? err.message : String(err)).slice(0, 500);
      row.lastAttemptAt = new Date();
      if (row.attempts >= MAX_WEBHOOK_ATTEMPTS) {
        // Terminal. A webhook that has failed this many times is not going to succeed by being
        // retried again; leaving it in the queue would mask genuinely stuck events behind it.
        row.abandoned = true;
        this.logger.error(`[webhook] ${eventId} abandoned after ${row.attempts} attempts: ${row.lastError}`);
      }
      await this.events.save(row);
    } catch (bookkeepingErr) {
      // Never let failure bookkeeping mask the original failure.
      this.logger.error(`[webhook] could not record failure for ${eventId}`, bookkeepingErr instanceof Error ? bookkeepingErr.stack : bookkeepingErr);
    }
  }

  private async markEventProcessed(eventId: string): Promise<void> {
    const row = await this.events.findOne({ where: { eventId } });
    if (row) {
      row.processed = true;
      await this.events.save(row);
    }
  }

  /** G30 — sweeper: catch missed webhooks by reconciling stale payments with Paystack verify. */
  startSweeper(): void {
    this.scheduler.onInterval('payment-sweeper', 5 * 60_000, async () => {
      await this.reconcileStale();
    });
    // Separate cadence and separate failure domain: a stuck *webhook row* is a different problem
    // from a stale *payment*, and one going wrong must not stop the other running.
    this.scheduler.onInterval('webhook-retry-sweeper', WEBHOOK_SWEEP_INTERVAL_MS, async () => {
      await this.retryStuckWebhooks();
    });
  }

  /**
   * Re-run webhooks that were accepted but never finished processing.
   *
   * `handleWebhook` inserts the row, acks Paystack immediately, then processes in the background
   * with `void processAsync(...)`. Anything that interrupts that — a thrown handler, a pod
   * rescheduled mid-flight, a deploy — left the row at `processed = false` with nothing on any
   * timer to pick it up. Paystack has already been told 200, so it will not redeliver. The event
   * was simply lost, silently, and the only trace was one error line.
   *
   * Retries are safe because every downstream handler dedupes on the same `eventId`.
   */
  async retryStuckWebhooks(): Promise<{ retried: number }> {
    // Grace period: a row created seconds ago is probably still being processed by the original
    // request, not stuck. Retrying it would race the in-flight attempt.
    const cutoff = new Date(Date.now() - WEBHOOK_STUCK_AFTER_MS);

    const stuck = await this.events.find({
      where: {
        processed: false,
        abandoned: false,
        createdAt: LessThan(cutoff),
        attempts: LessThan(MAX_WEBHOOK_ATTEMPTS),
      },
      order: { createdAt: 'ASC' },
      take: WEBHOOK_SWEEP_BATCH,
    });

    let retried = 0;
    for (const row of stuck) {
      const payload = row.payloadJson as { event?: string; data?: Record<string, unknown> };
      const event = payload?.event ?? row.event;
      const data = payload?.data ?? {};
      if (!event) {
        // Nothing to replay against — bury it rather than re-reading it every sweep forever.
        row.abandoned = true;
        row.lastError = 'malformed payload: no event name';
        await this.events.save(row);
        continue;
      }
      this.logger.warn(`[webhook] retrying stuck ${event} ${row.eventId} (attempt ${(row.attempts ?? 0) + 1})`);
      // Awaited, unlike the ingress path: the sweeper is already off the request path, and
      // serialising keeps a backlog from stampeding Paystack and the ledger at once.
      await this.processAsync(event, data, row.eventId);
      retried++;
    }

    return { retried };
  }

  private async reconcileStale(): Promise<void> {
    const cutoff = new Date(Date.now() - this.env.otpTtlMin * 60_000 * 2);
    // QueryBuilder rather than raw SQL: the previous `$1`/`$2` + `payment.checkout_payment`
    // form is Postgres-only and threw on SQLite, silently killing the sweeper in dev.
    const stale = await this.events.manager
      .getRepository(CheckoutPayment)
      .createQueryBuilder('p')
      .select('p.reference', 'reference')
      .addSelect('p.checkoutId', 'checkoutId')
      .where('p.status = :status', { status: CheckoutPaymentStatus.INITIATED })
      .andWhere('p.createdAt < :cutoff', { cutoff })
      .getRawMany<{ reference: string; checkoutId: string }>();

    for (const row of stale) {
      try {
        // In live mode verify with Paystack; in mock there's nothing to reconcile beyond what we know.
        if (this.env.paystackMode === 'live') {
          const v = await this.payments['verifyAmountLive'](row.reference);
          if (v.amountPesewas > 0) await this.payments.handleChargeSuccess(row.reference, `sweeper:${row.reference}`);
        }
      } catch {
        // leave for next sweep
      }
    }
  }
}

function isUniqueViolation(err: unknown): boolean {
  if (!(err instanceof QueryFailedError)) return false;
  // Postgres reports 23505; SQLite reports SQLITE_CONSTRAINT (errno 19). The
  // dedupe path must treat both as "someone else already inserted this eventId".
  const code = (err as QueryFailedError & { driverError?: { code?: string } }).driverError?.code;
  if (code === '23505' || code === 'SQLITE_CONSTRAINT') return true;
  return /UNIQUE constraint failed|duplicate key/i.test(err.message);
}
