/**
 * Baseline schema for the `auth` service, generated from its entity definitions.
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

export class BaselineAuth1750000000000 implements MigrationInterface {
  name = 'BaselineAuth1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const driver = queryRunner.connection.options.type;
    if (driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs') return; // sqlite dev uses synchronize

    await queryRunner.query('CREATE SCHEMA IF NOT EXISTS "auth"');
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    const statements: string[] = [
      "CREATE TABLE \"auth\".\"user\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"phone\" character varying NOT NULL, \"role\" character varying NOT NULL DEFAULT 'customer', \"roles\" text NOT NULL DEFAULT 'customer', \"name\" character varying, \"email\" character varying, \"passwordHash\" character varying, \"totpSecret\" character varying, \"deviceToken\" character varying, \"deviceFingerprint\" character varying, \"verified\" boolean NOT NULL DEFAULT false, \"adminRole\" character varying, \"publicId\" character varying, \"status\" character varying NOT NULL DEFAULT 'ACTIVE', \"suspendedUntil\" TIMESTAMP, \"suspensionReason\" text, \"suspendedBy\" character varying, \"lastLoginAt\" TIMESTAMP, \"city\" character varying, \"marketingConsent\" boolean NOT NULL DEFAULT false, \"customerCodTier\" character varying NOT NULL DEFAULT 'NEW', \"customerCodBlocked\" boolean NOT NULL DEFAULT false, \"customerCodBlockReason\" text, \"tokenEpoch\" integer NOT NULL DEFAULT '0', \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"UQ_8e1f623798118e629b46a9e6299\" UNIQUE (\"phone\"), CONSTRAINT \"PK_cace4a159ff9f2512dd42373760\" PRIMARY KEY (\"id\"))",
      "CREATE TABLE \"auth\".\"otp_code\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"phone\" character varying NOT NULL, \"codeHash\" character varying NOT NULL, \"expiresAt\" TIMESTAMP NOT NULL, \"attempts\" integer NOT NULL DEFAULT '0', \"consumed\" boolean NOT NULL DEFAULT false, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_c2c773c7da0f03da4a23c4066a7\" PRIMARY KEY (\"id\"))",
      "CREATE TABLE \"auth\".\"id_counter\" (\"key\" character varying NOT NULL, \"seq\" integer NOT NULL DEFAULT '0', CONSTRAINT \"PK_00f95399c7f3a4e763232e01e07\" PRIMARY KEY (\"key\"))",
      "CREATE TABLE \"auth\".\"admin_user\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"userId\" character varying NOT NULL, \"adminRole\" character varying NOT NULL DEFAULT 'support', \"displayName\" character varying, \"jobTitle\" character varying, \"status\" character varying NOT NULL DEFAULT 'ACTIVE', \"pendingTotpSecret\" character varying, \"totpEnrolledAt\" TIMESTAMP, \"enrolToken\" character varying, \"enrolTokenExpiresAt\" TIMESTAMP, \"telegramChatId\" character varying, \"telegramLinkedAt\" TIMESTAMP, \"notificationPrefsJson\" text, \"invitedBy\" character varying, \"invitedAt\" TIMESTAMP, \"lastLoginAt\" TIMESTAMP, \"lastLoginIp\" character varying, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_a28028ba709cd7e5053a86857b4\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_647d96361101993b5b117cd1b6\" ON \"auth\".\"admin_user\" (\"adminRole\", \"status\") ",
      "CREATE UNIQUE INDEX \"IDX_a93ad905a72b85605fb28b2619\" ON \"auth\".\"admin_user\" (\"userId\") ",
      "CREATE TABLE \"auth\".\"admin_role_grant\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"adminUserId\" character varying NOT NULL, \"permission\" character varying NOT NULL, \"mode\" character varying NOT NULL DEFAULT 'grant', \"grantedBy\" character varying, \"reason\" text, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_e4bee3405c94ed41f1b99b907fd\" PRIMARY KEY (\"id\"))",
      "CREATE UNIQUE INDEX \"IDX_0b4b2e07d3501c1cf3be1a2eb2\" ON \"auth\".\"admin_role_grant\" (\"adminUserId\", \"permission\") ",
      "CREATE TABLE \"auth\".\"admin_action\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"actorUserId\" character varying, \"actorAdminRole\" character varying, \"permission\" character varying, \"decision\" character varying NOT NULL, \"reason\" character varying, \"service\" character varying, \"method\" character varying, \"path\" character varying, \"resourceType\" character varying, \"resourceId\" character varying, \"amountPesewas\" integer, \"beforeJson\" text, \"afterJson\" text, \"degraded\" boolean NOT NULL DEFAULT false, \"ip\" character varying, \"userAgent\" character varying, \"traceId\" character varying, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_f4f741670e1953cf425278180a7\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_28182bab5596ec0188bc035997\" ON \"auth\".\"admin_action\" (\"permission\", \"createdAt\") ",
      "CREATE INDEX \"IDX_85529712629dad53c079ef2098\" ON \"auth\".\"admin_action\" (\"resourceType\", \"resourceId\") ",
      "CREATE INDEX \"IDX_30b160bf04e9055a28074a3aa9\" ON \"auth\".\"admin_action\" (\"actorUserId\", \"createdAt\") ",
      "CREATE TABLE \"auth\".\"admin_approval\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"kind\" character varying NOT NULL, \"permission\" character varying NOT NULL, \"service\" character varying NOT NULL, \"resourceType\" character varying, \"resourceId\" character varying, \"executionRef\" character varying NOT NULL, \"amountPesewas\" integer NOT NULL DEFAULT '0', \"currency\" character varying NOT NULL, \"payloadJson\" text, \"payloadHash\" character varying NOT NULL, \"makerUserId\" character varying NOT NULL, \"makerAdminRole\" character varying, \"reason\" text, \"requiredApprovals\" integer NOT NULL, \"requiresSuperAdmin\" boolean NOT NULL DEFAULT false, \"approvalsJson\" text, \"status\" character varying NOT NULL DEFAULT 'PENDING', \"expiresAt\" TIMESTAMP NOT NULL, \"decidedBy\" character varying, \"decidedAt\" TIMESTAMP, \"executedBy\" character varying, \"executedAt\" TIMESTAMP, \"resultJson\" text, \"failureReason\" text, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_3ab7348ead75ba284376cf0f4f4\" PRIMARY KEY (\"id\"))",
      "CREATE UNIQUE INDEX \"IDX_63347420546ad2a61f295afbc5\" ON \"auth\".\"admin_approval\" (\"executionRef\") ",
      "CREATE INDEX \"IDX_6862fb432938c0c56a6f962257\" ON \"auth\".\"admin_approval\" (\"permission\", \"status\") ",
      "CREATE INDEX \"IDX_cdcba1a3f2f15b5df8ecd632a5\" ON \"auth\".\"admin_approval\" (\"makerUserId\", \"createdAt\") ",
      "CREATE INDEX \"IDX_60433c820a00b0a085a090579f\" ON \"auth\".\"admin_approval\" (\"status\", \"createdAt\") ",
      "CREATE TABLE \"auth\".\"compliance_hold\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"targetType\" character varying NOT NULL, \"targetId\" character varying NOT NULL, \"scope\" character varying NOT NULL DEFAULT 'ALL', \"reason\" text NOT NULL, \"status\" character varying NOT NULL DEFAULT 'ACTIVE', \"until\" TIMESTAMP, \"placedBy\" character varying, \"liftedBy\" character varying, \"liftedAt\" TIMESTAMP, \"liftNote\" text, \"fraudFlagId\" character varying, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_e3ac1001a82e413db9023d3671a\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_c5b8123b0266af298eea35821e\" ON \"auth\".\"compliance_hold\" (\"status\", \"createdAt\") ",
      "CREATE INDEX \"IDX_45757e066ed34426ec274b53b6\" ON \"auth\".\"compliance_hold\" (\"targetType\", \"targetId\", \"status\") ",
      "CREATE TABLE \"auth\".\"kyc_review\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"userId\" character varying NOT NULL, \"userType\" character varying NOT NULL DEFAULT 'CUSTOMER', \"status\" character varying NOT NULL DEFAULT 'PENDING', \"documentKeysJson\" text, \"idNumber\" character varying, \"fullName\" character varying, \"submittedBy\" character varying, \"submittedAt\" TIMESTAMP, \"decidedBy\" character varying, \"decidedAt\" TIMESTAMP, \"decisionNote\" text, \"provider\" character varying, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_3f80078f8781749caf045f6f7e1\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_3a1595c09fd7a48d34d26b34b3\" ON \"auth\".\"kyc_review\" (\"userId\", \"createdAt\") ",
      "CREATE INDEX \"IDX_4f8f15bdf8032e7575d10e4aec\" ON \"auth\".\"kyc_review\" (\"status\", \"createdAt\") ",
      "CREATE TABLE \"auth\".\"fraud_flag\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"targetType\" character varying NOT NULL, \"targetId\" character varying NOT NULL, \"severity\" character varying NOT NULL DEFAULT 'MEDIUM', \"category\" character varying NOT NULL, \"reason\" text NOT NULL, \"evidenceJson\" text, \"status\" character varying NOT NULL DEFAULT 'OPEN', \"raisedBy\" character varying NOT NULL DEFAULT 'MANUAL', \"assignedTo\" character varying, \"resolvedBy\" character varying, \"resolvedAt\" TIMESTAMP, \"resolutionNote\" text, \"holdId\" character varying, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_a204ed5128c9837da9c4f7b8329\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_6c92a597d5e94c79e6fcc4e0fd\" ON \"auth\".\"fraud_flag\" (\"createdAt\") ",
      "CREATE INDEX \"IDX_1d296f5103905db31cbd0731c7\" ON \"auth\".\"fraud_flag\" (\"targetType\", \"targetId\") ",
      "CREATE INDEX \"IDX_b22752a6dc005c0e6a66700060\" ON \"auth\".\"fraud_flag\" (\"status\", \"severity\") ",
      "CREATE TABLE \"auth\".\"refresh_revocation\" (\"jti\" character varying NOT NULL, \"sub\" character varying NOT NULL, \"revokedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_94c476d92cba9894610f39d4016\" PRIMARY KEY (\"jti\"))",
      "CREATE TABLE \"auth\".\"customer_saved_address\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"customerId\" character varying NOT NULL, \"label\" character varying NOT NULL, \"addressJson\" text NOT NULL, \"isDefault\" boolean NOT NULL DEFAULT false, \"active\" boolean NOT NULL DEFAULT true, \"createdBy\" character varying, \"updatedBy\" character varying, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_d053faf19033c7019eaaf0dd264\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_5e6534782afefa420fa95478b3\" ON \"auth\".\"customer_saved_address\" (\"customerId\", \"active\") ",
      "CREATE TABLE \"auth\".\"customer_address_audit\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"customerId\" character varying NOT NULL, \"addressId\" character varying, \"action\" character varying NOT NULL, \"actorId\" character varying NOT NULL, \"actorRole\" character varying NOT NULL, \"beforeJson\" text, \"afterJson\" text, \"reason\" text, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_a42379401a89d4cf237e475a064\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_5a9b6a9f845714f1ce626821e8\" ON \"auth\".\"customer_address_audit\" (\"addressId\", \"createdAt\") ",
      "CREATE INDEX \"IDX_f123da6fd0e3f38122014c6bbf\" ON \"auth\".\"customer_address_audit\" (\"customerId\", \"createdAt\") ",
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
