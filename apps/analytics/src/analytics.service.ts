import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EVENTS } from '@ore/contracts';
import { ORE_BUS, ORE_DEDUPE, ConsumerDedupe } from '@ore/core';
import { Bus } from '@ore/bus';
import { AnalyticsEvent } from './entities/analytics-event.entity';

/**
 * Platform telemetry sink. Consumes the domain events that no other service
 * subscribes to (the audit-identified orphan publishes) and persists each one
 * as an append-only fact, idempotent by envelope id.
 *
 * Every publish now has a consumer; the event bus is the analytics backbone
 * instead of a fire-and-forget channel.
 */
@Injectable()
export class AnalyticsService implements OnModuleInit {
  private readonly logger = new Logger(AnalyticsService.name);

  // Events with no consumer anywhere else (verified by repo-wide subscriber scan).
  // USER_REGISTERED is intentionally absent: referral links phone-only claims to it.
  private readonly tracked: Array<keyof typeof EVENTS> = [
    'USER_STANDING_CHANGED',
    'CHECKOUT_COMPLETED',
    'VENDOR_UPDATED',
    'ITEM_AVAILABILITY_CHANGED',
    'COMMS_MESSAGE_CREATED',
    'DISPATCH_OFFER_ACCEPTED',
    'DISPATCH_OFFER_DECLINED',
    'DISPATCH_RIDER_AT_CUSTOMER',
    'DISPATCH_BATCH_CREATED',
    'LEDGER_COD_CASH_COLLECTED',
    'VENDOR_BONUS_EARNED',
    'LEDGER_REMITTANCE_CONFIRMED',
    'WITHDRAWAL_REQUESTED',
    'WITHDRAWAL_APPROVED',
    'DISPUTE_OPENED',
    'CHARGEBACK_OPENED',
    'CHARGEBACK_RESOLVED',
    'LEDGER_DISCREPANCY_FLAGGED',
    'USER_ONBOARDED',
    'ORDER_PREP_STARTED',
    'ORDER_OUT_FOR_DELIVERY',
    'ORDER_OTP_VERIFIED',
    'ORDER_FAILED_DELIVERY',
    'REFERRAL_CLAIMED',
    'REFERRAL_CREDITED',
  ];

  constructor(
    @InjectRepository(AnalyticsEvent) private readonly facts: Repository<AnalyticsEvent>,
    @Inject(ORE_BUS) private readonly bus: Bus,
    @Inject(ORE_DEDUPE) private readonly dedupe: ConsumerDedupe,
  ) {}

  async onModuleInit(): Promise<void> {
    for (const name of this.tracked) {
      const event = EVENTS[name];
      // Envelope payloads are heterogeneous by design; capture them as-is.
      // The unique envelopeId column is the DB-level backstop against replays.
      await this.bus.subscribe<Record<string, unknown>>(event, async (env) => {
        if (!(await this.dedupe.take(env.id))) return;
        try {
          await this.facts.save(this.facts.create({ name, envelopeId: env.id, payloadJson: env.payload }));
        } catch (err) {
          if ((err as { code?: string }).code === 'ER_DUP_ENTRY' || /duplicate|unique/i.test(String((err as Error).message))) {
            return; // redelivery of an already-recorded envelope — fine
          }
          this.logger.warn(`analytics persist failed for ${name}: ${(err as Error).message}`);
        }
      });
    }
    this.logger.log(`tracking ${this.tracked.length} event types`);
  }

  // ── Reads (internal only; the admin console can query through the gateway) ──
  list(name?: string, from?: Date, to?: Date, limit = 200): Promise<AnalyticsEvent[]> {
    const qb = this.facts.createQueryBuilder('f');
    if (name) qb.andWhere('f.name = :name', { name });
    if (from) qb.andWhere('f.createdAt >= :from', { from });
    if (to) qb.andWhere('f.createdAt <= :to', { to });
    return qb.orderBy('f.createdAt', 'DESC').take(Math.min(limit, 1000)).getMany();
  }

  async summary(from?: Date, to?: Date): Promise<Array<{ name: string; count: number }>> {
    const qb = this.facts.createQueryBuilder('f').select('f.name', 'name').addSelect('COUNT(*)', 'count').groupBy('f.name');
    if (from) qb.andWhere('f.createdAt >= :from', { from });
    if (to) qb.andWhere('f.createdAt <= :to', { to });
    const rows = await qb.getRawMany<{ name: string; count: string }>();
    return rows.map((r) => ({ name: r.name, count: Number(r.count) }));
  }
}
