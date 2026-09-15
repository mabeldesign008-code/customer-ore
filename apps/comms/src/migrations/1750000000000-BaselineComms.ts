/**
 * Baseline schema for the `comms` service, generated from its entity definitions.
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

export class BaselineComms1750000000000 implements MigrationInterface {
  name = 'BaselineComms1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const driver = queryRunner.connection.options.type;
    if (driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs') return; // sqlite dev uses synchronize

    await queryRunner.query('CREATE SCHEMA IF NOT EXISTS "comms"');
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    const statements: string[] = [
      "CREATE TABLE \"comms\".\"comms_message\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"threadId\" uuid NOT NULL, \"senderUserId\" character varying NOT NULL, \"senderRole\" character varying NOT NULL, \"body\" text NOT NULL, \"visibility\" character varying NOT NULL DEFAULT 'customer', \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_52112d6c552aa9d36d45c334247\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_3e153460044c3aacc2f623fbcf\" ON \"comms\".\"comms_message\" (\"threadId\", \"createdAt\") ",
      "CREATE TABLE \"comms\".\"comms_thread\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"kind\" character varying NOT NULL DEFAULT 'order', \"orderId\" character varying, \"ownerUserId\" character varying, \"ownerRole\" character varying, \"customerId\" character varying, \"vendorId\" character varying, \"riderId\" character varying, \"status\" character varying NOT NULL DEFAULT 'AI_HANDLING', \"assignedToUserId\" character varying, \"ownerAdminUserId\" character varying, \"flaggedTeams\" character varying, \"escalationReason\" character varying, \"escalationTeam\" character varying, \"lastAiAt\" TIMESTAMP, \"lastHumanAt\" TIMESTAMP, \"ticketRef\" character varying, \"priority\" character varying NOT NULL DEFAULT 'normal', \"category\" character varying, \"tagsJson\" text, \"firstResponseAt\" TIMESTAMP, \"resolvedAt\" TIMESTAMP, \"closedAt\" TIMESTAMP, \"closedBy\" character varying, \"reopenCount\" integer NOT NULL DEFAULT '0', \"csatScore\" integer, \"csatComment\" text, \"slaDueAt\" TIMESTAMP, \"slaBreachedAt\" TIMESTAMP, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_fabd340183e86450225f3ef3f25\" PRIMARY KEY (\"id\"))",
      "CREATE UNIQUE INDEX \"comms_thread_support_owner_unique\" ON \"comms\".\"comms_thread\" (\"ownerUserId\") WHERE kind = 'support'",
      "CREATE UNIQUE INDEX \"comms_thread_order_id_unique\" ON \"comms\".\"comms_thread\" (\"orderId\") ",
      "CREATE TABLE \"comms\".\"support_escalation\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"threadId\" character varying NOT NULL, \"reason\" character varying NOT NULL, \"summary\" text, \"team\" character varying NOT NULL DEFAULT 'general', \"actor\" character varying NOT NULL, \"fromStatus\" character varying, \"toStatus\" character varying NOT NULL, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_ec699287706f5109d7bff846a2c\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_7165ffdc0527af9ffce3e2c8d7\" ON \"comms\".\"support_escalation\" (\"threadId\", \"createdAt\") ",
      "CREATE TABLE \"comms\".\"support_tool_audit\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"threadId\" character varying NOT NULL, \"tool\" character varying NOT NULL, \"argsJson\" text, \"outcome\" character varying, \"model\" character varying, \"promptTokens\" integer NOT NULL DEFAULT '0', \"completionTokens\" integer NOT NULL DEFAULT '0', \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_fc53572e6d1625d9941848a3a7e\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_415b53311ce6d7abcfa3a1a68e\" ON \"comms\".\"support_tool_audit\" (\"threadId\", \"createdAt\") ",
      "CREATE TABLE \"comms\".\"support_participant\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"threadId\" character varying NOT NULL, \"userId\" character varying NOT NULL, \"adminRole\" character varying, \"invitedBy\" character varying, \"joinedAt\" TIMESTAMP NOT NULL DEFAULT now(), \"leftAt\" TIMESTAMP, CONSTRAINT \"PK_852f75563b0ec2f61297a1a777a\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_f9b9d30e7cd6085b014e8df174\" ON \"comms\".\"support_participant\" (\"userId\", \"leftAt\") ",
      "CREATE UNIQUE INDEX \"IDX_4d252a255302a577f0fb8d917c\" ON \"comms\".\"support_participant\" (\"threadId\", \"userId\") ",
      "CREATE TABLE \"comms\".\"content_article\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"title\" character varying NOT NULL, \"slug\" character varying NOT NULL, \"bodyMarkdown\" text NOT NULL, \"excerpt\" text, \"kind\" character varying NOT NULL DEFAULT 'BLOG', \"status\" character varying NOT NULL DEFAULT 'DRAFT', \"categoryId\" character varying, \"tagsText\" text, \"seoTitle\" character varying, \"seoDescription\" text, \"ogImageUrl\" character varying, \"indexable\" boolean NOT NULL DEFAULT true, \"legalReviewed\" boolean NOT NULL DEFAULT false, \"authorId\" character varying, \"lastEditedBy\" character varying, \"revisionCount\" integer NOT NULL DEFAULT '1', \"publishedAt\" TIMESTAMP, \"archivedAt\" TIMESTAMP, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_4d2cf7ccbcc630b726c06e929e0\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_18b0434f422b66b349c9580ad9\" ON \"comms\".\"content_article\" (\"categoryId\") ",
      "CREATE INDEX \"IDX_92f07a3cbfc1921cf1470e2ebc\" ON \"comms\".\"content_article\" (\"status\", \"kind\", \"publishedAt\") ",
      "CREATE UNIQUE INDEX \"IDX_33d2df3377ccfbe80a48b0d818\" ON \"comms\".\"content_article\" (\"slug\") ",
      "CREATE TABLE \"comms\".\"content_revision\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"articleId\" character varying NOT NULL, \"revision\" integer NOT NULL, \"bodyMarkdown\" text NOT NULL, \"title\" character varying, \"excerpt\" character varying, \"changeNote\" character varying, \"editedBy\" character varying, \"revertedFrom\" integer, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_9a263b2bcb4233173933931fb7d\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_fa50e02cc17724cd41b45ddab1\" ON \"comms\".\"content_revision\" (\"articleId\", \"createdAt\") ",
      "CREATE INDEX \"IDX_0ec8be00c48bea88009078a012\" ON \"comms\".\"content_revision\" (\"articleId\", \"revision\") ",
      "CREATE TABLE \"comms\".\"content_category\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"name\" character varying NOT NULL, \"slug\" character varying NOT NULL, \"description\" text, \"kind\" character varying NOT NULL DEFAULT 'BLOG', \"sortOrder\" integer NOT NULL DEFAULT '0', \"createdBy\" character varying, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_818b727b7f93a9952dc12cd526e\" PRIMARY KEY (\"id\"))",
      "CREATE UNIQUE INDEX \"IDX_60f7095e299a708275a1578752\" ON \"comms\".\"content_category\" (\"slug\") ",
      "CREATE TABLE \"comms\".\"content_media\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"url\" character varying NOT NULL, \"originalName\" character varying NOT NULL, \"contentType\" character varying, \"sizeBytes\" integer NOT NULL DEFAULT '0', \"widthPx\" integer, \"heightPx\" integer, \"altText\" character varying, \"uploadedBy\" character varying, \"storageKey\" character varying, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_7265e5fa322b3e309e547d8682e\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_6f4ba465b5e0aee47648cf4393\" ON \"comms\".\"content_media\" (\"uploadedBy\", \"createdAt\") ",
      "CREATE TABLE \"comms\".\"content_banner\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"title\" character varying NOT NULL, \"body\" text, \"severity\" character varying NOT NULL DEFAULT 'INFO', \"audience\" character varying NOT NULL DEFAULT 'ALL', \"city\" character varying, \"linkUrl\" character varying, \"status\" character varying NOT NULL DEFAULT 'SCHEDULED', \"dismissible\" boolean NOT NULL DEFAULT true, \"startsAt\" TIMESTAMP NOT NULL, \"endsAt\" TIMESTAMP, \"createdBy\" character varying, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_edf805a76d2885d8ec109f4a635\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_532733f7d0a497e5fe73778259\" ON \"comms\".\"content_banner\" (\"status\", \"startsAt\", \"endsAt\") ",
      "ALTER TABLE \"comms\".\"comms_message\" ADD CONSTRAINT \"FK_58cf0d06d467df92281add720ec\" FOREIGN KEY (\"threadId\") REFERENCES \"comms\".\"comms_thread\"(\"id\") ON DELETE CASCADE ON UPDATE NO ACTION",
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
