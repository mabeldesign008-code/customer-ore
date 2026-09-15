import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Account standing on `user`: status, suspension window and reason, who set it, last login,
 * city, marketing consent, and the token epoch.
 *
 * Every column is additive with a default, so existing rows come out ACTIVE and nothing that
 * reads `user` today changes behaviour.
 *
 * `tokenEpoch` is the mechanism behind "revoke their sessions": any check that compares a
 * token's epoch against this column rejects tokens issued before the change, without needing
 * a session table.
 */
export class AddAccountStanding1788500000000 implements MigrationInterface {
  name = 'AddAccountStanding1788500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const driver = queryRunner.connection.options.type;
    const isSqlite = driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs';
    // sqlite spells it `datetime`; Postgres has no such type and fails the whole migration.
    // Matches what the entities declare (`@CreateDateColumn` / `Date` → `timestamp`).
    const tsType = isSqlite ? 'datetime' : 'timestamp';
    if (!isSqlite) await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "auth"`);

    const table = 'user';
    const rows = await queryRunner.query(
      isSqlite
        ? `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`
        : `SELECT table_name FROM information_schema.tables WHERE table_schema='auth' AND table_name='${table}'`,
    );
    if ((rows as unknown[]).length === 0) return;

    const existing = new Set<string>();
    if (isSqlite) {
      const cols = (await queryRunner.query(`PRAGMA table_info("${table}")`)) as { name: string }[];
      for (const c of cols) existing.add(c.name);
    } else {
      const cols = (await queryRunner.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema='auth' AND table_name='${table}'`,
      )) as { column_name: string }[];
      for (const c of cols) existing.add(c.column_name);
    }

    // The probes above are schema-aware but the ALTER was not, so on Postgres it resolved
    // against the default search_path and failed.
    const qualified = isSqlite ? `"${table}"` : `"auth"."${table}"`;
    const add = async (name: string, ddl: string) => {
      if (existing.has(name)) return;
      await queryRunner.query(`ALTER TABLE ${qualified} ADD COLUMN "${name}" ${ddl}`);
    };
    // sqlite has no boolean type and takes 0/1; Postgres rejects an integer default on a
    // boolean column.
    const falseDefault = isSqlite ? '0' : 'false';

    await add('status', `varchar NOT NULL DEFAULT 'ACTIVE'`);
    await add('suspendedUntil', tsType);
    await add('suspensionReason', 'text');
    await add('suspendedBy', 'varchar');
    await add('lastLoginAt', tsType);
    await add('city', 'varchar');
    await add('marketingConsent', `boolean NOT NULL DEFAULT ${falseDefault}`);
    await add('tokenEpoch', 'integer NOT NULL DEFAULT 0');

    const hasIndex = async (name: string): Promise<boolean> => {
      const r = await queryRunner.query(
        isSqlite
          ? `SELECT name FROM sqlite_master WHERE type='index' AND name='${name}'`
          : `SELECT indexname FROM pg_indexes WHERE schemaname='auth' AND indexname='${name}'`,
      );
      return (r as unknown[]).length > 0;
    };
    if (!(await hasIndex('IDX_user_status_created'))) {
      await queryRunner.query(`CREATE INDEX "IDX_user_status_created" ON ${qualified} ("status", "createdAt")`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Additive-only and SQLite cannot drop columns portably, so down is a no-op.
    void queryRunner;
  }
}
