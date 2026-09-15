import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/** Persists the server-authoritative end of an online Rider session. */
export class AddRiderSession1760000000006 implements MigrationInterface {
  name = 'AddRiderSession1760000000006';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'dispatch.rider';
    if (!(await queryRunner.hasTable(tablePath))) throw new Error(`${tablePath} does not exist`);
    if (!(await queryRunner.hasColumn(tablePath, 'sessionEndsAt'))) {
      await queryRunner.addColumn(tablePath, new TableColumn({ name: 'sessionEndsAt', type: 'timestamp with time zone', isNullable: true }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'dispatch.rider';
    if (await queryRunner.hasTable(tablePath) && await queryRunner.hasColumn(tablePath, 'sessionEndsAt')) {
      await queryRunner.dropColumn(tablePath, 'sessionEndsAt');
    }
  }
}
