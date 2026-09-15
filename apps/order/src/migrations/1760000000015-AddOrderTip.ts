import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/** Customer-paid rider tip snapshotted at checkout. */
export class AddOrderTip1760000000015 implements MigrationInterface {
  name = 'AddOrderTip1760000000015';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'order.order';
    if (!(await queryRunner.hasTable(tablePath))) throw new Error(`${tablePath} does not exist`);
    if (!(await queryRunner.hasColumn(tablePath, 'tipPesewas'))) {
      await queryRunner.addColumn(tablePath, new TableColumn({ name: 'tipPesewas', type: 'int', default: 0 }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'order.order';
    if (!(await queryRunner.hasTable(tablePath))) return;
    if (await queryRunner.hasColumn(tablePath, 'tipPesewas')) await queryRunner.dropColumn(tablePath, 'tipPesewas');
  }
}
