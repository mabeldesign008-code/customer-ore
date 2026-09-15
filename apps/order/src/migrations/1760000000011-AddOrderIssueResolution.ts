import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/** Adds non-financial operations acknowledgement/resolution metadata to Vendor issues. */
export class AddOrderIssueResolution1760000000011 implements MigrationInterface {
  name = 'AddOrderIssueResolution1760000000011';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'order.order_issue';
    if (!(await queryRunner.hasTable(tablePath))) throw new Error(`${tablePath} does not exist`);
    const columns = [
      new TableColumn({ name: 'resolutionNote', type: 'text', isNullable: true }),
      new TableColumn({ name: 'resolvedBy', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'resolvedAt', type: 'timestamp with time zone', isNullable: true }),
    ];
    for (const column of columns) if (!(await queryRunner.hasColumn(tablePath, column.name))) await queryRunner.addColumn(tablePath, column);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'order.order_issue';
    if (!(await queryRunner.hasTable(tablePath))) return;
    for (const name of ['resolvedAt', 'resolvedBy', 'resolutionNote']) if (await queryRunner.hasColumn(tablePath, name)) await queryRunner.dropColumn(tablePath, name);
  }
}
