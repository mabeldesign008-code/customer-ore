import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/** Durable Rider safety/incident records. */
export class AddRiderIncidents1760000000005 implements MigrationInterface {
  name = 'AddRiderIncidents1760000000005';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'dispatch.rider_incident';
    if (!(await queryRunner.hasTable(tablePath))) {
      await queryRunner.createTable(new Table({
        schema: 'dispatch',
        name: 'rider_incident',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'riderId', type: 'varchar' },
          { name: 'orderId', type: 'varchar', isNullable: true },
          { name: 'type', type: 'varchar' },
          { name: 'note', type: 'text', isNullable: true },
          { name: 'lat', type: 'float8', isNullable: true },
          { name: 'lng', type: 'float8', isNullable: true },
          { name: 'status', type: 'varchar', default: "'OPEN'" },
          { name: 'createdAt', type: 'timestamp without time zone', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp without time zone', default: 'now()' },
        ],
      }));
    }
    const table = await queryRunner.getTable(tablePath);
    if (table && !table.indices.some((index) => index.name === 'IDX_rider_incident_rider_createdAt')) {
      await queryRunner.createIndex(tablePath, new TableIndex({ name: 'IDX_rider_incident_rider_createdAt', columnNames: ['riderId', 'createdAt'] }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('dispatch.rider_incident', true);
  }
}
