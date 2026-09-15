import { MigrationInterface, QueryRunner } from 'typeorm';

/** Tax Engine persistence: versioned rules, component classifications, WHT decisions,
 * ORE_TAX_LEDGER, and review queue. Paystack fields stay reconciliation-only. */
export class AddTaxEngine1789500000000 implements MigrationInterface {
  name = 'AddTaxEngine1789500000000';

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
    const hasColumn = async (table: string, column: string): Promise<boolean> => {
      const rows = await queryRunner.query(
        isSqlite
          ? `PRAGMA table_info("${table}")`
          : `SELECT column_name AS name FROM information_schema.columns WHERE table_schema='${schema}' AND table_name='${table}'`,
      ) as { name: string }[];
      return rows.some((row) => row.name === column);
    };

    if (!(await hasTable('tax_rule'))) {
      await queryRunner.query(`
        CREATE TABLE ${q('tax_rule')} (
          "id" ${pk},
          "ruleId" varchar NOT NULL,
          "taxType" varchar NOT NULL,
          "supplierType" varchar,
          "payerType" varchar,
          "payeeType" varchar,
          "residentStatus" varchar,
          "transactionType" varchar,
          "contractType" varchar,
          "thresholdType" varchar,
          "thresholdAmountPesewas" integer,
          "rateBps" integer NOT NULL,
          "taxBase" varchar NOT NULL DEFAULT 'TAXABLE_AMOUNT',
          "effectiveFrom" ${timestamp} NOT NULL,
          "effectiveTo" ${timestamp},
          "exemption" boolean NOT NULL DEFAULT ${boolDefault(false)},
          "certificateRequired" boolean NOT NULL DEFAULT ${boolDefault(false)},
          "active" boolean NOT NULL DEFAULT ${boolDefault(true)},
          "version" integer NOT NULL DEFAULT 1,
          "updatedBy" varchar,
          "createdAt" ${timestamp} NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" ${timestamp} NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    if (!(await hasTable('tax_transaction'))) {
      await queryRunner.query(`
        CREATE TABLE ${q('tax_transaction')} (
          "id" ${pk},
          "transactionId" varchar NOT NULL,
          "orderId" varchar,
          "componentType" varchar NOT NULL,
          "payerType" varchar,
          "payerId" varchar,
          "payeeType" varchar,
          "payeeId" varchar,
          "supplierType" varchar,
          "supplierId" varchar,
          "customerId" varchar,
          "grossAmountPesewas" integer NOT NULL,
          "taxableAmountPesewas" integer NOT NULL DEFAULT 0,
          "taxCategory" varchar,
          "revenueOwner" varchar,
          "paymentProcessor" varchar,
          "settlementMethod" varchar,
          "contractType" varchar,
          "transactionType" varchar,
          "residentStatus" varchar,
          "classificationStatus" varchar NOT NULL DEFAULT 'REVIEW_REQUIRED',
          "whtStatus" varchar NOT NULL DEFAULT 'REVIEW_REQUIRED',
          "vatStatus" varchar NOT NULL DEFAULT 'REVIEW_REQUIRED',
          "reviewReason" text,
          "metadataJson" text,
          "createdAt" ${timestamp} NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    if (!(await hasTable('wht_decision'))) {
      await queryRunner.query(`
        CREATE TABLE ${q('wht_decision')} (
          "id" ${pk},
          "transactionId" varchar NOT NULL,
          "orderId" varchar,
          "componentType" varchar NOT NULL,
          "ruleId" varchar,
          "whtStatus" varchar NOT NULL,
          "supplierId" varchar,
          "supplierType" varchar,
          "payerType" varchar,
          "payeeType" varchar,
          "transactionType" varchar,
          "contractType" varchar,
          "residentStatus" varchar,
          "taxYear" integer,
          "currentTransactionAmountPesewas" integer NOT NULL DEFAULT 0,
          "priorCumulativeAmountPesewas" integer NOT NULL DEFAULT 0,
          "postTransactionCumulativeAmountPesewas" integer NOT NULL DEFAULT 0,
          "thresholdType" varchar,
          "thresholdAmountPesewas" integer,
          "thresholdReachedFlag" boolean NOT NULL DEFAULT ${boolDefault(false)},
          "thresholdTriggerTransactionId" varchar,
          "rateBps" integer NOT NULL DEFAULT 0,
          "taxBasePesewas" integer NOT NULL DEFAULT 0,
          "whtAmountPesewas" integer NOT NULL DEFAULT 0,
          "certificateRequired" boolean NOT NULL DEFAULT ${boolDefault(false)},
          "certificateNumber" varchar,
          "reviewReason" varchar,
          "createdAt" ${timestamp} NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    if (await hasTable('tax_rule')) {
      if (!(await hasColumn('tax_rule', 'payeeType'))) await queryRunner.query(`ALTER TABLE ${q('tax_rule')} ADD COLUMN "payeeType" varchar`);
      if (!(await hasColumn('tax_rule', 'contractType'))) await queryRunner.query(`ALTER TABLE ${q('tax_rule')} ADD COLUMN "contractType" varchar`);
    }
    if (await hasTable('wht_decision')) {
      if (!(await hasColumn('wht_decision', 'contractType'))) await queryRunner.query(`ALTER TABLE ${q('wht_decision')} ADD COLUMN "contractType" varchar`);
      if (!(await hasColumn('wht_decision', 'residentStatus'))) await queryRunner.query(`ALTER TABLE ${q('wht_decision')} ADD COLUMN "residentStatus" varchar`);
    }

    if (!(await hasTable('ore_tax_ledger'))) {
      await queryRunner.query(`
        CREATE TABLE ${q('ore_tax_ledger')} (
          "taxTransactionId" ${pk},
          "orderId" varchar,
          "invoiceId" varchar,
          "partyId" varchar,
          "taxType" varchar NOT NULL,
          "taxCategory" varchar NOT NULL,
          "taxableValuePesewas" integer NOT NULL,
          "taxRateBps" integer NOT NULL,
          "taxAmountPesewas" integer NOT NULL,
          "taxPeriod" varchar NOT NULL,
          "transactionDate" ${timestamp} NOT NULL,
          "sourceTransaction" varchar NOT NULL,
          "sourceComponent" varchar,
          "ruleId" varchar,
          "reversalReference" varchar,
          "paymentStatus" varchar NOT NULL DEFAULT 'CONFIRMED',
          "filingStatus" varchar NOT NULL DEFAULT 'OPEN',
          "certificateNumber" varchar,
          "metaJson" text,
          "createdAt" ${timestamp} NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    if (!(await hasTable('tax_review_case'))) {
      await queryRunner.query(`
        CREATE TABLE ${q('tax_review_case')} (
          "id" ${pk},
          "transactionId" varchar NOT NULL,
          "orderId" varchar,
          "componentType" varchar,
          "reasonCode" varchar NOT NULL,
          "reason" text NOT NULL,
          "status" varchar NOT NULL DEFAULT 'OPEN',
          "assignedTo" varchar,
          "resolvedBy" varchar,
          "resolvedAt" ${timestamp},
          "resolutionNote" text,
          "payloadJson" text,
          "createdAt" ${timestamp} NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" ${timestamp} NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    const indexes: Array<[string, string]> = [
      ['UQ_tax_rule_rule_id', `CREATE UNIQUE INDEX "UQ_tax_rule_rule_id" ON ${q('tax_rule')} ("ruleId")`],
      ['IDX_tax_rule_type_active_from', `CREATE INDEX "IDX_tax_rule_type_active_from" ON ${q('tax_rule')} ("taxType", "active", "effectiveFrom")`],
      ['IDX_tax_transaction_tx_component', `CREATE INDEX "IDX_tax_transaction_tx_component" ON ${q('tax_transaction')} ("transactionId", "componentType")`],
      ['IDX_tax_transaction_order', `CREATE INDEX "IDX_tax_transaction_order" ON ${q('tax_transaction')} ("orderId")`],
      ['IDX_tax_transaction_revenue_owner', `CREATE INDEX "IDX_tax_transaction_revenue_owner" ON ${q('tax_transaction')} ("revenueOwner")`],
      ['IDX_tax_transaction_status_created', `CREATE INDEX "IDX_tax_transaction_status_created" ON ${q('tax_transaction')} ("classificationStatus", "createdAt")`],
      ['IDX_wht_decision_tx_component', `CREATE INDEX "IDX_wht_decision_tx_component" ON ${q('wht_decision')} ("transactionId", "componentType")`],
      ['IDX_wht_decision_supplier_year_type', `CREATE INDEX "IDX_wht_decision_supplier_year_type" ON ${q('wht_decision')} ("supplierId", "taxYear", "transactionType")`],
      ['IDX_wht_decision_status_created', `CREATE INDEX "IDX_wht_decision_status_created" ON ${q('wht_decision')} ("whtStatus", "createdAt")`],
      ['IDX_ore_tax_ledger_order', `CREATE INDEX "IDX_ore_tax_ledger_order" ON ${q('ore_tax_ledger')} ("orderId")`],
      ['IDX_ore_tax_ledger_invoice', `CREATE INDEX "IDX_ore_tax_ledger_invoice" ON ${q('ore_tax_ledger')} ("invoiceId")`],
      ['IDX_ore_tax_ledger_party', `CREATE INDEX "IDX_ore_tax_ledger_party" ON ${q('ore_tax_ledger')} ("partyId")`],
      ['IDX_ore_tax_ledger_type_period', `CREATE INDEX "IDX_ore_tax_ledger_type_period" ON ${q('ore_tax_ledger')} ("taxType", "taxPeriod")`],
      ['IDX_ore_tax_ledger_source', `CREATE INDEX "IDX_ore_tax_ledger_source" ON ${q('ore_tax_ledger')} ("sourceTransaction")`],
      ['IDX_tax_review_status_created', `CREATE INDEX "IDX_tax_review_status_created" ON ${q('tax_review_case')} ("status", "createdAt")`],
      ['IDX_tax_review_order', `CREATE INDEX "IDX_tax_review_order" ON ${q('tax_review_case')} ("orderId")`],
      ['IDX_tax_review_reason', `CREATE INDEX "IDX_tax_review_reason" ON ${q('tax_review_case')} ("reasonCode")`],
    ];
    for (const [name, sql] of indexes) {
      if (!(await hasIndex(name))) await queryRunner.query(sql);
    }

    if (isSqlite) {
      await queryRunner.query(`
        CREATE TRIGGER IF NOT EXISTS ore_tax_ledger_filed_no_update
        BEFORE UPDATE ON "ore_tax_ledger"
        FOR EACH ROW WHEN OLD."filingStatus" IN ('FILED','CLOSED')
        BEGIN
          SELECT RAISE(ABORT, 'filed tax ledger rows are immutable; post a linked reversal/adjustment');
        END;
      `);
      await queryRunner.query(`
        CREATE TRIGGER IF NOT EXISTS ore_tax_ledger_filed_no_delete
        BEFORE DELETE ON "ore_tax_ledger"
        FOR EACH ROW WHEN OLD."filingStatus" IN ('FILED','CLOSED')
        BEGIN
          SELECT RAISE(ABORT, 'filed tax ledger rows are immutable; post a linked reversal/adjustment');
        END;
      `);
    } else {
      await queryRunner.query(`
        CREATE OR REPLACE FUNCTION "${schema}".ore_tax_ledger_filed_immutable()
        RETURNS trigger AS $$
        BEGIN
          IF OLD."filingStatus" IN ('FILED','CLOSED') THEN
            RAISE EXCEPTION 'filed tax ledger rows are immutable; post a linked reversal/adjustment';
          END IF;
          IF TG_OP = 'DELETE' THEN
            RETURN OLD;
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);
      await queryRunner.query(`DROP TRIGGER IF EXISTS ore_tax_ledger_filed_no_update ON ${q('ore_tax_ledger')}`);
      await queryRunner.query(`CREATE TRIGGER ore_tax_ledger_filed_no_update BEFORE UPDATE ON ${q('ore_tax_ledger')} FOR EACH ROW EXECUTE FUNCTION "${schema}".ore_tax_ledger_filed_immutable()`);
      await queryRunner.query(`DROP TRIGGER IF EXISTS ore_tax_ledger_filed_no_delete ON ${q('ore_tax_ledger')}`);
      await queryRunner.query(`CREATE TRIGGER ore_tax_ledger_filed_no_delete BEFORE DELETE ON ${q('ore_tax_ledger')} FOR EACH ROW EXECUTE FUNCTION "${schema}".ore_tax_ledger_filed_immutable()`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const driver = queryRunner.connection.options.type;
    const isSqlite = driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs';
    const schema = 'ledger';
    const q = (name: string) => (isSqlite ? `"${name}"` : `"${schema}"."${name}"`);
    const hasTable = async (name: string): Promise<boolean> => {
      const rows = await queryRunner.query(
        isSqlite
          ? `SELECT name FROM sqlite_master WHERE type='table' AND name='${name}'`
          : `SELECT table_name FROM information_schema.tables WHERE table_schema='${schema}' AND table_name='${name}'`,
      );
      return (rows as unknown[]).length > 0;
    };

    if (isSqlite) {
      await queryRunner.query(`DROP TRIGGER IF EXISTS ore_tax_ledger_filed_no_delete`);
      await queryRunner.query(`DROP TRIGGER IF EXISTS ore_tax_ledger_filed_no_update`);
    } else {
      if (await hasTable('ore_tax_ledger')) {
        await queryRunner.query(`DROP TRIGGER IF EXISTS ore_tax_ledger_filed_no_delete ON ${q('ore_tax_ledger')}`);
        await queryRunner.query(`DROP TRIGGER IF EXISTS ore_tax_ledger_filed_no_update ON ${q('ore_tax_ledger')}`);
      }
      await queryRunner.query(`DROP FUNCTION IF EXISTS "${schema}".ore_tax_ledger_filed_immutable()`);
    }
    await queryRunner.query(`DROP TABLE IF EXISTS ${q('tax_review_case')}`);
    await queryRunner.query(`DROP TABLE IF EXISTS ${q('ore_tax_ledger')}`);
    await queryRunner.query(`DROP TABLE IF EXISTS ${q('wht_decision')}`);
    await queryRunner.query(`DROP TABLE IF EXISTS ${q('tax_transaction')}`);
    await queryRunner.query(`DROP TABLE IF EXISTS ${q('tax_rule')}`);
  }
}
