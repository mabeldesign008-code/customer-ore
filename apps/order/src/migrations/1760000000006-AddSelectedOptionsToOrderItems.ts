import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/** Snapshots selected catalogue variants into order items. */
export class AddSelectedOptionsToOrderItems1760000000006 implements MigrationInterface {
  name = 'AddSelectedOptionsToOrderItems1760000000006';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'order.order_item';
    if (!(await queryRunner.hasTable(tablePath))) throw new Error(`${tablePath} does not exist`);
    if (!(await queryRunner.hasColumn(tablePath, 'selectedOptions'))) {
      await queryRunner.addColumn(tablePath, new TableColumn({ name: 'selectedOptions', type: 'text', default: "'[]'" }));
    }
    if (!(await queryRunner.hasColumn(tablePath, 'optionsTotalPesewas'))) {
      await queryRunner.addColumn(tablePath, new TableColumn({ name: 'optionsTotalPesewas', type: 'int', default: 0 }));
    }
    if (!(await queryRunner.hasColumn(tablePath, 'prescriptionOnly'))) {
      await queryRunner.addColumn(tablePath, new TableColumn({ name: 'prescriptionOnly', type: 'boolean', default: false }));
    }

    const orderTable = 'order.order';
    if (!(await queryRunner.hasTable(orderTable))) throw new Error(`${orderTable} does not exist`);
    const orderColumns: TableColumn[] = [
      new TableColumn({ name: 'prescriptionStatus', type: 'varchar', default: "'NOT_REQUIRED'" }),
      new TableColumn({ name: 'prescriptionKey', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'prescriptionContentType', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'prescriptionReviewNote', type: 'text', isNullable: true }),
      new TableColumn({ name: 'conditionJson', type: 'text', isNullable: true }),
    ];
    for (const column of orderColumns) {
      if (!(await queryRunner.hasColumn(orderTable, column.name))) await queryRunner.addColumn(orderTable, column);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'order.order_item';
    if (!(await queryRunner.hasTable(tablePath))) return;
    if (await queryRunner.hasColumn(tablePath, 'prescriptionOnly')) await queryRunner.dropColumn(tablePath, 'prescriptionOnly');
    if (await queryRunner.hasColumn(tablePath, 'optionsTotalPesewas')) await queryRunner.dropColumn(tablePath, 'optionsTotalPesewas');
    if (await queryRunner.hasColumn(tablePath, 'selectedOptions')) await queryRunner.dropColumn(tablePath, 'selectedOptions');
    const orderTable = 'order.order';
    if (await queryRunner.hasTable(orderTable)) {
      for (const name of ['conditionJson', 'prescriptionReviewNote', 'prescriptionContentType', 'prescriptionKey', 'prescriptionStatus']) {
        if (await queryRunner.hasColumn(orderTable, name)) await queryRunner.dropColumn(orderTable, name);
      }
    }
  }
}
