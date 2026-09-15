jest.setTimeout(60000);
/**
 * LEDGER BALANCE INVARIANT — the foundational money test.
 *
 * Runs the REAL LedgerService posting code against a real SQLite database and asserts
 * the one property that must never break: across every money-moving event, total debits
 * equal total credits, and every transaction (grouped by ref) balances on its own.
 *
 * Because rider/vendor payouts are automatic and driven straight off this ledger, an
 * imbalance here is not an accounting nicety — it is the platform paying out money it
 * never received, or never paying out money it owes.
 *
 * This spec drives the private event handlers directly (the same code the bus invokes)
 * with the order-service HTTP lookups stubbed, so the arithmetic under test is the real
 * production arithmetic, and the rows written are real rows.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { initializeTransactionalContext, addTransactionalDataSource } from 'typeorm-transactional';

// The service's @Transaction() methods need this, exactly as libs/db does at bootstrap.
initializeTransactionalContext();
import { TypeOrmSQLITETestingModule } from '@ore/testing';
import { ORE_BUS, ORE_ENV, ORE_SCHEDULER, ORE_DEDUPE, InMemoryConsumerDedupe } from '@ore/core';
import { LedgerService } from './ledger.service';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { LedgerIdempotency } from './entities/ledger-idempotency.entity';
import { MoneyBreakdown } from './entities/money-breakdown.entity';
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
import { TaxRule, TaxTransaction, WhtDecision, TaxLedger, TaxReviewCase } from './entities';
import { TaxEngineService } from './tax-engine.service';

const ENTITIES = [
  LedgerEntry, LedgerIdempotency, MoneyBreakdown, CodCash, RiderBalance, RiderWithdrawal,
  VendorEarning, VendorSettlement, VendorBalance, VendorWithdrawal,
  Dispute, Chargeback, CustomerCredit, CustomerCreditLog, CustomerLoyalty, ReconcileRun,
  // Phase 6 added this repository to LedgerService (assertPeriodOpen); without it the
  // whole suite fails to construct and the balance invariant goes untested.
  AccountingPeriod, TaxRule, TaxTransaction, WhtDecision, TaxLedger, TaxReviewCase,
];

/** A realistic GHS 115.00 prepaid order, priced by computeBreakdown's own formulas. */
const ORDER = {
  id: 'order-1',
  ref: 'ORC-2026-000001',
  vendorId: 'vendor-1',
  customerId: 'cust-1',
  riderId: 'rider-1',
  orderType: 'FOOD',
  paymentMethod: 'PREPAID' as const,
  subtotalPesewas: 10_000,   // GHS 100.00 of goods
  deliveryFeePesewas: 1_000, // GHS 10.00 delivery fee
  serviceFeePesewas: 500,    // GHS 5.00 service fee
  platformFeePesewas: 200,   // GHS 2.00 platform fee
  vendorSharePesewas: 8_500, // subtotal − 15% commission = GHS 85.00
  riderFeePesewas: 800,      // GHS 8.00, computed at dispatch from distance
  totalPesewas: 11_500,      // subtotal + deliveryFee + serviceFee = GHS 115.00
  tipPesewas: 0,
  peakPayPesewas: 0,
  errandJson: null,
  status: 'DELIVERED',
};

describe('Ledger balance invariant', () => {
  let module: TestingModule;
  let service: LedgerService;
  let entries: Repository<LedgerEntry>;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [...TypeOrmSQLITETestingModule(ENTITIES)],
      providers: [
        LedgerService,
        TaxEngineService,
        { provide: ORE_BUS, useValue: { publish: jest.fn().mockResolvedValue(undefined), flush: jest.fn().mockResolvedValue(undefined) } },
        { provide: ORE_SCHEDULER, useValue: { onInterval: jest.fn() } },
        {
          provide: ORE_ENV,
          useValue: {
            riderClearHours: 24, vendorSettlementDay: 'friday',
            riderWithdrawMinPesewas: 5_000, riderWithdrawDailyCapPesewas: 500_000,
            riderWithdrawFreePerDay: 1, riderWithdrawFeePesewas: 100,
            vendorBonusAfterOrders: 10, vendorBonusPesewas: 20_000,
            codTierNewLimitPesewas: 50_000, codTierExperiencedLimitPesewas: 150_000,
            codTierSeniorLimitPesewas: 400_000, riderTierExperiencedDeliveries: 20,
            riderTierSeniorDeliveries: 60, codBlockAtPct: 90, codUnblockAtPct: 70,
            loyaltyPesewaPerGhs: 1,
          },
        },
        { provide: ORE_DEDUPE, useValue: new InMemoryConsumerDedupe() },
      ],
    }).compile();

    addTransactionalDataSource(module.get<DataSource>(getDataSourceToken()));

    service = module.get(LedgerService);
    entries = module.get(getRepositoryToken(LedgerEntry));

    // Audit S-1: production handlers re-verify charge/refund events against the payment
    // service before posting. This spec's fixtures ARE the payment truth — its subject is
    // the posting arithmetic — so the verification lookups are stubbed to agree, exactly
    // like the order-service fetches each test already stubs.
    (service as unknown as { checkoutIsPaid: (id: string) => Promise<boolean> }).checkoutIsPaid =
      async () => true;
    (service as unknown as { refundRecordMatches: (orderId: string, refundId: string | null, amount: number) => Promise<boolean> }).refundRecordMatches =
      async () => true;
  });

  /** Totals across the whole journal, plus a per-ref breakdown of anything unbalanced. */
  async function audit(): Promise<{ debit: number; credit: number; byRef: Record<string, { debit: number; credit: number }> }> {
    const rows = await entries.find();
    const byRef: Record<string, { debit: number; credit: number }> = {};
    let debit = 0;
    let credit = 0;
    for (const r of rows) {
      debit += r.debitPesewas;
      credit += r.creditPesewas;
      const key = r.ref ?? '(no ref)';
      byRef[key] ??= { debit: 0, credit: 0 };
      byRef[key].debit += r.debitPesewas;
      byRef[key].credit += r.creditPesewas;
    }
    return { debit, credit, byRef };
  }

  function unbalanced(byRef: Record<string, { debit: number; credit: number }>): string[] {
    return Object.entries(byRef)
      .filter(([, v]) => v.debit !== v.credit)
      .map(([ref, v]) => `      ref "${ref}": debits ${v.debit} vs credits ${v.credit} (off by ${v.debit - v.credit})`);
  }

  async function assertBalanced(label: string): Promise<void> {
    const { debit, credit, byRef } = await audit();
    const bad = unbalanced(byRef);
    expect({
      case: label,
      totalDebits: debit,
      totalCredits: credit,
      difference: debit - credit,
      unbalancedTransactions: bad,
    }).toEqual({
      case: label,
      totalDebits: debit,
      totalCredits: debit,
      difference: 0,
      unbalancedTransactions: [],
    });
  }

  it('prepaid lifecycle: charge → delivered keeps the journal balanced', async () => {
    // Stub the order-service HTTP lookups the handlers use.
    (service as unknown as { fetchOrdersByCheckout: (id: string) => Promise<unknown> }).fetchOrdersByCheckout =
      async () => [ORDER];
    (service as unknown as { fetchOrder: (id: string) => Promise<unknown> }).fetchOrder = async () => ORDER;

    await (service as unknown as { onChargeSucceeded: (id: string) => Promise<void> }).onChargeSucceeded('checkout-1');
    await assertBalanced('after charge.success');

    await (service as unknown as { onDelivered: (id: string) => Promise<void> }).onDelivered(ORDER.id);
    await assertBalanced('after order.delivered');
  });

  it('COD lifecycle: delivered keeps the journal balanced', async () => {
    const codOrder = { ...ORDER, id: 'order-cod', paymentMethod: 'COD' as const };
    (service as unknown as { fetchOrder: (id: string) => Promise<unknown> }).fetchOrder = async () => codOrder;

    await (service as unknown as { onDelivered: (id: string) => Promise<void> }).onDelivered(codOrder.id);

    const rows = await entries.find({ where: { orderId: 'order-cod' } });
    const debit = rows.reduce((s, r) => s + r.debitPesewas, 0);
    const credit = rows.reduce((s, r) => s + r.creditPesewas, 0);
    expect({
      case: 'COD delivered',
      entries: rows.map((r) => `${r.account}: dr ${r.debitPesewas} / cr ${r.creditPesewas}`),
      totalDebits: debit,
      totalCredits: credit,
      difference: debit - credit,
    }).toEqual({
      case: 'COD delivered',
      entries: rows.map((r) => `${r.account}: dr ${r.debitPesewas} / cr ${r.creditPesewas}`),
      totalDebits: debit,
      totalCredits: debit,
      difference: 0,
    });
  });

  it('a verified rider remittance moves cash without creating or destroying money', async () => {
    // Deliver a COD order so there is cash outstanding, then verify the remittance of it.
    const codOrder = { ...ORDER, id: 'order-remit', paymentMethod: 'COD' as const };
    (service as unknown as { fetchOrder: (id: string) => Promise<unknown> }).fetchOrder = async () => codOrder;
    await (service as unknown as { onDelivered: (id: string) => Promise<void> }).onDelivered(codOrder.id);

    await service.remit(codOrder.riderId as string, codOrder.totalPesewas);
    await service.verifyRiderRemittance('admin-1', codOrder.riderId as string, codOrder.totalPesewas);

    // The remittance must balance on its own ref: company cash up, COD receivable down.
    const { byRef } = await audit();
    const remitRef = Object.keys(byRef).find((r) => r.startsWith('remit-verified:'));
    expect({
      case: 'verified remittance',
      refFound: Boolean(remitRef),
      legs: remitRef ? byRef[remitRef] : null,
    }).toEqual({
      case: 'verified remittance',
      refFound: true,
      legs: { debit: codOrder.totalPesewas, credit: codOrder.totalPesewas },
    });
  });

  it('a partial refund unwinds the split proportionally and stays balanced', async () => {
    const partOrder = { ...ORDER, id: 'order-part-refund' };
    (service as unknown as { fetchOrdersByCheckout: (id: string) => Promise<unknown> }).fetchOrdersByCheckout =
      async () => [partOrder];
    (service as unknown as { fetchOrder: (id: string) => Promise<unknown> }).fetchOrder = async () => partOrder;

    await (service as unknown as { onChargeSucceeded: (id: string) => Promise<void> }).onChargeSucceeded('checkout-part');
    // Refund GHS 50.00 of the GHS 115.00 order; it was never delivered.
    await (service as unknown as { onRefundProcessed: (id: string, amount: number) => Promise<void> })
      .onRefundProcessed(partOrder.id, 5_000);

    const rows = await entries.find({ where: { orderId: 'order-part-refund' } });
    const debit = rows.reduce((s, r) => s + r.debitPesewas, 0);
    const credit = rows.reduce((s, r) => s + r.creditPesewas, 0);
    const net = (account: string) =>
      rows.filter((r) => r.account === account).reduce((s, r) => s + r.creditPesewas - r.debitPesewas, 0);

    expect({
      case: 'partial refund of an undelivered order',
      totalDebits: debit,
      totalCredits: credit,
      // Controlled split: before delivery there are no vendor/rider/revenue allocations.
      // The refund only reduces held customer funds.
      heldCustomerFunds: net('customer_funds_held'),
      vendorStillOwed: net('vendor_payable'),
      riderStillOwed: net('pending_rider_payable'),
      platformRevenue: net('platform_revenue'),
    }).toEqual({
      case: 'partial refund of an undelivered order',
      totalDebits: debit,
      totalCredits: debit,
      heldCustomerFunds: partOrder.totalPesewas - 5_000,
      vendorStillOwed: 0,
      riderStillOwed: 0,
      platformRevenue: 0,
    });
  });

  it('refund of a charged-but-undelivered order leaves no phantom payables', async () => {
    const refundOrder = { ...ORDER, id: 'order-refund' };
    (service as unknown as { fetchOrdersByCheckout: (id: string) => Promise<unknown> }).fetchOrdersByCheckout =
      async () => [refundOrder];
    (service as unknown as { fetchOrder: (id: string) => Promise<unknown> }).fetchOrder = async () => refundOrder;

    await (service as unknown as { onChargeSucceeded: (id: string) => Promise<void> }).onChargeSucceeded('checkout-refund');
    // Full refund, order never delivered.
    await (service as unknown as { onRefundProcessed: (id: string, amount: number) => Promise<void> })
      .onRefundProcessed(refundOrder.id, refundOrder.totalPesewas);

    const rows = await entries.find({ where: { orderId: 'order-refund' } });
    const net = (account: string) =>
      rows.filter((r) => r.account === account)
        .reduce((s, r) => s + r.creditPesewas - r.debitPesewas, 0);

    expect({
      case: 'fully refunded, never delivered',
      vendorStillOwed: net('vendor_payable'),
      riderStillOwed: net('pending_rider_payable') + net('rider_payable'),
      platformRevenue: net('platform_revenue'),
    }).toEqual({
      case: 'fully refunded, never delivered',
      vendorStillOwed: 0,
      riderStillOwed: 0,
      platformRevenue: 0,
    });
  });

  it('withholds configured supplier WHT from Ore-funded delivery-partner incentives without unbalancing', async () => {
    await module.get(TaxEngineService).ensureDefaultRulesSeeded();
    const taxRules = module.get<Repository<TaxRule>>(getRepositoryToken(TaxRule));
    const dpRule = (ruleId: string, contractType: string) => taxRules.create({
      ruleId,
      taxType: 'WHT',
      supplierType: 'INDEPENDENT_DELIVERY_PARTNER',
      payerType: 'ORE',
      payeeType: 'INDEPENDENT_DELIVERY_PARTNER',
      residentStatus: 'RESIDENT',
      transactionType: 'GENERAL_SERVICES',
      contractType,
      thresholdType: 'NO_THRESHOLD_RULE',
      thresholdAmountPesewas: null,
      rateBps: 1000,
      taxBase: 'TAXABLE_AMOUNT',
      effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
      effectiveTo: null,
      exemption: false,
      certificateRequired: false,
      active: true,
      version: 1,
    });
    await taxRules.save([
      dpRule('TEST-WHT-DP-SHORTFALL', 'ORE_APPROVED_DELIVERY_INCENTIVE'),
      dpRule('TEST-WHT-DP-PEAK', 'ORE_APPROVED_PEAK_INCENTIVE'),
    ]);

    const whtOrder = {
      ...ORDER,
      id: 'order-wht-dp',
      riderFeePesewas: 1_200, // GHS 2.00 more than customer delivery charge: Ore incentive/shortfall
      peakPayPesewas: 300,    // additional Ore-funded rider incentive
    };
    (service as unknown as { fetchOrdersByCheckout: (id: string) => Promise<unknown> }).fetchOrdersByCheckout =
      async () => [whtOrder];
    (service as unknown as { fetchOrder: (id: string) => Promise<unknown> }).fetchOrder = async () => whtOrder;
    (service as unknown as { fetchRider: (id: string) => Promise<unknown> }).fetchRider = async (id: string) => ({
      id,
      userId: 'user-rider-wht-dp',
      deliveryPartnerId: id,
      deliveryPartnerType: 'INDEPENDENT_DELIVERY_PARTNER',
      contractType: 'INDEPENDENT_DELIVERY_PARTNER',
      residentStatus: 'RESIDENT',
    });

    await (service as unknown as { onChargeSucceeded: (id: string) => Promise<void> }).onChargeSucceeded('checkout-wht-dp');
    await (service as unknown as { onDelivered: (id: string) => Promise<void> }).onDelivered(whtOrder.id);

    const rows = await entries.find({ where: { orderId: whtOrder.id } });
    const debit = rows.reduce((s, r) => s + r.debitPesewas, 0);
    const credit = rows.reduce((s, r) => s + r.creditPesewas, 0);
    const net = (account: string) => rows.filter((r) => r.account === account).reduce((s, r) => s + r.creditPesewas - r.debitPesewas, 0);
    const whtLedger = await module.get<Repository<TaxLedger>>(getRepositoryToken(TaxLedger)).find({ where: { orderId: whtOrder.id, taxType: 'WHT' } });

    expect({
      case: 'delivery partner incentive WHT',
      totalDebits: debit,
      totalCredits: credit,
      whtPayable: net('wht_payable'),
      riderPayable: net('rider_payable'),
      whtLedgerTotal: whtLedger.reduce((s, r) => s + r.taxAmountPesewas, 0),
      appliedWhtDecisions: await module.get<Repository<WhtDecision>>(getRepositoryToken(WhtDecision)).count({ where: { orderId: whtOrder.id, whtStatus: 'APPLIES' } }),
    }).toEqual({
      case: 'delivery partner incentive WHT',
      totalDebits: debit,
      totalCredits: debit,
      whtPayable: 50,
      riderPayable: 1_450,
      whtLedgerTotal: 50,
      appliedWhtDecisions: 2,
    });
  });

  it('routes Ore-paid delivery incentives to review when rider tax residency is unavailable', async () => {
    const reviewOrder = {
      ...ORDER,
      id: 'order-dp-residency-review',
      riderFeePesewas: 1_200,
    };
    (service as unknown as { fetchOrdersByCheckout: (id: string) => Promise<unknown> }).fetchOrdersByCheckout =
      async () => [reviewOrder];
    (service as unknown as { fetchOrder: (id: string) => Promise<unknown> }).fetchOrder = async () => reviewOrder;
    (service as unknown as { fetchRider: (id: string) => Promise<unknown> }).fetchRider = async () => {
      throw new Error('dispatch unavailable');
    };

    await (service as unknown as { onChargeSucceeded: (id: string) => Promise<void> }).onChargeSucceeded('checkout-dp-residency-review');
    await expect((service as unknown as { onDelivered: (id: string) => Promise<void> }).onDelivered(reviewOrder.id))
      .rejects.toThrow('Tax classification requires review before posting');

    const reviewCases = await module.get<Repository<TaxReviewCase>>(getRepositoryToken(TaxReviewCase)).find({ where: { orderId: reviewOrder.id } });
    expect({
      case: 'unknown DP residency review',
      reviewReasons: reviewCases.map((row) => row.reason).join('|'),
      finalDeliveryRows: await entries.count({ where: { orderId: reviewOrder.id, ref: `delivered:${reviewOrder.id}` } }),
    }).toEqual({
      case: 'unknown DP residency review',
      reviewReasons: reviewCases.map((row) => row.reason).join('|'),
      finalDeliveryRows: 0,
    });
    expect(reviewCases.map((row) => row.reason).join('|')).toContain('delivery_partner_resident_status_unknown');
  });

  it('classifies rider milestone incentives and withholds configured WHT before crediting wallet', async () => {
    const taxRules = module.get<Repository<TaxRule>>(getRepositoryToken(TaxRule));
    await taxRules.save(taxRules.create({
      ruleId: 'TEST-WHT-RIDER-MILESTONE',
      taxType: 'WHT',
      supplierType: 'INDEPENDENT_DELIVERY_PARTNER',
      payerType: 'ORE',
      payeeType: 'INDEPENDENT_DELIVERY_PARTNER',
      residentStatus: 'RESIDENT',
      transactionType: 'GENERAL_SERVICES',
      contractType: 'ORE_RIDER_MILESTONE_INCENTIVE',
      thresholdType: 'NO_THRESHOLD_RULE',
      thresholdAmountPesewas: null,
      rateBps: 500,
      taxBase: 'TAXABLE_AMOUNT',
      effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
      effectiveTo: null,
      exemption: false,
      certificateRequired: false,
      active: true,
      version: 1,
    }));
    (service as unknown as { fetchRider: (id: string) => Promise<unknown> }).fetchRider = async (id: string) => ({
      id,
      userId: 'user-rider-tax-ms',
      deliveryPartnerId: id,
      deliveryPartnerType: 'INDEPENDENT_DELIVERY_PARTNER',
      contractType: 'INDEPENDENT_DELIVERY_PARTNER',
      residentStatus: 'RESIDENT',
    });

    await service.creditRiderMilestone('rider-tax-ms', 25, 10_000);

    const rows = await entries.find({ where: { ref: 'milestone:rider:rider-tax-ms:25' } });
    const debit = rows.reduce((s, r) => s + r.debitPesewas, 0);
    const credit = rows.reduce((s, r) => s + r.creditPesewas, 0);
    const net = (account: string) => rows.filter((r) => r.account === account).reduce((s, r) => s + r.creditPesewas - r.debitPesewas, 0);
    const taxLedger = module.get<Repository<TaxLedger>>(getRepositoryToken(TaxLedger));
    const riderBalances = module.get<Repository<RiderBalance>>(getRepositoryToken(RiderBalance));

    expect({
      case: 'rider milestone WHT',
      totalDebits: debit,
      totalCredits: credit,
      riderMilestonePayable: net('rider_milestone'),
      whtPayable: net('wht_payable'),
      riderCleared: (await riderBalances.findOne({ where: { riderId: 'rider-tax-ms' } }))?.clearedPesewas,
      whtLedgerTotal: (await taxLedger.find({ where: { sourceTransaction: 'milestone:rider:rider-tax-ms:25', taxType: 'WHT' } })).reduce((s, r) => s + r.taxAmountPesewas, 0),
    }).toEqual({
      case: 'rider milestone WHT',
      totalDebits: debit,
      totalCredits: debit,
      riderMilestonePayable: 9_500,
      whtPayable: 500,
      riderCleared: 9_500,
      whtLedgerTotal: 500,
    });
  });

  it('classifies vendor loyalty bonuses and withholds configured WHT before increasing vendor payable', async () => {
    const taxRules = module.get<Repository<TaxRule>>(getRepositoryToken(TaxRule));
    await taxRules.save(taxRules.create({
      ruleId: 'TEST-WHT-VENDOR-BONUS',
      taxType: 'WHT',
      supplierType: 'VENDOR',
      payerType: 'ORE',
      payeeType: 'VENDOR',
      residentStatus: 'RESIDENT',
      transactionType: 'GENERAL_SERVICES',
      contractType: 'ORE_VENDOR_LOYALTY_BONUS',
      thresholdType: 'NO_THRESHOLD_RULE',
      thresholdAmountPesewas: null,
      rateBps: 1000,
      taxBase: 'TAXABLE_AMOUNT',
      effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
      effectiveTo: null,
      exemption: false,
      certificateRequired: false,
      active: true,
      version: 1,
    }));
    const vendorEarnings = module.get<Repository<VendorEarning>>(getRepositoryToken(VendorEarning));
    await vendorEarnings.save(Array.from({ length: 10 }, (_, index) => vendorEarnings.create({
      vendorId: 'vendor-tax-bonus',
      orderId: `vendor-bonus-count-${index + 1}`,
      orderRef: null,
      amountPesewas: 8_500,
      settlementId: null,
      settledAt: null,
    })));

    await (service as unknown as { maybeVendorBonus: (order: typeof ORDER, vendorOwner: string | null, vendorTaxProfile: { id: string; taxResidentStatus: 'RESIDENT' }) => Promise<void> }).maybeVendorBonus(
      { ...ORDER, id: 'order-vendor-bonus', vendorId: 'vendor-tax-bonus', customerId: 'cust-vendor-bonus' },
      null,
      { id: 'vendor-tax-bonus', taxResidentStatus: 'RESIDENT' },
    );

    const rows = await entries.find({ where: { ref: 'vendor_bonus:vendor-tax-bonus' } });
    const debit = rows.reduce((s, r) => s + r.debitPesewas, 0);
    const credit = rows.reduce((s, r) => s + r.creditPesewas, 0);
    const net = (account: string) => rows.filter((r) => r.account === account).reduce((s, r) => s + r.creditPesewas - r.debitPesewas, 0);
    const vendorBalances = module.get<Repository<VendorBalance>>(getRepositoryToken(VendorBalance));
    const taxLedger = module.get<Repository<TaxLedger>>(getRepositoryToken(TaxLedger));

    expect({
      case: 'vendor bonus WHT',
      totalDebits: debit,
      totalCredits: credit,
      vendorBonusPayable: net('vendor_bonus'),
      whtPayable: net('wht_payable'),
      vendorBonusBalance: (await vendorBalances.findOne({ where: { vendorId: 'vendor-tax-bonus' } }))?.bonusPesewas,
      whtLedgerTotal: (await taxLedger.find({ where: { sourceTransaction: 'vendor_bonus:order-vendor-bonus', taxType: 'WHT' } })).reduce((s, r) => s + r.taxAmountPesewas, 0),
    }).toEqual({
      case: 'vendor bonus WHT',
      totalDebits: debit,
      totalCredits: debit,
      vendorBonusPayable: 18_000,
      whtPayable: 2_000,
      vendorBonusBalance: 18_000,
      whtLedgerTotal: 2_000,
    });
  });

  it('holds an earned vendor bonus for tax review without rolling back the delivered order', async () => {
    const vendorEarnings = module.get<Repository<VendorEarning>>(getRepositoryToken(VendorEarning));
    await vendorEarnings.save(Array.from({ length: 9 }, (_, index) => vendorEarnings.create({
      vendorId: 'vendor-bonus-review',
      orderId: `vendor-bonus-review-count-${index + 1}`,
      orderRef: null,
      amountPesewas: 8_500,
      settlementId: null,
      settledAt: null,
    })));
    const bonusReviewOrder = { ...ORDER, id: 'order-vendor-bonus-review', vendorId: 'vendor-bonus-review', paymentMethod: 'COD' as const };
    (service as unknown as { fetchOrder: (id: string) => Promise<unknown> }).fetchOrder = async () => bonusReviewOrder;
    (service as unknown as { vendorTaxProfile: (id: string) => Promise<unknown> }).vendorTaxProfile = async () => null;

    await (service as unknown as { onDelivered: (id: string) => Promise<void> }).onDelivered(bonusReviewOrder.id);

    const rows = await entries.find({ where: { orderId: bonusReviewOrder.id, ref: `delivered:${bonusReviewOrder.id}` } });
    const debit = rows.reduce((s, r) => s + r.debitPesewas, 0);
    const credit = rows.reduce((s, r) => s + r.creditPesewas, 0);
    const reviewCases = await module.get<Repository<TaxReviewCase>>(getRepositoryToken(TaxReviewCase)).find({ where: { orderId: bonusReviewOrder.id } });
    expect({
      case: 'vendor bonus held for tax review',
      deliveredBalanced: debit === credit && rows.length > 0,
      bonusPayableRows: await entries.count({ where: { ref: 'vendor_bonus:vendor-bonus-review' } }),
      reviewReasons: reviewCases.map((row) => row.reason).join('|'),
    }).toEqual({
      case: 'vendor bonus held for tax review',
      deliveredBalanced: true,
      bonusPayableRows: 0,
      reviewReasons: reviewCases.map((row) => row.reason).join('|'),
    });
    expect(reviewCases.map((row) => row.reason).join('|')).toContain('vendor_resident_status_unknown_for_ore_paid_supplier');
  });

  it('a replayed delivered event (audit P0) never double-posts a single pesewa', async () => {
    const replayOrder = { ...ORDER, id: 'order-replay', paymentMethod: 'COD' as const };
    (service as unknown as { fetchOrder: (id: string) => Promise<unknown> }).fetchOrder = async () => replayOrder;

    const deliver = () =>
      (service as unknown as { onDelivered: (id: string) => Promise<void> }).onDelivered(replayOrder.id);

    // First delivery posts the batch…
    await deliver();
    // …then the order service republishes ORDER_DELIVERED with a NEW envelope id (the
    // P0 scenario: admin force-move). The business key, not the envelope, must stop it.
    await deliver();

    const rows = await entries.find({ where: { orderId: 'order-replay' } });
    const debit = rows.reduce((s, r) => s + r.debitPesewas, 0);
    const credit = rows.reduce((s, r) => s + r.creditPesewas, 0);
    const ledgerIdempotency = module.get(getRepositoryToken(LedgerIdempotency));

    expect({
      case: 'replayed ORDER_DELIVERED',
      totalDebits: debit,
      totalCredits: credit,
      ledgerRows: rows.length,
      deliveryBatches: await ledgerIdempotency.count({ where: { id: `delivered:${replayOrder.id}` } }),
      // vendor earning and COD receivable are one-per-order unique rows — a double run
      // would throw on their inserts; assert the side tables stayed single-row too
      vendorEarningRows: await module.get(getRepositoryToken(VendorEarning)).count({ where: { orderId: 'order-replay' } }),
      codRows: await module.get(getRepositoryToken(CodCash)).count({ where: { orderId: 'order-replay' } }),
    }).toEqual({
      case: 'replayed ORDER_DELIVERED',
      totalDebits: debit,
      totalCredits: debit,
      ledgerRows: 7, // COD debit + vendor/rider + net Ore revenue + VAT/NHIL/GETFund, all from the single first delivery
      deliveryBatches: 1,
      vendorEarningRows: 1,
      codRows: 1,
    });
  });
});
