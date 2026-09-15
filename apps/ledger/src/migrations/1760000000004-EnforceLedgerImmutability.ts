import { MigrationInterface, QueryRunner } from 'typeorm';
import { journalInvariantDdl, journalInvariantDropDdl } from '../journal-invariants';

/**
 * L6 — ledger correctness.
 *
 * Makes the ledger's two invariants properties of the database:
 *
 *   1. APPEND-ONLY — a posted `ledger_entry` row can never be updated or deleted.
 *      Corrections are reversing entries, so both the original and its correction stay
 *      visible. Audit is structural, not a separate log somebody remembers to write.
 *   2. BALANCED — for any `ref`, total debits equal total credits. Enforced by a DEFERRED
 *      constraint trigger, so it is checked at commit rather than after each leg.
 *
 * This matters because everything that pays out reads this table: rider payouts, vendor
 * settlements and customer refunds are all driven straight off it. A ledger that can be
 * edited, or that can hold a transaction which does not sum to zero, is a ledger that will
 * eventually pay out money that was never collected.
 *
 * An escape hatch exists for genuine data repair (Postgres): a member of the
 * `ore_ledger_maintenance` role may set `LOCAL ore.ledger_maintenance = 'on'` for one
 * transaction. It is NOLOGIN, grants nothing, and only relaxes these two triggers — an
 * operator has to be handed the role by a DBA before it means anything.
 *
 * Idempotent: the DDL is `IF NOT EXISTS` on SQLite and `CREATE OR REPLACE` / `DROP IF
 * EXISTS` on Postgres, so re-running it is harmless. The same DDL is also applied at boot
 * by `LedgerService.init()` — see `journal-invariants.ts`, the single source of truth —
 * because migrations only run in production.
 */
export class EnforceLedgerImmutability1760000000004 implements MigrationInterface {
  name = 'EnforceLedgerImmutability1760000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const driver = queryRunner.connection.options.type as string;
    for (const sql of journalInvariantDdl(driver)) {
      await queryRunner.query(sql);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const driver = queryRunner.connection.options.type as string;
    for (const sql of journalInvariantDropDdl(driver)) {
      await queryRunner.query(sql);
    }
  }
}
