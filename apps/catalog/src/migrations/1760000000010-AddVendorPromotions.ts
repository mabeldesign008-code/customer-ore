import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/** Adds the Vendor campaign-management contract without changing checkout pricing yet. */
export class AddVendorPromotions1760000000010 implements MigrationInterface {
  name = 'AddVendorPromotions1760000000010';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'catalog.vendor_promotion';
    if (!(await queryRunner.hasTable(tablePath))) {
      await queryRunner.createTable(new Table({
        schema: 'catalog',
        name: 'vendor_promotion',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'vendorId', type: 'varchar' },
          { name: 'title', type: 'varchar' },
          { name: 'discountType', type: 'varchar' },
          { name: 'discountValue', type: 'int' },
          { name: 'minimumSubtotalPesewas', type: 'int', default: 0 },
          { name: 'startsAt', type: 'timestamp with time zone' },
          { name: 'endsAt', type: 'timestamp with time zone' },
          { name: 'active', type: 'boolean', default: true },
          { name: 'createdAt', type: 'timestamp without time zone', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp without time zone', default: 'now()' },
        ],
      }));
    }
    const table = await queryRunner.getTable(tablePath);
    if (table && !table.indices.some((index) => index.name === 'IDX_vendor_promotion_active_window')) {
      await queryRunner.createIndex(tablePath, new TableIndex({ name: 'IDX_vendor_promotion_active_window', columnNames: ['vendorId', 'active', 'startsAt', 'endsAt'] }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('catalog.vendor_promotion', true);
  }
}
