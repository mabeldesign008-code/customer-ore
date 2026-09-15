import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Accounting tables: chart of accounts, closed periods, and the adjustment workflow.
 *
 * `UNIQUE("name")` on `chart_account` is what stops two admins mapping one internal
 * ledger account to two different accountant-facing codes. `UNIQUE("code")` stops the
 * opposite bug: two ledger accounts sharing one chart code. `UNIQUE("year","month")`
 * means a period can only ever be closed once, and `UNIQUE("executionRef")` stops a
 * retry after a crash from posting the same correction twice.
 */
export class AddAccounting1788600000000 implements MigrationInterface {
  name = 'AddAccounting1788600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const driver = queryRunner.connection.options.type;
    const isSqlite = driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs';
    const schema = 'ledger';
    if (!isSqlite) await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);

    const q = (name: string) => (isSqlite ? `"${name}"` : `"${schema}"."${name}"`);
    const timestamp = isSqlite ? 'datetime' : 'timestamp';
    const boolDefault = (value: boolean) => (isSqlite ? (value ? '1' : '0') : value ? 'true' : 'false');
    const pk = isSqlite ? 'varchar PRIMARY KEY' : 'uuid PRIMARY KEY DEFAULT uuid_generate_v4()';

    const hasTable = async (name: string): Promise<boolean> => {
      const rows = await queryRunner.query(
        isSqlite
          ? `SELECT name FROM sqlite_master WHERE type='table' AND name='${name}'`
          : `SELECT table_name FROM information_schema.tables WHERE table_schema='${schema}' AND table_name='${name}'`,
      );
      return (rows as unknown[]).length > 0;
    };
    const hasIndex = async (name: string): Promise<boolean> => {
      const rows = await queryRunner.query(
        isSqlite
          ? `SELECT name FROM sqlite_master WHERE type='index' AND name='${name}'`
          : `SELECT indexname FROM pg_indexes WHERE schemaname='${schema}' AND indexname='${name}'`,
      );
      return (rows as unknown[]).length > 0;
    };

    if (!(await hasTable('chart_account'))) {
      await queryRunner.query(`
        CREATE TABLE ${q('chart_account')} (
          "id" ${pk},
          "name" varchar NOT NULL,
          "code" varchar NOT NULL,
          "label" varchar NOT NULL,
          "nature" varchar NOT NULL DEFAULT 'CONTROL',
          "normalSide" varchar NOT NULL DEFAULT 'DEBIT',
          "mustNetToZero" boolean NOT NULL DEFAULT ${boolDefault(false)},
          "note" text,
          "updatedBy" varchar,
          "createdAt" ${timestamp} NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" ${timestamp} NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    if (!(await hasTable('accounting_period'))) {
      await queryRunner.query(`
        CREATE TABLE ${q('accounting_period')} (
          "id" ${pk},
          "year" integer NOT NULL,
          "month" integer NOT NULL,
          "label" varchar NOT NULL,
          "lockedBy" varchar,
          "reason" varchar,
          "trialBalanceJson" text,
          "netDebitPesewas" integer NOT NULL DEFAULT 0,
          "netCreditPesewas" integer NOT NULL DEFAULT 0,
          "balanced" boolean NOT NULL DEFAULT ${boolDefault(false)},
          "lockedAt" ${timestamp} NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    if (!(await hasTable('adjustment_request'))) {
      await queryRunner.query(`
        CREATE TABLE ${q('adjustment_request')} (
          "id" ${pk},
          "ref" varchar,
          "status" varchar NOT NULL DEFAULT 'PROPOSED',
          "proposedBy" varchar,
          "decidedBy" varchar,
          "reason" text NOT NULL,
          "reversesRef" varchar,
          "orderId" varchar,
          "entriesJson" text NOT NULL,
          "amountPesewas" integer NOT NULL DEFAULT 0,
          "correctsPeriod" varchar,
          "executionRef" varchar,
          "executionNote" varchar,
          "createdAt" ${timestamp} NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "decidedAt" ${timestamp},
          "executedAt" ${timestamp}
        )
      `);
    }

    if (!(await hasIndex('UQ_chart_account_name'))) {
      await queryRunner.query(`CREATE UNIQUE INDEX "UQ_chart_account_name" ON ${q('chart_account')} ("name")`);
    }
    if (!(await hasIndex('UQ_chart_account_code'))) {
      await queryRunner.query(`CREATE UNIQUE INDEX "UQ_chart_account_code" ON ${q('chart_account')} ("code")`);
    }
    if (!(await hasIndex('UQ_accounting_period_year_month'))) {
      await queryRunner.query(`CREATE UNIQUE INDEX "UQ_accounting_period_year_month" ON ${q('accounting_period')} ("year", "month")`);
    }
    if (!(await hasIndex('IDX_adjustment_request_status_created'))) {
      await queryRunner.query(`CREATE INDEX "IDX_adjustment_request_status_created" ON ${q('adjustment_request')} ("status", "createdAt")`);
    }
    if (!(await hasIndex('UQ_adjustment_request_execution_ref'))) {
      await queryRunner.query(`CREATE UNIQUE INDEX "UQ_adjustment_request_execution_ref" ON ${q('adjustment_request')} ("executionRef")`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const driver = queryRunner.connection.options.type;
    const isSqlite = driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs';
    const q = (name: string) => (isSqlite ? `"${name}"` : `"ledger"."${name}"`);
    await queryRunner.query(`DROP TABLE IF EXISTS ${q('adjustment_request')}`);
    await queryRunner.query(`DROP TABLE IF EXISTS ${q('accounting_period')}`);
    await queryRunner.query(`DROP TABLE IF EXISTS ${q('chart_account')}`);
  }
}
