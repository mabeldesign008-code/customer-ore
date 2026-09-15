jest.setTimeout(60000);
import { Test } from '@nestjs/testing';
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
import { journalInvariantDdl } from './journal-invariants';

/**
 * The ledger is what pays everyone, so its rules have to be properties of the database rather
 * than promises the application keeps. This spec drives the real code path —
 * `LedgerService.ensureJournalInvariants()` — against a real SQLite database and asserts the
 * triggers actually reject what they claim to reject.
 *
 * It also pins the two things that are easiest to get wrong in trigger DDL and fail silently:
 * the real column names ("debitPesewas", not debit_pesewas) and the real table name.
 */
describe('ledger journal invariants', () => {
  const ENTITIES = [
    LedgerEntry, LedgerIdempotency, MoneyBreakdown, CodCash, RiderBalance, RiderWithdrawal,
    VendorEarning, VendorSettlement, VendorBalance, VendorWithdrawal,
    Dispute, Chargeback, CustomerCredit, CustomerCreditLog, CustomerLoyalty, ReconcileRun,
    AccountingPeriod, TaxRule, TaxTransaction, WhtDecision, TaxLedger, TaxReviewCase,
  ];
  let module: Awaited<ReturnType<ReturnType<typeof Test.createTestingModule>['compile']>>;
  let service: LedgerService;
  let entries: Repository<LedgerEntry>;
  let dataSource: DataSource;

  beforeAll(async () => {
    module = (await Test.createTestingModule({
      imports: [...TypeOrmSQLITETestingModule(ENTITIES)],
      providers: [
        LedgerService,
        TaxEngineService,
        { provide: ORE_BUS, useValue: { publish: jest.fn().mockResolvedValue(undefined), flush: jest.fn().mockResolvedValue(undefined) } },
        { provide: ORE_DEDUPE, useValue: new InMemoryConsumerDedupe() },
        { provide: ORE_SCHEDULER, useValue: { onInterval: jest.fn() } },
        { provide: ORE_ENV, useValue: { riderClearHours: 24, vendorSettlementDay: 'friday', riderWithdrawMinPesewas: 5_000, riderWithdrawDailyCapPesewas: 500_000, riderWithdrawFreePerDay: 1, riderWithdrawFeePesewas: 100, vendorBonusAfterOrders: 10, vendorBonusPesewas: 20_000, codTierNewLimitPesewas: 50_000, codTierExperiencedLimitPesewas: 150_000, codTierSeniorLimitPesewas: 400_000, riderTierExperiencedDeliveries: 20, riderTierSeniorDeliveries: 60, codBlockAtPct: 90, codUnblockAtPct: 70, loyaltyPesewaPerGhs: 1 } },
      ],
    }).compile()) as never;

    dataSource = module.get<DataSource>(getDataSourceToken());
    addTransactionalDataSource(dataSource);
    service = module.get(LedgerService);
    entries = module.get(getRepositoryToken(LedgerEntry));
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  async function installedTriggers(): Promise<string[]> {
    const rows = (await dataSource.query(
      `SELECT name FROM sqlite_master WHERE type = 'trigger' ORDER BY name`,
    )) as { name: string }[];
    return rows.map((r) => r.name);
  }

  it('uses the column names that actually exist on the table', async () => {
    // A trigger written against debit_pesewas would be dead DDL that never matches a column.
    const columns = (await dataSource.query(`PRAGMA table_info(ledger_entry)`)) as { name: string }[];
    const names = columns.map((c) => c.name);
    expect(names).toContain('debitPesewas');
    expect(names).toContain('creditPesewas');
    expect(names).not.toContain('debit_pesewas');
  });

  it('installs the append-only triggers at boot', async () => {
    await service.ensureJournalInvariants();
    expect(await installedTriggers()).toEqual(
      expect.arrayContaining(['ledger_entry_no_update', 'ledger_entry_no_delete']),
    );
  });

  it('is idempotent — re-running it does not error or duplicate', async () => {
    await service.ensureJournalInvariants();
    await service.ensureJournalInvariants();
    const triggers = await installedTriggers();
    expect(triggers.filter((n) => n === 'ledger_entry_no_update')).toHaveLength(1);
  });

  it('rejects an UPDATE of a posted row', async () => {
    await entries.save(entries.create({ account: 'customer_cash', debitPesewas: 1000, creditPesewas: 0, ref: 'inv:update' }));
    await expect(
      entries.query(`UPDATE ledger_entry SET "debitPesewas" = 999 WHERE "ref" = 'inv:update'`),
    ).rejects.toThrow(/append-only/);
  });

  it('rejects a DELETE of a posted row', async () => {
    await expect(entries.query(`DELETE FROM ledger_entry WHERE "ref" = 'inv:update'`)).rejects.toThrow(
      /append-only/,
    );
  });

  it('still allows appending a reversing entry, which is how a correction is meant to be made', async () => {
    // The whole point of append-only: the original stays, the reversal is added alongside it.
    await expect(
      entries.save([
        entries.create({ account: 'customer_cash', debitPesewas: 0, creditPesewas: 1000, ref: 'inv:update' }),
      ]),
    ).resolves.toBeDefined();

    const rows = await entries.find({ where: { ref: 'inv:update' } });
    expect(rows).toHaveLength(2);
    expect(rows.reduce((sum, r) => sum + r.debitPesewas - r.creditPesewas, 0)).toBe(0);
  });

  it('emits valid DDL for Postgres too, quoted and schema-qualified', () => {
    const ddl = journalInvariantDdl('postgres').join('\n');
    // Unquoted identifiers fold to lowercase in Postgres and the function would not compile.
    expect(ddl).toContain('"debitPesewas"');
    expect(ddl).toContain('"creditPesewas"');
    // The entity is @Entity({ schema: 'ledger' }); Postgres honours the schema, SQLite does not.
    expect(ddl).toContain('ledger.ledger_entry');
    // Deferral is what makes the balance check possible at all — see the SQLite note.
    expect(ddl).toContain('DEFERRABLE INITIALLY DEFERRED');
    expect(ddl).toContain('ore_ledger_maintenance');
  });
});
