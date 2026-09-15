import { MigrationInterface, QueryRunner, Table, TableColumn, TableIndex } from 'typeorm';

export class AddFavouritesVouchers1760000000019 implements MigrationInterface {
  name = 'AddFavouritesVouchers1760000000019';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('catalog.vendor_promotion', 'code'))) {
      await queryRunner.addColumn('catalog.vendor_promotion', new TableColumn({ name: 'code', type: 'varchar', isNullable: true, isUnique: true }));
    }
    if (!(await queryRunner.hasTable('catalog.customer_favourite'))) {
      await queryRunner.createTable(new Table({
        schema: 'catalog',
        name: 'customer_favourite',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'customerId', type: 'varchar' },
          { name: 'vendorId', type: 'varchar' },
          { name: 'createdAt', type: 'timestamp without time zone', default: 'now()' },
        ],
      }));
      await queryRunner.createIndex('catalog.customer_favourite', new TableIndex({ name: 'IDX_customer_favourite_unique', columnNames: ['customerId', 'vendorId'], isUnique: true }));
    }
    if (!(await queryRunner.hasTable('catalog.customer_voucher'))) {
      await queryRunner.createTable(new Table({
        schema: 'catalog',
        name: 'customer_voucher',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'customerId', type: 'varchar' },
          { name: 'code', type: 'varchar' },
          { name: 'promotionId', type: 'varchar' },
          { name: 'vendorId', type: 'varchar' },
          { name: 'createdAt', type: 'timestamp without time zone', default: 'now()' },
        ],
      }));
      await queryRunner.createIndex('catalog.customer_voucher', new TableIndex({ name: 'IDX_customer_voucher_unique', columnNames: ['customerId', 'code'], isUnique: true }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('catalog.customer_voucher', true);
    await queryRunner.dropTable('catalog.customer_favourite', true);
    if (await queryRunner.hasColumn('catalog.vendor_promotion', 'code')) {
      await queryRunner.dropColumn('catalog.vendor_promotion', 'code');
    }
  }
}
