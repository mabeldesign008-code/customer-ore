import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Compliance: holds, KYC reviews, fraud flags.
 *
 * The scope is deliberately narrow — holds, KYC review and fraud flags. Consent gating, DSAR,
 * breach and retention work items were scoped out by the product owner; the permission keys for
 * them remain in the matrix but nothing is built against them.
 */
export class AddCompliance1788900000000 implements MigrationInterface {
  name = 'AddCompliance1788900000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query('CREATE SCHEMA IF NOT EXISTS "auth"');
    await q.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    if (!(await q.hasTable('auth.compliance_hold'))) {
      await q.createTable(new Table({
        schema: 'auth',
        name: 'compliance_hold',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'targetType', type: 'varchar' },
          { name: 'targetId', type: 'varchar' },
          { name: 'scope', type: 'varchar', default: `'ALL'` },
          { name: 'reason', type: 'text' },
          { name: 'status', type: 'varchar', default: `'ACTIVE'` },
          { name: 'until', type: 'timestamp', isNullable: true },
          { name: 'placedBy', type: 'varchar', isNullable: true },
          { name: 'liftedBy', type: 'varchar', isNullable: true },
          { name: 'liftedAt', type: 'timestamp', isNullable: true },
          { name: 'liftNote', type: 'text', isNullable: true },
          { name: 'fraudFlagId', type: 'varchar', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
        ],
      }));
      await q.createIndex('auth.compliance_hold', new TableIndex({
        name: 'IDX_hold_target_status', columnNames: ['targetType', 'targetId', 'status'],
      }));
      await q.createIndex('auth.compliance_hold', new TableIndex({
        name: 'IDX_hold_status_created', columnNames: ['status', 'createdAt'],
      }));
    }

    if (!(await q.hasTable('auth.kyc_review'))) {
      await q.createTable(new Table({
        schema: 'auth',
        name: 'kyc_review',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'userId', type: 'varchar' },
          { name: 'userType', type: 'varchar', default: `'CUSTOMER'` },
          { name: 'status', type: 'varchar', default: `'PENDING'` },
          { name: 'documentKeysJson', type: 'text', isNullable: true },
          { name: 'idNumber', type: 'varchar', isNullable: true },
          { name: 'fullName', type: 'varchar', isNullable: true },
          { name: 'submittedBy', type: 'varchar', isNullable: true },
          { name: 'submittedAt', type: 'timestamp', isNullable: true },
          { name: 'decidedBy', type: 'varchar', isNullable: true },
          { name: 'decidedAt', type: 'timestamp', isNullable: true },
          { name: 'decisionNote', type: 'text', isNullable: true },
          { name: 'provider', type: 'varchar', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
      }));
      await q.createIndex('auth.kyc_review', new TableIndex({
        name: 'IDX_kyc_status_created', columnNames: ['status', 'createdAt'],
      }));
      await q.createIndex('auth.kyc_review', new TableIndex({
        name: 'IDX_kyc_user_created', columnNames: ['userId', 'createdAt'],
      }));
    }

    if (!(await q.hasTable('auth.fraud_flag'))) {
      await q.createTable(new Table({
        schema: 'auth',
        name: 'fraud_flag',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'targetType', type: 'varchar' },
          { name: 'targetId', type: 'varchar' },
          { name: 'severity', type: 'varchar', default: `'MEDIUM'` },
          { name: 'category', type: 'varchar' },
          { name: 'reason', type: 'text' },
          { name: 'evidenceJson', type: 'text', isNullable: true },
          { name: 'status', type: 'varchar', default: `'OPEN'` },
          { name: 'raisedBy', type: 'varchar' },
          { name: 'assignedTo', type: 'varchar', isNullable: true },
          { name: 'resolvedBy', type: 'varchar', isNullable: true },
          { name: 'resolvedAt', type: 'timestamp', isNullable: true },
          { name: 'resolutionNote', type: 'text', isNullable: true },
          { name: 'holdId', type: 'varchar', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
      }));
      await q.createIndex('auth.fraud_flag', new TableIndex({
        name: 'IDX_flag_status_severity', columnNames: ['status', 'severity'],
      }));
      await q.createIndex('auth.fraud_flag', new TableIndex({
        name: 'IDX_flag_target', columnNames: ['targetType', 'targetId'],
      }));
    }
  }

  async down(q: QueryRunner): Promise<void> {
    for (const t of ['fraud_flag', 'kyc_review', 'compliance_hold']) {
      if (await q.hasTable(`auth.${t}`)) await q.dropTable(`auth.${t}`, true);
    }
  }
}
