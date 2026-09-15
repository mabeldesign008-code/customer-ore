/**
 * Baseline schema for the `catalog` service, generated from its entity definitions.
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

export class BaselineCatalog1750000000000 implements MigrationInterface {
  name = 'BaselineCatalog1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const driver = queryRunner.connection.options.type;
    if (driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs') return; // sqlite dev uses synchronize

    await queryRunner.query('CREATE SCHEMA IF NOT EXISTS "catalog"');
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    const statements: string[] = [
      "CREATE TABLE \"catalog\".\"vendor\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"ownerUserId\" character varying NOT NULL, \"vendorType\" character varying NOT NULL DEFAULT 'FOOD', \"approved\" boolean NOT NULL DEFAULT false, \"publicId\" character varying, \"logoKey\" character varying, \"bannerKey\" character varying, \"name\" character varying NOT NULL, \"lat\" double precision NOT NULL, \"lng\" double precision NOT NULL, \"deliveryRadiusKm\" double precision NOT NULL DEFAULT '8', \"acceptsCod\" boolean NOT NULL DEFAULT true, \"accepting\" boolean NOT NULL DEFAULT true, \"maxConcurrentOrders\" integer NOT NULL DEFAULT '5', \"defaultPrepTimeMin\" integer NOT NULL DEFAULT '10', \"hoursJson\" text, \"holidayHoursJson\" text, \"payoutAccountJson\" text, \"taxResidentStatus\" character varying NOT NULL DEFAULT 'UNKNOWN', \"taxIdentificationNumber\" character varying, \"taxProfileJson\" text, \"plan\" character varying NOT NULL DEFAULT 'STANDARD', \"suspendUntil\" TIMESTAMP, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_931a23f6231a57604f5a0e32780\" PRIMARY KEY (\"id\"))",
      "CREATE TABLE \"catalog\".\"menu_item\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"vendorId\" character varying NOT NULL, \"name\" character varying NOT NULL, \"category\" character varying NOT NULL, \"pricePesewas\" integer NOT NULL, \"prepTimeMin\" integer NOT NULL DEFAULT '10', \"unit\" character varying NOT NULL DEFAULT 'each', \"stock\" integer, \"prescriptionOnly\" boolean NOT NULL DEFAULT false, \"available\" boolean NOT NULL DEFAULT true, \"modifiers\" text NOT NULL DEFAULT '[]', \"addonGroups\" text, \"imageKey\" character varying, \"imageContentType\" character varying, \"sku\" character varying, \"expiryDate\" TIMESTAMP, \"dosage\" character varying, \"turnaround\" character varying, \"dailyMarketPrice\" boolean NOT NULL DEFAULT false, \"garmentType\" character varying, \"conditionJson\" text, \"dietaryTags\" text NOT NULL DEFAULT '[]', \"description\" character varying, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_722c4de0accbbfafc77947a8556\" PRIMARY KEY (\"id\"))",
      "CREATE TABLE \"catalog\".\"vendor_story\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"vendorId\" character varying NOT NULL, \"kind\" character varying NOT NULL, \"mediaKey\" character varying NOT NULL, \"muxPlaybackId\" character varying, \"caption\" character varying, \"active\" boolean NOT NULL DEFAULT true, \"expiresAt\" TIMESTAMP NOT NULL, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_b6f98de1bc10f7032b318967fc9\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_b44a1c22fe056593371036389b\" ON \"catalog\".\"vendor_story\" (\"vendorId\", \"active\") ",
      "CREATE TABLE \"catalog\".\"vendor_promotion\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"vendorId\" character varying NOT NULL, \"title\" character varying NOT NULL, \"code\" character varying, \"discountType\" character varying NOT NULL, \"discountValue\" integer NOT NULL, \"minimumSubtotalPesewas\" integer NOT NULL DEFAULT '0', \"budgetPesewas\" integer, \"redemptionLimit\" integer, \"spentPesewas\" integer NOT NULL DEFAULT '0', \"redemptionsUsed\" integer NOT NULL DEFAULT '0', \"startsAt\" TIMESTAMP NOT NULL, \"endsAt\" TIMESTAMP NOT NULL, \"active\" boolean NOT NULL DEFAULT true, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"UQ_c96c4f8776b843ef5871b345951\" UNIQUE (\"code\"), CONSTRAINT \"PK_34adb13b0fc77796ac0d78b09f2\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_d2a9cb9d5ee2d90a6ceee084ef\" ON \"catalog\".\"vendor_promotion\" (\"vendorId\", \"active\", \"startsAt\", \"endsAt\") ",
      "CREATE TABLE \"catalog\".\"stock_reservation\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"orderId\" character varying NOT NULL, \"itemId\" character varying NOT NULL, \"qty\" integer NOT NULL, \"status\" character varying NOT NULL DEFAULT 'RESERVED', \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_a1f7c9841feb7e5744923efa2d2\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_184f9c46c6ecdf905aabd423dd\" ON \"catalog\".\"stock_reservation\" (\"itemId\", \"status\") ",
      "CREATE INDEX \"IDX_f6bdb3dfa9fa9a3c91e91e5207\" ON \"catalog\".\"stock_reservation\" (\"orderId\", \"status\") ",
      "CREATE TABLE \"catalog\".\"vendor_review\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"orderId\" character varying NOT NULL, \"vendorId\" character varying NOT NULL, \"customerId\" character varying NOT NULL, \"rating\" integer NOT NULL, \"comment\" text, \"vendorResponse\" text, \"respondedAt\" TIMESTAMP, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"UQ_8e04c42c966d9637296823c8227\" UNIQUE (\"orderId\"), CONSTRAINT \"PK_fbbc1e7a9e602243b2783dac776\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_08cf9381f1b967f9639ff503e0\" ON \"catalog\".\"vendor_review\" (\"vendorId\", \"createdAt\") ",
      "CREATE TABLE \"catalog\".\"promotion_redemption\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"orderId\" character varying NOT NULL, \"promotionId\" character varying NOT NULL, \"customerId\" character varying, \"discountPesewas\" integer NOT NULL, \"status\" character varying NOT NULL DEFAULT 'REDEEMED', \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"UQ_2d9eda913152d2e6f239f998142\" UNIQUE (\"orderId\"), CONSTRAINT \"PK_3b4442001e48f88b7a8d33c1387\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_f6db2b558e4e94c9fb52f86768\" ON \"catalog\".\"promotion_redemption\" (\"promotionId\", \"status\") ",
      "CREATE TABLE \"catalog\".\"vendor_location\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"vendorId\" character varying NOT NULL, \"name\" character varying NOT NULL, \"address\" text NOT NULL, \"lat\" double precision NOT NULL, \"lng\" double precision NOT NULL, \"deliveryRadiusKm\" double precision NOT NULL DEFAULT '8', \"accepting\" boolean NOT NULL DEFAULT true, \"hoursJson\" text, \"holidayHoursJson\" text, \"active\" boolean NOT NULL DEFAULT true, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_97bb3a124fc8c9afa05565c25ad\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_350ed202126cb0b4cde0098409\" ON \"catalog\".\"vendor_location\" (\"vendorId\", \"active\") ",
      "CREATE TABLE \"catalog\".\"vendor_staff\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"vendorId\" character varying NOT NULL, \"userId\" character varying NOT NULL, \"displayName\" character varying NOT NULL, \"phone\" character varying, \"staffRole\" character varying NOT NULL DEFAULT 'ORDER_OPERATOR', \"active\" boolean NOT NULL DEFAULT true, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_5b97df11805a8999d38c57c85a7\" PRIMARY KEY (\"id\"))",
      "CREATE UNIQUE INDEX \"IDX_1eb0b908a7da5391dd29365273\" ON \"catalog\".\"vendor_staff\" (\"vendorId\", \"userId\") ",
      "CREATE TABLE \"catalog\".\"vendor_pos_connection\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"vendorId\" character varying NOT NULL, \"provider\" character varying NOT NULL, \"externalStoreId\" character varying, \"tokenHash\" character varying NOT NULL, \"active\" boolean NOT NULL DEFAULT true, \"lastReceivedAt\" TIMESTAMP, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"UQ_5b4b5678c4762059721c3aa1d55\" UNIQUE (\"vendorId\"), CONSTRAINT \"PK_19646b8a6cb930a65306b614aa4\" PRIMARY KEY (\"id\"))",
      "CREATE TABLE \"catalog\".\"vendor_sla_violation\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"vendorId\" character varying NOT NULL, \"type\" character varying NOT NULL, \"orderId\" character varying, \"severity\" integer NOT NULL DEFAULT '0', \"note\" character varying, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_1bc8a54c574003091895e70e9f2\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_1adb9a643b3b8caca761d9a31e\" ON \"catalog\".\"vendor_sla_violation\" (\"vendorId\", \"createdAt\") ",
      "CREATE TABLE \"catalog\".\"vendor_penalty\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"vendorId\" character varying NOT NULL, \"level\" character varying NOT NULL, \"trigger\" character varying NOT NULL, \"amountPesewas\" integer NOT NULL DEFAULT '0', \"note\" character varying, \"decidedBy\" character varying, \"active\" boolean NOT NULL DEFAULT true, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_8568a0562fbb065183460cf2d6b\" PRIMARY KEY (\"id\"))",
      "CREATE TABLE \"catalog\".\"customer_favourite\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"customerId\" character varying NOT NULL, \"vendorId\" character varying NOT NULL, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_b8277508cdbe42531edae555283\" PRIMARY KEY (\"id\"))",
      "CREATE UNIQUE INDEX \"IDX_5ccd8608593f208f503bb6f305\" ON \"catalog\".\"customer_favourite\" (\"customerId\", \"vendorId\") ",
      "CREATE TABLE \"catalog\".\"customer_voucher\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"customerId\" character varying NOT NULL, \"code\" character varying NOT NULL, \"promotionId\" character varying NOT NULL, \"vendorId\" character varying NOT NULL, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_e518632fd09d365050cd0be73d3\" PRIMARY KEY (\"id\"))",
      "CREATE UNIQUE INDEX \"IDX_898edba368698dd4ca80a0846a\" ON \"catalog\".\"customer_voucher\" (\"customerId\", \"code\") ",
      "CREATE TABLE \"catalog\".\"vendor_performance_config\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"name\" character varying NOT NULL, \"version\" integer NOT NULL, \"reviewPeriod\" character varying NOT NULL DEFAULT 'MONTHLY', \"active\" boolean NOT NULL DEFAULT true, \"configJson\" text NOT NULL, \"createdBy\" character varying NOT NULL, \"approvedBy\" character varying, \"notes\" text, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_6310c019794f32e847ae1349ccc\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_d14f8ba568b50b64a4a18ea0c9\" ON \"catalog\".\"vendor_performance_config\" (\"active\", \"createdAt\") ",
      "CREATE TABLE \"catalog\".\"vendor_performance_record\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"vendorId\" character varying NOT NULL, \"periodStart\" TIMESTAMP NOT NULL, \"periodEnd\" TIMESTAMP NOT NULL, \"configVersion\" integer NOT NULL, \"configId\" character varying, \"reviewerId\" character varying, \"overallScore\" double precision, \"grade\" character varying, \"status\" character varying NOT NULL, \"trend\" character varying NOT NULL, \"insufficientData\" boolean NOT NULL DEFAULT false, \"resultJson\" text NOT NULL, \"metricCategories\" text, \"incidentTypes\" text, \"actionCodes\" text, \"outcome\" character varying, \"recordType\" character varying NOT NULL DEFAULT 'REVIEW', \"linkedRecordId\" character varying, \"notes\" text, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_4430bcd9fd2bde101eff1334fde\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_e0b873c41149829eaf306af734\" ON \"catalog\".\"vendor_performance_record\" (\"outcome\", \"createdAt\") ",
      "CREATE INDEX \"IDX_52a450e2f9bc5f3c154259dec3\" ON \"catalog\".\"vendor_performance_record\" (\"reviewerId\", \"createdAt\") ",
      "CREATE INDEX \"IDX_e832bf31d527d4070ba5aff444\" ON \"catalog\".\"vendor_performance_record\" (\"status\", \"createdAt\") ",
      "CREATE INDEX \"IDX_e88fb5381dade193e05241ee8b\" ON \"catalog\".\"vendor_performance_record\" (\"vendorId\", \"periodStart\", \"periodEnd\") ",
      "CREATE TABLE \"catalog\".\"vendor_performance_audit\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"vendorId\" character varying, \"action\" character varying NOT NULL, \"actorId\" character varying NOT NULL, \"recordId\" character varying, \"payloadJson\" text, \"reason\" text, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_6ca81bfec4ab22a603d32a172e5\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_966ef81861573e5095a39f0e4d\" ON \"catalog\".\"vendor_performance_audit\" (\"vendorId\", \"createdAt\") ",
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
