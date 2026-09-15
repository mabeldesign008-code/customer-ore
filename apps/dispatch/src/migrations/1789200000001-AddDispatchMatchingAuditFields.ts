import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/** Matching-engine audit/eligibility fields required for assignment lock traceability. */
export class AddDispatchMatchingAuditFields1789200000001 implements MigrationInterface {
  name = 'AddDispatchMatchingAuditFields1789200000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await this.addColumns(queryRunner, 'dispatch.rider', [
      new TableColumn({ name: 'timeoutCount', type: 'integer', default: '0' }),
      new TableColumn({ name: 'cancellationCount', type: 'integer', default: '0' }),
      new TableColumn({ name: 'restrictedUntil', type: 'timestamp with time zone', isNullable: true }),
      new TableColumn({ name: 'restrictionReason', type: 'varchar', isNullable: true }),
    ]);
    await this.addColumns(queryRunner, 'dispatch.offer', [
      new TableColumn({ name: 'score', type: 'float8', default: '0' }),
      new TableColumn({ name: 'validationJson', type: 'text', isNullable: true }),
    ]);
    await this.addColumns(queryRunner, 'dispatch.assignment', [
      new TableColumn({ name: 'offerId', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'batchId', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'pickupDistanceKm', type: 'float8', default: '0' }),
      new TableColumn({ name: 'score', type: 'float8', default: '0' }),
      new TableColumn({ name: 'source', type: 'varchar', default: "'competitive_wave'" }),
      new TableColumn({ name: 'validationJson', type: 'text', isNullable: true }),
    ]);
    if (await queryRunner.hasTable('dispatch.batch')) {
      await queryRunner.query(`UPDATE dispatch.batch SET status = 'PENDING' WHERE "riderId" IS NULL AND status = 'ACTIVE'`);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await this.dropColumns(queryRunner, 'dispatch.assignment', ['validationJson', 'source', 'score', 'pickupDistanceKm', 'batchId', 'offerId']);
    await this.dropColumns(queryRunner, 'dispatch.offer', ['validationJson', 'score']);
    await this.dropColumns(queryRunner, 'dispatch.rider', ['restrictionReason', 'restrictedUntil', 'cancellationCount', 'timeoutCount']);
  }

  private async addColumns(queryRunner: QueryRunner, tablePath: string, columns: TableColumn[]): Promise<void> {
    if (!(await queryRunner.hasTable(tablePath))) return;
    for (const column of columns) {
      if (!(await queryRunner.hasColumn(tablePath, column.name))) {
        await queryRunner.addColumn(tablePath, column);
      }
    }
  }

  private async dropColumns(queryRunner: QueryRunner, tablePath: string, columnNames: string[]): Promise<void> {
    if (!(await queryRunner.hasTable(tablePath))) return;
    for (const name of columnNames) {
      if (await queryRunner.hasColumn(tablePath, name)) {
        await queryRunner.dropColumn(tablePath, name);
      }
    }
  }
}
