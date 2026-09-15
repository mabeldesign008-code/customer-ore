/** Ledger service — G10/G28/G38 + doc §5 rider wallet & COD control engine.
 *  Records the split at checkout; posts entries on money events; tracks COD cash;
 *  runs the rider wallet (pending/cleared/locked/cash-liability), withdrawals and
 *  the COD remittance ladder. "No money shared yet" — everything here is a
 *  payable/receivable; actual money-out goes through Paystack Transfers. */

import { Transactional as Transaction } from 'typeorm-transactional';

import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, IsNull, LessThan, Repository } from 'typeorm';
import {
  EVENTS,
  CodCashStatus,
  ChargeSucceededPayload,
  OrderEventPayload,
  ChargebackStatus,
  DisputeStatus,
  FaultParty,
  OrderStatus,
  RefundMethod,
  RiderCodStatus,
  RiderCodTier,
  VendorSettlementStatus,
  WithdrawalStatus,
  RiderWalletDto,
  mondayBoundary,
  payoutChunks,
  vendorSettlementPlan,
  TaxPartyType,
  TaxPricingMode,
} from '@ore/contracts';
import { ORE_BUS, ORE_ENV, ORE_SCHEDULER, internalFetch, serviceUrl, ORE_DEDUPE, ConsumerDedupe } from '@ore/core';
import { Bus } from '@ore/bus';
import { OreEnv } from '@ore/config';
import { Scheduler } from '@ore/jobs';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { LedgerIdempotency } from './entities/ledger-idempotency.entity';
import { MoneyBreakdown } from './entities/money-breakdown.entity';
import { journalInvariantDdl } from './journal-invariants';
import { splitLegCredits } from './delivery-leg-split';
import { CodCash } from './entities/cod-cash.entity';
import { RiderBalance } from './entities/rider-balance.entity';
import { RiderWithdrawal } from './entities/rider-withdrawal.entity';
import { VendorEarning } from './entities/vendor-earning.entity';
import { VendorSettlement } from './entities/vendor-settlement.entity';
import { VendorBalance } from './entities/vendor-balance.entity';
import { VendorWithdrawal } from './entities/vendor-withdrawal.entity';
import { Dispute } from './entities/dispute.entity';
import { Chargeback } from './entities/chargeback.entity';
import { CustomerCredit } from './entities/customer-credit.entity';
import { CustomerCreditLog } from './entities/customer-credit-log.entity';
import { CustomerLoyalty } from './entities/customer-loyalty.entity';
import { ReconcileRun } from './entities/reconcile-run.entity';
import { AccountingPeriod } from './entities/accounting-period.entity';
import { TaxEngineService, DeliveryPartnerTaxProfile, OrderTaxPostingPlan, isPostingDeferred, TaxClassificationReviewRequired } from './tax-engine.service';
import {
  CodTierConfig,
  codEscalationStep,
  codLimitDecision,
  codLimitPesewas,
  withdrawalPlan,
  withdrawablePesewas,
} from '@ore/contracts';

interface RawOrder {
  id: string;
  ref: string;
  status: string;
  orderType: string;
  vendorId: string;
  vendorName: string;
  vendorType?: string;
  serviceLevel?: 'STANDARD' | 'SCHEDULED' | 'PRIORITY';
  customerId: string;
  paymentMethod: 'PREPAID' | 'COD';
  riderId: string | null;
  subtotalPesewas: number;
  deliveryFeePesewas: number;
  serviceFeePesewas: number;
  platformFeePesewas: number;
  promotionDiscountPesewas?: number;
  vendorSharePesewas: number;
  riderFeePesewas: number;
  tipPesewas?: number;
  peakPayPesewas?: number;
  totalPesewas: number;
  errandJson: {
    task: string;
    budgetPesewas: number;
    escrowPesewas: number;
    errandStatus: string;
    spentPesewas: number;
    receipts: { amountPesewas: number; photoKey: string; note: string | null; at: string }[];
    compensationPesewas: number;
  } | null;
}

export function vendorStatementRange(from?: string, to?: string): { from: Date; to: Date } | null {
  if (from === undefined && to === undefined) return null;
  const parse = (value: string | undefined, endOfDay: boolean): Date => {
    if (!value) return endOfDay ? new Date('9999-12-31T23:59:59.999Z') : new Date('1970-01-01T00:00:00.000Z');
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? `${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`
      : value;
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) throw new BadRequestException('Statement dates must be valid ISO dates');
    return parsed;
  };
  const range = { from: parse(from, false), to: parse(to, true) };
  if (range.from > range.to) throw new BadRequestException('Statement from date must be before the to date');
  return range;
}

/** One leg of an order's fulfilment, as reported by dispatch. Rider pay is per-leg. */
interface DeliveryLeg {
  id: string;
  riderId: string;
  status: 'ACTIVE' | 'COMPLETED' | 'RELEASED';
  riderFeePesewas: number;
  peakPayPesewas: number;
  earningsPostedAt: string | null;
}

interface DispatchRider {
  id: string;
  userId: string;
  phone: string;
  codTier?: RiderCodTier;
  codStatus?: RiderCodStatus;
  codBlocked?: boolean;
  codBlockReason?: string | null;
  completedDeliveries?: number;
  verified?: boolean;
  deliveryPartnerId?: string | null;
  deliveryPartnerType?: TaxPartyType | null;
  fleetPartnerId?: string | null;
  settlementMethod?: string | null;
  contractType?: string | null;
  residentStatus?: string | null;
}

interface VendorTaxProfile {
  id: string;
  taxResidentStatus?: 'RESIDENT' | 'NON_RESIDENT' | 'UNKNOWN' | null;
  taxIdentificationNumber?: string | null;
  taxProfileJson?: Record<string, unknown> | null;
}

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(
    @InjectRepository(LedgerEntry) private readonly entries: Repository<LedgerEntry>,
    @InjectRepository(LedgerIdempotency) private readonly idempotency: Repository<LedgerIdempotency>,
    @InjectRepository(MoneyBreakdown) private readonly breakdowns: Repository<MoneyBreakdown>,
    @InjectRepository(CodCash) private readonly codCash: Repository<CodCash>,
    @InjectRepository(RiderBalance) private readonly balances: Repository<RiderBalance>,
    @InjectRepository(RiderWithdrawal) private readonly withdrawals: Repository<RiderWithdrawal>,
    @InjectRepository(VendorEarning) private readonly vendorEarnings: Repository<VendorEarning>,
    @InjectRepository(VendorSettlement) private readonly vendorSettlements: Repository<VendorSettlement>,
    @InjectRepository(VendorBalance) private readonly vendorBalances: Repository<VendorBalance>,
    @InjectRepository(VendorWithdrawal) private readonly vendorWithdrawals: Repository<VendorWithdrawal>,
    @InjectRepository(Dispute) private readonly disputes: Repository<Dispute>,
    @InjectRepository(Chargeback) private readonly chargebacks: Repository<Chargeback>,
    @InjectRepository(CustomerCredit) private readonly customerCredits: Repository<CustomerCredit>,
    @InjectRepository(CustomerCreditLog) private readonly creditLogs: Repository<CustomerCreditLog>,
    @InjectRepository(CustomerLoyalty) private readonly loyalties: Repository<CustomerLoyalty>,
    @InjectRepository(ReconcileRun) private readonly reconciles: Repository<ReconcileRun>,
    @InjectRepository(AccountingPeriod) private readonly accountingPeriods: Repository<AccountingPeriod>,
    private readonly taxEngine: TaxEngineService,
    @Inject(ORE_BUS) private readonly bus: Bus,
    @Inject(ORE_ENV) private readonly env: OreEnv,
    @Inject(ORE_SCHEDULER) private readonly scheduler: Scheduler,
    @Inject(ORE_DEDUPE) private readonly dedupe: ConsumerDedupe,
  ) {}

  private get tierCfg(): CodTierConfig {
    return {
      newLimitPesewas: this.env.codTierNewLimitPesewas,
      experiencedLimitPesewas: this.env.codTierExperiencedLimitPesewas,
      seniorLimitPesewas: this.env.codTierSeniorLimitPesewas,
      experiencedDeliveries: this.env.riderTierExperiencedDeliveries,
      seniorDeliveries: this.env.riderTierSeniorDeliveries,
    };
  }

  private taxPricingMode(): TaxPricingMode {
    return (process.env.ORE_TAX_PRICING_MODE === 'EXCLUSIVE' ? 'EXCLUSIVE' : 'INCLUSIVE');
  }

  private oreDeliveryMarginContracted(): boolean {
    return (process.env.ORE_DELIVERY_MARGIN_REVENUE_ENABLED ?? 'true').toLowerCase() !== 'false';
  }

  private deliveryPartnerTaxProfile(rider: DispatchRider | null, riderId: string): DeliveryPartnerTaxProfile {
    const deliveryPartnerType = rider?.deliveryPartnerType ?? (rider?.fleetPartnerId ? 'FLEET_DELIVERY_PARTNER' : 'INDEPENDENT_DELIVERY_PARTNER');
    return {
      deliveryPartnerId: rider?.deliveryPartnerId ?? riderId,
      deliveryPartnerType,
      fleetPartnerId: rider?.fleetPartnerId ?? null,
      contractType: rider?.contractType ?? (deliveryPartnerType === 'FLEET_DELIVERY_PARTNER' ? 'FLEET_DELIVERY_PARTNER' : 'INDEPENDENT_DELIVERY_PARTNER'),
      residentStatus: rider?.residentStatus === 'RESIDENT' || rider?.residentStatus === 'NON_RESIDENT' ? rider.residentStatus : 'UNKNOWN',
    };
  }

  private vendorResidentStatus(profile: VendorTaxProfile | null): 'RESIDENT' | 'NON_RESIDENT' | 'UNKNOWN' {
    return profile?.taxResidentStatus === 'RESIDENT' || profile?.taxResidentStatus === 'NON_RESIDENT'
      ? profile.taxResidentStatus
      : 'UNKNOWN';
  }

  private hasOrePaidDeliveryPartnerComponent(order: RawOrder): boolean {
    return Math.max(0, (order.riderFeePesewas ?? 0) - order.deliveryFeePesewas) > 0
      || Math.max(0, order.peakPayPesewas ?? 0) > 0;
  }

  private withheldSupplierTaxPesewas(grossAmountPesewas: number, wht: { whtStatus: string; whtAmountPesewas: number } | null): number {
    if (wht?.whtStatus !== 'APPLIES') return 0;
    return Math.min(grossAmountPesewas, Math.max(0, wht.whtAmountPesewas ?? 0));
  }

  /**
   * Installs the ledger's database-level invariants (append-only + per-ref balance).
   *
   * Runs at boot rather than only from the migration because `migrationsRun` is gated on
   * production, so in development the schema is synchronised and migrations never execute —
   * the invariants would silently be absent everywhere except prod. The DDL is idempotent
   * (`IF NOT EXISTS` / `CREATE OR REPLACE`), and it comes from the same module the migration
   * uses, so the two cannot drift.
   *
   * If it cannot be installed the service still starts, but says so loudly: the
   * application-level gate in `recordTransaction` is still in force, and it is better to
   * boot without the belt than to have no ledger at all.
   */
  async ensureJournalInvariants(): Promise<void> {
    try {
      const driver = this.entries.manager.connection.options.type as string;
      for (const sql of journalInvariantDdl(driver)) {
        await this.entries.query(sql);
      }
    } catch (err) {
      Logger.warn(
        `Ledger journal invariants not enforced at the database level: ${(err as Error).message}. ` +
        'The append-only + balance rules are still enforced in recordTransaction, but a code path ' +
        'that bypasses it would not be caught.',
        'LedgerService',
      );
    }
  }

  async init(): Promise<void> {
    // The ledger is what pays everyone, so its invariants are installed before it accepts a
    // single event.
    // In production, this is handled by migrations run from a single CI/CD job to prevent race conditions.
    if (this.env.nodeEnv !== 'production') {
      await this.ensureJournalInvariants();
    }
    // G10: record the per-order money breakdown the moment the order exists (covers COD + prepaid)
    await this.bus.subscribe<OrderEventPayload>(EVENTS.ORDER_CREATED, async (env) => {
      if (!(await this.take(env.id))) return;
      const order = await this.fetchOrder(env.payload.orderId).catch(() => null);
      if (order) await this.ensureBreakdown(order);
    });

    await this.bus.subscribe<ChargeSucceededPayload>(EVENTS.PAYMENT_CHARGE_SUCCEEDED, async (env) => {
      if (!(await this.take(env.id))) return;
      await this.onChargeSucceeded(env.payload.checkoutId, env.payload.pspFeePesewas || 0);
    });

    await this.bus.subscribe<OrderEventPayload>(EVENTS.ORDER_DELIVERED, async (env) => {
      if (!(await this.take(env.id))) return;
      await this.settleOrDefer(env.payload.orderId);
    });

    await this.bus.subscribe<OrderEventPayload & { reason?: string }>(EVENTS.ORDER_CANCELLED, async (env) => {
      if (!(await this.take(env.id))) return;
      await this.onAborted(env.payload.orderId, 'cancelled');
    });

    await this.bus.subscribe<OrderEventPayload>(EVENTS.ORDER_REJECTED, async (env) => {
      if (!(await this.take(env.id))) return;
      await this.onAborted(env.payload.orderId, 'rejected');
    });

    await this.bus.subscribe<{ orderId: string; amountPesewas: number; reason: string; status: string; refundComponent?: string; taxPeriodStatus?: string; originalTaxStatus?: string }>(EVENTS.PAYMENT_REFUND_PROCESSED, async (env) => {
      if (!(await this.take(env.id))) return;
      // The refund id lives in the envelope id — the one replay-safe handle we have.
      await this.onRefundProcessed(env.payload.orderId, env.payload.amountPesewas, env.id, env.payload.refundComponent, env.payload.taxPeriodStatus, env.payload.originalTaxStatus);
    });

    // The refund was announced processed but then FAILED upstream (Paystack webhook
    // refund.failed): reverse the unwind so vendor/rider revenue is booked back in.
    // Audit F-BUG-15 — before this consumer, a failed refund left the ledger with
    // revenue unwound and customer cash credited while no money ever moved.
    await this.bus.subscribe<{ orderId: string; amountPesewas: number; originalEnvelopeId?: string }>(EVENTS.PAYMENT_REFUND_FAILED, async (env) => {
      if (!(await this.take(env.id))) return;
      await this.onRefundFailed(env.payload.orderId, env.payload.originalEnvelopeId);
    });

    // money-out truth: Paystack Transfer result finalises withdrawals AND vendor settlements
    await this.bus.subscribe<{ reference: string; withdrawalId?: string; vendorWithdrawalId?: string; settlementId?: string; pspFeePesewas?: number }>(EVENTS.PAYMENT_TRANSFER_SUCCEEDED, async (env) => {
      if (!(await this.take(env.id))) return;
      if (env.payload.withdrawalId) {
        await this.applyTransferResult(env.payload.withdrawalId, env.payload.reference, true, env.payload.pspFeePesewas);
      } else if (env.payload.vendorWithdrawalId) {
        await this.applyVendorWithdrawalResult(env.payload.vendorWithdrawalId, env.payload.reference, true, env.payload.pspFeePesewas);
      } else if (env.payload.settlementId) {
        await this.finalizeSettlementTransfer(env.payload.settlementId, env.payload.reference, true);
      }
    });
    await this.bus.subscribe<{ reference: string; withdrawalId?: string; vendorWithdrawalId?: string; settlementId?: string }>(EVENTS.PAYMENT_TRANSFER_FAILED, async (env) => {
      if (!(await this.take(env.id))) return;
      if (env.payload.withdrawalId) {
        await this.applyTransferResult(env.payload.withdrawalId, env.payload.reference, false);
      } else if (env.payload.vendorWithdrawalId) {
        await this.applyVendorWithdrawalResult(env.payload.vendorWithdrawalId, env.payload.reference, false);
      } else if (env.payload.settlementId) {
        await this.finalizeSettlementTransfer(env.payload.settlementId, env.payload.reference, false);
      }
    });

    // doc §8 rider milestones (dispatch publishes on delivery count) — idempotent per milestone
    await this.bus.subscribe<{ riderId: string; milestone: number; amountPesewas: number }>(EVENTS.RIDER_MILESTONE_EARNED, async (env) => {
      if (!(await this.take(env.id))) return;
      await this.creditRiderMilestone(env.payload.riderId, env.payload.milestone, env.payload.amountPesewas);
    });

    // doc §4 vendor penalty (SLA engine) — financial penalties absorbed by the vendor
    await this.bus.subscribe<{ vendorId: string; amountPesewas: number; trigger: string }>(EVENTS.VENDOR_PENALTY, async (env) => {
      if (!(await this.take(env.id))) return;
      if (env.payload.amountPesewas > 0) {
        const vb = await this.vendorBalanceFor(env.payload.vendorId);
        vb.owedPesewas += env.payload.amountPesewas;
        await this.vendorBalances.save(vb);
        await this.post(null, 'vendor_penalty', 0, 0, `penalty:${env.payload.vendorId} ${env.payload.trigger}`);
      }
    });

    this.scheduler.onInterval('ledger-reconcile', 24 * 60 * 60_000, async () => { await this.reconcile(); });
    this.scheduler.onInterval('ledger-psp-reconcile', 24 * 60 * 60_000, async () => { await this.runExternalPspReconciliation(); });
    this.scheduler.onInterval('transfer-sweeper', 10 * 60_000, async () => { await this.reconcileStaleTransfers(); });
    // A tax classification only a human can make blocks the posting that pays the rider and the
    // vendor. Resolving the review case used to update the case and nothing else, so the money
    // stayed unposted with no remaining trigger to post it (audit P3-1/P4-3).
    this.scheduler.onInterval('tax-review-replay', 15 * 60_000, async () => { await this.replayResolvedTaxReviews(); });
    // doc §8: referral credits expire after their window if unused
    this.scheduler.onInterval('referral-credit-expiry', 12 * 60 * 60_000, async () => { await this.expireReferralCredits(); });
    // wallet clearing (pending → cleared after RIDER_CLEAR_HOURS) + COD debt escalation ladder
    this.scheduler.onInterval('wallet-clear', this.env.riderClearCheckIntervalMin * 60_000, async () => { await this.clearEarnings(); });
    this.scheduler.onInterval('wallet-cod-escalate', this.env.codEscalateCheckIntervalMin * 60_000, async () => { await this.escalateCodDebt(); });
    // doc §4: weekly vendor settlement — run early Monday morning, idempotent per (vendor, cycle)
    this.scheduler.onInterval('vendor-settle', this.env.vendorSettleCheckIntervalMin * 60_000, async () => {
      const now = new Date();
      if (now.getUTCDay() === this.env.vendorSettleDay && now.getUTCHours() < 6) {
        await this.runVendorSettlements(now);
      }
    });
  }

  /** charge.success (prepaid) — Paystack confirms cash capture only.
   *  Tax/revenue/settlement ownership is not inferred from Paystack and final allocations
   *  are not released until the order outcome is known. */
  /**
   * Audit S-1: confirm with the payment service — the system of record for Paystack truth —
   * that a checkout really is SUCCESS before the ledger books customer money. The envelope
   * signature proves where an event came from; this proves the underlying fact.
   *
   * A transport failure THROWS so the bus retries (payment may be mid-deploy); only an
   * authoritative "not paid" returns false and gets logged. Kept as its own method so the
   * balance-invariant spec can stub the payment lookup while exercising real posting code.
   */
  private async checkoutIsPaid(checkoutId: string): Promise<boolean> {
    const res = await internalFetch(`${serviceUrl('payment')}/internal/payments/checkout/${encodeURIComponent(checkoutId)}`);
    if (!res.ok) {
      throw new Error(`charge_succeeded re-verification could not reach payment service (HTTP ${res.status}) for checkout ${checkoutId}`);
    }
    const truth = (await res.json()) as { found: boolean; status: string | null };
    if (truth.found && truth.status === 'SUCCESS') return true;
    Logger.error(
      `[security] REFUSED charge_succeeded posting for checkout ${checkoutId}: payment service reports ${truth.found ? truth.status : 'not found'}`,
      'LedgerService',
    );
    return false;
  }

  /**
   * Audit S-1: verify a refund event against the payment system of record before crediting
   * a customer wallet. The envelope id is `refund:<uuid>` — the same row id the payment
   * service published from. Transport failure throws (bus retries); a mismatch refuses.
   */
  private async refundRecordMatches(orderId: string, refundId: string | null, amountPesewas: number): Promise<boolean> {
    const res = await internalFetch(`${serviceUrl('payment')}/internal/payments/refunds/${encodeURIComponent(orderId)}`);
    if (!res.ok) {
      throw new Error(`refund_processed verification could not reach payment service (HTTP ${res.status}) for order ${orderId}`);
    }
    const refunds = (await res.json()) as Array<{ id: string; status: string; amountPesewas: number }>;
    const match = refundId ? refunds.find((r) => r.id === refundId) : undefined;
    if (match && ['PROCESSED', 'PROCESSING'].includes(match.status) && match.amountPesewas === amountPesewas) return true;
    Logger.error(
      `[security] REFUSED refund_processed for order ${orderId} (refund ${refundId ?? 'n/a'}, ${amountPesewas} pesewas): ` +
        'no matching PROCESSED/PROCESSING refund row in the payment service',
      'LedgerService',
    );
    return false;
  }

  private async onChargeSucceeded(checkoutId: string, pspFeePesewas: number = 0): Promise<void> {
    if (!(await this.checkoutIsPaid(checkoutId))) return;
    // Remote fetch outside the journal transaction (audit P2).
    const orders = await this.fetchOrdersByCheckout(checkoutId);
    await this.postChargeSucceeded(orders, pspFeePesewas);
  }

  @Transaction()
  private async postChargeSucceeded(orders: RawOrder[], pspFeePesewas: number): Promise<void> {
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      if (order.paymentMethod !== 'PREPAID') continue;
      // Replay guard: a republished charge event must not capture the same order twice.
      if (await this.alreadyPosted(`charge:${order.id}`)) continue;
      await this.ensureBreakdown(order);
      
      const isFirst = i === 0;
      const feeToApply = isFirst ? pspFeePesewas : 0;
      
      const legs: { account: string; debitPesewas: number; creditPesewas: number }[] = [];
      if (feeToApply > 0) {
        legs.push({ account: 'psp_fee', debitPesewas: feeToApply, creditPesewas: 0 });
        legs.push({ account: 'customer_cash', debitPesewas: order.totalPesewas - feeToApply, creditPesewas: 0 });
      } else {
        legs.push({ account: 'customer_cash', debitPesewas: order.totalPesewas, creditPesewas: 0 });
      }
      legs.push({ account: 'customer_funds_held', debitPesewas: 0, creditPesewas: order.totalPesewas });

      await this.recordTransaction(
        order.id,
        legs,
        `payment_capture:${order.id}`,
        `charge:${order.id}`,
      );
    }
  }

  /**
   * Re-drive postings that a tax classification review had blocked.
   *
   * `onDelivered` refuses to post when a rider's or vendor's resident status is UNKNOWN — the
   * right call, because guessing writes a wrong WHT figure into an append-only ledger and files
   * it with the GRA. But the refusal is a `throw`, and after the retries are spent the event is
   * dead-lettered; resolving the review case then updated the case row and nothing else. So the
   * order stayed unposted forever: the rider had delivered, the customer had paid, and nothing
   * was ever going to pay either the rider or the vendor. An operator doing exactly what the
   * exceptions queue asked of them produced no effect (audit P3-1/P4-3).
   *
   * Re-running `onDelivered` is safe: it opens with the `delivered:<orderId>` replay guard, so a
   * posting that already happened is a no-op, and a case whose blocker is still unresolved
   * simply fails again and is retried on the next sweep.
   */
  private async replayResolvedTaxReviews(): Promise<void> {
    const cases = await this.taxEngine.resolvedOrderReviews();
    for (const c of cases) {
      if (!c.orderId) continue;
      try {
        if (await this.alreadyPosted(`delivered:${c.orderId}`)) continue;
        await this.onDelivered(c.orderId);
        Logger.log(`[TaxReviewReplay] posted order ${c.orderId} after review ${c.id} was resolved`, 'LedgerService');
      } catch (err) {
        // Still blocked, or blocked on something else now. Leave it for the next sweep rather
        // than letting one stuck order stop the rest of the queue being paid out.
        Logger.warn(`[TaxReviewReplay] order ${c.orderId} still not postable: ${(err as Error).message}`, 'LedgerService');
      }
    }
  }

  /**
   * Post a delivered order, treating a tax hold as done-for-now rather than as a failure.
   *
   * `onDelivered` refuses to post while a rider's or vendor's resident status is UNKNOWN, which
   * is right — guessing writes a wrong withholding figure into an append-only ledger and files
   * it with the GRA. But refusing by throwing put the event through ten redeliveries and into
   * the dead-letter queue, on every delivery by every rider whose compliance check had not
   * finished. That is the queue an operator reads to find real breakage, and this drowned it:
   * on a live run seventeen of nineteen dead letters were routine tax holds.
   *
   * No retry can clear the hold — only a person can — and the review case is already committed
   * by the time the deferral is raised, so the event is acked here and
   * `replayResolvedTaxReviews` pays the money out once the decision is made. Any other error
   * still propagates and still earns its redeliveries.
   */
  private async settleOrDefer(orderId: string): Promise<void> {
    try {
      await this.onDelivered(orderId);
    } catch (err) {
      if (!isPostingDeferred(err)) throw err;
      Logger.log(
        `[TaxReview] order ${orderId} held pending classification review: ${err.reasons}`,
        'LedgerService',
      );
    }
  }

  /** order delivered — rider earned fee → wallet pending; COD creates the cash receivable (G38);
   *  vendor earns its (net-of-commission) share → settlement accrual (doc §4);
   *  errands settle the escrow (doc §Errands). */
  private async onDelivered(orderId: string): Promise<void> {
    // Replay guard (audit P0): this handler runs every side effect — rider fee, COD
    // receivable, vendor earning, loyalty, bonus. A republished ORDER_DELIVERED (new
    // envelope id, so the in-memory dedupe can't see it) must not run it twice.
    if (await this.alreadyPosted(`delivered:${orderId}`)) return;
    // Remote fetches happen OUTSIDE the journal transaction (audit P2): a slow or failing
    // upstream must never hold a journal transaction open or roll back posted legs.
    const order = await this.fetchOrder(orderId);
    // Audit S-1: this handler releases money — rider fee, vendor earning, COD receivable,
    // loyalty, bonus. It used to run for any order it could fetch, so a forged
    // `order.delivered` envelope triggered vendor settlement on an order still in transit.
    // The order service is the lifecycle system of record: settle only what it says is delivered.
    if (order.status !== 'DELIVERED') {
      Logger.error(
        `[security] REFUSED order.delivered posting for ${orderId}: order status is ${order.status}, not DELIVERED`,
        'LedgerService',
      );
      return;
    }
    const [vendorOwner, vendorTaxProfile, rider] = await Promise.all([
      this.vendorOwnerUserId(order.vendorId).catch(() => null),
      this.vendorTaxProfile(order.vendorId).catch(() => null),
      order.riderId ? this.fetchRider(order.riderId).catch(() => null) : Promise.resolve(null),
    ]);
    const deliveryProfile = order.riderId ? this.deliveryPartnerTaxProfile(rider, order.riderId) : null;
    if (deliveryProfile?.residentStatus === 'UNKNOWN' && this.hasOrePaidDeliveryPartnerComponent(order)) {
      await this.taxEngine.recordClassificationReview({
        transactionId: `order:${order.id}:final`,
        orderId: order.id,
        componentType: 'delivery_partner_tax_profile',
        reason: 'delivery_partner_resident_status_unknown',
        payload: { riderId: order.riderId, vendorId: order.vendorId },
      });
      throw new TaxClassificationReviewRequired('delivery_partner_resident_status_unknown');
    }
    try {
      await this.postDelivered(order, vendorOwner, deliveryProfile, vendorTaxProfile);
    } catch (err) {
      if (err instanceof ConflictException && (err.message.includes('requires review') || err.message.includes('Payment capture must be confirmed'))) {
        await this.taxEngine.recordClassificationReview({
          transactionId: `order:${order.id}:final`,
          orderId: order.id,
          componentType: 'order_tax_classification',
          reason: err.message,
          payload: { riderId: order.riderId, vendorId: order.vendorId },
        });
      }
      throw err;
    }
  }

  @Transaction()
  private async postDelivered(order: RawOrder, vendorOwner: string | null, deliveryProfile: DeliveryPartnerTaxProfile | null, vendorTaxProfile: VendorTaxProfile | null): Promise<void> {
    const orderId = order.id;
    if (await this.alreadyPosted(`delivered:${orderId}`)) return; // re-check inside the tx: two racing events
    await this.ensureBreakdown(order);
    if (order.paymentMethod === 'PREPAID' && !(await this.alreadyPosted(`charge:${orderId}`))) {
      await this.taxEngine.recordRefundReview({
        orderId,
        transactionId: `order:${orderId}:final`,
        amountPesewas: order.totalPesewas,
        reason: 'Payment capture is not confirmed; final tax/settlement allocation cannot be released',
      });
      throw new ConflictException('Payment capture must be confirmed before final allocations post');
    }

    const plan = await this.taxEngine.orderFinalPostingPlan({
      order,
      deliveryPartner: deliveryProfile,
      vendorResidentStatus: this.vendorResidentStatus(vendorTaxProfile),
      oreDeliveryMarginContracted: this.oreDeliveryMarginContracted(),
      pricingMode: this.taxPricingMode(),
      paymentProcessor: order.paymentMethod === 'COD' ? 'CASH' : 'PAYSTACK',
      settlementMethod: order.paymentMethod === 'COD' ? 'COD_CASH' : 'INTERNAL_LEDGER',
      transactionDate: new Date(),
    });

    await this.postFinalAllocation(order, plan);

    const riderFeePesewas = order.riderFeePesewas ?? 0;
    const tipPesewas = order.tipPesewas ?? 0;
    const peakPayPesewas = order.peakPayPesewas ?? 0;
    const riderCreditPesewas = Math.max(0, riderFeePesewas + tipPesewas + peakPayPesewas - plan.deliveryPartnerWithholdingPesewas);

    // doc §5: fulfilment earnings land in Pending, clear after the configured window. Supplier WHT, when
    // a configured rule applies, is withheld into tax payable rather than rider/partner payable.
    //
    // Earnings are split across every leg that was actually worked, not paid to whoever happens
    // to be assigned at delivery. A laundry order has a collection rider and a return rider; a
    // reassignment after pickup leaves two riders each owed for the distance they covered.
    // Paying only `order.riderId` meant the collection rider was never paid at all.
    await this.creditDeliveryLegs(order, riderCreditPesewas);

    // Errand shopping reimbursement is not a delivery fee or revenue. It is customer escrow
    // paid through to the rider/shopper and made available immediately.
    if (order.riderId && plan.errandSpentReimbursementPesewas > 0) {
      const rb = await this.balanceFor(order.riderId);
      rb.clearedPesewas += plan.errandSpentReimbursementPesewas;
      rb.feesEarnedPesewas += plan.errandSpentReimbursementPesewas;
      await this.balances.save(rb);
    }

    if (plan.errandUnspentCreditPesewas > 0) {
      await this.creditCustomerWallet(order.customerId, plan.errandUnspentCreditPesewas, `errand:unspent:${order.id}`, 'unspent errand budget refund', {
        fundedBy: null,
      });
    }

    if (order.paymentMethod === 'COD' && order.riderId) {
      await this.codCash.save(this.codCash.create({ orderId, riderId: order.riderId, amountPesewas: order.totalPesewas, status: CodCashStatus.EXPECTED }));
      await this.addCashLiability(order.riderId, order.totalPesewas);
      await this.bus.publish(EVENTS.LEDGER_COD_CASH_COLLECTED, { orderId, riderId: order.riderId, amountPesewas: order.totalPesewas });
      await this.evaluateCodControl(order.riderId);
    }

    // doc §4: vendor earns on every delivered vendor order (prepaid + COD).
    await this.accrueVendorEarning(order);
    await this.awardLoyalty(order.customerId, order.subtotalPesewas);
    // doc §8: vendor GHS 200 bonus after N real (non-self) delivered orders. A missing
    // vendor tax profile opens a Finance/Tax review for the bonus, but must not roll back
    // the delivered order's already-classified vendor/rider/Ore allocation.
    try {
      await this.maybeVendorBonus(order, vendorOwner, vendorTaxProfile);
    } catch (err) {
      if (err instanceof ConflictException || err instanceof BadRequestException) {
        this.logger.warn(`Vendor bonus held for tax review on order ${order.id}: ${err.message}`);
        return;
      }
      throw err;
    }
  }

  private async postFinalAllocation(order: RawOrder, plan: OrderTaxPostingPlan): Promise<void> {
    const legs: { account: string; debitPesewas: number; creditPesewas: number }[] = [];
    if (order.paymentMethod === 'COD') {
      legs.push({ account: 'cod_cash_receivable', debitPesewas: order.totalPesewas, creditPesewas: 0 });
    } else {
      legs.push({ account: 'customer_funds_held', debitPesewas: order.totalPesewas, creditPesewas: 0 });
    }

    if (plan.deliveryShortfallIncentivePesewas > 0) {
      legs.push({ account: 'delivery_partner_incentives', debitPesewas: plan.deliveryShortfallIncentivePesewas, creditPesewas: 0 });
    }
    if (plan.orePeakIncentivePesewas > 0) {
      legs.push({ account: 'platform_peak_pay', debitPesewas: plan.orePeakIncentivePesewas, creditPesewas: 0 });
    }

    if (order.vendorSharePesewas > 0) {
      legs.push({ account: 'vendor_payable', debitPesewas: 0, creditPesewas: order.vendorSharePesewas });
    }

    const riderCreditGross =
      plan.deliveryPartnerEarningPesewas +
      plan.riderTipPesewas +
      plan.orePeakIncentivePesewas +
      plan.errandSpentReimbursementPesewas;
    const riderCredit = Math.max(0, riderCreditGross - plan.deliveryPartnerWithholdingPesewas);
    if (riderCredit > 0) {
      legs.push({ account: 'rider_payable', debitPesewas: 0, creditPesewas: riderCredit });
    }

    if (plan.errandUnspentCreditPesewas > 0) {
      legs.push({ account: 'customer_wallet_credit', debitPesewas: 0, creditPesewas: plan.errandUnspentCreditPesewas });
    }

    if (plan.oreNetRevenuePesewas > 0) {
      legs.push({ account: 'platform_revenue', debitPesewas: 0, creditPesewas: plan.oreNetRevenuePesewas });
    }
    for (const tax of plan.taxEntries) {
      if (tax.creditPesewas > 0) legs.push({ account: tax.account, debitPesewas: 0, creditPesewas: tax.creditPesewas });
    }

    // `ref` is the grouping key the database balance guard sums over (see journal-invariants.ts),
    // so it has to identify ONE transaction. This passed the literal 'delivered', which meant
    // every delivered order that ever posted shared a single group: the guard was checking that
    // the whole platform's deliveries net to zero rather than that this order's journal balances,
    // and its per-row scan grew with the table forever.
    await this.recordTransaction(order.id, legs, `delivered:${order.id}`, `delivered:${order.id}`);
  }

  /** doc §8 vendor bonus — after N real delivered orders (excludes the vendor's own orders). */
  private async maybeVendorBonus(order: RawOrder, vendorOwner: string | null, vendorTaxProfile: VendorTaxProfile | null): Promise<void> {
    if (order.vendorSharePesewas <= 0) return; // errands/zero-share don't count
    if (vendorOwner && order.customerId === vendorOwner) return; // not test/self orders
    const count = await this.vendorEarnings.count({ where: { vendorId: order.vendorId } });
    if (count !== this.env.vendorBonusAfterOrders) return;
    const vendorResidentStatus = this.vendorResidentStatus(vendorTaxProfile);
    if (vendorResidentStatus === 'UNKNOWN') {
      await this.taxEngine.recordClassificationReview({
        transactionId: `vendor_bonus:${order.id}`,
        orderId: order.id,
        componentType: 'vendor_bonus_incentive',
        reason: 'vendor_resident_status_unknown_for_ore_paid_supplier',
        payload: { vendorId: order.vendorId },
      });
      throw new TaxClassificationReviewRequired('vendor_bonus_incentive:vendor_resident_status_unknown_for_ore_paid_supplier');
    }
    const grossBonus = this.env.vendorBonusPesewas;
    const classification = await this.taxEngine.classifyGenericComponent({
      transactionId: `vendor_bonus:${order.id}`,
      orderId: order.id,
      componentType: 'vendor_bonus_incentive',
      payerType: 'ORE', payerId: 'ORE',
      payeeType: 'VENDOR', payeeId: order.vendorId,
      supplierType: 'VENDOR', supplierId: order.vendorId,
      customerId: order.customerId,
      grossAmountPesewas: grossBonus,
      taxableAmountPesewas: grossBonus,
      taxCategory: 'NOT_ORE_SUPPLY',
      revenueOwner: 'VENDOR',
      paymentProcessor: 'INTERNAL',
      settlementMethod: 'INTERNAL_LEDGER',
      contractType: 'ORE_VENDOR_LOYALTY_BONUS',
      transactionType: 'GENERAL_SERVICES',
      residentStatus: vendorResidentStatus,
      transactionDate: new Date(),
      pricingMode: this.taxPricingMode(),
    });
    const withheldPesewas = this.withheldSupplierTaxPesewas(grossBonus, classification.wht);
    const netBonus = grossBonus - withheldPesewas;

    const vb = await this.vendorBalanceFor(order.vendorId);
    vb.bonusPesewas += netBonus;
    await this.vendorBalances.save(vb);
    // The bonus lands in the vendor's balance as something we will pay out, so it is a
    // liability — and a liability nobody booked a cost against is profit we never had.
    // Supplier WHT, when configured, is credited to tax payable instead of vendor payable.
    const legs = [
      { account: 'vendor_bonus_funding', debitPesewas: grossBonus, creditPesewas: 0 },
      { account: 'vendor_bonus', debitPesewas: 0, creditPesewas: netBonus },
    ];
    if (withheldPesewas > 0) legs.push({ account: 'wht_payable', debitPesewas: 0, creditPesewas: withheldPesewas });
    await this.recordTransaction(
      null,
      legs,
      `vendor_bonus:${order.vendorId}`,
      `vendor_bonus:${order.id}`,
    );
    await this.bus.publish(EVENTS.VENDOR_BONUS_EARNED, { vendorId: order.vendorId, amountPesewas: netBonus, grossAmountPesewas: grossBonus, withheldPesewas, orders: count });
  }

  /** pre-pickup abort — prepaid refund handled by payment-service; ledger just notes the reversal.
   *  Errands: failed-errand compensation (doc §Errands) — rider reimbursed their spend (never
   *  out of pocket), the rest of the escrow credited back to the customer (idempotent). */
  private async onAborted(orderId: string, reason: string): Promise<void> {
    // Replay guard: cancelled/rejected events are at-least-once too.
    if (await this.alreadyPosted(`abort:${reason}:${orderId}`)) return;
    // Remote fetch outside the journal transaction (audit P2).
    const order = await this.fetchOrder(orderId).catch(() => null);
    await this.postAborted(order, orderId, reason);
  }

  @Transaction()
  private async postAborted(order: RawOrder | null, orderId: string, reason: string): Promise<void> {
    if (await this.alreadyPosted(`abort:${reason}:${orderId}`)) return; // racing events
    if (order?.orderType === 'ERRAND' && order.errandJson) {
      const errand = order.errandJson;
      const spent = errand.spentPesewas;
      const compensation = Math.max(0, order.totalPesewas - spent);
      if (order.riderId && spent > 0) {
        const rb = await this.balanceFor(order.riderId);
        rb.clearedPesewas += spent;
        rb.feesEarnedPesewas += spent;
        await this.balances.save(rb);
      }
      // Release the escrow against what it actually paid for: the rider's spend and the
      // customer's compensation. The compensation used to be booked twice — once here as
      // `errand_compensation` and once inside creditCustomerWallet — so a failed errand
      // recorded twice the liability it owed.
      const legs: { account: string; debitPesewas: number; creditPesewas: number }[] = [
        { account: 'customer_funds_held', debitPesewas: order.totalPesewas, creditPesewas: 0 },
      ];
      if (spent > 0) legs.push({ account: 'rider_payable', debitPesewas: 0, creditPesewas: spent });
      if (compensation > 0) legs.push({ account: 'customer_wallet_credit', debitPesewas: 0, creditPesewas: compensation });
      await this.recordTransaction(orderId, legs, `errand:abort:${reason}:${orderId}`, `abort:${reason}:${orderId}`);
      if (compensation > 0) {
        await this.creditCustomerWallet(order.customerId, compensation, `errand:refund:${orderId}`, `failed errand compensation (${reason})`, {
          fundedBy: null,
        });
      }
      return;
    }
    await this.post(orderId, 'aborted', 0, 0, `abort:${reason}`);
  }

  /**
   * Refunds reverse only what is safe and identified. Before final settlement, the only
   * released accounting component is held customer funds, so the refund reduces that hold.
   * After final allocation/tax has posted, an unclassified refund goes to Finance/Tax review
   * instead of auto-reversing revenue, VAT, WHT or partner settlements from a Paystack move.
   */
  private async onRefundProcessed(orderId: string, amountPesewas: number, idempotencyKey?: string, refundComponent?: string, taxPeriodStatus?: string, originalTaxStatus?: string): Promise<void> {
    // Replay guard: a redelivered refund event must not unwind the split twice.
    if (idempotencyKey && (await this.alreadyPosted(idempotencyKey))) return;
    // Audit S-1: the refund must exist in the payment system of record, with a matching
    // amount and a real status, before the customer wallet is credited. A forged
    // refund_processed event must not be able to mint customer credit.
    const refundId = idempotencyKey && idempotencyKey.startsWith('refund:') ? idempotencyKey.slice('refund:'.length) : null;
    if (!(await this.refundRecordMatches(orderId, refundId, amountPesewas))) return;
    // Remote fetch outside the journal transaction (audit P2).
    const order = await this.fetchOrder(orderId).catch(() => null);
    await this.postRefundProcessed(order, orderId, amountPesewas, idempotencyKey, refundComponent, taxPeriodStatus, originalTaxStatus);
  }

  @Transaction()
  private async postRefundProcessed(order: RawOrder | null, orderId: string, amountPesewas: number, idempotencyKey?: string, refundComponent?: string, taxPeriodStatus?: string, originalTaxStatus?: string): Promise<void> {
    if (idempotencyKey && (await this.alreadyPosted(idempotencyKey))) return; // racing events
    if (amountPesewas <= 0) return;

    const held = Math.max(0, await this.netCredit(orderId, 'customer_funds_held'));
    const finalReleased = await this.alreadyPosted(`delivered:${orderId}`);
    if (!finalReleased && held > 0) {
      const refundAmount = Math.min(amountPesewas, held);
      await this.recordTransaction(
        orderId,
        [
          { account: 'customer_funds_held', debitPesewas: refundAmount, creditPesewas: 0 },
          { account: 'customer_cash', debitPesewas: 0, creditPesewas: refundAmount },
        ],
        // Keyed by the refund event, not the order: an order can be refunded more than once
        // (partial refunds, a later goodwill credit), and those are separate transactions that
        // must not share the balance guard's grouping key. Without an idempotency key there is no
        // natural identifier for the refund, so fall back to a unique one — the same shape the
        // tax review below already uses.
        idempotencyKey ?? `refund:${orderId}:${Date.now()}`,
        idempotencyKey,
      );
      return;
    }

    await this.taxEngine.recordRefundReview({
      orderId,
      transactionId: idempotencyKey ?? `refund:${orderId}:${Date.now()}`,
      amountPesewas,
      reason: finalReleased
        ? `Refund after final allocation needs affected component/tax-period review before reversal (component=${refundComponent ?? 'UNSPECIFIED'}, taxPeriodStatus=${taxPeriodStatus ?? 'UNKNOWN'}, originalTaxStatus=${originalTaxStatus ?? 'UNKNOWN'})`
        : 'Refund has no identifiable held-funds balance; original treatment uncertain',
      component: refundComponent ?? null,
    });
  }

  /**
   * PAYMENT_REFUND_FAILED: the refund was announced (and unwound) but the PSP says it
   * failed — reverse the exact legs that `postRefundProcessed` posted, restoring the
   * vendor/rider/platform split. Idempotent per original envelope; a failure that never
   * posted (refund failed before we confirmed) has nothing to reverse.
   */
  @Transaction()
  /**
   * The amount a dispute resolution will actually move, resolved BEFORE the approval
   * is submitted (audit F-SEC-9). The approval gate tiers signatures by amount
   * (1 checker < GHS 1k; 2 + super 1k–10k; 3 + super ≥ 10k) — the controller used to
   * submit `dto.amountPesewas ?? 0`, so a `refund_full` (amount resolved from the order
   * inside the service) tiered at GHS 0 and a single non-super signature authorized a
   * refund of any size.
   */
  async disputeResolutionAmount(disputeId: string, dto: { decision?: string; amountPesewas?: number }): Promise<number> {
    const dispute = await this.disputes.findOne({ where: { id: disputeId } });
    if (!dispute) throw new NotFoundException('Dispute not found');
    if (dto.decision === 'refund_full') {
      const order = await this.fetchOrder(dispute.orderId);
      return order.totalPesewas;
    }
    if (dto.decision === 'refund_partial') {
      const amount = Number(dto.amountPesewas ?? 0);
      if (amount <= 0) throw new BadRequestException('A partial refund needs a positive amountPesewas');
      const order = await this.fetchOrder(dispute.orderId);
      if (amount > order.totalPesewas) {
        throw new BadRequestException(`Refund cannot exceed order total (GHS ${(order.totalPesewas / 100).toFixed(2)})`);
      }
      return amount;
    }
    return 0;
  }

  /**
   * The amount a chargeback resolution will actually move (audit F-SEC-9). `lost`
   * returns the bank claim to the bank for the full `amountPesewas`; `won` moves only
   * the fees (tracked separately, not tiered).
   */
  async chargebackResolutionAmount(chargebackId: string, dto: { outcome?: string }): Promise<number> {
    const cb = await this.chargebacks.findOne({ where: { id: chargebackId } });
    if (!cb) throw new NotFoundException('Chargeback not found');
    return dto.outcome === 'lost' ? cb.amountPesewas : 0;
  }

  private async onRefundFailed(orderId: string, originalEnvelopeId?: string): Promise<void> {
    if (!originalEnvelopeId) return;
    const reversalKey = `refundreversed:${originalEnvelopeId}`;
    if (await this.alreadyPosted(reversalKey)) return; // racing redeliveries

    const posted = await this.entries.find({ where: { idempotencyKey: originalEnvelopeId } });
    if (posted.length === 0) {
      this.logger.warn(`[ledger] refund failed for order ${orderId} but nothing was posted under ${originalEnvelopeId} — nothing to reverse`);
      return;
    }
    const reversed = posted.map((l) => ({
      account: l.account,
      debitPesewas: l.creditPesewas,
      creditPesewas: l.debitPesewas,
    }));
    await this.recordTransaction(orderId, reversed, `refund-reversed:${orderId}`, reversalKey);
    this.logger.warn(`[ledger] reversed refund unwind for order ${orderId} (${reversed.length} legs) — refund failed upstream`);
  }

  // ── Rider wallet (doc §5) ─────────────────────────────────────────
  async balanceFor(riderId: string, manager?: any): Promise<RiderBalance> {
    const repository = manager ? manager.getRepository(RiderBalance) : this.balances;
    let balance = await repository.findOne({ where: { riderId } });
    if (!balance) {
      const rider = await this.fetchRider(riderId).catch(() => null);
      try {
        balance = await repository.save(repository.create({ riderId, userId: rider?.userId ?? null }));
      } catch (err) {
        // Check-then-insert races: two concurrent events for the same rider both see no
        // row and both insert. rider_balance.riderId is UNIQUE, so one loses with
        // SQLITE_CONSTRAINT. Under JetStream's at-least-once delivery this is normal,
        // not exceptional — take the winner's row instead of failing the event.
        balance = await repository.findOne({ where: { riderId } });
        if (!balance) throw err;
      }
    }
    return balance;
  }

  /** doc §8 rider milestone (GHS 100 @25, GHS 200 @50) — credited to cleared, idempotent. */
  @Transaction()
  async creditRiderMilestone(riderId: string, milestone: number, amountPesewas: number): Promise<void> {
    const ref = `milestone:rider:${riderId}:${milestone}`;
    const existing = await this.entries.findOne({ where: { ref } });
    if (existing) return;

    const rider = await this.fetchRider(riderId).catch(() => null);
    const profile = this.deliveryPartnerTaxProfile(rider, riderId);
    if (profile.residentStatus === 'UNKNOWN') {
      await this.taxEngine.recordClassificationReview({
        transactionId: ref,
        orderId: null,
        componentType: 'rider_milestone_incentive',
        reason: 'delivery_partner_resident_status_unknown',
        payload: { riderId, milestone, amountPesewas },
      });
      return;
    }
    const payeeType = profile.deliveryPartnerType ?? 'INDEPENDENT_DELIVERY_PARTNER';
    const classification = await this.taxEngine.classifyGenericComponent({
      transactionId: ref,
      orderId: null,
      componentType: 'rider_milestone_incentive',
      payerType: 'ORE', payerId: 'ORE',
      payeeType, payeeId: profile.deliveryPartnerId ?? riderId,
      supplierType: payeeType, supplierId: profile.deliveryPartnerId ?? riderId,
      customerId: null,
      grossAmountPesewas: amountPesewas,
      taxableAmountPesewas: amountPesewas,
      taxCategory: 'NOT_ORE_SUPPLY',
      revenueOwner: payeeType === 'FLEET_DELIVERY_PARTNER' ? 'FLEET_DELIVERY_PARTNER' : 'DELIVERY_PARTNER',
      paymentProcessor: 'INTERNAL',
      settlementMethod: 'INTERNAL_LEDGER',
      contractType: 'ORE_RIDER_MILESTONE_INCENTIVE',
      transactionType: 'GENERAL_SERVICES',
      residentStatus: profile.residentStatus === 'NON_RESIDENT' ? 'NON_RESIDENT' : 'RESIDENT',
      transactionDate: new Date(),
      pricingMode: this.taxPricingMode(),
    });
    const withheldPesewas = this.withheldSupplierTaxPesewas(amountPesewas, classification.wht);
    const netAmountPesewas = amountPesewas - withheldPesewas;

    const balance = await this.balanceFor(riderId);
    balance.clearedPesewas += netAmountPesewas;
    balance.feesEarnedPesewas += amountPesewas;
    await this.balances.save(balance);
    // Credited straight into the rider's cleared balance, so it is money we owe them and
    // needs a cost booked against it — written through recordTransaction like everything else.
    // Supplier WHT, when configured, is withheld into tax payable instead of rider payable.
    const legs = [
      { account: 'rider_milestone_funding', debitPesewas: amountPesewas, creditPesewas: 0 },
      { account: 'rider_milestone', debitPesewas: 0, creditPesewas: netAmountPesewas },
    ];
    if (withheldPesewas > 0) legs.push({ account: 'wht_payable', debitPesewas: 0, creditPesewas: withheldPesewas });
    await this.recordTransaction(
      null,
      legs,
      ref,
      ref,
    );
  }

  /** earnings → Pending + set clearing time (extend window to the newest earning). */
  private async creditEarnings(riderId: string, feePesewas: number): Promise<void> {
    const balance = await this.balanceFor(riderId);
    balance.pendingPesewas += feePesewas;
    balance.feesEarnedPesewas += feePesewas;
    const clearsAt = new Date(Date.now() + this.env.riderClearHours * 3_600_000);
    balance.clearsAt = balance.clearsAt && balance.clearsAt > clearsAt ? balance.clearsAt : clearsAt;
    await this.balances.save(balance);
  }

  /**
   * Split delivery earnings across every leg that was actually worked.
   *
   * Rider pay is per-assignment. A laundry order is collected by one rider and returned by
   * another; a reassignment after pickup leaves two riders each owed for the distance they
   * covered. `order.riderId` only ever names the last of them, so crediting it alone silently
   * dropped the earlier rider's pay — no error, no journal entry, just an unpaid rider.
   *
   * `netCreditPesewas` is the order's total delivery-partner credit after withholding. It is
   * apportioned across legs in proportion to each leg's gross fee, with the rounding residue
   * going to the last leg so the parts always sum to the whole (the same convention the tax
   * engine uses for its line residue).
   *
   * Withholding is apportioned pro-rata rather than computed per rider. That is exact whenever
   * the legs share a resident status, which is the normal case; if a future order mixes a
   * resident and a non-resident partner the split is an approximation and the total remains
   * correct. Per-payee withholding would need the tax scenario to emit one delivery-partner
   * component per leg — worth doing if mixed-status multi-leg orders ever become real.
   */
  private async creditDeliveryLegs(order: RawOrder, netCreditPesewas: number): Promise<void> {
    if (netCreditPesewas <= 0) return;

    const legs = await this.fetchOrderAssignments(order.id);
    const unpaid = legs.filter((l) => !l.earningsPostedAt);
    const shares = splitLegCredits(
      unpaid.map((l) => ({ id: l.id, riderId: l.riderId, grossPesewas: l.riderFeePesewas + l.peakPayPesewas })),
      netCreditPesewas,
    );

    // No leg detail (older orders, or dispatch unreachable) — fall back to the pre-split
    // behaviour so the assigned rider is still paid rather than nobody being paid.
    if (shares.length === 0) {
      if (order.riderId) await this.creditEarnings(order.riderId, netCreditPesewas);
      return;
    }

    for (const share of shares) {
      if (share.creditPesewas > 0) await this.creditEarnings(share.riderId, share.creditPesewas);
      await this.markAssignmentPaid(share.id).catch((err) => {
        // The credit already landed. Failing to stamp the leg risks a double-credit on a
        // redelivery, so it must be loud rather than swallowed.
        this.logger.error(`[ledger] leg ${share.id} credited but not stamped paid: ${err instanceof Error ? err.message : String(err)}`);
      });
    }
  }

  private async addCashLiability(riderId: string, amountPesewas: number): Promise<void> {
    const balance = await this.balanceFor(riderId);
    balance.cashOwedPesewas += amountPesewas;
    await this.balances.save(balance);
  }

  /** periodic job: pending → cleared once the window has elapsed. */
  @Transaction()
  async clearEarnings(): Promise<number> {
    const now = new Date();
    const rows = await this.balances
      .createQueryBuilder('b')
      .where('b."pendingPesewas" > 0')
      .andWhere('b."clearsAt" IS NOT NULL')
      .andWhere('b."clearsAt" <= :now', { now })
      .getMany();
    for (const b of rows) {
      b.clearedPesewas += b.pendingPesewas;
      b.pendingPesewas = 0;
      b.clearsAt = null;
      await this.balances.save(b);
    }
    return rows.length;
  }

  // ── COD cash control (doc §5: 90% remit trigger, hysteresis unblock, 24/48/72h ladder) ──
  async evaluateCodControl(riderId: string): Promise<void> {
    const rider = await this.fetchRider(riderId).catch(() => null);
    if (!rider) return;

    const outstanding = await this.codCash
      .find({ where: { riderId, status: CodCashStatus.EXPECTED } })
      .then((rows) => rows.reduce((s, c) => s + c.amountPesewas, 0));

    const tier = rider.codTier ?? RiderCodTier.NEW;
    const tierLimit = codLimitPesewas(tier, this.tierCfg);
    const decision = codLimitDecision({
      outstandingPesewas: outstanding,
      tierLimitPesewas: tierLimit,
      triggerPct: this.env.codRemitTriggerPct,
      unblockPct: this.env.codUnblockPct,
      currentlyBlocked: !!rider.codBlocked,
    });

    // ladder from the oldest outstanding cash
    const oldest = await this.codCash.findOne({
      where: { riderId, status: CodCashStatus.EXPECTED },
      order: { createdAt: 'ASC' },
    });
    let codStatus: RiderCodStatus = RiderCodStatus.CLEAR;
    if (oldest) {
      const ageH = (Date.now() - oldest.createdAt.getTime()) / 3_600_000;
      codStatus = codEscalationStep(ageH, {
        warningH: this.env.codEscalateWarningH,
        suspendH: this.env.codEscalateSuspendH,
        investigateH: this.env.codEscalateInvestigateH,
        terminateH: this.env.codEscalateTerminateH,
      });
    }

    let blocked = !!rider.codBlocked;
    let blockReason = rider.codBlockReason ?? null;
    if (decision.shouldBlock) {
      blocked = true;
      blockReason = blockReason === 'admin' ? 'admin' : 'limit';
    } else if (decision.shouldUnblock && blockReason !== 'admin') {
      blocked = false;
      blockReason = null;
    }

    const changed =
      blocked !== !!rider.codBlocked ||
      blockReason !== (rider.codBlockReason ?? null) ||
      codStatus !== (rider.codStatus ?? RiderCodStatus.CLEAR);

    if (changed) {
      await this.bus.publish(EVENTS.RIDER_COD_STATUS_CHANGED, {
        riderId,
        userId: rider.userId,
        phone: rider.phone,
        codTier: tier,
        codStatus,
        codBlocked: blocked,
        codBlockReason: blockReason,
        outstandingPesewas: outstanding,
        tierLimitPesewas: tierLimit,
        triggerAtPesewas: decision.triggerAtPesewas,
        reason: codStatus === RiderCodStatus.TERMINATED ? 'cod_debt_termination' : undefined,
      });
    }
  }

  /** periodic job: walk riders with overdue COD cash and step them up the ladder. */
  async escalateCodDebt(): Promise<number> {
    const riders = await this.codCash
      .createQueryBuilder('c')
      .select('DISTINCT c.riderId', 'riderId')
      .where('c.status = :s', { s: CodCashStatus.EXPECTED })
      .getRawMany<{ riderId: string }>();
    for (const { riderId } of riders) await this.evaluateCodControl(riderId);
    return riders.length;
  }

  // ── Remittance (G38) — FIFO over EXPECTED cash ────────────────────
  @Transaction()
  async remit(riderId: string, amountPesewas: number): Promise<RiderBalance> {
    const pending = await this.codCash.find({
      where: { riderId, status: CodCashStatus.EXPECTED },
      order: { createdAt: 'ASC' },
    });
    if (pending.length === 0) throw new NotFoundException('No COD cash outstanding to remit');

    const totalOwed = pending.reduce((s, c) => s + c.amountPesewas, 0);
    if (amountPesewas > totalOwed) {
      throw new BadRequestException(`Remittance exceeds outstanding COD cash (GHS ${(totalOwed / 100).toFixed(2)})`);
    }

    // FIFO: consume oldest cash first, mark COLLECTED (awaiting admin verification)
    let remaining = amountPesewas;
    for (const c of pending) {
      if (remaining <= 0) break;
      const take = Math.min(c.amountPesewas, remaining);
      remaining -= take;
      if (take === c.amountPesewas) {
        c.status = CodCashStatus.COLLECTED;
        await this.codCash.save(c);
      }
    }

    return this.balanceFor(riderId);
  }

  @Transaction()
  async verifyRiderRemittance(adminUserId: string, riderId: string, amountPesewas: number): Promise<RiderBalance> {
    const collected = await this.codCash.find({
      where: { riderId, status: CodCashStatus.COLLECTED },
      order: { createdAt: 'ASC' },
    });
    if (collected.length === 0) throw new NotFoundException('No collected remittances awaiting verification');

    let remaining = amountPesewas;
    for (const c of collected) {
      if (remaining <= 0) break;
      const take = Math.min(c.amountPesewas, remaining);
      remaining -= take;
      if (take === c.amountPesewas) {
        c.status = CodCashStatus.REMITTED;
        await this.codCash.save(c);
      }
    }

    const balance = await this.balanceFor(riderId);
    balance.cashOwedPesewas = Math.max(0, balance.cashOwedPesewas - amountPesewas);
    balance.remittedPesewas += amountPesewas;
    const saved = await this.balances.save(balance);

    // The rider handed cash to the platform: the COD receivable (an asset — cash sitting in
    // riders' hands) goes down and the company's cash goes up by the same amount. This used
    // to credit a `rider_remittance` account that is not in the chart of accounts and had no
    // offsetting debit at all, so every verified remittance wrote credits into the journal
    // with nothing on the other side.
    await this.recordTransaction(
      null,
      [
        { account: 'customer_cash', debitPesewas: amountPesewas, creditPesewas: 0 },
        { account: 'cod_cash_receivable', debitPesewas: 0, creditPesewas: amountPesewas },
      ],
      `remit-verified:${riderId}:${adminUserId}`,
    );
    await this.bus.publish(EVENTS.LEDGER_REMITTANCE_CONFIRMED, { riderId, amountPesewas, balance: saved });
    // cash came in → re-evaluate the 90%/70% COD control
    await this.evaluateCodControl(riderId);
    return saved;
  }

  // ── Withdrawals (doc §5: min GHS 50, daily cap GHS 2,000, 1 free/day then GHS 2) ──
  @Transaction()
  @Transaction()
  async requestWithdrawal(riderId: string, dto: { amountPesewas: number; destination: string }): Promise<RiderWithdrawal> {
    const balance = await this.balances.findOne({ where: { riderId }, lock: { mode: 'pessimistic_write' } });
    if (!balance) throw new BadRequestException('Wallet not found');
    // We charge exactly what Paystack charges for transfers to keep our ledger neutral
    const isMomo = dto.destination.toUpperCase().includes('MOMO');
    const dynamicFeePesewas = isMomo ? 100 : 800;
    
    const plan = withdrawalPlan({
      amountPesewas: dto.amountPesewas,
      clearedPesewas: balance.clearedPesewas,
      cashOwedPesewas: balance.cashOwedPesewas,
      lockedPesewas: balance.lockedPesewas,
      today: new Date().toISOString().slice(0, 10),
      withdrawalDay: balance.withdrawalDay,
      withdrawnTodayPesewas: balance.withdrawnTodayPesewas,
      withdrawalsTodayCount: balance.withdrawalsTodayCount,
      freePerDay: 0, // No free withdrawals if we are enforcing strict 1:1 Paystack fee pass-through
      feePesewas: dynamicFeePesewas,
      minPesewas: this.env.riderWithdrawMinPesewas,
      dailyCapPesewas: this.env.riderWithdrawDailyCapPesewas,
    });
    if (!plan.ok) {
      const msg =
        plan.reason === 'below_min' ? `Minimum withdrawal is GHS ${(this.env.riderWithdrawMinPesewas / 100).toFixed(2)}`
        : plan.reason === 'exceeds_cap' ? `Daily withdrawal cap is GHS ${(this.env.riderWithdrawDailyCapPesewas / 100).toFixed(2)}`
        : 'Insufficient available balance (cleared − COD cash owed − locked)';
      throw new BadRequestException(msg);
    }

    balance.clearedPesewas -= dto.amountPesewas + plan.feePesewas;
    balance.lockedPesewas += dto.amountPesewas; // in-transit hold until paid/failed
    balance.withdrawalDay = plan.withdrawalDay;
    balance.withdrawnTodayPesewas = plan.withdrawnTodayPesewas;
    balance.withdrawalsTodayCount = plan.withdrawalsTodayCount;
    await this.balances.save(balance);

    const withdrawal = await this.withdrawals.save(
      this.withdrawals.create({
        riderId,
        amountPesewas: dto.amountPesewas,
        feePesewas: plan.feePesewas,
        destination: dto.destination,
        status: WithdrawalStatus.REQUESTED,
      }),
    );
    const reserveLegs: { account: string; debitPesewas: number; creditPesewas: number }[] = [
      { account: 'rider_payable', debitPesewas: dto.amountPesewas, creditPesewas: 0 },
      { account: 'payout_pending', debitPesewas: 0, creditPesewas: dto.amountPesewas },
    ];
    if (plan.feePesewas > 0) {
      reserveLegs.push({ account: 'rider_payable', debitPesewas: plan.feePesewas, creditPesewas: 0 });
      reserveLegs.push({ account: 'platform_revenue', debitPesewas: 0, creditPesewas: plan.feePesewas });
    }
    await this.recordTransaction(null, reserveLegs, `withdrawal_reserve:${withdrawal.id}`);
    const rider = await this.fetchRider(riderId).catch(() => null);
    await this.bus.publish(EVENTS.WITHDRAWAL_REQUESTED, {
      withdrawalId: withdrawal.id,
      riderId,
      userId: rider?.userId,
      amountPesewas: dto.amountPesewas,
      feePesewas: plan.feePesewas,
    });
    return withdrawal;
  }

  @Transaction()
  async approveWithdrawal(adminUserId: string, withdrawalId: string): Promise<RiderWithdrawal> {
    const withdrawal = await this.withdrawals.findOne({ where: { id: withdrawalId } });
    if (!withdrawal) throw new NotFoundException('Withdrawal not found');
    if (withdrawal.status !== WithdrawalStatus.REQUESTED) {
      throw new BadRequestException(`Withdrawal already ${withdrawal.status.toLowerCase()}`);
    }

    const reference = `ORE-WD-${withdrawal.id.slice(0, 8).toUpperCase()}`;
    withdrawal.status = WithdrawalStatus.APPROVED;
    withdrawal.adminNote = `approved by ${adminUserId}`;
    await this.withdrawals.save(withdrawal);
    await this.bus.publish(EVENTS.WITHDRAWAL_APPROVED, {
      withdrawalId: withdrawal.id,
      riderId: withdrawal.riderId,
      amountPesewas: withdrawal.amountPesewas,
      reference,
    });

    // execute the money-out via payment-service (Paystack Transfers; mock completes instantly)
    const res = await internalFetch(`${serviceUrl('payment')}/internal/payments/transfers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amountPesewas: withdrawal.amountPesewas,
        destination: withdrawal.destination,
        reference,
        metadata: { withdrawalId: withdrawal.id },
      }),
    });
    if (!res.ok) {
      await this.applyTransferResult(withdrawal.id, reference, false);
      return this.withdrawals.findOne({ where: { id: withdrawalId } }) as Promise<RiderWithdrawal>;
    }
    const body = (await res.json()) as { reference: string; status: string };
    if (body.status === 'success') {
      await this.applyTransferResult(withdrawal.id, body.reference, true);
    } else {
      withdrawal.status = WithdrawalStatus.PROCESSING;
      withdrawal.transferReference = body.reference;
      await this.withdrawals.save(withdrawal);
    }
    return this.withdrawals.findOne({ where: { id: withdrawalId } }) as Promise<RiderWithdrawal>;
  }

  @Transaction()
  async rejectWithdrawal(adminUserId: string, withdrawalId: string, note?: string): Promise<RiderWithdrawal> {
    const withdrawal = await this.withdrawals.findOne({ where: { id: withdrawalId } });
    if (!withdrawal) throw new NotFoundException('Withdrawal not found');
    if (withdrawal.status !== WithdrawalStatus.REQUESTED) {
      throw new BadRequestException(`Cannot reject a ${withdrawal.status.toLowerCase()} withdrawal`);
    }
    
    // atomic claim — only one path (admin reject vs transfer event) can finalise
    const claim = await this.claimTransition(withdrawalId, [WithdrawalStatus.REQUESTED], WithdrawalStatus.REJECTED);
    if (!claim) throw new BadRequestException('Withdrawal already processed');
    const fresh = (await this.withdrawals.findOneOrFail({ where: { id: withdrawalId } }))!;
    await this.refundHoldSideEffects(fresh, `rejected by ${adminUserId}${note ? ` — ${note}` : ''}`);
    await this.bus.publish(EVENTS.WITHDRAWAL_REJECTED, {
      withdrawalId: fresh.id,
      riderId: fresh.riderId,
      userId: await this.userIdFor(fresh.riderId),
      amountPesewas: fresh.amountPesewas,
    });
    return fresh;
  }

  /** money-out truth: Paystack Transfer success → PAID; failure → FAILED + hold returned.
   *  Idempotent — called both from the direct approval path and from the transfer event;
   *  the status transition is claimed atomically so exactly one path runs the side effects. */
  @Transaction()
  private async applyTransferResult(withdrawalId: string, reference: string, ok: boolean, pspFeePesewas: number = 0): Promise<void> {
    const claim = await this.claimTransition(
      withdrawalId,
      [WithdrawalStatus.REQUESTED, WithdrawalStatus.APPROVED, WithdrawalStatus.PROCESSING],
      ok ? WithdrawalStatus.PAID : WithdrawalStatus.FAILED,
      ok ? { transferReference: reference, processedAt: new Date() } : { transferReference: reference }
    );
    if (!claim) return; // someone else (or a previous run) finalised it
    const withdrawal = (await this.withdrawals.findOneOrFail({ where: { id: withdrawalId } }))!;
    if (ok) {
      const balance = await this.balanceFor(withdrawal.riderId);
      balance.lockedPesewas = Math.max(0, balance.lockedPesewas - withdrawal.amountPesewas);
      await this.balances.save(balance);
      const payoutLegs: { account: string; debitPesewas: number; creditPesewas: number }[] = [
        { account: 'payout_pending', debitPesewas: withdrawal.amountPesewas, creditPesewas: 0 },
      ];
      let totalCashOut = withdrawal.amountPesewas;
      if (pspFeePesewas > 0) {
        payoutLegs.push({ account: 'platform_revenue', debitPesewas: pspFeePesewas, creditPesewas: 0 });
        totalCashOut += pspFeePesewas;
      }
      payoutLegs.push({ account: 'customer_cash', debitPesewas: 0, creditPesewas: totalCashOut });
      await this.recordTransaction(null, payoutLegs, `withdrawal_settle:${withdrawal.id}`);
      const userId = await this.userIdFor(withdrawal.riderId);
      await this.bus.publish(EVENTS.WITHDRAWAL_PAID, {
        withdrawalId: withdrawal.id,
        riderId: withdrawal.riderId,
        userId,
        amountPesewas: withdrawal.amountPesewas,
        feePesewas: withdrawal.feePesewas,
        reference,
      });
    } else {
      await this.refundHoldSideEffects(withdrawal, `transfer failed (${reference})`);
      const userId = await this.userIdFor(withdrawal.riderId);
      await this.bus.publish(EVENTS.WITHDRAWAL_FAILED, {
        withdrawalId: withdrawal.id,
        riderId: withdrawal.riderId,
        userId,
        amountPesewas: withdrawal.amountPesewas,
      });
    }
  }

  /** Atomic status transition (UPDATE … WHERE status IN …) — returns false if not claimed. */
  private async claimTransition(
    withdrawalId: string,
    fromStatuses: WithdrawalStatus[],
    toStatus: WithdrawalStatus,
    extra?: Partial<RiderWithdrawal>
  ): Promise<boolean> {
    const res = await this.withdrawals
      .createQueryBuilder()
      .update(RiderWithdrawal)
      .set({ status: toStatus, ...extra })
      .where('id = :id', { id: withdrawalId })
      .andWhere('status IN (:...from)', { from: fromStatuses })
      .execute();
    return (res.affected ?? 0) > 0;
  }

  /** failed/rejected withdrawal → release the hold back into cleared (amount + fee). */
  @Transaction()
  private async refundHoldSideEffects(withdrawal: RiderWithdrawal, note: string): Promise<void> {
    const balance = await this.balanceFor(withdrawal.riderId);
    balance.lockedPesewas = Math.max(0, balance.lockedPesewas - withdrawal.amountPesewas);
    balance.clearedPesewas += withdrawal.amountPesewas + withdrawal.feePesewas;
    await this.balances.save(balance);
    
    withdrawal.adminNote = note;
    await this.withdrawals.save(withdrawal);
    
    const reserveLegs: { account: string; debitPesewas: number; creditPesewas: number }[] = [
      { account: 'payout_pending', debitPesewas: withdrawal.amountPesewas, creditPesewas: 0 },
      { account: 'rider_payable', debitPesewas: 0, creditPesewas: withdrawal.amountPesewas },
    ];
    if (withdrawal.feePesewas > 0) {
      reserveLegs.push({ account: 'platform_revenue', debitPesewas: withdrawal.feePesewas, creditPesewas: 0 });
      reserveLegs.push({ account: 'rider_payable', debitPesewas: 0, creditPesewas: withdrawal.feePesewas });
    }
    await this.recordTransaction(null, reserveLegs, `withdrawal_reversal:${withdrawal.id}`);
  }

  /** finance correction (doc: penalties/adjustments are admin-only + audited). */
  @Transaction()
  async adjustWallet(adminUserId: string, riderId: string, dto: { amountPesewas: number; kind: 'credit_cleared' | 'penalty' | 'reversal'; reason: string }): Promise<RiderBalance> {
    const balance = await this.balanceFor(riderId);
    if (dto.kind === 'credit_cleared') balance.clearedPesewas += dto.amountPesewas;
    else if (dto.kind === 'penalty') {
      const capped = Math.min(dto.amountPesewas, balance.clearedPesewas);
      balance.lockedPesewas += capped;
      balance.clearedPesewas -= capped;
    } else {
      balance.lockedPesewas = Math.max(0, balance.lockedPesewas - dto.amountPesewas);
    }
    const saved = await this.balances.save(balance);
    // A memo, not a movement: the adjustment moves money between the cleared and locked
    // buckets of one balance row, so nothing is owed to or by anyone new. It goes through
    // recordTransaction anyway, so every write to the journal passes the same gate, and it
    // no longer invents a per-kind account name the chart of accounts has never heard of.
    await this.recordTransaction(
      null,
      [
        { account: 'rider_payable', debitPesewas: 0, creditPesewas: 0 },
      ],
      `wallet_adjust:${saved.id}`,
    );
    return saved;
  }

  /** Rider wallet/earnings statement derived from the authoritative ledger entries. */
  async riderStatement(riderId: string): Promise<{
    wallet: RiderWalletDto;
    todayEarnedPesewas: number;
    weekEarnedPesewas: number;
    tripsToday: number;
    weekSeries: { label: string; amountPesewas: number }[];
    earnings: { orderId: string; orderRef: string | null; amountPesewas: number; basePesewas: number; tipPesewas: number; peakPayPesewas: number; createdAt: string }[];
  }> {
    const wallet = await this.walletView(riderId);
    const entries = await this.entries.find({
      where: { account: 'rider_payable' },
      order: { createdAt: 'DESC' },
      take: 250,
    });
    const earnings: { orderId: string; orderRef: string | null; amountPesewas: number; basePesewas: number; tipPesewas: number; peakPayPesewas: number; createdAt: string }[] = [];
    for (const entry of entries) {
      if (!entry.orderId || entry.creditPesewas <= 0) continue;
      const order = await this.fetchOrder(entry.orderId).catch(() => null);
      if (!order || order.riderId !== riderId) continue;
      const tipPesewas = order.tipPesewas ?? 0;
      const peakPayPesewas = order.peakPayPesewas ?? 0;
      earnings.push({
        orderId: order.id,
        orderRef: order.ref ?? null,
        amountPesewas: entry.creditPesewas,
        basePesewas: Math.max(0, entry.creditPesewas - tipPesewas - peakPayPesewas),
        tipPesewas,
        peakPayPesewas,
        createdAt: entry.createdAt.toISOString(),
      });
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(startOfToday);
    weekStart.setDate(weekStart.getDate() - 6);
    const todayRows = earnings.filter((row) => new Date(row.createdAt) >= startOfToday);
    const weekRows = earnings.filter((row) => new Date(row.createdAt) >= weekStart);
    const weekSeries = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + index);
      const next = new Date(day);
      next.setDate(day.getDate() + 1);
      const amountPesewas = earnings
        .filter((row) => {
          const created = new Date(row.createdAt);
          return created >= day && created < next;
        })
        .reduce((sum, row) => sum + row.amountPesewas, 0);
      return {
        label: day.toLocaleDateString('en-US', { weekday: 'short' }),
        amountPesewas,
      };
    });

    return {
      wallet,
      todayEarnedPesewas: todayRows.reduce((sum, row) => sum + row.amountPesewas, 0),
      weekEarnedPesewas: weekRows.reduce((sum, row) => sum + row.amountPesewas, 0),
      tripsToday: todayRows.length,
      weekSeries,
      earnings,
    };
  }

  /** doc §5 wallet view: available payout = cleared − COD − penalties, never negative. */
  async walletView(riderId: string): Promise<RiderWalletDto> {
    const balance = await this.balanceFor(riderId);
    const rider = await this.fetchRider(riderId).catch(() => null);
    const tier = rider?.codTier ?? RiderCodTier.NEW;
    const codStatus = rider?.codStatus ?? RiderCodStatus.CLEAR;
    const blocked = !!rider?.codBlocked;
    const tierLimit = codLimitPesewas(tier, this.tierCfg);

    const freshDay = balance.withdrawalDay !== new Date().toISOString().slice(0, 10);
    const countToday = freshDay ? 0 : balance.withdrawalsTodayCount;

    return {
      riderId,
      userId: balance.userId ?? rider?.userId ?? '',
      pendingPesewas: balance.pendingPesewas,
      clearedPesewas: balance.clearedPesewas,
      lockedPesewas: balance.lockedPesewas,
      cashLiabilityPesewas: balance.cashOwedPesewas,
      withdrawablePesewas: withdrawablePesewas(balance.clearedPesewas, balance.cashOwedPesewas, balance.lockedPesewas),
      lifetimeEarnedPesewas: balance.feesEarnedPesewas,
      lifetimeRemittedPesewas: balance.remittedPesewas,
      codTier: tier,
      codStatus,
      codEligible: !blocked && (codStatus === RiderCodStatus.CLEAR || codStatus === RiderCodStatus.WARNING),
      tierLimitPesewas: tierLimit,
      triggerPct: this.env.codRemitTriggerPct,
      withdrawalDay: freshDay ? null : balance.withdrawalDay,
      withdrawnTodayPesewas: freshDay ? 0 : balance.withdrawnTodayPesewas,
      freeWithdrawalsLeftToday: Math.max(0, this.env.riderWithdrawFreePerDay - countToday),
      withdrawalFeePesewas: this.env.riderWithdrawFeePesewas,
      minWithdrawalPesewas: this.env.riderWithdrawMinPesewas,
      dailyCapPesewas: this.env.riderWithdrawDailyCapPesewas,
    };
  }

  listWithdrawals(riderId: string): Promise<RiderWithdrawal[]> {
    return this.withdrawals.find({ where: { riderId }, order: { createdAt: 'DESC' } });
  }

  adminListWithdrawals(status?: WithdrawalStatus): Promise<RiderWithdrawal[]> {
    return this.withdrawals.find({ where: status ? { status } : {}, order: { createdAt: 'DESC' }, take: 100 });
  }

  adminListWallets(): Promise<RiderBalance[]> {
    return this.balances.find({ order: { updatedAt: 'DESC' }, take: 100 });
  }

  // ── Vendor settlement engine (doc §4) ────────────────────────────
  /** Every delivered order accrues the vendor's net-of-commission share (idempotent per order). */
  private async accrueVendorEarning(order: RawOrder): Promise<void> {
    if (order.vendorSharePesewas <= 0) return;
    const existing = await this.vendorEarnings.findOne({ where: { orderId: order.id } });
    if (!existing) {
      await this.vendorEarnings.save(
        this.vendorEarnings.create({
          vendorId: order.vendorId,
          orderId: order.id,
          orderRef: order.ref ?? null,
          amountPesewas: order.vendorSharePesewas,
        }),
      );
      const balance = await this.vendorBalanceFor(order.vendorId);
      balance.accruedPesewas += order.vendorSharePesewas;
      await this.vendorBalances.save(balance);
    }
  }

  /** Weekly run (doc §4): sweeps all unsettled earnings up to the run time (so nothing lags),
   *  labelled with the current Monday cycle. Debt first → min GHS 100 → rolling reserve → payout.
   *  Idempotent: one settlement per (vendor, cycle); sub-min cycles roll over to the next run. */
  async runVendorSettlements(now = new Date()): Promise<VendorSettlement[]> {
    const cycleEnd = mondayBoundary(now);
    const cycleStart = new Date(cycleEnd.getTime() - 7 * 86_400_000);
    const vendors = await this.vendorEarnings
      .createQueryBuilder('e')
      .select('DISTINCT e.vendorId', 'vendorId')
      .where('e."settledAt" IS NULL')
      .andWhere('e."createdAt" < :now', { now })
      .getRawMany<{ vendorId: string }>();

    const created: VendorSettlement[] = [];
    for (const { vendorId } of vendors) {
      const settlement = await this.settleOneVendor(vendorId, cycleStart, cycleEnd);
      if (settlement) created.push(settlement);
    }
    return created;
  }

  /** Settle one vendor atomically (called per vendor by runVendorSettlements). */
  @Transaction()
  private async settleOneVendor(vendorId: string, cycleStart: Date, cycleEnd: Date): Promise<VendorSettlement | null> {
    const existing = await this.vendorSettlements.findOne({ where: { vendorId, cycleEnd } });
    if (existing) return null; // already settled this cycle
    
    const rows = await this.vendorEarnings.find({ where: { vendorId, settledAt: IsNull() }, order: { createdAt: 'ASC' } });
    const balance = await this.vendorBalanceFor(vendorId);
    const gross = rows.reduce((s, e) => s + e.amountPesewas, 0) + balance.bonusPesewas;
    if (gross <= 0) return null;
    
    const plan = vendorSettlementPlan({
      grossPesewas: gross,
      owedPesewas: balance.owedPesewas,
      reservePct: this.env.vendorReservePct,
      minPesewas: this.env.vendorMinSettlementPesewas,
    });
    if (!plan.eligible) return null; // below min → rolls into the next cycle
    
    const settlement = await this.vendorSettlements.save(
      this.vendorSettlements.create({
        vendorId,
        cycleStart,
        cycleEnd,
        grossPesewas: gross,
        debtAppliedPesewas: plan.debtAppliedPesewas,
        reservePesewas: plan.reservePesewas,
        payoutPesewas: plan.payoutPesewas,
      }),
    );
    
    for (const e of rows) {
      e.settlementId = settlement.id;
      e.settledAt = new Date();
      await this.vendorEarnings.save(e);
    }
    
    balance.owedPesewas -= plan.debtAppliedPesewas;
    balance.reservePesewas += plan.reservePesewas;
    balance.bonusPesewas = 0; // bonus folded into this cycle's gross
    await this.vendorBalances.save(balance);
    
    await this.bus.publish(EVENTS.VENDOR_SETTLEMENT_CREATED, {
      settlementId: settlement.id,
      vendorId,
      userId: await this.vendorOwnerUserId(vendorId).catch(() => null),
      payoutPesewas: settlement.payoutPesewas,
      cycleStart: cycleStart.toISOString(),
      cycleEnd: cycleEnd.toISOString(),
    });
    
    return settlement;
  }

  /** Admin executes the payout via Paystack Transfers (daily cap GHS 10,000 → chunked).
   *  Mock completes instantly; live is finalised by the transfer webhook/event. */
  async payVendorSettlement(adminUserId: string, settlementId: string, note?: string): Promise<VendorSettlement> {
    const s = await this.vendorSettlements.findOne({ where: { id: settlementId } });
    if (!s) throw new NotFoundException('Settlement not found');
    if (s.status !== VendorSettlementStatus.READY && s.status !== VendorSettlementStatus.FAILED) {
      throw new BadRequestException(`Cannot pay a ${s.status.toLowerCase()} settlement`);
    }
    const chunks = payoutChunks(s.payoutPesewas, this.env.vendorDailyCapPesewas);
    if (chunks.length === 0) throw new BadRequestException('Nothing to pay');

    // Pay to the vendor's VERIFIED payout account via the real transfer endpoint, not a
    // literal "VENDOR SETTLEMENT" destination — the generic /transfers route has no
    // account to pay, so in live Paystack every settlement failed (mock masked it).
    // Audit F-BUG-18. The success event carries settlementId so the ledger finalises
    // this settlement when Paystack confirms.
    const payout = await this.vendorPayoutAccount(s.vendorId);

    let lastReference: string | null = null;
    let ok = true;
    for (let i = 0; i < chunks.length; i += 1) {
      const reference = `ORE-VS-${s.id.slice(0, 8).toUpperCase()}-${i + 1}`;
      const res = await internalFetch(`${serviceUrl('payment')}/internal/payments/vendor-transfers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountPesewas: chunks[i],
          reference,
          payout,
          metadata: { settlementId: s.id },
        }),
      });
      if (!res.ok) { ok = false; break; }
      const body = (await res.json()) as { reference: string; status: string };
      lastReference = body.reference;
      if (body.status !== 'success') { ok = false; break; }
    }

    if (!ok) {
      // claim-style: only READY can become FAILED here (never clobber an event-claimed PAID)
      await this.vendorSettlements
        .createQueryBuilder()
        .update(VendorSettlement)
        .set({
          status: VendorSettlementStatus.FAILED,
          note: `transfer failed — ${note ?? 'retry required'}`,
          transferReference: lastReference ?? s.transferReference ?? null,
        })
        .where('id = :id', { id: settlementId })
        .andWhere('status = :ready', { ready: VendorSettlementStatus.READY })
        .execute();
      return (await this.vendorSettlements.findOne({ where: { id: settlementId } }))!;
    }

    // targeted update ONLY (never a full save of the stale entity — that could clobber a
    // transfer-event claim of READY→PAID and re-open the double-post race)
    await this.vendorSettlements
      .createQueryBuilder()
      .update(VendorSettlement)
      .set({ transferReference: lastReference ?? null, note: note ?? null })
      .where('id = :id', { id: settlementId })
      .execute();

    // mock: finalise right here; live: the transfer event (settlementId) finalises idempotently
    await this.finalizeSettlementTransfer(settlementId, lastReference ?? settlementId, true);
    return (await this.vendorSettlements.findOne({ where: { id: settlementId } }))!;
  }

  /** Transfer result (webhook truth): claim READY|FAILED → PAID, post pool entry, notify. */
  @Transaction()
  private async finalizeSettlementTransfer(settlementId: string, reference: string, ok: boolean): Promise<void> {
    if (!ok) {
      const s = await this.vendorSettlements.findOne({ where: { id: settlementId } });
      if (s && s.status === VendorSettlementStatus.READY) {
        s.status = VendorSettlementStatus.FAILED;
        s.note = `transfer failed (${reference})`;
        await this.vendorSettlements.save(s);
      }
      return;
    }
    const claim = await this.vendorSettlements
      .createQueryBuilder()
      .update(VendorSettlement)
      .set({ status: VendorSettlementStatus.PAID, paidAt: new Date() })
      .where('id = :id', { id: settlementId })
      .andWhere('status IN (:...from)', { from: [VendorSettlementStatus.READY, VendorSettlementStatus.FAILED] })
      .execute();
    if (!(claim.affected ?? 0)) return; // already finalised
    const s = (await this.vendorSettlements.findOne({ where: { id: settlementId } }))!;
    const balance = await this.vendorBalanceFor(s.vendorId);
    balance.paidOutPesewas += s.payoutPesewas;
    await this.vendorBalances.save(balance);
    // Paying a settlement discharges what we owed the vendor and moves cash out of the pool.
    await this.recordTransaction(
      null,
      [
        { account: 'vendor_payable', debitPesewas: s.payoutPesewas, creditPesewas: 0 },
        { account: 'customer_cash', debitPesewas: 0, creditPesewas: s.payoutPesewas },
      ],
      `settlement:${s.id}`,
    );
    await this.bus.publish(EVENTS.VENDOR_SETTLEMENT_PAID, {
      settlementId: s.id,
      vendorId: s.vendorId,
      userId: await this.vendorOwnerUserId(s.vendorId).catch(() => null),
      payoutPesewas: s.payoutPesewas,
      reference,
    });
  }

  /** Doc §4 instant payout reversal on fault → vendor owes the amount back (negative balance). */
  async reverseVendorSettlement(adminUserId: string, settlementId: string, reason: string): Promise<VendorSettlement> {
    const s = await this.vendorSettlements.findOne({ where: { id: settlementId } });
    if (!s) throw new NotFoundException('Settlement not found');
    if (s.status !== VendorSettlementStatus.PAID) {
      throw new BadRequestException(`Only paid settlements can be reversed (status: ${s.status})`);
    }
    const claim = await this.vendorSettlements
      .createQueryBuilder()
      .update(VendorSettlement)
      .set({ status: VendorSettlementStatus.REVERSED, note: reason })
      .where('id = :id', { id: settlementId })
      .andWhere('status = :paid', { paid: VendorSettlementStatus.PAID })
      .execute();
    if (!(claim.affected ?? 0)) throw new BadRequestException('Settlement already reversed');
    const balance = await this.vendorBalanceFor(s.vendorId);
    balance.owedPesewas += s.payoutPesewas;
    await this.vendorBalances.save(balance);
    // The exact inverse of the payout: the vendor owes it back, so the payable returns and
    // the money is back in the pool.
    await this.recordTransaction(
      null,
      [
        { account: 'customer_cash', debitPesewas: s.payoutPesewas, creditPesewas: 0 },
        { account: 'vendor_payable', debitPesewas: 0, creditPesewas: s.payoutPesewas },
      ],
      `settlement:${s.id} reversed: ${reason}`,
    );
    await this.bus.publish(EVENTS.VENDOR_SETTLEMENT_REVERSED, {
      settlementId: s.id,
      vendorId: s.vendorId,
      userId: await this.vendorOwnerUserId(s.vendorId).catch(() => null),
      amountPesewas: s.payoutPesewas,
      reason,
    });
    return (await this.vendorSettlements.findOne({ where: { id: settlementId } }))!;
  }

  /** Rolling reserve release (finance op, audited) → becomes a READY settlement. */
  async releaseVendorReserve(adminUserId: string, vendorId: string, amountPesewas: number, reason: string): Promise<VendorSettlement> {
    const balance = await this.vendorBalanceFor(vendorId);
    if (amountPesewas > balance.reservePesewas) {
      throw new BadRequestException(`Reserve release exceeds held reserve (GHS ${(balance.reservePesewas / 100).toFixed(2)})`);
    }
    const now = new Date();
    const settlement = await this.vendorSettlements.save(
      this.vendorSettlements.create({
        vendorId,
        cycleStart: mondayBoundary(now),
        cycleEnd: mondayBoundary(now),
        grossPesewas: 0,
        reservePesewas: 0,
        payoutPesewas: amountPesewas,
        note: `rolling reserve release — ${reason}`,
      }),
    );
    balance.reservePesewas -= amountPesewas;
    await this.vendorBalances.save(balance);
    // Releasing reserve does not create money: it moves earnings we were holding back into
    // a settlement we now owe.
    await this.recordTransaction(
      null,
      [
        { account: 'vendor_reserve', debitPesewas: amountPesewas, creditPesewas: 0 },
        { account: 'vendor_payable', debitPesewas: 0, creditPesewas: amountPesewas },
      ],
      `reserve:${settlement.id}`,
    );
    await this.bus.publish(EVENTS.VENDOR_SETTLEMENT_CREATED, {
      settlementId: settlement.id,
      vendorId,
      userId: await this.vendorOwnerUserId(vendorId).catch(() => null),
      payoutPesewas: amountPesewas,
      note: settlement.note,
    });
    void adminUserId;
    return settlement;
  }

  async vendorBalanceFor(vendorId: string): Promise<VendorBalance> {
    let balance = await this.vendorBalances.findOne({ where: { vendorId } });
    if (!balance) {
      balance = await this.vendorBalances.save(this.vendorBalances.create({ vendorId }));
    }
    return balance;
  }

  /** Vendor-facing statement: running balance + pending + earnings + settlements. */
  async vendorStatement(vendorId: string, from?: string, to?: string): Promise<{
    vendorId: string;
    from: string | null;
    to: string | null;
    balance: VendorBalance & { pendingSettlementPesewas: number; availablePesewas: number };
    earnings: VendorEarning[];
    settlements: VendorSettlement[];
  }> {
    const range = vendorStatementRange(from, to);
    const balance = await this.vendorBalanceFor(vendorId);
    const pending = await this.vendorEarnings
      .find({ where: { vendorId, settledAt: IsNull() } })
      .then((rows) => rows.reduce((s, e) => s + e.amountPesewas, 0));
    const earnings = await this.vendorEarnings.find({
      where: range ? { vendorId, createdAt: Between(range.from, range.to) } : { vendorId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
    const settlements = await this.vendorSettlements.find({
      where: range ? { vendorId, createdAt: Between(range.from, range.to) } : { vendorId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
    return {
      vendorId,
      from: range?.from.toISOString() ?? null,
      to: range?.to.toISOString() ?? null,
      balance: {
        ...balance,
        pendingSettlementPesewas: pending,
        availablePesewas: Math.max(0, balance.accruedPesewas - balance.paidOutPesewas - balance.reservePesewas - balance.owedPesewas - balance.withdrawalHeldPesewas),
      },
      earnings,
      settlements,
    };
  }

  async listVendorWithdrawals(vendorId: string): Promise<VendorWithdrawal[]> {
    return this.vendorWithdrawals.find({ where: { vendorId }, order: { createdAt: 'DESC' }, take: 100 });
  }

  @Transaction()
  async requestVendorWithdrawal(vendorId: string, amountPesewas: number): Promise<VendorWithdrawal> {
    const minimum = Number(process.env.VENDOR_WITHDRAWAL_MIN_PESEWAS ?? 10_000);
    if (!Number.isInteger(amountPesewas) || amountPesewas < minimum) throw new BadRequestException(`Vendor withdrawal minimum is GHS ${(minimum / 100).toFixed(2)}`);
    const balance = await this.vendorBalances.findOne({ where: { vendorId }, lock: { mode: 'pessimistic_write' } });
    if (!balance) throw new BadRequestException('Wallet not found');
    const available = Math.max(0, balance.accruedPesewas - balance.paidOutPesewas - balance.reservePesewas - balance.owedPesewas - balance.withdrawalHeldPesewas);
    const payout = await this.vendorPayoutAccount(vendorId);
    const pspFeePesewas = payout.type === 'MOMO' ? 100 : 800; // Expected transfer fee
    
    if (amountPesewas + pspFeePesewas > available) throw new BadRequestException('Withdrawal + transfer fee exceeds available Vendor balance');
    
    const destination = payout.type === 'MOMO'
      ? `${payout.accountNumber} MOMO ${payout.provider}`
      : `${payout.accountNumber} BANK ${payout.accountName}`;
    
    // We debit the full amount (requested + fee) from the vendor's balance to fund the withdrawal + transfer cost
    balance.withdrawalHeldPesewas += amountPesewas + pspFeePesewas;
    await this.vendorBalances.save(balance);
    
    const withdrawal = await this.vendorWithdrawals.save(this.vendorWithdrawals.create({ vendorId, amountPesewas, destination, status: 'PROCESSING', transferReference: null, note: null, processedAt: null }));
    
    const reserveLegs: { account: string; debitPesewas: number; creditPesewas: number }[] = [
      { account: 'vendor_payable', debitPesewas: amountPesewas, creditPesewas: 0 },
      { account: 'vendor_withdrawal_held', debitPesewas: 0, creditPesewas: amountPesewas },
    ];
    if (pspFeePesewas > 0) {
      reserveLegs.push({ account: 'vendor_payable', debitPesewas: pspFeePesewas, creditPesewas: 0 });
      reserveLegs.push({ account: 'platform_revenue', debitPesewas: 0, creditPesewas: pspFeePesewas });
    }
    
    await this.recordTransaction(
      null,
      reserveLegs,
      `vendor_withdrawal_reserve:${withdrawal.id}`
    );
    const reference = `ORE-VWD-${withdrawal.id.slice(0, 8).toUpperCase()}`;
    const response = await internalFetch(`${serviceUrl('payment')}/internal/payments/vendor-transfers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amountPesewas, reference, payout, metadata: { vendorWithdrawalId: withdrawal.id } }) }).catch(() => null);
    if (!response || !response.ok) {
      await this.applyVendorWithdrawalResult(withdrawal.id, reference, false);
    } else {
      const body = await response.json() as { reference: string; status: string };
      if (body.status === 'success') await this.applyVendorWithdrawalResult(withdrawal.id, body.reference, true);
      else { withdrawal.transferReference = body.reference; await this.vendorWithdrawals.save(withdrawal); }
    }
    return (await this.vendorWithdrawals.findOne({ where: { id: withdrawal.id } }))!;
  }

  private async vendorPayoutAccount(vendorId: string): Promise<{ type: 'MOMO' | 'BANK'; provider: string; accountNumber: string; accountName: string }> {
    const response = await internalFetch(`${serviceUrl('catalog')}/internal/vendors/${vendorId}/payout`);
    if (!response.ok) throw new BadRequestException('Vendor payout account is unavailable');
    const body = await response.json() as { payoutAccountJson?: Record<string, unknown> | null };
    const payout = body.payoutAccountJson;
    if (!payout || (payout.type !== 'MOMO' && payout.type !== 'BANK') || typeof payout.provider !== 'string' || typeof payout.accountNumber !== 'string' || typeof payout.accountName !== 'string') throw new BadRequestException('Vendor payout account must be verified before withdrawal');
    return { type: payout.type, provider: payout.provider, accountNumber: payout.accountNumber, accountName: payout.accountName };
  }

  @Transaction()
  private async applyVendorWithdrawalResult(id: string, reference: string, ok: boolean, pspFeePesewas: number = 0): Promise<void> {
    const withdrawal = await this.vendorWithdrawals.findOne({ where: { id } });
    if (!withdrawal || withdrawal.status === 'PAID' || withdrawal.status === 'FAILED' || withdrawal.status === 'REJECTED') return;
    withdrawal.status = ok ? 'PAID' : 'FAILED';
    withdrawal.transferReference = reference;
    withdrawal.processedAt = new Date();
    await this.vendorWithdrawals.save(withdrawal);
    
    // We infer the original estimated fee based on destination
    const originalFeePesewas = withdrawal.destination.includes('MOMO') ? 100 : 800;
    
    const balance = await this.vendorBalanceFor(withdrawal.vendorId);
    balance.withdrawalHeldPesewas = Math.max(0, balance.withdrawalHeldPesewas - (withdrawal.amountPesewas + originalFeePesewas));
    if (ok) balance.paidOutPesewas += (withdrawal.amountPesewas + originalFeePesewas);
    await this.vendorBalances.save(balance);
    
    if (ok) {
      const legs: { account: string; debitPesewas: number; creditPesewas: number }[] = [
        { account: 'vendor_withdrawal_held', debitPesewas: withdrawal.amountPesewas, creditPesewas: 0 },
      ];
      let totalCashOut = withdrawal.amountPesewas;
      if (pspFeePesewas > 0) {
        legs.push({ account: 'platform_revenue', debitPesewas: pspFeePesewas, creditPesewas: 0 });
        totalCashOut += pspFeePesewas;
      }
      legs.push({ account: 'customer_cash', debitPesewas: 0, creditPesewas: totalCashOut });

      await this.recordTransaction(
        null,
        legs,
        `vendor-withdrawal:${id}`,
      );
    } else {
      const reverseLegs: { account: string; debitPesewas: number; creditPesewas: number }[] = [
        { account: 'vendor_withdrawal_held', debitPesewas: 0, creditPesewas: withdrawal.amountPesewas },
        { account: 'vendor_payable', debitPesewas: withdrawal.amountPesewas, creditPesewas: 0 },
      ];
      if (originalFeePesewas > 0) {
        reverseLegs.push({ account: 'platform_revenue', debitPesewas: 0, creditPesewas: originalFeePesewas });
        reverseLegs.push({ account: 'vendor_payable', debitPesewas: 0, creditPesewas: originalFeePesewas });
      }
      
      await this.recordTransaction(
        null,
        reverseLegs,
        `vendor_withdrawal_reversal:${id}`
      );
    }
  }

  adminListSettlements(status?: VendorSettlementStatus): Promise<VendorSettlement[]> {
    return this.vendorSettlements.find({ where: status ? { status } : {}, order: { createdAt: 'DESC' }, take: 100 });
  }

  private async vendorOwnerUserId(vendorId: string): Promise<string | null> {
    const res = await internalFetch(`${serviceUrl('catalog')}/internal/vendors/${vendorId}/owner`);
    if (!res.ok) return null;
    const body = (await res.json()) as { ownerUserId?: string } | null;
    return body?.ownerUserId ?? null;
  }

  private async vendorTaxProfile(vendorId: string): Promise<VendorTaxProfile | null> {
    const res = await internalFetch(`${serviceUrl('catalog')}/internal/vendors/${vendorId}/tax-profile`);
    if (!res.ok) return null;
    return (await res.json()) as VendorTaxProfile | null;
  }

  // ── Disputes / refunds / chargebacks (doc §Payment) ───────────────
  async openDispute(customerId: string, dto: {
    orderId: string;
    reason: string;
    description: string;
    evidenceKeys?: string[];
  }): Promise<Dispute> {
    const order = await this.fetchOrder(dto.orderId);
    if (order.customerId !== customerId) {
      throw new BadRequestException('You can only dispute your own orders');
    }
    if (![OrderStatus.DELIVERED, OrderStatus.FAILED_DELIVERY].includes(order.status as OrderStatus)) {
      throw new BadRequestException(`Disputes open on delivered orders only (status: ${order.status})`);
    }
    const existing = await this.disputes.findOne({ where: { orderId: dto.orderId } });
    if (existing) throw new ConflictException('A dispute already exists for this order');

    const dispute = await this.disputes.save(
      this.disputes.create({
        orderId: dto.orderId,
        customerId,
        vendorId: order.vendorId,
        reason: dto.reason as never,
        description: dto.description,
        evidenceKeys: dto.evidenceKeys ?? null,
      }),
    );
    await this.bus.publish(EVENTS.DISPUTE_OPENED, {
      disputeId: dispute.id,
      orderId: dto.orderId,
      customerId,
      vendorId: order.vendorId,
      reason: dto.reason,
    });
    return dispute;
  }

  listMyDisputes(customerId: string): Promise<Dispute[]> {
    return this.disputes.find({ where: { customerId }, order: { createdAt: 'DESC' }, take: 50 });
  }

  adminListDisputes(status?: DisputeStatus): Promise<Dispute[]> {
    return this.disputes.find({ where: status ? { status } : {}, order: { createdAt: 'DESC' }, take: 100 });
  }

  /** Resolve with the doc §Payment fault matrix + refund priority (wallet credit first). */
  @Transaction()
  async resolveDispute(adminUserId: string, disputeId: string, dto: {
    decision: 'refund_full' | 'refund_partial' | 'no_refund';
    fault?: FaultParty;
    amountPesewas?: number;
    refundMethod?: RefundMethod;
    note?: string;
  }): Promise<Dispute> {
    const dispute = await this.disputes.findOne({ where: { id: disputeId } });
    if (!dispute) throw new NotFoundException('Dispute not found');
    if (dispute.status !== DisputeStatus.OPEN && dispute.status !== DisputeStatus.INVESTIGATING) {
      throw new BadRequestException(`Dispute already ${dispute.status.toLowerCase()}`);
    }
    const order = await this.fetchOrder(dispute.orderId);

    let refundAmount = 0;
    if (dto.decision === 'refund_full') refundAmount = order.totalPesewas;
    else if (dto.decision === 'refund_partial') {
      refundAmount = dto.amountPesewas ?? 0;
      if (refundAmount <= 0) throw new BadRequestException('A partial refund needs a positive amountPesewas');
    }
    if (refundAmount > order.totalPesewas) {
      throw new BadRequestException(`Refund cannot exceed order total (GHS ${(order.totalPesewas / 100).toFixed(2)})`);
    }
    if (refundAmount > 0 && !dto.fault) {
      throw new BadRequestException('A refund decision needs a fault party (doc §Payment fault matrix)');
    }
    // no double refund: never refund an order a chargeback already paid back to the bank
    const lostChargeback = await this.chargebacks.findOne({ where: { orderId: dispute.orderId, status: ChargebackStatus.LOST } });
    if (lostChargeback && refundAmount > 0) {
      throw new BadRequestException('This order was already refunded via chargeback — no double refund');
    }

    const method = dto.refundMethod ?? RefundMethod.WALLET; // doc: wallet credit first
    let refunded = 0;
    if (refundAmount > 0) {
      if (method === RefundMethod.WALLET) {
        await this.creditCustomerWallet(order.customerId, refundAmount, `dispute:${dispute.id}`, `dispute refund (${dto.fault})`);
      } else {
        // original method — PSP refund (prepaid only; COD is settled in cash → wallet credit)
        const res = await internalFetch(`${serviceUrl('payment')}/internal/payments/refund`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: dispute.orderId, reason: `dispute:${dispute.id} ${dto.note ?? ''}`.trim(), amountPesewas: refundAmount }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
          throw new BadRequestException(body?.error?.message ?? 'PSP refund failed — try wallet credit');
        }
      }
      // fault matrix: the at-fault party absorbs the cost (platform fronts, balance tracks the debt)
      await this.allocateRefundCost(order, refundAmount, dto.fault!);
      // No journal entry here on purpose. The wallet path is booked by creditCustomerWallet
      // and the PSP path by onRefundProcessed when the payment service confirms it, so a
      // `dispute_refund` credit here recorded the same refund a second time with nothing
      // against it. Who absorbs the cost is tracked on the balances by allocateRefundCost.
      refunded = refundAmount;
    }

    dispute.status =
      dto.decision === 'refund_full' ? DisputeStatus.RESOLVED_REFUND
      : dto.decision === 'refund_partial' ? DisputeStatus.RESOLVED_PARTIAL
      : DisputeStatus.RESOLVED_NO_REFUND;
    dispute.fault = dto.fault ?? null;
    dispute.decisionPesewas = refundAmount;
    dispute.refundedPesewas = refunded;
    dispute.refundMethod = refunded > 0 ? method : null;
    dispute.note = dto.note ?? null;
    dispute.decidedBy = adminUserId;
    dispute.decidedAt = new Date();
    await this.disputes.save(dispute);

    await this.bus.publish(EVENTS.DISPUTE_RESOLVED, {
      disputeId: dispute.id,
      orderId: dispute.orderId,
      customerId: order.customerId,
      decision: dto.decision,
      fault: dispute.fault,
      amountPesewas: refunded,
      refundMethod: dispute.refundMethod,
    });
    return dispute;
  }

  /** Fault matrix: vendor absorbs via owed (settlement debt), rider via a locked penalty hold. */
  @Transaction()
  private async allocateRefundCost(order: RawOrder, amountPesewas: number, fault: FaultParty): Promise<void> {
    if (fault === FaultParty.VENDOR) {
      const vb = await this.vendorBalanceFor(order.vendorId);
      vb.owedPesewas += amountPesewas;
      await this.vendorBalances.save(vb);
    } else if (fault === FaultParty.RIDER && order.riderId) {
      const rb = await this.balanceFor(order.riderId);
      rb.lockedPesewas += amountPesewas; // penalty hold — reduces withdrawable
      await this.balances.save(rb);
    }
    // PLATFORM absorbs; CUSTOMER never gets a refund decision
  }

  // ── Customer wallet credit (doc §Payment: refund priority = wallet first) ──
  /** Idempotent by ref — a refund/credit is applied exactly once (no double refund).
   *  `expiryDays` (doc §8 referral credits) + `kind` recorded on the log for the expiry sweeper. */
  async creditCustomerWallet(
    userId: string,
    amountPesewas: number,
    ref: string,
    reason: string,
    opts?: { expiryDays?: number; kind?: string; fundedBy?: string | null },
  ): Promise<CustomerCredit> {
    if (amountPesewas <= 0) throw new BadRequestException('Credit must be positive');
    const existing = await this.creditLogs.findOne({ where: { ref } });
    if (existing) {
      // already applied — return current balance (idempotent)
      return this.customerCreditFor(userId);
    }
    let credit = await this.customerCredits.findOne({ where: { userId } });
    if (!credit) credit = await this.customerCredits.save(this.customerCredits.create({ userId }));
    credit.creditPesewas += amountPesewas;
    credit.lifetimeCreditedPesewas += amountPesewas;
    await this.customerCredits.save(credit);
    try {
      await this.creditLogs.save(this.creditLogs.create({
        userId,
        amountPesewas,
        ref,
        reason,
        kind: opts?.kind ?? 'manual',
        expiresAt: opts?.expiryDays ? new Date(Date.now() + opts.expiryDays * 86_400_000) : null,
      }));
    } catch {
      // unique ref race — someone else applied it; roll the balance back and report current
      credit.creditPesewas -= amountPesewas;
      credit.lifetimeCreditedPesewas -= amountPesewas;
      await this.customerCredits.save(credit);
      return this.customerCreditFor(userId);
    }
    // Crediting a wallet creates a liability we must honour at checkout, so it needs a debit
    // against whatever funded it. This used to credit `customer_wallet_credit` with nothing
    // on the other side, which is how the journal came to carry GHS 75 of credits that no
    // account had paid for. Callers that know their funding source pass `fundedBy`
    // (a dispute refund, say, comes out of customer funds already held); everything else is
    // a discretionary grant and lands on `customer_wallet_funding` as a cost.
    // `fundedBy: null` means the caller has already booked the funding debit as part of its
    // own transaction — an errand's unspent budget is funded by the escrow release, for
    // instance. Booking a second debit here would charge the platform twice for one credit.
    if (opts?.fundedBy !== null) {
      const legs: { account: string; debitPesewas: number; creditPesewas: number }[] = [
        {
          account: opts?.fundedBy ?? 'customer_wallet_funding',
          debitPesewas: amountPesewas,
          creditPesewas: 0,
        },
        { account: 'customer_wallet_credit', debitPesewas: 0, creditPesewas: amountPesewas },
      ];
      await this.recordTransaction(null, legs, ref);
    }
    await this.bus.publish(EVENTS.CUSTOMER_CREDIT_CHANGED, {
      userId,
      creditPesewas: credit.creditPesewas,
      deltaPesewas: amountPesewas,
      ref,
    });
    return credit;
  }

  /** doc §8: referral credits expire after their window if unused — remove from the balance. */
  async expireReferralCredits(): Promise<number> {
    const now = new Date();
    const due = await this.creditLogs.find({
      where: { kind: 'referral', expiredAt: IsNull() },
      take: 500,
    });
    let expired = 0;
    for (const log of due) {
      if (!log.expiresAt || log.expiresAt >= now) continue;
      const balance = await this.customerCreditFor(log.userId);
      const remove = Math.min(log.amountPesewas, balance.creditPesewas);
      balance.creditPesewas -= remove;
      balance.lifetimeCreditedPesewas -= remove;
      await this.customerCredits.save(balance);
      log.expiredAt = now;
      await this.creditLogs.save(log);
      // Expiry discharges the liability without anything being spent: the credit is written
      // back as funding released, so the wallet and the journal agree that it is gone.
      if (remove > 0) {
        await this.recordTransaction(
          null,
          [
            { account: 'customer_wallet_credit', debitPesewas: remove, creditPesewas: 0 },
            { account: 'customer_wallet_funding', debitPesewas: 0, creditPesewas: remove },
          ],
          `expired:${log.ref}`,
        );
      }
      expired += 1;
    }
    return expired;
  }

  /**
   * Internal: has this order been refunded (PSP refund / dispute refund / chargeback
   * lost / errand compensation)?
   *
   * The old version looked for journal accounts `refund_paid` / `chargeback_lost` /
   * `dispute_refund` / `errand_compensation` — names the journal never used (it writes
   * `refund`, `customer_wallet_credit`, `customer_cash`), so this ALWAYS returned
   * `{refunded:false}` and the referral program's "non-refunded only" gate was void:
   * rewards were granted on refunded orders (audit F-BUG-20). Detection now matches the
   * accounts the journal actually writes, plus the operational rows for the paths that
   * book without an orderId (chargeback legs, dispute wallet credits).
   */
  async isOrderRefunded(orderId: string): Promise<{ refunded: boolean }> {
    const entries = await this.entries.find({ where: { orderId } });
    if (entries.some((e) => (e.account === 'customer_cash' || e.account === 'customer_wallet_credit') && e.creditPesewas > 0)) {
      return { refunded: true };
    }
    // Chargeback legs are booked with orderId=null — the row is the source of truth.
    const lost = await this.chargebacks.findOne({ where: { orderId, status: ChargebackStatus.LOST } });
    if (lost) return { refunded: true };
    // Dispute refunds (wallet path books without orderId) — the row tracks the amount.
    const disputes = await this.disputes.find({ where: { orderId } });
    if (disputes.some((d) => (d.refundedPesewas ?? 0) > 0)) return { refunded: true };
    // Unspent errand budget credited back to the customer wallet (ref carries the order id).
    const errandCredit = await this.creditLogs.findOne({ where: { ref: `errand:unspent:${orderId}` } });
    if (errandCredit) return { refunded: true };
    return { refunded: false };
  }

  async loyaltyFor(userId: string): Promise<CustomerLoyalty> {
    let row = await this.loyalties.findOne({ where: { userId } });
    if (!row) row = await this.loyalties.save(this.loyalties.create({ userId }));
    return row;
  }

  async loyaltyView(userId: string): Promise<{ points: number; lifetimeEarned: number; lifetimeRedeemed: number; redeemBlockPoints: number; redeemBlockPesewas: number }> {
    const row = await this.loyaltyFor(userId);
    return { points: row.points, lifetimeEarned: row.lifetimeEarned, lifetimeRedeemed: row.lifetimeRedeemed, redeemBlockPoints: 100, redeemBlockPesewas: 100 };
  }

  private async awardLoyalty(userId: string, subtotalPesewas: number): Promise<void> {
    const points = Math.max(0, Math.floor(subtotalPesewas / 100));
    if (points <= 0) return;
    const row = await this.loyaltyFor(userId);
    row.points += points;
    row.lifetimeEarned += points;
    await this.loyalties.save(row);
  }

  async redeemLoyalty(userId: string, points: number): Promise<{ points: number; creditedPesewas: number }> {
    if (points < 100 || points % 100 !== 0) throw new BadRequestException('Redeem loyalty in blocks of 100 points (GHS 1)');
    const row = await this.loyaltyFor(userId);
    if (row.points < points) throw new BadRequestException('Not enough loyalty points');
    const creditedPesewas = points;
    row.points -= points;
    row.lifetimeRedeemed += points;
    await this.loyalties.save(row);
    await this.creditCustomerWallet(userId, creditedPesewas, `loyalty:${userId}:${Date.now()}`, 'loyalty redeem', { kind: 'loyalty' });
    return { points: row.points, creditedPesewas };
  }

  async customerCreditFor(userId: string): Promise<CustomerCredit> {
    let credit = await this.customerCredits.findOne({ where: { userId } });
    if (!credit) credit = await this.customerCredits.save(this.customerCredits.create({ userId }));
    return credit;
  }

  /** Admin grants a wallet credit (audited finance op) — idempotent per ref. */
  async adminCreditCustomer(adminUserId: string, userId: string, amountPesewas: number, reason: string): Promise<CustomerCredit> {
    return this.creditCustomerWallet(userId, amountPesewas, `admin:${adminUserId}:${Date.now()}`, `admin credit — ${reason}`);
  }

  /** Spend wallet credit toward a checkout (doc §Payment) — idempotent by ref, capped at balance. */
  async spendCustomerCredit(userId: string, amountPesewas: number, ref: string): Promise<{ appliedPesewas: number; balancePesewas: number }> {
    const existing = await this.creditLogs.findOne({ where: { ref: `spend:${ref}` } });
    if (existing) {
      const credit = await this.customerCreditFor(userId);
      return { appliedPesewas: existing.amountPesewas, balancePesewas: credit.creditPesewas };
    }
    const credit = await this.customerCreditFor(userId);
    const applied = Math.min(amountPesewas, credit.creditPesewas);
    if (applied <= 0) return { appliedPesewas: 0, balancePesewas: credit.creditPesewas };
    credit.creditPesewas -= applied;
    credit.lifetimeUsedPesewas += applied;
    await this.customerCredits.save(credit);
    try {
      await this.creditLogs.save(this.creditLogs.create({ userId, amountPesewas: applied, ref: `spend:${ref}`, reason: 'checkout credit spend' }));
    } catch {
      // unique ref race — roll back
      credit.creditPesewas += applied;
      credit.lifetimeUsedPesewas -= applied;
      await this.customerCredits.save(credit);
      return { appliedPesewas: 0, balancePesewas: credit.creditPesewas };
    }
    // Spending wallet credit discharges the liability, so the debit belongs on
    // `customer_wallet_credit` itself. Posting it to a separate `customer_wallet_spend`
    // account left the liability standing at full size forever while a pseudo-account that
    // is not in the chart of accounts accumulated the debits.
    //
    // The credit side reverses the funding expense booked when the credit was granted:
    // credit we actually honoured cost us the discount, and the grant entry already paid for
    // it, so spending releases that provision. Credit that expires unused is written back the
    // same way in `expireReferralCredits`. Either way the liability and its funding agree.
    await this.recordTransaction(
      null,
      [
        { account: 'customer_wallet_credit', debitPesewas: applied, creditPesewas: 0 },
        { account: 'customer_wallet_funding', debitPesewas: 0, creditPesewas: applied },
      ],
      `spend:${ref}`,
    );
    await this.bus.publish(EVENTS.CUSTOMER_CREDIT_CHANGED, {
      userId,
      creditPesewas: credit.creditPesewas,
      deltaPesewas: -applied,
      ref,
    });
    return { appliedPesewas: applied, balancePesewas: credit.creditPesewas };
  }

  async customerCreditStatement(userId: string): Promise<{ balance: CustomerCredit; log: CustomerCreditLog[] }> {
    return {
      balance: await this.customerCreditFor(userId),
      log: await this.creditLogs.find({ where: { userId }, order: { createdAt: 'DESC' }, take: 50 }),
    };
  }

  // ── Chargebacks (doc §Payment: freeze → evidence → won/lost, no double refund) ──
  async openChargeback(adminUserId: string, dto: {
    orderId: string;
    reference: string;
    amountPesewas: number;
    reason: string;
    evidenceKeys?: string[];
  }): Promise<Chargeback> {
    const order = await this.fetchOrder(dto.orderId);
    const existing = await this.chargebacks.findOne({ where: [{ orderId: dto.orderId }, { reference: dto.reference }] });
    if (existing) throw new ConflictException('A chargeback already exists for this order/reference');
    const chargeback = await this.chargebacks.save(
      this.chargebacks.create({
        orderId: dto.orderId,
        reference: dto.reference,
        amountPesewas: Math.min(dto.amountPesewas, order.totalPesewas),
        reason: dto.reason,
        evidenceKeys: dto.evidenceKeys ?? null,
      }),
    );
    await this.bus.publish(EVENTS.CHARGEBACK_OPENED, {
      chargebackId: chargeback.id,
      orderId: dto.orderId,
      amountPesewas: chargeback.amountPesewas,
      reference: dto.reference,
    });
    return chargeback;
  }

  @Transaction()
  async resolveChargeback(adminUserId: string, chargebackId: string, dto: {
    outcome: 'won' | 'lost';
    fault?: FaultParty;
    feesPesewas?: number;
    note?: string;
  }): Promise<Chargeback> {
    const cb = await this.chargebacks.findOne({ where: { id: chargebackId } });
    if (!cb) throw new NotFoundException('Chargeback not found');
    if (cb.status !== ChargebackStatus.OPEN && cb.status !== ChargebackStatus.FROZEN) {
      throw new BadRequestException(`Chargeback already ${cb.status.toLowerCase()}`);
    }
    if (dto.outcome === 'lost') {
      // no double refund: if a dispute already refunded this order, the bank claim is contested
      const refundedDispute = await this.disputes.findOne({ where: { orderId: cb.orderId } });
      if (refundedDispute && refundedDispute.refundedPesewas > 0) {
        throw new BadRequestException('Order already refunded via dispute — resolve as won (no double refund)');
      }
    }

    cb.fault = dto.fault ?? null;
    cb.feesPesewas = dto.feesPesewas ?? 0;
    cb.note = dto.note ?? null;
    cb.decidedBy = adminUserId;
    cb.decidedAt = new Date();

    if (dto.outcome === 'won') {
      cb.status = ChargebackStatus.WON;
      await this.allocateChargebackFees(cb, dto.fault);
    } else {
      cb.status = ChargebackStatus.LOST;
      cb.refundedPesewas = cb.amountPesewas;
      // The bank took the money back, so it leaves the pool and counts as a refund we issued.
      await this.recordTransaction(
        null,
        [
          { account: 'refund', debitPesewas: cb.amountPesewas, creditPesewas: 0 },
          { account: 'customer_cash', debitPesewas: 0, creditPesewas: cb.amountPesewas },
        ],
        `chargeback:${cb.id}`,
      );
      await this.allocateChargebackFees(cb, dto.fault);
    }
    await this.chargebacks.save(cb);

    await this.bus.publish(EVENTS.CHARGEBACK_RESOLVED, {
      chargebackId: cb.id,
      orderId: cb.orderId,
      outcome: dto.outcome,
      amountPesewas: cb.refundedPesewas,
      feesPesewas: cb.feesPesewas,
    });
    return cb;
  }

  private async allocateChargebackFees(cb: Chargeback, fault?: FaultParty | null): Promise<void> {
    if (cb.feesPesewas <= 0) return;
    const order = await this.fetchOrder(cb.orderId).catch(() => null);
    if (fault === FaultParty.VENDOR && order) {
      const vb = await this.vendorBalanceFor(order.vendorId);
      vb.owedPesewas += cb.feesPesewas;
      await this.vendorBalances.save(vb);
    } else if (fault === FaultParty.RIDER && order?.riderId) {
      const rb = await this.balanceFor(order.riderId);
      rb.lockedPesewas += cb.feesPesewas;
      await this.balances.save(rb);
    }
    // PLATFORM absorbs otherwise
  }

  adminListChargebacks(status?: ChargebackStatus): Promise<Chargeback[]> {
    return this.chargebacks.find({ where: status ? { status } : {}, order: { createdAt: 'DESC' }, take: 100 });
  }

  // ── Reads ─────────────────────────────────────────────────────────
  async breakdown(orderId: string): Promise<MoneyBreakdown | null> {
    return this.breakdowns.findOne({ where: { orderId } });
  }

  async breakdownFor(user: { sub: string; role: string }, orderId: string): Promise<MoneyBreakdown | null> {
    if (user.role !== 'admin') {
      const order = await this.fetchOrder(orderId);
      if (order.customerId !== user.sub) throw new ForbiddenException('Not your order');
    }
    return this.breakdown(orderId);
  }

  async orderEntries(orderId: string): Promise<LedgerEntry[]> {
    return this.entries.find({ where: { orderId }, order: { createdAt: 'ASC' } });
  }

  // ── Reconciliation (G28/G30) ──────────────────────────────────────
  async reconcile(): Promise<ReconcileRun> {
    const period = new Date().toISOString().slice(0, 10);
    const run = await this.reconciles.save(this.reconciles.create({ period, status: 'RUNNING' }));
    try {
      const entries = await this.entries.find({ order: { createdAt: 'ASC' } });
      const totalIn = entries.reduce((s, e) => s + e.debitPesewas, 0);
      const totalOut = entries.reduce((s, e) => s + e.creditPesewas, 0);
      const status = totalIn === totalOut ? 'MATCHED' : 'FLAGGED';
      run.status = status;
      run.reportJson = { period, entries: entries.length, totalInPesewas: totalIn, totalOutPesewas: totalOut, deltaPesewas: totalIn - totalOut };
      await this.reconciles.save(run);
      if (status === 'FLAGGED') {
        await this.bus.publish(EVENTS.LEDGER_DISCREPANCY_FLAGGED, { period, deltaPesewas: totalIn - totalOut });
      }
      return run;
    } catch (err) {
      run.status = 'FLAGGED';
      run.reportJson = { error: String(err) };
      await this.reconciles.save(run);
      return run;
    }
  }

  async latestReconcile(): Promise<ReconcileRun | null> {
    return this.reconciles.findOne({ order: { createdAt: 'DESC' } });
  }

  async runExternalPspReconciliation(): Promise<void> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().slice(0, 10);
    
    Logger.log(`[Reconciliation] Starting daily PSP/Paystack reconciliation for ${dateStr}...`, 'LedgerService');
    
    try {
      const pspResponse = await internalFetch(
        `${serviceUrl('payment')}/internal/payments/settlements/report?date=${dateStr}`
      );
      
      if (!pspResponse.ok) {
        throw new Error(`Failed to query Payment Service: ${pspResponse.statusText}`);
      }
      
      const pspData = (await pspResponse.json()) as { settledAmountPesewas: number };
      
      const start = new Date(`${dateStr}T00:00:00.000Z`);
      const end = new Date(`${dateStr}T23:59:59.999Z`);
      
      const internalSum = await this.entries
        .createQueryBuilder('entry')
        .select('SUM(entry.debitPesewas)', 'total')
        .where('entry.account = :account', { account: 'customer_cash' })
        .andWhere('entry.createdAt BETWEEN :start AND :end', { start, end })
        .getRawOne();
        
      const ourTotalPesewas = Number(internalSum?.total || 0);
      const variance = ourTotalPesewas - pspData.settledAmountPesewas;
      
      if (variance === 0) {
        Logger.log(`[Reconciliation] PSP Sync MATCHED for ${dateStr}. Zero variance detected.`, 'LedgerService');
      } else {
        Logger.error(
          `[Reconciliation] DISCREPANCY DETECTED for ${dateStr}! Our Ledger: ${ourTotalPesewas} pesewas | Paystack: ${pspData.settledAmountPesewas} pesewas. Variance: ${variance} pesewas!`,
          'LedgerService'
        );
        
        await this.bus.publish(EVENTS.LEDGER_DISCREPANCY_FLAGGED, {
          period: dateStr,
          deltaPesewas: variance,
        });
      }
    } catch (err: any) {
      Logger.error(`[Reconciliation] Daily PSP sync failed: ${err.message}`, 'LedgerService');
    }
  }

  /**
   * Catch withdrawals whose Paystack transfer result never arrived (missed webhook,
   * restart between transfer and ack). Two bugs made the old version useless (audit
   * F-BUG-19): it scanned REQUESTED (unapproved — no transfer exists yet; the in-flight
   * states are APPROVED/PROCESSING), and it rebuilt the reference without the
   * toUpperCase() that approveWithdrawal uses, so the lookup 404'd by construction.
   */
  async reconcileStaleTransfers(): Promise<void> {
    Logger.log(`[Reconciliation] Running transfer payout sweeper for in-flight (approved/processing) withdrawals...`, 'LedgerService');

    try {
      // Only reconcile transfers that were actually initiated (approved/processing) and
      // have been in flight for a bit, so we do not race a transfer whose webhook is
      // milliseconds away.
      const cutoff = new Date(Date.now() - 5 * 60_000);
      const staleWithdrawals = await this.withdrawals.find({
        where: {
          status: In([WithdrawalStatus.APPROVED, WithdrawalStatus.PROCESSING]),
          updatedAt: LessThan(cutoff),
        },
      });

      for (const w of staleWithdrawals) {
        // Use the reference actually sent to Paystack; fall back to the deterministic
        // (upper-cased) form approveWithdrawal uses when none was stored.
        const reference = w.transferReference ?? `ORE-WD-${w.id.slice(0, 8).toUpperCase()}`;
        try {
          const res = await internalFetch(
            `${serviceUrl('payment')}/internal/payments/transfers/${encodeURIComponent(reference)}`
          );
          if (res.ok) {
            const data = (await res.json()) as { status: 'success' | 'processing' | 'failed' };
            if (data.status === 'success') {
              await this.applyTransferResult(w.id, reference, true);
              Logger.log(`[Reconciliation] Stale withdrawal ${w.id} successfully completed via sweeper.`, 'LedgerService');
            } else if (data.status === 'failed') {
              await this.applyTransferResult(w.id, reference, false);
              Logger.warn(`[Reconciliation] Stale withdrawal ${w.id} marked failed via sweeper.`, 'LedgerService');
            }
          }
        } catch {
          // skip and retry next interval
        }
      }
    } catch (err: any) {
      Logger.error(`[Reconciliation] Transfer sweeper job failed: ${err.message}`, 'LedgerService');
    }
  }

  // ── Admin Analytics ─────────────────────────────────────────────────
  async adminAnalytics(period: string): Promise<any> {
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // default to week
    }

    // Financial metrics. Filter by the resolved period window — an exact-instant
    // comparison would match at most one row and report revenue as zero.
    const orderBreakdowns = await this.breakdowns.find({
      where: { createdAt: Between(startDate, now) },
      order: { createdAt: 'DESC' },
    });

    const revenue = orderBreakdowns.reduce((sum, b) => sum + b.totalPesewas, 0);
    const platformFees = orderBreakdowns.reduce((sum, b) => sum + b.platformFeePesewas, 0);
    const deliveryFees = orderBreakdowns.reduce((sum, b) => sum + b.deliveryFeePesewas, 0);

    // Wallet metrics
    const activeWallets = await this.balances.count();
    const totalWalletBalance = await this.balances
      .createQueryBuilder('balance')
      .select('SUM(balance.clearedPesewas)', 'total')
      .getRawOne();

    // Withdrawal metrics
    const pendingWithdrawals = await this.withdrawals.count({ 
      where: { status: WithdrawalStatus.REQUESTED } 
    });
    
    const withdrawalAmount = await this.withdrawals
      .createQueryBuilder('withdrawal')
      .select('SUM(withdrawal.amountPesewas)', 'total')
      .where('withdrawal.status = :status', { status: WithdrawalStatus.REQUESTED })
      .getRawOne();

    // Settlement metrics
    const vendorSettlements = await this.vendorSettlements.count({
      where: { status: VendorSettlementStatus.READY }
    });

    return {
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      financials: {
        totalRevenuePesewas: revenue,
        platformFeesPesewas: platformFees,
        deliveryFeesPesewas: deliveryFees,
        orderCount: orderBreakdowns.length
      },
      wallets: {
        activeRiderWallets: activeWallets,
        totalBalancePesewas: totalWalletBalance?.total || 0,
        pendingWithdrawals,
        pendingWithdrawalAmountPesewas: withdrawalAmount?.total || 0
      },
      vendors: {
        pendingSettlements: vendorSettlements
      },
      summary: {
        healthScore: revenue > 0 ? 'HEALTHY' : 'LOW_ACTIVITY',
        recommendedActions: []
      }
    };
  }

  // ── internals ─────────────────────────────────────────────────────
  private async ensureBreakdown(order: RawOrder): Promise<void> {
    const existing = await this.breakdowns.findOne({ where: { orderId: order.id } });
    if (existing) return;
    try {
      await this.breakdowns.save(
        this.breakdowns.create({
        orderId: order.id,
        subtotalPesewas: order.subtotalPesewas,
        deliveryFeePesewas: order.deliveryFeePesewas,
        serviceFeePesewas: order.serviceFeePesewas,
        platformFeePesewas: order.platformFeePesewas,
        vendorSharePesewas: order.vendorSharePesewas,
        riderFeePesewas: order.riderFeePesewas,
        totalPesewas: order.totalPesewas,
        }),
      );
    } catch {
      // money_breakdown.orderId is UNIQUE. Two concurrent events for the same order both
      // pass the findOne above and both insert; the loser gets SQLITE_CONSTRAINT. The row
      // now exists either way, which is the only thing this method promises.
    }
  }

  /** Net credit for one account on one order (credits - debits). Used to size reversals. */
  private async netCredit(orderId: string, account: string): Promise<number> {
    const rows = await this.entries.find({ where: { orderId, account } });
    return rows.reduce((sum, r) => sum + (r.creditPesewas || 0) - (r.debitPesewas || 0), 0);
  }

  /**
   * Refuse to write into a month accounting has closed.
   *
   * This lives here rather than in AccountingService for two reasons. First, the dependency
   * direction: accounting needs the ledger to post, so the ledger cannot call back into it.
   * Second, and more importantly, this has to be on the *write path*. A rule enforced in a
   * controller is a rule about the UI; putting it where every insert goes through means a
   * scheduled sweep, a replayed webhook and a manual adjustment all hit the same wall.
   *
   * The period is the current month, because entries are always dated now — a correction to
   * a closed month is posted today and *names* the month it corrects.
   *
   * A missing or unreadable period table must not stop the ledger from recording money, so a
   * lookup failure is logged and allowed through. Being unable to write an entry at all is
   * the worse failure: it loses the record of money that moved.
   */
  private async assertPeriodOpen(): Promise<void> {
    try {
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = now.getUTCMonth() + 1;
      const locked = await this.accountingPeriods.findOne({ where: { year, month } });
      if (locked) {
        throw new ConflictException(
          `Accounting period ${locked.label} is closed (locked ${locked.lockedAt.toISOString()}). ` +
            `Post the correction in the current period as an adjusting entry instead.`,
        );
      }
    } catch (err) {
      if (err instanceof ConflictException) throw err;
      Logger.error(`Period-lock check failed, allowing the write: ${(err as Error).message}`, 'LedgerService');
    }
  }

  private async post(orderId: string | null, account: string, debit: number, credit: number, ref: string): Promise<void> {
    await this.assertPeriodOpen();
    await this.entries.save(this.entries.create({ orderId, account, debitPesewas: debit, creditPesewas: credit, ref }));
  }

  @Transaction()
  async recordTransaction(
    orderId: string | null,
    entries: { account: string; debitPesewas: number; creditPesewas: number }[],
    ref: string,
    idempotencyKey?: string,
  ): Promise<void> {
    // Replay guard (audit P0): a batch whose business key is already committed is a
    // redelivery — skip it entirely. The PK on ledger_idempotency is the hard stop for a
    // concurrent duplicate: one writer wins, the loser's insert fails, its transaction
    // rolls back and the event is redelivered — at which point the key exists and this
    // check skips it.
    if (idempotencyKey && (await this.alreadyPosted(idempotencyKey))) {
      return;
    }
    if (idempotencyKey) {
      try {
        await this.idempotency.save(this.idempotency.create({ id: idempotencyKey }));
      } catch (err) {
        // Only a PK race is safe to ignore: the key now exists, so the other writer's
        // batch is committed and this one must not post. Anything else is a real failure
        // and must surface, not silently skip money.
        const exists = await this.idempotency.findOne({ where: { id: idempotencyKey } });
        if (!exists) throw err;
        return;
      }
    }

    const totalDebit = entries.reduce((sum, e) => sum + e.debitPesewas, 0);
    const totalCredit = entries.reduce((sum, e) => sum + e.creditPesewas, 0);

    if (totalDebit !== totalCredit) {
      throw new Error(`Ledger transaction unbalanced: Debits (${totalDebit}) != Credits (${totalCredit}) for ref ${ref}`);
    }

    // `ref` is the grouping key the database balance guard sums over, so two different
    // transactions sharing one is not a cosmetic naming slip — it merges their journals into a
    // single balance group. The guard then only checks that the merged total nets to zero, which
    // an unbalanced journal can satisfy by being cancelled out by an unrelated one, and its
    // per-row scan grows with every leg that has ever shared the key.
    //
    // `postFinalAllocation` passed the literal 'delivered' for every order in the system, so this
    // had already happened to the most-posted journal there is. Refusing the reuse here means the
    // next call site that gets it wrong fails loudly on its second write instead of quietly
    // degrading the invariant that everything downstream trusts.
    if (await this.entries.findOne({ where: { ref } })) {
      throw new Error(
        `Ledger ref '${ref}' already has posted legs. A ref identifies one transaction and is the ` +
          'balance guard\'s grouping key; reusing it merges unrelated journals into one balance group.',
      );
    }

    await this.assertPeriodOpen();

    for (const entry of entries) {
      await this.entries.save(
        this.entries.create({
          orderId,
          account: entry.account,
          debitPesewas: entry.debitPesewas,
          creditPesewas: entry.creditPesewas,
          ref,
          idempotencyKey: idempotencyKey ?? null,
        }),
      );
    }
  }

  /** True if a money operation with this business key already ran (replay guard). */
  private async alreadyPosted(key: string): Promise<boolean> {
    return Boolean(await this.idempotency.findOne({ where: { id: key } }));
  }

  private async fetchOrdersByCheckout(checkoutId: string): Promise<RawOrder[]> {
    const res = await internalFetch(`${serviceUrl('order')}/internal/orders/checkout/${checkoutId}`);
    if (!res.ok) return [];
    return (await res.json()) as RawOrder[];
  }

  private async fetchOrder(orderId: string): Promise<RawOrder> {
    const res = await internalFetch(`${serviceUrl('order')}/internal/orders/${orderId}`);
    if (!res.ok) throw new NotFoundException('Order not found');
    return (await res.json()) as RawOrder;
  }

  private async fetchRider(riderId: string): Promise<DispatchRider> {
    const res = await internalFetch(`${serviceUrl('dispatch')}/internal/riders/${riderId}`);
    if (!res.ok) throw new NotFoundException('Rider not found');
    return (await res.json()) as DispatchRider;
  }

  /**
   * The legs worked on an order, so earnings can be split across the riders who worked them.
   *
   * Deliberately outside the journal transaction and deliberately non-throwing: dispatch being
   * slow or down must not roll back a posted journal (audit P2). An empty result makes
   * `creditDeliveryLegs` fall back to crediting the assigned rider, which is the pre-split
   * behaviour — degraded, but never nobody-gets-paid.
   */
  private async fetchOrderAssignments(orderId: string): Promise<DeliveryLeg[]> {
    try {
      const res = await internalFetch(`${serviceUrl('dispatch')}/internal/orders/${orderId}/assignments`);
      if (!res.ok) return [];
      return (await res.json()) as DeliveryLeg[];
    } catch {
      return [];
    }
  }

  /** Stamp a leg as paid so a redelivered ORDER_DELIVERED cannot credit it twice. */
  private async markAssignmentPaid(assignmentId: string): Promise<void> {
    const res = await internalFetch(`${serviceUrl('dispatch')}/internal/assignments/${assignmentId}/earnings-posted`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!res.ok) throw new Error(`dispatch returned ${res.status}`);
  }

  private async userIdFor(riderId: string): Promise<string | null> {
    const balance = await this.balanceFor(riderId);
    if (balance.userId) return balance.userId;
    const rider = await this.fetchRider(riderId).catch(() => null);
    if (rider?.userId) {
      balance.userId = rider.userId;
      await this.balances.save(balance);
      return rider.userId;
    }
    return null;
  }

  /**
   * Claim an envelope for processing, exactly once across every replica and every restart.
   *
   * This was a plain in-memory `Set`. It died with the process, so a redelivery after a deploy
   * was reprocessed; it was per-replica, so a fanned-out event was handled once per replica; and
   * it called `.clear()` wholesale at 10 000 entries, so the next redelivery of any of those
   * events was reprocessed too. All three are reachable on an at-least-once bus.
   */
  private take(id: string): Promise<boolean> {
    return this.dedupe.take(id);
  }
}
