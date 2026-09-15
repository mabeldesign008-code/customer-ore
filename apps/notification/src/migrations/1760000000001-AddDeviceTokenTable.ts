import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/** Adds durable FCM device-token registration for mobile push notifications. */
export class AddDeviceTokenTable1760000000001 implements MigrationInterface {
  name = 'AddDeviceTokenTable1760000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE SCHEMA IF NOT EXISTS "notification"');
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    if (!(await queryRunner.hasTable('notification.device_token'))) {
      await queryRunner.createTable(
        new Table({
          schema: 'notification',
          name: 'device_token',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'uuid',
              default: 'uuid_generate_v4()',
            },
            { name: 'userId', type: 'varchar' },
            { name: 'token', type: 'text' },
            { name: 'platform', type: 'varchar' },
            { name: 'createdAt', type: 'timestamp without time zone', default: 'now()' },
            { name: 'updatedAt', type: 'timestamp without time zone', default: 'now()' },
          ],
        }),
      );
    }

    const tablePath = 'notification.device_token';
    const table = await queryRunner.getTable(tablePath);
    if (!table?.indices.some((index) => index.name === 'IDX_device_token_token_unique')) {
      await queryRunner.createIndex(
        tablePath,
        new TableIndex({
          name: 'IDX_device_token_token_unique',
          columnNames: ['token'],
          isUnique: true,
        }),
      );
    }
    const refreshed = await queryRunner.getTable(tablePath);
    if (!refreshed?.indices.some((index) => index.name === 'IDX_device_token_userId_updatedAt')) {
      await queryRunner.createIndex(
        tablePath,
        new TableIndex({
          name: 'IDX_device_token_userId_updatedAt',
          columnNames: ['userId', 'updatedAt'],
        }),
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('notification.device_token', true);
  }
}
