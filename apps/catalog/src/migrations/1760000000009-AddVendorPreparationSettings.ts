import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/** Adds the Vendor-level default used when a new catalogue item omits prep time. */
export class AddVendorPreparationSettings1760000000009 implements MigrationInterface {
  name = 'AddVendorPreparationSettings1760000000009';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'catalog.vendor';
    if (!(await queryRunner.hasTable(tablePath))) throw new Error(`${tablePath} does not exist`);
    if (!(await queryRunner.hasColumn(tablePath, 'defaultPrepTimeMin'))) {
      await queryRunner.addColumn(tablePath, new TableColumn({ name: 'defaultPrepTimeMin', type: 'int', default: 10 }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'catalog.vendor';
    if (await queryRunner.hasTable(tablePath) && await queryRunner.hasColumn(tablePath, 'defaultPrepTimeMin')) {
      await queryRunner.dropColumn(tablePath, 'defaultPrepTimeMin');
    }
  }
}
