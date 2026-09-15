import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/** Adds date-specific Vendor holiday/exception hours. */
export class AddVendorHolidayHours1760000000012 implements MigrationInterface {
  name = 'AddVendorHolidayHours1760000000012';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'catalog.vendor';
    if (!(await queryRunner.hasTable(tablePath))) throw new Error(`${tablePath} does not exist`);
    if (!(await queryRunner.hasColumn(tablePath, 'holidayHoursJson'))) {
      await queryRunner.addColumn(tablePath, new TableColumn({ name: 'holidayHoursJson', type: 'text', isNullable: true }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'catalog.vendor';
    if (await queryRunner.hasTable(tablePath) && await queryRunner.hasColumn(tablePath, 'holidayHoursJson')) {
      await queryRunner.dropColumn(tablePath, 'holidayHoursJson');
    }
  }
}
