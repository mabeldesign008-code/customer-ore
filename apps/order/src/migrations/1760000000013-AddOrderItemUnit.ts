import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/** Preserves catalogue units/pack basis for Rider and order operational views. */
export class AddOrderItemUnit1760000000013 implements MigrationInterface {
  name = 'AddOrderItemUnit1760000000013';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'order.order_item';
    if (!(await queryRunner.hasTable(tablePath))) throw new Error(`${tablePath} does not exist`);
    if (!(await queryRunner.hasColumn(tablePath, 'unit'))) {
      await queryRunner.addColumn(tablePath, new TableColumn({ name: 'unit', type: 'varchar', isNullable: true }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'order.order_item';
    if (await queryRunner.hasTable(tablePath) && await queryRunner.hasColumn(tablePath, 'unit')) {
      await queryRunner.dropColumn(tablePath, 'unit');
    }
  }
}
