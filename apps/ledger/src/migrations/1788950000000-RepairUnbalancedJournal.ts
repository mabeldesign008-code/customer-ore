import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import { journalTable } from '../journal-invariants';

/**
 * Repair the journal rows that were posted before the balance gate existed.
 *
 * History: `LedgerService.post()` wrote one journal row at a time with nothing checking that
 * a transaction's legs summed to zero, and 19 call sites used it to record money on one side
 * only. The most common shape was a wallet credit — a liability we owe a customer — booked
 * with no cost against it. Those rows are still in the journal, and the journal is what
 * payouts are computed from, so a liability with no cost behind it is money the platform can
 * be asked for and never collected.
 *
 * This migration does NOT edit or delete them. `ledger_entry` is append-only, and more to the
 * point editing a posted row destroys the evidence of what the code actually did. Each broken
 * transaction gets a balancing leg appended under the SAME `ref`, which is the standard
 * correcting entry: the original stays, the correction sits beside it, and the group now nets
 * to zero.
 *
 * Choosing the other side of the entry:
 *  - A `customer_wallet_credit` that was credited with nothing funding it gets its cost booked
 *    to `customer_wallet_funding`. The customer really did receive that credit, so the
 *    liability is genuine — what was missing is the cost, not the credit.
 *  - Anything else goes to `ledger_repair_suspense`, a CONTROL account flagged
 *    `mustNetToZero`. Parking an unexplained difference in a visible suspense account is
 *    deliberate: it shows up on the trial balance until an accountant reclassifies it, rather
 *    than being quietly absorbed into revenue, which is how an error becomes invisible.
 *
 * Idempotent by construction: it only acts on refs that currently do not balance, so a second
 * run finds none.
 */
export class RepairUnbalancedJournal1788950000000 implements MigrationInterface {
  name = 'RepairUnbalancedJournal1788950000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const driver = queryRunner.connection.options.type as string;
    const table = journalTable(driver);
    const isSqlite = driver === 'sqlite' || driver === 'better-sqlite3' || driver === 'sqljs';
    // Postgres takes $1..$n; SQLite takes ?. Same query, rewritten at the boundary.
    const run = (sql: string, params: unknown[] = []): Promise<unknown> =>
      queryRunner.query(isSqlite ? sql.replace(/\$\d+/g, '?') : sql, params);

    // Every ref whose debits and credits disagree.
    const unbalanced = (await queryRunner.query(
      `SELECT "ref" AS ref,
              SUM("debitPesewas")  AS total_debit,
              SUM("creditPesewas") AS total_credit,
              COUNT(*)             AS legs
         FROM ${table}
        WHERE "ref" IS NOT NULL
        GROUP BY "ref"
       HAVING SUM("debitPesewas") <> SUM("creditPesewas")`,
    )) as { ref: string; total_debit: number; total_credit: number; legs: number }[];

    if (unbalanced.length === 0) return;

    for (const group of unbalanced) {
      const net = Number(group.total_debit) - Number(group.total_credit);
      if (net === 0) continue;

      // A single-leg group is the known one-sided shape, so the missing side is identifiable.
      // A multi-leg group that does not net is not something this migration should guess at.
      const suspect =
        Number(group.legs) === 1
          ? ((await run(`SELECT account FROM ${table} WHERE "ref" = $1 LIMIT 1`, [
              group.ref,
            ])) as { account: string }[])[0]?.account
          : undefined;

      const counterparty =
        suspect === 'customer_wallet_credit' ? 'customer_wallet_funding' : 'ledger_repair_suspense';

      // net < 0 means the group is short a debit (the wallet-credit case).
      const debitPesewas = net < 0 ? -net : 0;
      const creditPesewas = net > 0 ? net : 0;

      const meta = JSON.stringify({
        repair: this.name,
        correctedRef: group.ref,
        missingDebitPesewas: net < 0 ? -net : 0,
        missingCreditPesewas: net > 0 ? net : 0,
        suspectAccount: suspect ?? null,
        reason:
          suspect === 'customer_wallet_credit'
            ? 'Wallet credit was posted with no funding debit against it.'
            : 'Group did not balance and its missing side could not be identified; parked in suspense for reclassification.',
      });

      await run(
        `INSERT INTO ${table} (id, "orderId", account, "debitPesewas", "creditPesewas", "ref", "metaJson", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [randomUUID(), null, counterparty, debitPesewas, creditPesewas, group.ref, meta, new Date()],
      );
    }

    // Prove it, rather than assuming: nothing may still be unbalanced once we are done.
    const remaining = (await run(
      `SELECT COUNT(*) AS n FROM (
         SELECT "ref" FROM ${table}
          WHERE "ref" IS NOT NULL
          GROUP BY "ref"
         HAVING SUM("debitPesewas") <> SUM("creditPesewas")
       ) AS still_broken`,
    )) as { n: number }[];

    if (Number(remaining[0]?.n ?? 0) !== 0) {
      throw new Error(
        `RepairUnbalancedJournal left ${remaining[0]?.n} ref(s) unbalanced — rolling back rather than ` +
        'leaving a journal that does not balance.',
      );
    }
  }

  public async down(): Promise<void> {
    // No down by design. `down` would have to delete the correcting legs, and `ledger_entry`
    // is append-only — that is the whole point of the table. A repair that turned out to be
    // wrong is itself corrected with a further reversing entry, never by removal.
  }
}
