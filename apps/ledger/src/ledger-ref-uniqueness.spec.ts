jest.setTimeout(60000);
/**
 * F-LED-1 — `ref` is the balance guard's grouping key, and one call site used a constant.
 *
 * `journal-invariants.ts` states the invariant as "for any `ref` — the grouping key every
 * transaction's legs share — total debits equal total credits", and enforces it in Postgres with
 * a deferred constraint trigger that sums `WHERE ref = NEW.ref`.
 *
 * `postFinalAllocation` passed the literal string `'delivered'`. Every delivered order in the
 * platform therefore landed in ONE balance group, which has two consequences:
 *
 *   1. The guard stopped checking what it was written to check. Instead of "this order's journal
 *      balances" it checked "every delivery ever posted nets to zero", a condition an unbalanced
 *      order can satisfy by being cancelled out by another one.
 *   2. It gets slower forever. The trigger is FOR EACH ROW and scans every row sharing the ref,
 *      so each of the ~8 legs of a delivery re-scanned every delivery leg in the table.
 *
 * Three further call sites keyed a ref by something not unique to the transaction (errand abort
 * by reason, wallet adjustment by admin and free text, reserve release by vendor and reason), and
 * refunds keyed by the order's business reference rather than the refund.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { initializeTransactionalContext, addTransactionalDataSource } from 'typeorm-transactional';

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
  AccountingPeriod, TaxRule, TaxTransaction, WhtDecision, TaxLedger, TaxReviewCase,
];

describe('ledger ref is a per-transaction grouping key', () => {
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
        { provide: ORE_ENV, useValue: { riderClearHours: 24, vendorSettlementDay: 'friday', loyaltyPesewaPerGhs: 1, vendorBonusAfterOrders: 10, vendorBonusPesewas: 20_000 } },
        { provide: ORE_DEDUPE, useValue: new InMemoryConsumerDedupe() },
      ],
    }).compile();
    addTransactionalDataSource(module.get<DataSource>(getDataSourceToken()));
    service = module.get(LedgerService);
    entries = module.get<Repository<LedgerEntry>>(getRepositoryToken(LedgerEntry));
  });

  // One datasource for the suite (typeorm-transactional refuses a second 'default'), so each
  // test starts from an empty journal instead of a fresh module.
  beforeEach(async () => {
    await module.get<DataSource>(getDataSourceToken()).query('DELETE FROM ledger_entry');
    await module.get<DataSource>(getDataSourceToken()).query('DELETE FROM ledger_idempotency');
  });

  afterAll(async () => {
    await module.get<DataSource>(getDataSourceToken()).destroy().catch(() => undefined);
    await module.close();
  });

  const legs = (amount: number) => [
    { account: 'customer_funds_held', debitPesewas: amount, creditPesewas: 0 },
    { account: 'vendor_payable', debitPesewas: 0, creditPesewas: amount },
  ];

  it('refuses to post a second transaction under a ref that already has legs', async () => {
    await service.recordTransaction('order-1', legs(1000), 'delivered:order-1');
    // The old code would have posted this under the same 'delivered' group as order-1.
    await expect(service.recordTransaction('order-2', legs(2000), 'delivered:order-1'))
      .rejects.toThrow(/already has posted legs/);
  });

  it('explains why reuse is refused, not merely that it was', async () => {
    await service.recordTransaction('order-1', legs(1000), 'shared-ref');
    await expect(service.recordTransaction('order-2', legs(2000), 'shared-ref'))
      .rejects.toThrow(/grouping key/);
  });

  it('leaves the second transaction unposted rather than half-posted', async () => {
    await service.recordTransaction('order-1', legs(1000), 'shared-ref');
    await service.recordTransaction('order-2', legs(2000), 'shared-ref').catch(() => undefined);
    expect(await entries.count({ where: { orderId: 'order-2' } })).toBe(0);
  });

  it('gives each delivered order its own ref', async () => {
    // The regression proper: two deliveries must not share a balance group.
    await service.recordTransaction('order-1', legs(1000), 'delivered:order-1');
    await service.recordTransaction('order-2', legs(2000), 'delivered:order-2');
    const refs = (await entries.find()).map((e) => e.ref);
    expect(new Set(refs)).toEqual(new Set(['delivered:order-1', 'delivered:order-2']));
  });

  it('still allows distinct transactions for the same order under distinct refs', async () => {
    // An order legitimately posts several journals across its life: capture, then delivery.
    await service.recordTransaction('order-1', legs(1000), 'payment_capture:order-1');
    await service.recordTransaction('order-1', legs(1000), 'delivered:order-1');
    expect(await entries.count({ where: { orderId: 'order-1' } })).toBe(4);
  });

  it('still skips a genuine replay by idempotency key without raising the reuse error', async () => {
    // A redelivered event must be a silent no-op, not a loud failure — the reuse guard must not
    // turn at-least-once delivery into an error.
    await service.recordTransaction('order-1', legs(1000), 'delivered:order-1', 'delivered:order-1');
    await service.recordTransaction('order-1', legs(1000), 'delivered:order-1', 'delivered:order-1');
    expect(await entries.count({ where: { orderId: 'order-1' } })).toBe(2);
  });
});
