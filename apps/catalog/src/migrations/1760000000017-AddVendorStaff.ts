import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/** Adds Vendor-scoped staff access records. */
export class AddVendorStaff1760000000017 implements MigrationInterface {
  name = 'AddVendorStaff1760000000017';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'catalog.vendor_staff';
    if (!(await queryRunner.hasTable(tablePath))) {
      await queryRunner.createTable(new Table({
        schema: 'catalog',
        name: 'vendor_staff',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'vendorId', type: 'varchar' },
          { name: 'userId', type: 'varchar' },
          { name: 'displayName', type: 'varchar' },
          { name: 'phone', type: 'varchar', isNullable: true },
          { name: 'staffRole', type: 'varchar', default: "'ORDER_OPERATOR'" },
          { name: 'active', type: 'boolean', default: true },
          { name: 'createdAt', type: 'timestamp without time zone', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp without time zone', default: 'now()' },
        ],
      }));
    }
    const table = await queryRunner.getTable(tablePath);
    if (table && !table.indices.some((index) => index.name === 'IDX_vendor_staff_vendor_user')) await queryRunner.createIndex(tablePath, new TableIndex({ name: 'IDX_vendor_staff_vendor_user', columnNames: ['vendorId', 'userId'], isUnique: true }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('catalog.vendor_staff', true);
  }
}
