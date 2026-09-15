import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/** Adds authenticated Vendor logo/banner media keys. */
export class AddVendorMedia1760000000013 implements MigrationInterface {
  name = 'AddVendorMedia1760000000013';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'catalog.vendor';
    if (!(await queryRunner.hasTable(tablePath))) throw new Error(`${tablePath} does not exist`);
    for (const name of ['logoKey', 'bannerKey']) {
      if (!(await queryRunner.hasColumn(tablePath, name))) await queryRunner.addColumn(tablePath, new TableColumn({ name, type: 'varchar', isNullable: true }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'catalog.vendor';
    if (!(await queryRunner.hasTable(tablePath))) return;
    for (const name of ['bannerKey', 'logoKey']) {
      if (await queryRunner.hasColumn(tablePath, name)) await queryRunner.dropColumn(tablePath, name);
    }
  }
}
