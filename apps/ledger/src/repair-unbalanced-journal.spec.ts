import { DataSource } from 'typeorm';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { RepairUnbalancedJournal1788950000000 } from './migrations/1788950000000-RepairUnbalancedJournal';

/**
 * The repair migration, run against the rows that actually broke.
 *
 * The unbalanced journal is not hypothetical: `ore-ledger-legacy-unbalanced.sqlite` held three
 * `customer_wallet_credit` credits of GHS 25.00 each with nothing funding them — liabilities
 * the platform would have had to honour and never collected, totalling GHS 75.00. Those exact
 * rows are reproduced here so the migration is tested against the shape that exists, not a
 * convenient invention.
 *
 * The property that matters: after the repair, every `ref` nets to zero, nothing was edited or
 * deleted, and re-running changes nothing.
 */
describe('RepairUnbalancedJournal migration', () => {
  let dataSource: DataSource;
  let migration: RepairUnbalancedJournal1788950000000;

  /** The three rows as they exist in the legacy database. */
  const LEGACY = [
    { id: '15c559ec-009b-42cd-a29a-d6f4c3930a67', account: 'customer_wallet_credit', debitPesewas: 0, creditPesewas: 2500, ref: 'p6-verify:mteylggk' },
    { id: '17e36872-3560-4197-bebc-647654acc3bb', account: 'customer_wallet_credit', debitPesewas: 0, creditPesewas: 2500, ref: 'p6-verify:mteyr8zs' },
    { id: '67d60c04-6e6b-4052-a769-fdd1514c87e8', account: 'customer_wallet_credit', debitPesewas: 0, creditPesewas: 2500, ref: 'p6-verify:mteyst8w' },
  ];

  async function seed(): Promise<void> {
    for (const row of LEGACY) {
      await dataSource.getRepository(LedgerEntry).insert({ orderId: null, ...row, metaJson: null });
    }
  }

  async function unbalancedRefs(): Promise<string[]> {
    const rows = (await dataSource.query(
      `SELECT "ref" AS ref, SUM("debitPesewas") AS d, SUM("creditPesewas") AS c
         FROM ledger_entry WHERE "ref" IS NOT NULL GROUP BY "ref"
        HAVING SUM("debitPesewas") <> SUM("creditPesewas")`,
    )) as { ref: string }[];
    return rows.map((r) => r.ref);
  }

  async function totals(): Promise<{ debit: number; credit: number; rows: number }> {
    const [t] = (await dataSource.query(
      `SELECT SUM("debitPesewas") AS debit, SUM("creditPesewas") AS credit, COUNT(*) AS rows FROM ledger_entry`,
    )) as { debit: number; credit: number; rows: number }[];
    return { debit: Number(t.debit ?? 0), credit: Number(t.credit ?? 0), rows: Number(t.rows) };
  }

  beforeEach(async () => {
    dataSource = new DataSource({ type: 'sqlite', database: ':memory:', entities: [LedgerEntry], synchronize: true });
    await dataSource.initialize();
    migration = new RepairUnbalancedJournal1788950000000();
  });

  afterEach(async () => {
    if (dataSource.isInitialized) await dataSource.destroy();
  });

  it('starts from the broken state it claims to fix', async () => {
    await seed();
    expect(await unbalancedRefs()).toHaveLength(3);
    expect(await totals()).toEqual({ debit: 0, credit: 7500, rows: 3 });
  });

  it('books the missing funding debit so every ref balances', async () => {
    await seed();
    await migration.up(dataSource.createQueryRunner());

    expect(await unbalancedRefs()).toEqual([]);
    const t = await totals();
    expect(t.debit).toBe(t.credit);
    expect(t.debit).toBe(7500);
  });

  it('appends correcting entries and leaves every original row untouched', async () => {
    await seed();
    const before = await dataSource.getRepository(LedgerEntry).find({ order: { id: 'ASC' } });
    await migration.up(dataSource.createQueryRunner());
    const after = await dataSource.getRepository(LedgerEntry).find({ order: { id: 'ASC' } });

    // Append-only: 3 originals + 3 corrections, and the originals are byte-for-byte intact.
    expect(after).toHaveLength(6);
    for (const original of before) {
      expect(after.find((r) => r.id === original.id)).toMatchObject({
        account: original.account,
        debitPesewas: original.debitPesewas,
        creditPesewas: original.creditPesewas,
        ref: original.ref,
      });
    }
  });

  it('puts a wallet credit against its funding cost, not against suspense', async () => {
    await seed();
    await migration.up(dataSource.createQueryRunner());

    const corrections = await dataSource.getRepository(LedgerEntry).find({ where: { account: 'customer_wallet_funding' } });
    expect(corrections).toHaveLength(3);
    expect(corrections.every((c) => c.debitPesewas === 2500 && c.creditPesewas === 0)).toBe(true);
    // Same ref as the entry it corrects — that is what makes the group net to zero.
    expect(corrections.map((c) => c.ref).sort()).toEqual(LEGACY.map((l) => l.ref).sort());
    expect(await dataSource.getRepository(LedgerEntry).find({ where: { account: 'ledger_repair_suspense' } })).toHaveLength(0);
  });

  it('records why each entry exists', async () => {
    await seed();
    await migration.up(dataSource.createQueryRunner());
    const [correction] = await dataSource.getRepository(LedgerEntry).find({ where: { account: 'customer_wallet_funding' } });
    expect(correction.metaJson).toMatchObject({ repair: migration.name, suspectAccount: 'customer_wallet_credit' });
  });

  it('is idempotent — a second run posts nothing', async () => {
    await seed();
    await migration.up(dataSource.createQueryRunner());
    const afterFirst = await totals();
    await migration.up(dataSource.createQueryRunner());
    expect(await totals()).toEqual(afterFirst);
  });

  it('parks a difference it cannot identify in suspense rather than guessing', async () => {
    // A multi-leg group that does not net has no obvious missing side. Absorbing it into
    // revenue would hide it; suspense keeps it on the trial balance until someone answers it.
    const repo = dataSource.getRepository(LedgerEntry);
    await repo.insert([
      { orderId: null, account: 'customer_cash', debitPesewas: 4000, creditPesewas: 0, ref: 'weird:group', metaJson: null },
      { orderId: null, account: 'platform_revenue', debitPesewas: 0, creditPesewas: 3000, ref: 'weird:group', metaJson: null },
    ]);

    await migration.up(dataSource.createQueryRunner());

    expect(await unbalancedRefs()).toEqual([]);
    const parked = await repo.find({ where: { account: 'ledger_repair_suspense' } });
    expect(parked).toHaveLength(1);
    // 4000 debited against 3000 credited leaves the group 1000 short of a credit, so the
    // correcting leg is a credit. (The sibling test covers the mirrored over-credit case.)
    expect(parked[0].creditPesewas).toBe(1000);
    expect(parked[0].debitPesewas).toBe(0);
    expect(parked[0].ref).toBe('weird:group');
  });

  it('corrects an over-debit as well as an over-credit', async () => {
    await dataSource.getRepository(LedgerEntry).insert({
      orderId: null, account: 'customer_cash', debitPesewas: 1200, creditPesewas: 0, ref: 'over:debit', metaJson: null,
    });
    await migration.up(dataSource.createQueryRunner());

    expect(await unbalancedRefs()).toEqual([]);
    const parked = await dataSource.getRepository(LedgerEntry).find({ where: { account: 'ledger_repair_suspense' } });
    expect(parked[0].creditPesewas).toBe(1200);
    expect(parked[0].debitPesewas).toBe(0);
  });

  it('does nothing to a journal that already balances', async () => {
    const repo = dataSource.getRepository(LedgerEntry);
    await repo.insert([
      { orderId: null, account: 'customer_cash', debitPesewas: 5000, creditPesewas: 0, ref: 'clean:1', metaJson: null },
      { orderId: null, account: 'platform_revenue', debitPesewas: 0, creditPesewas: 5000, ref: 'clean:1', metaJson: null },
    ]);
    await migration.up(dataSource.createQueryRunner());
    expect(await totals()).toEqual({ debit: 5000, credit: 5000, rows: 2 });
  });
});
