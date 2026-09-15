import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The maker-checker approval table.
 *
 * The `UNIQUE("executionRef")` constraint is not an optimisation — it is the DB-level
 * guarantee that one approved request cannot produce two payouts. If a service crashes
 * after the money moved and the request is replayed, this index is what rejects it.
 *
 * Idempotent, matching the other migrations in this app: dev runs `synchronize: true`,
 * so the table may already exist by the time this executes.
 */
export class AddAdminApprovals1788100000000 implements MigrationInterface {
  name = 'AddAdminApprovals1788100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const driver = queryRunner.connection.options.type;
    const isSqlite = driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs';
    // sqlite spells it `datetime`; Postgres has no such type and fails the whole migration.
    // Matches what the entities declare (`@CreateDateColumn` / `Date` → `timestamp`).
    const tsType = isSqlite ? 'datetime' : 'timestamp';
    // Unqualified DDL lands in `public`, not the service's schema — TypeORM's `schema` option
    // does not apply to raw queries. That silently broke schema-per-service and made the
    // `hasTable` probes below (which look in this schema) always false, so the migration was
    // never actually idempotent either. sqlite has no schemas, so the two dialects differ.
    const q = (t: string) => (isSqlite ? `"${t}"` : `"auth"."${t}"`);
    if (!isSqlite) await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "auth"`);

    const hasTable = async (name: string): Promise<boolean> => {
      const rows = await queryRunner.query(
        isSqlite
          ? `SELECT name FROM sqlite_master WHERE type='table' AND name='${name}'`
          : `SELECT table_name FROM information_schema.tables WHERE table_schema='auth' AND table_name='${name}'`,
      );
      return (rows as unknown[]).length > 0;
    };

    if (!(await hasTable('admin_approval'))) {
      await queryRunner.query(`
        CREATE TABLE ${q('admin_approval')} (
          "id" varchar PRIMARY KEY,
          "kind" varchar NOT NULL,
          "permission" varchar NOT NULL,
          "service" varchar NOT NULL,
          "resourceType" varchar,
          "resourceId" varchar,
          "executionRef" varchar NOT NULL,
          "amountPesewas" integer NOT NULL DEFAULT 0,
          "currency" varchar NOT NULL DEFAULT 'GHS',
          "payloadJson" text,
          "payloadHash" varchar NOT NULL,
          "makerUserId" varchar NOT NULL,
          "makerAdminRole" varchar,
          "reason" text,
          "requiredApprovals" integer NOT NULL DEFAULT 1,
          "requiresSuperAdmin" boolean NOT NULL DEFAULT 0,
          "approvalsJson" text,
          "status" varchar NOT NULL DEFAULT 'PENDING',
          "expiresAt" ${tsType} NOT NULL,
          "decidedBy" varchar,
          "decidedAt" ${tsType},
          "executedBy" varchar,
          "executedAt" ${tsType},
          "resultJson" text,
          "failureReason" text,
          "createdAt" ${tsType} NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" ${tsType} NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    // The idempotency guard. Created separately so a partially-migrated table can be
    // completed by re-running this migration rather than requiring a rebuild.
    const hasIndex = async (name: string): Promise<boolean> => {
      const rows = await queryRunner.query(
        isSqlite
          ? `SELECT name FROM sqlite_master WHERE type='index' AND name='${name}'`
          : `SELECT indexname FROM pg_indexes WHERE schemaname='auth' AND indexname='${name}'`,
      );
      return (rows as unknown[]).length > 0;
    };

    if (!(await hasIndex('UQ_admin_approval_execution_ref'))) {
      await queryRunner.query(
        `CREATE UNIQUE INDEX "UQ_admin_approval_execution_ref" ON ${q('admin_approval')} ("executionRef")`,
      );
    }
    if (!(await hasIndex('IDX_admin_approval_status_created'))) {
      await queryRunner.query(
        `CREATE INDEX "IDX_admin_approval_status_created" ON ${q('admin_approval')} ("status", "createdAt")`,
      );
    }
    if (!(await hasIndex('IDX_admin_approval_maker_created'))) {
      await queryRunner.query(
        `CREATE INDEX "IDX_admin_approval_maker_created" ON ${q('admin_approval')} ("makerUserId", "createdAt")`,
      );
    }
    if (!(await hasIndex('IDX_admin_approval_permission_status'))) {
      await queryRunner.query(
        `CREATE INDEX "IDX_admin_approval_permission_status" ON ${q('admin_approval')} ("permission", "status")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {

    const driver = queryRunner.connection.options.type;

    const isSqlite = driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs';

    const q = (t: string) => (isSqlite ? `"${t}"` : `"auth"."${t}"`);
    await queryRunner.query(`DROP TABLE IF EXISTS ${q('admin_approval')}`);
  }
}
