import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/** Adds Vendor-managed Laundry lifecycle stage separate from the delivery state machine. */
export class AddLaundryLifecycle1760000000009 implements MigrationInterface {
  name = 'AddLaundryLifecycle1760000000009';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'order.order';
    if (!(await queryRunner.hasTable(tablePath))) throw new Error(`${tablePath} does not exist`);
    if (!(await queryRunner.hasColumn(tablePath, 'laundryStage'))) await queryRunner.addColumn(tablePath, new TableColumn({ name: 'laundryStage', type: 'varchar', isNullable: true }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'order.order';
    if (await queryRunner.hasTable(tablePath) && await queryRunner.hasColumn(tablePath, 'laundryStage')) await queryRunner.dropColumn(tablePath, 'laundryStage');
  }
}
