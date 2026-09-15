/** Payment service — initialize, webhook processing (source of truth), refunds, sweeper. */

import { Transactional as Transaction } from 'typeorm-transactional';

import { BadRequestException, ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import {
  EVENTS,
  CheckoutPaymentStatus,
  RefundStatus,
  ChargeSucceededPayload,
} from '@ore/contracts';
import { ORE_BUS, ORE_ENV, ORE_PAYSTACK, ORE_SCHEDULER } from '@ore/core';
import { Bus } from '@ore/bus';
import { OreEnv } from '@ore/config';
import { Scheduler } from '@ore/jobs';
import { PaystackClient, PaystackInputError, PaystackProviderError } from '@ore/paystack';
import { CheckoutPayment } from './entities/checkout-payment.entity';
import { PaymentAllocation } from './entities/payment-allocation.entity';
import { Refund } from './entities/refund.entity';
import { PaymentProcessorRecord } from './entities/payment-processor-record.entity';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(CheckoutPayment) private readonly payments: Repository<CheckoutPayment>,
    @InjectRepository(PaymentAllocation) private readonly allocations: Repository<PaymentAllocation>,
    @InjectRepository(Refund) private readonly refunds: Repository<Refund>,
    @InjectRepository(PaymentProcessorRecord) private readonly processorRecords: Repository<PaymentProcessorRecord>,
    @Inject(ORE_ENV) private readonly env: OreEnv,
    @Inject(ORE_BUS) private readonly bus: Bus,
    @Inject(ORE_PAYSTACK) private readonly paystack: PaystackClient,
    @Inject(ORE_SCHEDULER) private readonly scheduler: Scheduler,
  ) {}

  /** Cart checkout calls this — one charge for all prepaid sub-orders (G37). */
  @Transaction()
  async initialize(params: {
    checkoutId: string;
    amountPesewas: number;
    phone: string;
    allocations: { orderId: string; allocatedPesewas: number }[];
  }): Promise<{ reference: string; paystackUrl: string | null; mode: string }> {
    const reference = `${this.env.paystackRefPrefix}-${Date.now()}-${randomBytes(3).toString('hex')}`;
    const customerEmail = `${params.phone}@customers.ore.gh`;

    let init: Awaited<ReturnType<PaystackClient['initialize']>>;
    try {
      init = await this.paystack.initialize({
        reference,
        amountPesewas: params.amountPesewas,
        email: customerEmail,
        currency: this.env.paystackCurrency,
        channels: this.env.paystackMode === 'live' ? ['mobile_money', 'card'] : undefined,
        metadata: { checkoutId: params.checkoutId },
      });
    } catch (err) {
      throw this.asClientError(err);
    }

    const payment = await this.payments.save(
      this.payments.create({
        checkoutId: params.checkoutId,
        reference,
        amountPesewas: params.amountPesewas,
        currency: this.env.paystackCurrency,
        status: CheckoutPaymentStatus.INITIATED,
        customerEmail,
      }),
    );
    await this.allocations.save(
      params.allocations.map((a) =>
        this.allocations.create({
          checkoutPaymentId: payment.id,
          checkoutId: params.checkoutId,
          orderId: a.orderId,
          allocatedPesewas: a.allocatedPesewas,
        }),
      ),
    );
    await this.processorRecords.save(
      params.allocations.map((a) =>
        this.processorRecords.create({
          paymentProcessor: 'PAYSTACK',
          checkoutPaymentId: payment.id,
          checkoutId: params.checkoutId,
          orderId: a.orderId,
          paystackTransactionId: reference,
          paystackSplitId: null,
          paymentStatus: CheckoutPaymentStatus.INITIATED,
          splitStatus: 'PROVISIONAL_ONLY',
          vendorAllocationPesewas: 0,
          deliveryPartnerAllocationPesewas: 0,
          fleetDeliveryPartnerAllocationPesewas: 0,
          oreAllocationPesewas: 0,
          processorFeePesewas: 0,
          refundStatus: 'NONE',
          settlementStatus: 'PENDING_ORDER_OUTCOME',
          allocationJson: { chargedAllocationPesewas: a.allocatedPesewas, note: 'processor route only; tax/revenue owner comes from ledger classification' },
        }),
      ),
    );
    // Mock mode grants the charge on the spot so local development does not need a real card.
    // `mockComplete` has always refused to do this in production; this path did not, so a
    // production deployment that came up in mock mode handed out free orders with no webhook, no
    // money and a SUCCESS row to match. `loadEnv` now refuses to boot that combination at all —
    // this is the second lock on the same door, because the cost of being wrong here is revenue.
    if (init.mode === 'mock') {
      if (this.env.nodeEnv === 'production') {
        throw new Error('Refusing to auto-complete a mock charge in production');
      }
      // Tell the mock provider this reference is paid, so a later `verify` agrees with the
      // payment row instead of blanket-approving every reference it is ever shown.
      PaystackClient.markMockPaid(reference, params.amountPesewas, this.env.paystackCurrency);
      await this.handleChargeSuccess(reference, `mock-${reference}`, new Date().toISOString());
    }
    return { reference, paystackUrl: init.authorizationUrl, mode: init.mode };
  }

  /** Webhook processing — called by WebhookService after signature + dedupe. */
  @Transaction()
  async handleChargeSuccess(reference: string, eventId: string, paidAt?: string): Promise<void> {
    const payment = await this.payments.findOne({ where: { reference } });
    if (payment) {
      await this.completeCheckoutCharge(payment, reference, eventId, paidAt);
      return;
    }
    throw new NotFoundException(`No payment for reference ${reference}`);
  }

  private async completeCheckoutCharge(
    payment: CheckoutPayment,
    reference: string,
    eventId: string,
    paidAt?: string,
  ): Promise<void> {
    if (payment.status === CheckoutPaymentStatus.SUCCESS) return; // idempotent

    let pspFeePesewas = 0;
    if (this.env.paystackMode === 'live') {
      const v = await this.verifyAmountLive(reference);
      if (v.amountPesewas !== payment.amountPesewas) {
        throw new BadRequestException(`Amount mismatch: expected ${payment.amountPesewas}, got ${v.amountPesewas}`);
      }
      pspFeePesewas = v.feePesewas;
    }

    payment.status = CheckoutPaymentStatus.SUCCESS;
    payment.paidAt = paidAt ? new Date(paidAt) : new Date();
    payment.channel = this.env.paystackMode === 'live' ? 'gateway' : 'mock';
    await this.payments.save(payment);
    const records = await this.processorRecords.find({ where: { checkoutPaymentId: payment.id } });
    for (const record of records) {
      record.paymentStatus = CheckoutPaymentStatus.SUCCESS;
      record.paystackTransactionId = reference;
      record.processorFeePesewas = pspFeePesewas;
      record.settlementStatus = 'PENDING_ORDER_OUTCOME';
      await this.processorRecords.save(record);
    }

    const payload: ChargeSucceededPayload = {
      reference,
      checkoutId: payment.checkoutId,
      amountPesewas: payment.amountPesewas,
      pspFeePesewas,
      currency: payment.currency,
      channel: payment.channel ?? 'gateway',
      paidAt: payment.paidAt.toISOString(),
    };
    await this.bus.publish(EVENTS.PAYMENT_CHARGE_SUCCEEDED, payload, { envelopeId: `paystack:${eventId}` });
    // Flush the transactional outbox so downstream services (order confirm) react
    // without waiting for the relay tick; the relay remains the durability net.
    await this.bus.flush?.().catch((err) => this.logger.error('[payment] outbox flush failed', err instanceof Error ? err.stack : err));
  }

  private async verifyAmountLive(reference: string): Promise<{ amountPesewas: number, feePesewas: number }> {
    const v = await this.paystack.verify(reference);
    if (v.status !== 'success') throw new BadRequestException(`Paystack says payment is ${v.status}`);
    if (v.currency !== this.env.paystackCurrency) throw new BadRequestException('Currency mismatch');
    return { amountPesewas: v.amountPesewas, feePesewas: v.feePesewas };
  }

  /**
   * Paystack rejections are caller/account problems, not outages (audit S-12/H-5).
   * An unparseable payout destination and Paystack's "You cannot initiate third party
   * payouts at this time" both used to surface as generic 500s, which tells a caller to
   * retry something that will never succeed and pages on-call for a configuration state.
   */
  private asClientError(err: unknown): Error {
    if (err instanceof PaystackInputError || err instanceof PaystackProviderError) {
      return new BadRequestException(err.message);
    }
    return err instanceof Error ? err : new Error(String(err));
  }

  /** Money out — rider withdrawal (doc §5). Mock completes instantly; live defers to the
   *  transfer.success/failed webhook (webhook = source of truth for money, both directions). */
  async transfer(params: {
    amountPesewas: number;
    destination: string;
    reference: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ reference: string; status: string }> {
    let result: { reference: string; status: string };
    try {
      result = await this.paystack.transfer({
        reference: params.reference,
        amountPesewas: params.amountPesewas,
        currency: this.env.paystackCurrency,
        destination: params.destination,
        metadata: params.metadata,
      });
    } catch (err) {
      throw this.asClientError(err);
    }
    if (result.status === 'success') {
      await this.bus.publish(
        EVENTS.PAYMENT_TRANSFER_SUCCEEDED,
        {
          reference: result.reference,
          withdrawalId: params.metadata?.withdrawalId,
          vendorWithdrawalId: params.metadata?.vendorWithdrawalId,
          settlementId: params.metadata?.settlementId,
        },
        { envelopeId: `transfer:${result.reference}` },
      );
      return { reference: result.reference, status: 'success' };
    }
    return { reference: result.reference, status: 'processing' };
  }

  async vendorTransfer(params: { amountPesewas: number; reference: string; payout: { type: 'MOMO' | 'BANK'; provider: string; accountNumber: string; accountName: string }; metadata?: Record<string, unknown> }): Promise<{ reference: string; status: string }> {
    let recipient: { recipientCode: string };
    let result: { reference: string; status: string };
    try {
      recipient = await this.paystack.createRecipient({ type: params.payout.type === 'MOMO' ? 'mobile_money' : 'ghipss', name: params.payout.accountName, accountNumber: params.payout.accountNumber, bankCode: params.payout.provider, currency: 'GHS' });
      result = await this.paystack.transferToRecipient({ amountPesewas: params.amountPesewas, reference: params.reference, recipientCode: recipient.recipientCode, metadata: params.metadata, reason: 'Vendor withdrawal' });
    } catch (err) {
      throw this.asClientError(err);
    }
    if (result.status === 'success') await this.bus.publish(EVENTS.PAYMENT_TRANSFER_SUCCEEDED, { reference: result.reference, withdrawalId: params.metadata?.withdrawalId, vendorWithdrawalId: params.metadata?.vendorWithdrawalId, settlementId: params.metadata?.settlementId }, { envelopeId: `transfer:${result.reference}` });
    return { reference: result.reference, status: result.status };
  }

  /**
   * Refund one vendor-order's allocation (partial refund on the single charge) — G26/G27/G37.
   *
   * Cumulatively capped: the refund may never exceed what the order was actually charged,
   * minus everything already refunded (requested, in flight, or confirmed). A per-call cap
   * alone lets N partial refunds walk out N × the allocation.
   */
  @Transaction()
  async refundOrder(orderId: string, reason: string, amountPesewas?: number, tax?: { refundComponent?: string; originalTaxStatus?: string; taxPeriodStatus?: 'OPEN' | 'FILED' | 'AMENDED' | 'CLOSED' }): Promise<Refund> {
    const alloc = await this.allocations.findOne({ where: { orderId } });
    if (!alloc) throw new NotFoundException('No payment allocation for this order (COD orders are settled in cash)');
    const payment = await this.payments.findOne({ where: { id: alloc.checkoutPaymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (amountPesewas !== undefined && amountPesewas <= 0) throw new BadRequestException('Refund amount must be positive');

    const outstanding = await this.refunds.find({
      where: { orderId, status: In([RefundStatus.PENDING, RefundStatus.PROCESSING, RefundStatus.PROCESSED]) },
    });
    const alreadyRefunded = (outstanding ?? []).reduce((sum, r) => sum + (r.amountPesewas ?? 0), 0);
    const available = alloc.allocatedPesewas - alreadyRefunded;
    if (available <= 0) {
      throw new ConflictException(
        `Order is already fully refunded (GHS ${(alloc.allocatedPesewas / 100).toFixed(2)} charged, GHS ${(alreadyRefunded / 100).toFixed(2)} refunded)`,
      );
    }

    const refundAmount = Math.min(amountPesewas ?? available, available);
    if (refundAmount <= 0) throw new BadRequestException('Refund amount must be positive');

    let result: { reference: string; status: string; amountPesewas: number; currency: string };
    try {
      result = await this.paystack.refund(payment.reference, refundAmount, reason);
    } catch (err) {
      throw this.asClientError(err);
    }
    const refund = await this.refunds.save(
      this.refunds.create({
        orderId,
        checkoutPaymentId: payment.id,
        amountPesewas: refundAmount,
        reason,
        originalTransactionId: `order:${orderId}:final`,
        refundComponent: tax?.refundComponent ?? 'UNSPECIFIED',
        originalTaxStatus: tax?.originalTaxStatus ?? 'UNKNOWN',
        taxPeriodStatus: tax?.taxPeriodStatus ?? 'OPEN',
        settlementStatus: 'PENDING_TAX_CLASSIFICATION',
        approvalStatus: 'APPROVED',
        paystackRef: result.reference,
        status: result.status === 'processed' ? RefundStatus.PROCESSED : RefundStatus.PROCESSING,
      }),
    );
    const processorRows = await this.processorRecords.find({ where: { orderId } });
    for (const row of processorRows) {
      row.refundStatus = refund.status;
      row.allocationJson = { ...(row.allocationJson ?? {}), lastRefundPesewas: refundAmount, refundComponent: refund.refundComponent };
      await this.processorRecords.save(row);
    }
    await this.bus.publish(
      EVENTS.PAYMENT_REFUND_PROCESSED,
      { orderId, checkoutId: payment.checkoutId, amountPesewas: refundAmount, reason, status: refund.status, refundComponent: refund.refundComponent, originalTaxStatus: refund.originalTaxStatus, taxPeriodStatus: refund.taxPeriodStatus },
      { envelopeId: `refund:${refund.id}` },
    );
    return refund;
  }

  /**
   * Webhook truth for refunds (Paystack `refund.success` / `refund.failed`). The request path
   * already told the ledger "refund processed", so on success we only confirm the row; on
   * failure we mark the row FAILED and publish PAYMENT_REFUND_FAILED so the ledger can
   * reverse its unwind — otherwise a failed refund would leave vendor revenue booked as
   * refunded while the money never came back.
   */
  async finalizeRefundFromWebhook(event: string, data: Record<string, unknown>): Promise<void> {
    const obj = (data && typeof data.object === 'object' && data.object !== null ? data.object : data) as Record<string, unknown>;
    const refundRef = typeof obj.reference === 'string' ? obj.reference : null;
    const chargeRef =
      typeof data.reference === 'string' ? data.reference
      : typeof obj.charge === 'string' ? obj.charge
      : null;
    const amount = typeof obj.amount === 'number' ? obj.amount : null;

    let refund: Refund | null = null;
    if (refundRef) {
      refund = await this.refunds.findOne({ where: { paystackRef: refundRef } });
    }
    if (!refund && chargeRef) {
      const payment = await this.payments.findOne({ where: { reference: chargeRef } });
      if (payment) {
        const where: Record<string, unknown> = { checkoutPaymentId: payment.id };
        if (amount != null) where.amountPesewas = amount;
        refund = await this.refunds.findOne({ where });
      }
    }
    if (!refund) {
      this.logger.warn(`[webhook] ${event}: no matching refund row (refundRef=${refundRef} chargeRef=${chargeRef} amount=${amount})`);
      return;
    }
    if (refund.status === RefundStatus.PROCESSED || refund.status === RefundStatus.FAILED) return;

    const succeeded = event === 'refund.success' || event === 'refund.processed';
    refund.status = succeeded ? RefundStatus.PROCESSED : RefundStatus.FAILED;
    refund.settlementStatus = succeeded ? 'REFUND_CONFIRMED_BY_PROCESSOR' : 'REFUND_FAILED_BY_PROCESSOR';
    await this.refunds.save(refund);
    const processorRows = await this.processorRecords.find({ where: { orderId: refund.orderId } });
    for (const row of processorRows) {
      row.refundStatus = refund.status;
      row.allocationJson = { ...(row.allocationJson ?? {}), refundWebhookEvent: event, paystackRefundRef: refund.paystackRef };
      await this.processorRecords.save(row);
    }

    if (!succeeded) {
      const reason = typeof data.message === 'string' ? data.message : 'refund failed upstream';
      this.logger.warn(`[webhook] refund ${refund.id} for order ${refund.orderId} FAILED upstream: ${reason}`);
      await this.bus.publish(
        EVENTS.PAYMENT_REFUND_FAILED,
        {
          orderId: refund.orderId,
          amountPesewas: refund.amountPesewas,
          paystackRef: refund.paystackRef ?? undefined,
          reason,
          originalEnvelopeId: `refund:${refund.id}`,
        },
        { envelopeId: `refundfailed:${refund.id}` },
      );
    }
  }

  /** Internal: the payment behind one vendor-order (support AI reads charge state per order). */
  async paymentForOrder(orderId: string): Promise<{
    payment: CheckoutPayment;
    allocation: PaymentAllocation;
  } | null> {
    const allocation = await this.allocations.findOne({ where: { orderId } });
    if (!allocation) return null;
    const payment = await this.payments.findOne({ where: { id: allocation.checkoutPaymentId } });
    if (!payment) return null;
    return { payment, allocation };
  }

  /**
   * Mock-mode helper: complete a payment as if Paystack charged it.
   *
   * Gated on the runtime environment as well as PAYSTACK_MODE. The route that
   * reaches this is `@Public()`, so an env misconfiguration in production would
   * otherwise let anyone mark any payment as paid. `PAYSTACK_MODE=mock` alone
   * is not a sufficient guard for an unauthenticated money-creating endpoint.
   */
  async mockComplete(reference: string): Promise<void> {
    if (this.env.nodeEnv === 'production' || this.env.paystackMode !== 'mock') {
      throw new NotFoundException('Not found');
    }
    const payment = await this.payments.findOne({ where: { reference } });
    if (!payment) throw new NotFoundException('Reference not found');
    PaystackClient.markMockPaid(reference, payment.amountPesewas, payment.currency);
    await this.handleChargeSuccess(reference, `mock-${reference}`, new Date().toISOString());
  }

  async getReconciliationReport(dateStr: string): Promise<{ settledAmountPesewas: number }> {
    const start = new Date(`${dateStr}T00:00:00.000Z`);
    const end = new Date(`${dateStr}T23:59:59.999Z`);
    
    const result = await this.payments
      .createQueryBuilder('p')
      .select('SUM(p.amountPesewas)', 'total')
      .where('p.status = :status', { status: 'SUCCESS' })
      .andWhere('p.paidAt BETWEEN :start AND :end', { start, end })
      .getRawOne();
      
    return {
      settledAmountPesewas: Number(result?.total || 0),
    };
  }

  async getTransferStatus(reference: string): Promise<{ reference: string; status: 'success' | 'processing' | 'failed' }> {
    return this.paystack.getTransferStatus(reference);
  }

  /**
   * Payment truth for one checkout (audit S-1, consumer re-verification).
   *
   * The bus envelope signature proves an event came from a holder of the cluster key; it
   * cannot prove the money moved. This is the endpoint the ledger and order consumers ask
   * before they post journal entries or confirm orders off a `payment.charge_succeeded`
   * event. Deliberately never throws for "not found" — `found:false` is a legitimate answer
   * that the consumer must refuse, and a 404 would be indistinguishable from a routing bug.
   */
  async checkoutStatus(checkoutId: string): Promise<{
    checkoutId: string;
    found: boolean;
    status: string | null;
    reference: string | null;
    amountPesewas: number | null;
    currency: string | null;
    paidAt: string | null;
  }> {
    const p = await this.payments.findOne({ where: { checkoutId } });
    if (!p) return { checkoutId, found: false, status: null, reference: null, amountPesewas: null, currency: null, paidAt: null };
    return {
      checkoutId,
      found: true,
      status: p.status,
      reference: p.reference,
      amountPesewas: p.amountPesewas,
      currency: p.currency,
      paidAt: p.paidAt ? new Date(p.paidAt).toISOString() : null,
    };
  }

  /** Refunds recorded for one order (audit S-1) — the ledger verifies refund events against these. */
  async refundsForOrder(orderId: string): Promise<Array<{ id: string; orderId: string; status: string; amountPesewas: number; paystackRef: string | null }>> {
    const rows = await this.refunds.find({ where: { orderId } });
    return rows.map((r) => ({ id: r.id, orderId: r.orderId, status: r.status, amountPesewas: r.amountPesewas, paystackRef: r.paystackRef ?? null }));
  }
}
