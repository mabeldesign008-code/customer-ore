import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/** Optional scheduled-dash windows for a Rider. Going online without a block still works. */
export class AddRiderBlocks1760000000007 implements MigrationInterface {
  name = 'AddRiderBlocks1760000000007';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'dispatch.rider_block';
    if (!(await queryRunner.hasTable(tablePath))) {
      await queryRunner.createTable(new Table({
        schema: 'dispatch',
        name: 'rider_block',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'riderId', type: 'varchar' },
          { name: 'startsAt', type: 'timestamp with time zone' },
          { name: 'endsAt', type: 'timestamp with time zone' },
          { name: 'status', type: 'varchar', default: "'SCHEDULED'" },
          { name: 'createdAt', type: 'timestamp without time zone', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp without time zone', default: 'now()' },
        ],
      }));
    }
    const table = await queryRunner.getTable(tablePath);
    if (table && !table.indices.some((index) => index.name === 'IDX_rider_block_rider_startsAt')) {
      await queryRunner.createIndex(tablePath, new TableIndex({ name: 'IDX_rider_block_rider_startsAt', columnNames: ['riderId', 'startsAt'] }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('dispatch.rider_block', true);
  }
}
