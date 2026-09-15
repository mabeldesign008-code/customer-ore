/**
 * Baseline schema for the `payment` service, generated from its entity definitions.
 *
 * Production runs with `synchronize: false`, so migrations are the only thing that builds a
 * database — but this service's chain began by altering tables that nothing had created. A
 * fresh deploy failed at boot. Dev and test never caught it because they use
 * `synchronize: true` and skip migrations entirely.
 *
 * Every statement is guarded, so this is a no-op against a database that already has the
 * objects: safe to apply to an existing deployment as well as a new one.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class BaselinePayment1750000000000 implements MigrationInterface {
  name = 'BaselinePayment1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const driver = queryRunner.connection.options.type;
    if (driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs') return; // sqlite dev uses synchronize

    await queryRunner.query('CREATE SCHEMA IF NOT EXISTS "payment"');
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    const statements: string[] = [
      "CREATE TABLE \"payment\".\"checkout_payment\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"checkoutId\" character varying NOT NULL, \"reference\" character varying NOT NULL, \"amountPesewas\" integer NOT NULL, \"currency\" character varying NOT NULL DEFAULT 'GHS', \"channel\" character varying, \"status\" character varying NOT NULL DEFAULT 'INITIATED', \"customerEmail\" character varying, \"paidAt\" TIMESTAMP, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"UQ_8994ce17e894c160c598f951e88\" UNIQUE (\"reference\"), CONSTRAINT \"PK_7cb8d28a7cb25949d6491bdba5d\" PRIMARY KEY (\"id\"))",
      "CREATE TABLE \"payment\".\"payment_allocation\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"checkoutPaymentId\" character varying NOT NULL, \"checkoutId\" character varying NOT NULL, \"orderId\" character varying NOT NULL, \"allocatedPesewas\" integer NOT NULL, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_c33ff68d0655802841f39d2bbdc\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_4388ee04c2f2334c6aec607183\" ON \"payment\".\"payment_allocation\" (\"orderId\") ",
      "CREATE TABLE \"payment\".\"webhook_event\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"eventId\" character varying NOT NULL, \"event\" character varying NOT NULL, \"payloadJson\" text NOT NULL, \"processed\" boolean NOT NULL DEFAULT false, \"attempts\" integer NOT NULL DEFAULT '0', \"lastError\" text, \"abandoned\" boolean NOT NULL DEFAULT false, \"lastAttemptAt\" TIMESTAMP WITH TIME ZONE, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"UQ_fa4fdad56b2b0994a0ebde08b2c\" UNIQUE (\"eventId\"), CONSTRAINT \"PK_0f56d2f40f5ec823acf8e8edad1\" PRIMARY KEY (\"id\"))",
      "CREATE TABLE \"payment\".\"refund\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"orderId\" character varying NOT NULL, \"checkoutPaymentId\" character varying NOT NULL, \"amountPesewas\" integer NOT NULL, \"reason\" character varying NOT NULL, \"originalTransactionId\" character varying, \"refundComponent\" character varying NOT NULL DEFAULT 'UNSPECIFIED', \"originalTaxStatus\" character varying NOT NULL DEFAULT 'UNKNOWN', \"taxPeriodStatus\" character varying NOT NULL DEFAULT 'OPEN', \"settlementStatus\" character varying NOT NULL DEFAULT 'PENDING', \"approvalStatus\" character varying NOT NULL DEFAULT 'APPROVED', \"paystackRef\" character varying, \"status\" character varying NOT NULL DEFAULT 'PENDING', \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_f1cefa2e60d99b206c46c1116e5\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_1f1294d539d9bbfe6c5b7de66b\" ON \"payment\".\"refund\" (\"orderId\") ",
      "CREATE TABLE \"payment\".\"refund_request\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"orderId\" character varying NOT NULL, \"amountPesewas\" integer NOT NULL, \"reason\" text NOT NULL, \"refundComponent\" character varying NOT NULL DEFAULT 'UNSPECIFIED', \"originalTaxStatus\" character varying NOT NULL DEFAULT 'UNKNOWN', \"taxPeriodStatus\" character varying NOT NULL DEFAULT 'OPEN', \"raisedBy\" character varying NOT NULL DEFAULT 'admin', \"raisedByUserId\" character varying, \"status\" character varying NOT NULL DEFAULT 'PENDING', \"decidedBy\" character varying, \"decidedAt\" TIMESTAMP, \"decisionNote\" text, \"approvalId\" character varying, \"executionRef\" character varying, \"refundId\" character varying, \"failureReason\" text, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_31723f412cab252cdd2005c9a26\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_e4fac6b3c0dedc8c81d619abe8\" ON \"payment\".\"refund_request\" (\"orderId\") ",
      "CREATE INDEX \"IDX_c9d2e68b0c84ec05aef00243d0\" ON \"payment\".\"refund_request\" (\"status\", \"createdAt\") ",
      "CREATE TABLE \"payment\".\"payment_processor_record\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"paymentProcessor\" character varying NOT NULL DEFAULT 'PAYSTACK', \"checkoutPaymentId\" character varying, \"checkoutId\" character varying, \"orderId\" character varying, \"paystackTransactionId\" character varying, \"paystackSplitId\" character varying, \"paymentStatus\" character varying NOT NULL DEFAULT 'INITIATED', \"splitStatus\" character varying NOT NULL DEFAULT 'NOT_SPLIT', \"vendorAllocationPesewas\" integer NOT NULL DEFAULT '0', \"deliveryPartnerAllocationPesewas\" integer NOT NULL DEFAULT '0', \"fleetDeliveryPartnerAllocationPesewas\" integer NOT NULL DEFAULT '0', \"oreAllocationPesewas\" integer NOT NULL DEFAULT '0', \"processorFeePesewas\" integer NOT NULL DEFAULT '0', \"refundStatus\" character varying NOT NULL DEFAULT 'NONE', \"settlementStatus\" character varying NOT NULL DEFAULT 'PENDING_ORDER_OUTCOME', \"allocationJson\" text, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_3084f1490a6dd973ed477a52e44\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_f123d6298a1eb6e5d157d9db51\" ON \"payment\".\"payment_processor_record\" (\"paymentStatus\", \"settlementStatus\") ",
      "CREATE INDEX \"IDX_767a4f76320038570ef7b4ecd8\" ON \"payment\".\"payment_processor_record\" (\"paystackTransactionId\") ",
      "CREATE INDEX \"IDX_b81a7835ea38a5689225016d60\" ON \"payment\".\"payment_processor_record\" (\"orderId\") ",
      "CREATE INDEX \"IDX_89fb5db45a3df11ad4c9befdb2\" ON \"payment\".\"payment_processor_record\" (\"checkoutId\") ",
    ];

    for (const sql of statements) {
      try {
        await queryRunner.query(sql);
      } catch (err) {
        // Already present (existing deployment) — the object this statement creates is exactly
        // what a later migration or an earlier deploy already produced. Anything else rethrows.
        const msg = (err as Error).message;
        if (!/already exists/i.test(msg)) throw err;
      }
    }
  }

  public async down(): Promise<void> {
    // Intentionally empty: dropping a service's entire schema is never what a rollback wants.
  }
}
