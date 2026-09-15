import { MigrationInterface, QueryRunner, Table } from 'typeorm';

/** Adds a generic Vendor POS webhook connection. */
export class AddVendorPosConnections1760000000018 implements MigrationInterface {
  name = 'AddVendorPosConnections1760000000018';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'catalog.vendor_pos_connection';
    if (!(await queryRunner.hasTable(tablePath))) await queryRunner.createTable(new Table({ schema: 'catalog', name: 'vendor_pos_connection', columns: [
      { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
      { name: 'vendorId', type: 'varchar', isUnique: true },
      { name: 'provider', type: 'varchar' },
      { name: 'externalStoreId', type: 'varchar', isNullable: true },
      { name: 'tokenHash', type: 'varchar' },
      { name: 'active', type: 'boolean', default: true },
      { name: 'lastReceivedAt', type: 'timestamp with time zone', isNullable: true },
      { name: 'createdAt', type: 'timestamp without time zone', default: 'now()' },
      { name: 'updatedAt', type: 'timestamp without time zone', default: 'now()' },
    ] }));
  }

  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.dropTable('catalog.vendor_pos_connection', true); }
}
