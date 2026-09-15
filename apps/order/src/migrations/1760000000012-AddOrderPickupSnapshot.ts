import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/** Snapshots the Vendor branch/primary pickup context for Dispatch and Rider. */
export class AddOrderPickupSnapshot1760000000012 implements MigrationInterface {
  name = 'AddOrderPickupSnapshot1760000000012';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'order.order';
    if (!(await queryRunner.hasTable(tablePath))) throw new Error(`${tablePath} does not exist`);
    if (!(await queryRunner.hasColumn(tablePath, 'pickupJson'))) {
      await queryRunner.addColumn(tablePath, new TableColumn({ name: 'pickupJson', type: 'text', isNullable: true }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'order.order';
    if (await queryRunner.hasTable(tablePath) && await queryRunner.hasColumn(tablePath, 'pickupJson')) {
      await queryRunner.dropColumn(tablePath, 'pickupJson');
    }
  }
}
