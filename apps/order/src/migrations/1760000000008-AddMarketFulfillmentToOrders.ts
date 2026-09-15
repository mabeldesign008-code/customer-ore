import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/** Persists the Vendor's measured market/weight fulfillment snapshot. */
export class AddMarketFulfillmentToOrders1760000000008 implements MigrationInterface {
  name = 'AddMarketFulfillmentToOrders1760000000008';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'order.order';
    if (!(await queryRunner.hasTable(tablePath))) throw new Error(`${tablePath} does not exist`);
    if (!(await queryRunner.hasColumn(tablePath, 'marketFulfillmentJson'))) {
      await queryRunner.addColumn(tablePath, new TableColumn({ name: 'marketFulfillmentJson', type: 'text', isNullable: true }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'order.order';
    if (await queryRunner.hasTable(tablePath) && await queryRunner.hasColumn(tablePath, 'marketFulfillmentJson')) {
      await queryRunner.dropColumn(tablePath, 'marketFulfillmentJson');
    }
  }
}
