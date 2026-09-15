/**
 * Baseline schema for the `onboarding` service, generated from its entity definitions.
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

export class BaselineOnboarding1750000000000 implements MigrationInterface {
  name = 'BaselineOnboarding1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const driver = queryRunner.connection.options.type;
    if (driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs') return; // sqlite dev uses synchronize

    await queryRunner.query('CREATE SCHEMA IF NOT EXISTS "onboarding"');
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    const statements: string[] = [
      "CREATE TABLE \"onboarding\".\"application\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"applicantUserId\" character varying NOT NULL, \"applicantPhone\" character varying NOT NULL, \"applicantName\" character varying, \"kind\" character varying NOT NULL, \"status\" character varying NOT NULL DEFAULT 'DRAFT', \"currentStage\" integer NOT NULL DEFAULT '1', \"maxStages\" integer NOT NULL DEFAULT '4', \"stageData\" json, \"smileIdStatus\" character varying NOT NULL DEFAULT 'NOT_STARTED', \"vendorClass\" character varying, \"vendorType\" character varying, \"businessName\" character varying, \"lat\" double precision, \"lng\" double precision, \"workplaceGps\" json, \"payoutInfo\" json, \"vehicle\" character varying, \"reason\" character varying, \"requiresActionField\" character varying, \"publicId\" character varying, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_569e0c3e863ebdf5f2408ee1670\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_27cbbadccded14c5f1fa462493\" ON \"onboarding\".\"application\" (\"status\", \"kind\") ",
      "CREATE TABLE \"onboarding\".\"document\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"applicationId\" character varying NOT NULL, \"kind\" character varying NOT NULL, \"fileName\" character varying NOT NULL, \"contentType\" character varying NOT NULL, \"storageKey\" character varying, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_e57d3357f83f3cdc0acffc3d777\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_1b70297200edbb168a1a48a051\" ON \"onboarding\".\"document\" (\"applicationId\") ",
      "CREATE TABLE \"onboarding\".\"id_counter\" (\"key\" character varying NOT NULL, \"seq\" integer NOT NULL DEFAULT '0', CONSTRAINT \"PK_00f95399c7f3a4e763232e01e07\" PRIMARY KEY (\"key\"))",
      "CREATE TABLE \"onboarding\".\"audit_log\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"applicationId\" character varying NOT NULL, \"reviewerId\" character varying NOT NULL, \"reviewerRole\" character varying NOT NULL DEFAULT 'compliance', \"action\" character varying NOT NULL, \"previousState\" character varying NOT NULL, \"newState\" character varying NOT NULL, \"reason\" character varying, \"requiresActionField\" character varying, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_07fefa57f7f5ab8fc3f52b3ed0b\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_803cfc335b4846a0178559926c\" ON \"onboarding\".\"audit_log\" (\"applicationId\", \"createdAt\") ",
      "CREATE TABLE \"onboarding\".\"smile_verification_job\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"applicationId\" character varying NOT NULL, \"applicantUserId\" character varying NOT NULL, \"providerJobId\" character varying NOT NULL, \"providerUserId\" character varying, \"status\" character varying NOT NULL DEFAULT 'PENDING', \"reason\" character varying, \"message\" text, \"providerPayload\" text, \"providerCreatedAt\" TIMESTAMP, \"completedAt\" TIMESTAMP, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_c88c5ec4c7b1f2385284936c00c\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_fccf7e688f6b1f479e3ac0de40\" ON \"onboarding\".\"smile_verification_job\" (\"applicationId\", \"createdAt\") ",
      "CREATE UNIQUE INDEX \"IDX_6f4073991bf8529aeb5c65742e\" ON \"onboarding\".\"smile_verification_job\" (\"providerJobId\") ",
      "CREATE TABLE \"onboarding\".\"smile_verification_webhook_event\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"eventHash\" character varying NOT NULL, \"providerJobId\" character varying NOT NULL, \"payloadJson\" text NOT NULL, \"processed\" boolean NOT NULL DEFAULT false, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_227c6d0575279fa52a7bf4fa309\" PRIMARY KEY (\"id\"))",
      "CREATE UNIQUE INDEX \"IDX_3064403f57131fe9d40e9ff51a\" ON \"onboarding\".\"smile_verification_webhook_event\" (\"eventHash\") ",
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
