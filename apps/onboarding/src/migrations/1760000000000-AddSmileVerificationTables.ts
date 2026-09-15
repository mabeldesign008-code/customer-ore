import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/** Adds durable SmileID submission and webhook-deduplication storage. */
export class AddSmileVerificationTables1760000000000 implements MigrationInterface {
  name = 'AddSmileVerificationTables1760000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE SCHEMA IF NOT EXISTS "onboarding"');
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    if (!(await queryRunner.hasTable('onboarding.smile_verification_job'))) {
      await queryRunner.createTable(
        new Table({
          schema: 'onboarding',
          name: 'smile_verification_job',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'uuid',
              default: 'uuid_generate_v4()',
            },
            { name: 'applicationId', type: 'varchar' },
            { name: 'applicantUserId', type: 'varchar' },
            { name: 'providerJobId', type: 'varchar' },
            { name: 'providerUserId', type: 'varchar', isNullable: true },
            { name: 'status', type: 'varchar', default: "'PENDING'" },
            { name: 'reason', type: 'varchar', isNullable: true },
            { name: 'message', type: 'text', isNullable: true },
            { name: 'providerPayload', type: 'text', isNullable: true },
            { name: 'providerCreatedAt', type: 'timestamptz', isNullable: true },
            { name: 'completedAt', type: 'timestamptz', isNullable: true },
            { name: 'createdAt', type: 'timestamp without time zone', default: 'now()' },
            { name: 'updatedAt', type: 'timestamp without time zone', default: 'now()' },
          ],
        }),
      );
    }

    await createIndexIfMissing(
      queryRunner,
      'onboarding.smile_verification_job',
      new TableIndex({
        name: 'IDX_smile_verification_job_providerJobId_unique',
        columnNames: ['providerJobId'],
        isUnique: true,
      }),
    );
    await createIndexIfMissing(
      queryRunner,
      'onboarding.smile_verification_job',
      new TableIndex({
        name: 'IDX_smile_verification_job_applicationId_createdAt',
        columnNames: ['applicationId', 'createdAt'],
      }),
    );

    if (!(await queryRunner.hasTable('onboarding.smile_verification_webhook_event'))) {
      await queryRunner.createTable(
        new Table({
          schema: 'onboarding',
          name: 'smile_verification_webhook_event',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'uuid',
              default: 'uuid_generate_v4()',
            },
            { name: 'eventHash', type: 'varchar' },
            { name: 'providerJobId', type: 'varchar' },
            { name: 'payloadJson', type: 'text' },
            { name: 'processed', type: 'boolean', default: false },
            { name: 'createdAt', type: 'timestamp without time zone', default: 'now()' },
          ],
        }),
      );
    }

    await createIndexIfMissing(
      queryRunner,
      'onboarding.smile_verification_webhook_event',
      new TableIndex({
        name: 'IDX_smile_verification_webhook_event_eventHash_unique',
        columnNames: ['eventHash'],
        isUnique: true,
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('onboarding.smile_verification_webhook_event', true);
    await queryRunner.dropTable('onboarding.smile_verification_job', true);
  }
}

async function createIndexIfMissing(
  queryRunner: QueryRunner,
  tablePath: string,
  index: TableIndex,
): Promise<void> {
  const table = await queryRunner.getTable(tablePath);
  if (!table?.indices.some((existing) => existing.name === index.name)) {
    await queryRunner.createIndex(tablePath, index);
  }
}
