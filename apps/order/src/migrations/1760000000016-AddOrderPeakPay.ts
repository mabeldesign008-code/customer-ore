import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/** Platform-funded rider peak pay snapshotted at dispatch. */
export class AddOrderPeakPay1760000000016 implements MigrationInterface {
  name = 'AddOrderPeakPay1760000000016';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'order.order';
    if (!(await queryRunner.hasTable(tablePath))) throw new Error(`${tablePath} does not exist`);
    if (!(await queryRunner.hasColumn(tablePath, 'peakPayPesewas'))) {
      await queryRunner.addColumn(tablePath, new TableColumn({ name: 'peakPayPesewas', type: 'int', default: 0 }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'order.order';
    if (!(await queryRunner.hasTable(tablePath))) return;
    if (await queryRunner.hasColumn(tablePath, 'peakPayPesewas')) await queryRunner.dropColumn(tablePath, 'peakPayPesewas');
  }
}
