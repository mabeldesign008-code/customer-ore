import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/** Stores sender/recipient and custody details for request-only Parcel orders. */
export class AddParcelLifecycle1760000000014 implements MigrationInterface {
  name = 'AddParcelLifecycle1760000000014';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'order.order';
    if (!(await queryRunner.hasTable(tablePath))) throw new Error(`${tablePath} does not exist`);
    if (!(await queryRunner.hasColumn(tablePath, 'parcelJson'))) {
      await queryRunner.addColumn(tablePath, new TableColumn({ name: 'parcelJson', type: 'text', isNullable: true }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'order.order';
    if (await queryRunner.hasTable(tablePath) && await queryRunner.hasColumn(tablePath, 'parcelJson')) {
      await queryRunner.dropColumn(tablePath, 'parcelJson');
    }
  }
}
