import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Align chart-account defaults for tax rollout.
 *
 * Some installations may already have run the original accounting migration and seeded
 * system default rows with old codes (`vendor_reserve=2400`, etc.). Tax accounts now use
 * the 2400 range, so this migration moves only system-seeded rows (`updatedBy IS NULL`)
 * out of that range before the application boot seeder inserts VAT/NHIL/GETFund/WHT
 * accounts. Admin-maintained mappings are not overwritten; they remain Finance-owned.
 */
export class AlignAccountingChartForTax1789500000003 implements MigrationInterface {
  name = 'AlignAccountingChartForTax1789500000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const driver = queryRunner.connection.options.type;
    const isSqlite = driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs';
    const schema = 'ledger';
    if (!isSqlite) await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    const q = (name: string) => (isSqlite ? `"${name}"` : `"${schema}"."${name}"`);
    const idx = (name: string) => (isSqlite ? `"${name}"` : `"${schema}"."${name}"`);
    const param = (position: number) => (isSqlite ? '?' : `$${position}`);
    const falseValue = isSqlite ? '0' : 'false';

    const hasTable = async (name: string): Promise<boolean> => {
      const rows = await queryRunner.query(
        isSqlite
          ? `SELECT name FROM sqlite_master WHERE type='table' AND name='${name}'`
          : `SELECT table_name FROM information_schema.tables WHERE table_schema='${schema}' AND table_name='${name}'`,
      );
      return (rows as unknown[]).length > 0;
    };
    if (!(await hasTable('chart_account'))) return;

    const hasIndex = async (name: string): Promise<boolean> => {
      const rows = await queryRunner.query(
        isSqlite
          ? `SELECT name FROM sqlite_master WHERE type='index' AND name='${name}'`
          : `SELECT indexname FROM pg_indexes WHERE schemaname='${schema}' AND indexname='${name}'`,
      );
      return (rows as unknown[]).length > 0;
    };

    const codeFreeFor = async (accountName: string, code: string): Promise<boolean> => {
      const rows = await queryRunner.query(
        `SELECT "name" FROM ${q('chart_account')} WHERE "code" = ${param(1)} AND "name" <> ${param(2)} LIMIT 1`,
        [code, accountName],
      );
      return (rows as unknown[]).length === 0;
    };

    const moveSystemDefault = async (accountName: string, code: string, label: string, nature: string, normalSide: string, note: string): Promise<void> => {
      if (!(await codeFreeFor(accountName, code))) return;
      await queryRunner.query(
        `UPDATE ${q('chart_account')}
           SET "code" = ${param(1)}, "label" = ${param(2)}, "nature" = ${param(3)}, "normalSide" = ${param(4)}, "mustNetToZero" = ${falseValue}, "note" = ${param(5)}, "updatedAt" = CURRENT_TIMESTAMP
         WHERE "name" = ${param(6)} AND "updatedBy" IS NULL`,
        [code, label, nature, normalSide, note, accountName],
      );
    };

    await moveSystemDefault('errand_escrow', '2520', 'Errand budget held in escrow', 'LIABILITY', 'CREDIT', 'Customer budget for an errand, held until the errand is delivered or aborted.');
    await moveSystemDefault('vendor_withdrawal_held', '2510', 'Vendor withdrawals in flight', 'LIABILITY', 'CREDIT', 'Requested but not yet paid. Cleared when the payout lands or the attempt fails.');
    await moveSystemDefault('vendor_reserve', '2500', 'Vendor rolling reserve held', 'LIABILITY', 'CREDIT', 'The slice of vendor earnings held back each cycle. Releasing it moves it into a settlement payable.');
    await moveSystemDefault('platform_revenue', '4000', 'Platform revenue — net of VAT/levies', 'REVENUE', 'CREDIT', 'Only Ore-owned consideration after tax extraction. Vendor product value, DP earnings and fleet settlements are pass-through, not revenue.');
    await moveSystemDefault('customer_funds_held', '2105', 'Customer funds awaiting final allocation', 'LIABILITY', 'CREDIT', 'Controlled-split hold. Paystack capture lands here until order outcome, tax classification and settlement allocation are resolved.');

    const duplicates = await queryRunner.query(`
      SELECT "code", COUNT(*) AS count
        FROM ${q('chart_account')}
       GROUP BY "code"
      HAVING COUNT(*) > 1
      LIMIT 1
    `);
    if ((duplicates as unknown[]).length === 0) {
      if (await hasIndex('IDX_chart_account_code')) {
        await queryRunner.query(`DROP INDEX ${idx('IDX_chart_account_code')}`);
      }
      if (!(await hasIndex('UQ_chart_account_code'))) {
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_chart_account_code" ON ${q('chart_account')} ("code")`);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const driver = queryRunner.connection.options.type;
    const isSqlite = driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs';
    const q = (name: string) => (isSqlite ? `"${name}"` : `"ledger"."${name}"`);
    const idx = (name: string) => (isSqlite ? `"${name}"` : `"ledger"."${name}"`);
    const hasTable = async (name: string): Promise<boolean> => {
      const rows = await queryRunner.query(
        isSqlite
          ? `SELECT name FROM sqlite_master WHERE type='table' AND name='${name}'`
          : `SELECT table_name FROM information_schema.tables WHERE table_schema='ledger' AND table_name='${name}'`,
      );
      return (rows as unknown[]).length > 0;
    };
    if (!(await hasTable('chart_account'))) return;
    const hasIndex = async (name: string): Promise<boolean> => {
      const rows = await queryRunner.query(
        isSqlite
          ? `SELECT name FROM sqlite_master WHERE type='index' AND name='${name}'`
          : `SELECT indexname FROM pg_indexes WHERE schemaname='ledger' AND indexname='${name}'`,
      );
      return (rows as unknown[]).length > 0;
    };
    if (await hasIndex('UQ_chart_account_code')) {
      await queryRunner.query(`DROP INDEX ${idx('UQ_chart_account_code')}`);
    }
    if (!(await hasIndex('IDX_chart_account_code'))) {
      await queryRunner.query(`CREATE INDEX "IDX_chart_account_code" ON ${q('chart_account')} ("code")`);
    }
  }
}
