import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Turns a conversation into a ticket: reference, priority, category, tags, the response
 * and resolution clocks, CSAT, and the SLA breach marker.
 *
 * Every column is additive and nullable-or-defaulted, so existing threads keep working
 * and can be read before anything backfills them.
 */
export class AddSupportTickets1788400000000 implements MigrationInterface {
  name = 'AddSupportTickets1788400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const driver = queryRunner.connection.options.type;
    const isSqlite = driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs';
    // sqlite spells it `datetime`; Postgres has no such type and fails the whole migration.
    // Matches what the entities declare (`@CreateDateColumn` / `Date` → `timestamp`).
    const tsType = isSqlite ? 'datetime' : 'timestamp';
    if (!isSqlite) await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "comms"`);

    // Both branches of this ternary used to read 'comms_thread'. On Postgres the raw DDL below
    // then resolved against the default search_path instead of the service's schema and failed
    // outright — invisible under sqlite, which has no schemas.
    const table = isSqlite ? 'comms_thread' : 'comms"."comms_thread';
    const hasTable = async (): Promise<boolean> => {
      const rows = await queryRunner.query(
        isSqlite
          ? `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`
          : `SELECT table_name FROM information_schema.tables WHERE table_schema='comms' AND table_name='${table}'`,
      );
      return (rows as unknown[]).length > 0;
    };
    if (!(await hasTable())) return;

    const existing = new Set<string>();
    if (isSqlite) {
      const cols = (await queryRunner.query(`PRAGMA table_info("${table}")`)) as { name: string }[];
      for (const c of cols) existing.add(c.name);
    } else {
      const cols = (await queryRunner.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema='comms' AND table_name='${table}'`,
      )) as { column_name: string }[];
      for (const c of cols) existing.add(c.column_name);
    }

    const add = async (name: string, ddl: string) => {
      if (existing.has(name)) return;
      await queryRunner.query(`ALTER TABLE "${table}" ADD COLUMN "${name}" ${ddl}`);
    };

    await add('ticketRef', 'varchar');
    await add('priority', `varchar NOT NULL DEFAULT 'normal'`);
    await add('category', 'varchar');
    await add('tagsJson', 'text');
    await add('firstResponseAt', tsType);
    await add('resolvedAt', tsType);
    await add('closedAt', tsType);
    await add('closedBy', 'varchar');
    await add('reopenCount', 'integer NOT NULL DEFAULT 0');
    await add('csatScore', 'integer');
    await add('csatComment', 'text');
    await add('slaDueAt', tsType);
    await add('slaBreachedAt', tsType);

    const hasIndex = async (name: string): Promise<boolean> => {
      const rows = await queryRunner.query(
        isSqlite
          ? `SELECT name FROM sqlite_master WHERE type='index' AND name='${name}'`
          : `SELECT indexname FROM pg_indexes WHERE schemaname='comms' AND indexname='${name}'`,
      );
      return (rows as unknown[]).length > 0;
    };
    if (!(await hasIndex('IDX_comms_thread_sla_due'))) {
      await queryRunner.query(`CREATE INDEX "IDX_comms_thread_sla_due" ON "${table}" ("slaDueAt")`);
    }
    if (!(await hasIndex('IDX_comms_thread_ticket_ref'))) {
      await queryRunner.query(`CREATE INDEX "IDX_comms_thread_ticket_ref" ON "${table}" ("ticketRef")`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // SQLite cannot drop columns before 3.35 and this is additive-only, so down is a no-op.
    // The columns are all nullable or defaulted and nothing reads them if the code reverts.
    void queryRunner;
  }
}
