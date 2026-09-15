import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/** Adds delivered-order Vendor reviews and Vendor responses. */
export class AddVendorReviews1760000000014 implements MigrationInterface {
  name = 'AddVendorReviews1760000000014';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'catalog.vendor_review';
    if (!(await queryRunner.hasTable(tablePath))) {
      await queryRunner.createTable(new Table({
        schema: 'catalog',
        name: 'vendor_review',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'orderId', type: 'varchar', isUnique: true },
          { name: 'vendorId', type: 'varchar' },
          { name: 'customerId', type: 'varchar' },
          { name: 'rating', type: 'int' },
          { name: 'comment', type: 'text', isNullable: true },
          { name: 'vendorResponse', type: 'text', isNullable: true },
          { name: 'respondedAt', type: 'timestamp with time zone', isNullable: true },
          { name: 'createdAt', type: 'timestamp without time zone', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp without time zone', default: 'now()' },
        ],
      }));
    }
    const table = await queryRunner.getTable(tablePath);
    if (table && !table.indices.some((index) => index.name === 'IDX_vendor_review_vendor_created')) {
      await queryRunner.createIndex(tablePath, new TableIndex({ name: 'IDX_vendor_review_vendor_created', columnNames: ['vendorId', 'createdAt'] }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('catalog.vendor_review', true);
  }
}
