import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/** Persists a server-authoritative pause window for Rider sessions. */
export class AddRiderPause1760000000004 implements MigrationInterface {
  name = 'AddRiderPause1760000000004';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'dispatch.rider';
    if (!(await queryRunner.hasTable(tablePath))) throw new Error(`${tablePath} does not exist`);
    if (!(await queryRunner.hasColumn(tablePath, 'pausedUntil'))) {
      await queryRunner.addColumn(tablePath, new TableColumn({ name: 'pausedUntil', type: 'timestamp with time zone', isNullable: true }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'dispatch.rider';
    if (await queryRunner.hasTable(tablePath) && await queryRunner.hasColumn(tablePath, 'pausedUntil')) {
      await queryRunner.dropColumn(tablePath, 'pausedUntil');
    }
  }
}
