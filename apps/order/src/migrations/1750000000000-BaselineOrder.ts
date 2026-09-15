/**
 * Baseline schema for the `order` service, generated from its entity definitions.
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

export class BaselineOrder1750000000000 implements MigrationInterface {
  name = 'BaselineOrder1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const driver = queryRunner.connection.options.type;
    if (driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs') return; // sqlite dev uses synchronize

    await queryRunner.query('CREATE SCHEMA IF NOT EXISTS "order"');
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    const statements: string[] = [
      "CREATE TABLE \"order\".\"order\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"ref\" character varying NOT NULL, \"checkoutId\" character varying NOT NULL, \"orderType\" character varying NOT NULL DEFAULT 'CATALOGUE', \"errandJson\" text, \"parcelJson\" text, \"recipientJson\" text, \"giftToken\" character varying(64), \"customerPhone\" character varying, \"vendorId\" character varying NOT NULL, \"vendorName\" character varying NOT NULL, \"vendorType\" character varying NOT NULL DEFAULT 'FOOD', \"serviceCode\" character varying NOT NULL DEFAULT 'FO', \"feePolicyVersion\" integer NOT NULL DEFAULT '1', \"commissionBps\" integer NOT NULL DEFAULT '0', \"customerId\" character varying NOT NULL, \"paymentMethod\" character varying NOT NULL DEFAULT 'PREPAID', \"status\" character varying NOT NULL DEFAULT 'PENDING_PAYMENT', \"prescriptionStatus\" character varying NOT NULL DEFAULT 'NOT_REQUIRED', \"prescriptionKey\" character varying, \"prescriptionContentType\" character varying, \"prescriptionReviewNote\" text, \"conditionJson\" text, \"marketFulfillmentJson\" text, \"laundryStage\" character varying, \"addressJson\" text NOT NULL, \"pickupJson\" text, \"prepTimeMin\" integer NOT NULL, \"originalPrepTimeMin\" integer, \"prepTimeExtendedByMin\" integer NOT NULL DEFAULT '0', \"prepExtensionCount\" integer NOT NULL DEFAULT '0', \"lastPrepExtendedAt\" TIMESTAMP, \"lastPrepExtendedBy\" character varying, \"lastPrepExtensionReason\" text, \"subtotalPesewas\" integer NOT NULL, \"deliveryFeePesewas\" integer NOT NULL, \"serviceFeePesewas\" integer NOT NULL, \"platformFeePesewas\" integer NOT NULL, \"vendorSharePesewas\" integer NOT NULL, \"riderFeePesewas\" integer NOT NULL, \"totalPesewas\" integer NOT NULL, \"promotionId\" character varying, \"promotionTitle\" character varying, \"promotionDiscountPesewas\" integer NOT NULL DEFAULT '0', \"tipPesewas\" integer NOT NULL DEFAULT '0', \"peakPayPesewas\" integer NOT NULL DEFAULT '0', \"note\" character varying, \"leaveAtDoor\" boolean NOT NULL DEFAULT false, \"dropNote\" character varying, \"scheduledFor\" TIMESTAMP, \"serviceLevel\" character varying NOT NULL DEFAULT 'STANDARD', \"deliverySignatureKey\" character varying, \"deliverySignatureContentType\" character varying, \"riderId\" character varying, \"otpHash\" character varying, \"otpCipher\" text, \"otpAttempts\" integer NOT NULL DEFAULT '0', \"acceptedAt\" TIMESTAMP, \"readyAt\" TIMESTAMP, \"pickedUpAt\" TIMESTAMP, \"deliveredAt\" TIMESTAMP, \"deliveryProofKey\" character varying, \"deliveryProofContentType\" character varying, \"cancelledAt\" TIMESTAMP, \"cancelReason\" character varying, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"UQ_4fa992eb0133cd958978cddf22d\" UNIQUE (\"ref\"), CONSTRAINT \"PK_1031171c13130102495201e3e20\" PRIMARY KEY (\"id\"))",
      "CREATE UNIQUE INDEX \"order_gift_token_uidx\" ON \"order\".\"order\" (\"giftToken\") WHERE \"giftToken\" IS NOT NULL",
      "CREATE INDEX \"IDX_ba6497045e34c439ad50181f66\" ON \"order\".\"order\" (\"checkoutId\", \"status\") ",
      "CREATE TABLE \"order\".\"order_item\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"orderId\" character varying NOT NULL, \"itemId\" character varying NOT NULL, \"name\" character varying NOT NULL, \"qty\" integer NOT NULL, \"unit\" character varying, \"unitPricePesewas\" integer NOT NULL, \"prepTimeMin\" integer NOT NULL, \"modifiers\" text NOT NULL DEFAULT '[]', \"selectedOptions\" text NOT NULL DEFAULT '[]', \"optionsTotalPesewas\" integer NOT NULL DEFAULT '0', \"prescriptionOnly\" boolean NOT NULL DEFAULT false, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_d01158fe15b1ead5c26fd7f4e90\" PRIMARY KEY (\"id\"))",
      "CREATE TABLE \"order\".\"order_event\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"orderId\" character varying NOT NULL, \"from\" character varying, \"to\" character varying NOT NULL, \"actor\" character varying NOT NULL DEFAULT 'system', \"payloadJson\" text, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_394b0d7613180ebee9028e9aaa1\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_c7692d881f326d48552256e4f5\" ON \"order\".\"order_event\" (\"orderId\") ",
      "CREATE TABLE \"order\".\"order_sequence\" (\"key\" character varying NOT NULL, \"seq\" integer NOT NULL DEFAULT '0', CONSTRAINT \"PK_43b5c0a4935c5e88169c712721d\" PRIMARY KEY (\"key\"))",
      "CREATE TABLE \"order\".\"order_issue\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"orderId\" character varying NOT NULL, \"vendorId\" character varying NOT NULL, \"reporterUserId\" character varying NOT NULL, \"category\" character varying NOT NULL, \"note\" text, \"status\" character varying NOT NULL DEFAULT 'OPEN', \"resolutionNote\" text, \"resolvedBy\" character varying, \"resolvedAt\" TIMESTAMP, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_f2b1f6b1ca98ef908a590527c3b\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_2d53f576a06072236a6808b7cf\" ON \"order\".\"order_issue\" (\"orderId\", \"createdAt\") ",
      "CREATE TABLE \"order\".\"order_address_audit\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"orderId\" character varying NOT NULL, \"action\" character varying NOT NULL, \"actorId\" character varying, \"actorRole\" character varying, \"source\" character varying, \"beforeJson\" text, \"afterJson\" text NOT NULL, \"reason\" text, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_a5d80d857aeea494fb8b1373c92\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_c5d7589076ba19fcfab87590d3\" ON \"order\".\"order_address_audit\" (\"orderId\", \"action\") ",
      "CREATE INDEX \"IDX_cf317ca4e9e4e5a620b4926034\" ON \"order\".\"order_address_audit\" (\"orderId\", \"createdAt\") ",
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
