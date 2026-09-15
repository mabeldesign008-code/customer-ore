import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/** Adds multi-location Vendor records. */
export class AddVendorLocations1760000000016 implements MigrationInterface {
  name = 'AddVendorLocations1760000000016';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'catalog.vendor_location';
    if (!(await queryRunner.hasTable(tablePath))) {
      await queryRunner.createTable(new Table({
        schema: 'catalog',
        name: 'vendor_location',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'vendorId', type: 'varchar' },
          { name: 'name', type: 'varchar' },
          { name: 'address', type: 'text' },
          { name: 'lat', type: 'float8' },
          { name: 'lng', type: 'float8' },
          { name: 'deliveryRadiusKm', type: 'float8', default: 8 },
          { name: 'accepting', type: 'boolean', default: true },
          { name: 'hoursJson', type: 'text', isNullable: true },
          { name: 'holidayHoursJson', type: 'text', isNullable: true },
          { name: 'active', type: 'boolean', default: true },
          { name: 'createdAt', type: 'timestamp without time zone', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp without time zone', default: 'now()' },
        ],
      }));
    }
    const table = await queryRunner.getTable(tablePath);
    if (table && !table.indices.some((index) => index.name === 'IDX_vendor_location_vendor_active')) await queryRunner.createIndex(tablePath, new TableIndex({ name: 'IDX_vendor_location_vendor_active', columnNames: ['vendorId', 'active'] }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('catalog.vendor_location', true);
  }
}
