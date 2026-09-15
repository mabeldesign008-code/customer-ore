import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentProcessorRecords1789500000001 implements MigrationInterface {
  name = 'AddPaymentProcessorRecords1789500000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const driver = queryRunner.connection.options.type;
    const isSqlite = driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs';
    const schema = 'payment';
    if (!isSqlite) await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);

    const q = (name: string) => (isSqlite ? `"${name}"` : `"${schema}"."${name}"`);
    const timestamp = isSqlite ? 'datetime' : 'timestamp';
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
    const hasColumn = async (table: string, column: string): Promise<boolean> => {
      const rows = await queryRunner.query(
        isSqlite
          ? `PRAGMA table_info("${table}")`
          : `SELECT column_name AS name FROM information_schema.columns WHERE table_schema='${schema}' AND table_name='${table}'`,
      ) as { name: string }[];
      return rows.some((row) => row.name === column);
    };

    if (!(await hasTable('payment_processor_record'))) {
      await queryRunner.query(`
        CREATE TABLE ${q('payment_processor_record')} (
          "id" ${pk},
          "paymentProcessor" varchar NOT NULL DEFAULT 'PAYSTACK',
          "checkoutPaymentId" varchar,
          "checkoutId" varchar,
          "orderId" varchar,
          "paystackTransactionId" varchar,
          "paystackSplitId" varchar,
          "paymentStatus" varchar NOT NULL DEFAULT 'INITIATED',
          "splitStatus" varchar NOT NULL DEFAULT 'NOT_SPLIT',
          "vendorAllocationPesewas" integer NOT NULL DEFAULT 0,
          "deliveryPartnerAllocationPesewas" integer NOT NULL DEFAULT 0,
          "fleetDeliveryPartnerAllocationPesewas" integer NOT NULL DEFAULT 0,
          "oreAllocationPesewas" integer NOT NULL DEFAULT 0,
          "processorFeePesewas" integer NOT NULL DEFAULT 0,
          "refundStatus" varchar NOT NULL DEFAULT 'NONE',
          "settlementStatus" varchar NOT NULL DEFAULT 'PENDING_ORDER_OUTCOME',
          "allocationJson" text,
          "createdAt" ${timestamp} NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" ${timestamp} NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    if (await hasTable('refund')) {
      if (!(await hasColumn('refund', 'originalTransactionId'))) await queryRunner.query(`ALTER TABLE ${q('refund')} ADD COLUMN "originalTransactionId" varchar`);
      if (!(await hasColumn('refund', 'refundComponent'))) await queryRunner.query(`ALTER TABLE ${q('refund')} ADD COLUMN "refundComponent" varchar NOT NULL DEFAULT 'UNSPECIFIED'`);
      if (!(await hasColumn('refund', 'originalTaxStatus'))) await queryRunner.query(`ALTER TABLE ${q('refund')} ADD COLUMN "originalTaxStatus" varchar NOT NULL DEFAULT 'UNKNOWN'`);
      if (!(await hasColumn('refund', 'taxPeriodStatus'))) await queryRunner.query(`ALTER TABLE ${q('refund')} ADD COLUMN "taxPeriodStatus" varchar NOT NULL DEFAULT 'OPEN'`);
      if (!(await hasColumn('refund', 'settlementStatus'))) await queryRunner.query(`ALTER TABLE ${q('refund')} ADD COLUMN "settlementStatus" varchar NOT NULL DEFAULT 'PENDING'`);
      if (!(await hasColumn('refund', 'approvalStatus'))) await queryRunner.query(`ALTER TABLE ${q('refund')} ADD COLUMN "approvalStatus" varchar NOT NULL DEFAULT 'APPROVED'`);
    }
    if (await hasTable('refund_request')) {
      if (!(await hasColumn('refund_request', 'refundComponent'))) await queryRunner.query(`ALTER TABLE ${q('refund_request')} ADD COLUMN "refundComponent" varchar NOT NULL DEFAULT 'UNSPECIFIED'`);
      if (!(await hasColumn('refund_request', 'originalTaxStatus'))) await queryRunner.query(`ALTER TABLE ${q('refund_request')} ADD COLUMN "originalTaxStatus" varchar NOT NULL DEFAULT 'UNKNOWN'`);
      if (!(await hasColumn('refund_request', 'taxPeriodStatus'))) await queryRunner.query(`ALTER TABLE ${q('refund_request')} ADD COLUMN "taxPeriodStatus" varchar NOT NULL DEFAULT 'OPEN'`);
    }

    const indexes: Array<[string, string]> = [
      ['IDX_payment_processor_checkout', `CREATE INDEX "IDX_payment_processor_checkout" ON ${q('payment_processor_record')} ("checkoutId")`],
      ['IDX_payment_processor_order', `CREATE INDEX "IDX_payment_processor_order" ON ${q('payment_processor_record')} ("orderId")`],
      ['IDX_payment_processor_paystack_tx', `CREATE INDEX "IDX_payment_processor_paystack_tx" ON ${q('payment_processor_record')} ("paystackTransactionId")`],
      ['IDX_payment_processor_status', `CREATE INDEX "IDX_payment_processor_status" ON ${q('payment_processor_record')} ("paymentStatus", "settlementStatus")`],
    ];
    for (const [name, sql] of indexes) {
      if (!(await hasIndex(name))) await queryRunner.query(sql);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const driver = queryRunner.connection.options.type;
    const isSqlite = driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs';
    const q = (name: string) => (isSqlite ? `"${name}"` : `"payment"."${name}"`);
    await queryRunner.query(`DROP TABLE IF EXISTS ${q('payment_processor_record')}`);
  }
}
