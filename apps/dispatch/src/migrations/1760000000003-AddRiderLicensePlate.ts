import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/** Persists the Rider vehicle plate collected during onboarding. */
export class AddRiderLicensePlate1760000000003 implements MigrationInterface {
  name = 'AddRiderLicensePlate1760000000003';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'dispatch.rider';
    if (!(await queryRunner.hasTable(tablePath))) {
      throw new Error(`Cannot add Rider license plate: ${tablePath} does not exist`);
    }
    if (!(await queryRunner.hasColumn(tablePath, 'licensePlate'))) {
      await queryRunner.addColumn(
        tablePath,
        new TableColumn({
          name: 'licensePlate',
          type: 'varchar',
          isNullable: true,
        }),
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'dispatch.rider';
    if (await queryRunner.hasTable(tablePath) && await queryRunner.hasColumn(tablePath, 'licensePlate')) {
      await queryRunner.dropColumn(tablePath, 'licensePlate');
    }
  }
}
