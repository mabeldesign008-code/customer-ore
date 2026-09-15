import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/** Vendor EPT/countdown extension audit fields. Immutable detail is in order_event payloads. */
export class AddPreparationExtensionAudit1789200000000 implements MigrationInterface {
  name = 'AddPreparationExtensionAudit1789200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'order.order';
    if (!(await queryRunner.hasTable(tablePath))) throw new Error(`${tablePath} does not exist`);
    const columns = [
      new TableColumn({ name: 'originalPrepTimeMin', type: 'integer', isNullable: true }),
      new TableColumn({ name: 'prepTimeExtendedByMin', type: 'integer', default: '0' }),
      new TableColumn({ name: 'prepExtensionCount', type: 'integer', default: '0' }),
      new TableColumn({ name: 'lastPrepExtendedAt', type: 'timestamp with time zone', isNullable: true }),
      new TableColumn({ name: 'lastPrepExtendedBy', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'lastPrepExtensionReason', type: 'text', isNullable: true }),
    ];
    for (const column of columns) {
      if (!(await queryRunner.hasColumn(tablePath, column.name))) {
        await queryRunner.addColumn(tablePath, column);
      }
    }
    await queryRunner.query('UPDATE "order"."order" SET "originalPrepTimeMin" = COALESCE("originalPrepTimeMin", "prepTimeMin")');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'order.order';
    for (const column of ['lastPrepExtensionReason', 'lastPrepExtendedBy', 'lastPrepExtendedAt', 'prepExtensionCount', 'prepTimeExtendedByMin', 'originalPrepTimeMin']) {
      if (await queryRunner.hasColumn(tablePath, column)) {
        await queryRunner.dropColumn(tablePath, column);
      }
    }
  }
}
