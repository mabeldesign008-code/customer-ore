import { MigrationInterface, QueryRunner } from 'typeorm';

/** Supplier tax profile fields for WHT classification of Ore-paid vendor incentives. */
export class AddVendorTaxProfile1789500000004 implements MigrationInterface {
  name = 'AddVendorTaxProfile1789500000004';

  async up(queryRunner: QueryRunner): Promise<void> {
    const driver = queryRunner.connection.options.type;
    const isSqlite = driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs';
    const schema = 'catalog';
    if (!isSqlite) await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);

    const table = isSqlite ? 'vendor' : `${schema}.vendor`;
    const q = isSqlite ? '"vendor"' : `"${schema}"."vendor"`;
    const hasTable = await queryRunner.hasTable(table);
    if (!hasTable) return;

    const existing = await queryRunner.getTable(table);
    const hasColumn = (name: string) => !!existing?.columns.some((column) => column.name === name);

    if (!hasColumn('taxResidentStatus')) {
      await queryRunner.query(`ALTER TABLE ${q} ADD COLUMN "taxResidentStatus" varchar NOT NULL DEFAULT 'UNKNOWN'`);
    }
    if (!hasColumn('taxIdentificationNumber')) {
      await queryRunner.query(`ALTER TABLE ${q} ADD COLUMN "taxIdentificationNumber" varchar`);
    }
    if (!hasColumn('taxProfileJson')) {
      await queryRunner.query(`ALTER TABLE ${q} ADD COLUMN "taxProfileJson" text`);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const driver = queryRunner.connection.options.type;
    const isSqlite = driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs';
    const table = isSqlite ? 'vendor' : 'catalog.vendor';
    if (!(await queryRunner.hasTable(table))) return;
    const existing = await queryRunner.getTable(table);
    for (const column of ['taxProfileJson', 'taxIdentificationNumber', 'taxResidentStatus']) {
      if (existing?.columns.some((c) => c.name === column)) await queryRunner.dropColumn(table, column);
    }
  }
}
