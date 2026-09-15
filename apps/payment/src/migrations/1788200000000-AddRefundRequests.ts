import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The refund request queue: a refund that has been asked for but not paid.
 *
 * Splits `finance.refund.approve` from raising, so asking and approving cannot be the
 * same person. Idempotent, matching the other migrations here.
 */
export class AddRefundRequests1788200000000 implements MigrationInterface {
  name = 'AddRefundRequests1788200000000';

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
    const q = (t: string) => (isSqlite ? `"${t}"` : `"payment"."${t}"`);
    if (!isSqlite) await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "payment"`);

    const hasTable = async (name: string): Promise<boolean> => {
      const rows = await queryRunner.query(
        isSqlite
          ? `SELECT name FROM sqlite_master WHERE type='table' AND name='${name}'`
          : `SELECT table_name FROM information_schema.tables WHERE table_schema='payment' AND table_name='${name}'`,
      );
      return (rows as unknown[]).length > 0;
    };

    if (!(await hasTable('refund_request'))) {
      await queryRunner.query(`
        CREATE TABLE ${q('refund_request')} (
          "id" varchar PRIMARY KEY,
          "orderId" varchar NOT NULL,
          "amountPesewas" integer NOT NULL,
          "reason" text NOT NULL,
          "raisedBy" varchar NOT NULL DEFAULT 'admin',
          "raisedByUserId" varchar,
          "status" varchar NOT NULL DEFAULT 'PENDING',
          "decidedBy" varchar,
          "decidedAt" ${tsType},
          "decisionNote" text,
          "approvalId" varchar,
          "executionRef" varchar,
          "refundId" varchar,
          "failureReason" text,
          "createdAt" ${tsType} NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" ${tsType} NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    const hasIndex = async (name: string): Promise<boolean> => {
      const rows = await queryRunner.query(
        isSqlite
          ? `SELECT name FROM sqlite_master WHERE type='index' AND name='${name}'`
          : `SELECT indexname FROM pg_indexes WHERE schemaname='payment' AND indexname='${name}'`,
      );
      return (rows as unknown[]).length > 0;
    };

    if (!(await hasIndex('IDX_refund_request_status_created'))) {
      await queryRunner.query(`CREATE INDEX "IDX_refund_request_status_created" ON ${q('refund_request')} ("status", "createdAt")`);
    }
    if (!(await hasIndex('IDX_refund_request_order'))) {
      await queryRunner.query(`CREATE INDEX "IDX_refund_request_order" ON ${q('refund_request')} ("orderId")`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {

    const driver = queryRunner.connection.options.type;

    const isSqlite = driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs';

    const q = (t: string) => (isSqlite ? `"${t}"` : `"payment"."${t}"`);
    await queryRunner.query(`DROP TABLE IF EXISTS ${q('refund_request')}`);
  }
}
