import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/** Adds idempotent stock reservations for quantity-tracked catalogue items. */
export class AddStockReservations1760000000011 implements MigrationInterface {
  name = 'AddStockReservations1760000000011';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'catalog.stock_reservation';
    if (!(await queryRunner.hasTable(tablePath))) {
      await queryRunner.createTable(new Table({
        schema: 'catalog',
        name: 'stock_reservation',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'orderId', type: 'varchar' },
          { name: 'itemId', type: 'varchar' },
          { name: 'qty', type: 'int' },
          { name: 'status', type: 'varchar', default: "'RESERVED'" },
          { name: 'createdAt', type: 'timestamp without time zone', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp without time zone', default: 'now()' },
        ],
      }));
    }
    const table = await queryRunner.getTable(tablePath);
    if (table && !table.indices.some((index) => index.name === 'IDX_stock_reservation_order_status')) {
      await queryRunner.createIndex(tablePath, new TableIndex({ name: 'IDX_stock_reservation_order_status', columnNames: ['orderId', 'status'] }));
    }
    if (table && !table.indices.some((index) => index.name === 'IDX_stock_reservation_item_status')) {
      await queryRunner.createIndex(tablePath, new TableIndex({ name: 'IDX_stock_reservation_item_status', columnNames: ['itemId', 'status'] }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('catalog.stock_reservation', true);
  }
}
