import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddOrderDropAndSchedule1760000000017 implements MigrationInterface {
  name = 'AddOrderDropAndSchedule1760000000017';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'order.order';
    if (!(await queryRunner.hasTable(tablePath))) throw new Error(`${tablePath} does not exist`);
    if (!(await queryRunner.hasColumn(tablePath, 'leaveAtDoor'))) {
      await queryRunner.addColumn(tablePath, new TableColumn({ name: 'leaveAtDoor', type: 'boolean', default: false }));
    }
    if (!(await queryRunner.hasColumn(tablePath, 'dropNote'))) {
      await queryRunner.addColumn(tablePath, new TableColumn({ name: 'dropNote', type: 'varchar', isNullable: true }));
    }
    if (!(await queryRunner.hasColumn(tablePath, 'scheduledFor'))) {
      await queryRunner.addColumn(tablePath, new TableColumn({ name: 'scheduledFor', type: 'timestamp with time zone', isNullable: true }));
    }
    if (!(await queryRunner.hasColumn(tablePath, 'deliverySignatureKey'))) {
      await queryRunner.addColumn(tablePath, new TableColumn({ name: 'deliverySignatureKey', type: 'varchar', isNullable: true }));
    }
    if (!(await queryRunner.hasColumn(tablePath, 'deliverySignatureContentType'))) {
      await queryRunner.addColumn(tablePath, new TableColumn({ name: 'deliverySignatureContentType', type: 'varchar', isNullable: true }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'order.order';
    for (const col of ['deliverySignatureContentType', 'deliverySignatureKey', 'scheduledFor', 'dropNote', 'leaveAtDoor']) {
      if (await queryRunner.hasColumn(tablePath, col)) await queryRunner.dropColumn(tablePath, col);
    }
  }
}
