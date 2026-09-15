import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/** Adds shared variant/media and six-vertical catalogue fields. */
export class AddVerticalCatalogFields1760000000004 implements MigrationInterface {
  name = 'AddVerticalCatalogFields1760000000004';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'catalog.menu_item';
    if (!(await queryRunner.hasTable(tablePath))) {
      throw new Error(`Cannot add vertical catalogue fields: ${tablePath} does not exist`);
    }

    const columns: TableColumn[] = [
      new TableColumn({ name: 'addonGroups', type: 'text', isNullable: true }),
      new TableColumn({ name: 'imageKey', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'imageContentType', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'sku', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'expiryDate', type: 'timestamptz', isNullable: true }),
      new TableColumn({ name: 'dosage', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'turnaround', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'dailyMarketPrice', type: 'boolean', default: false }),
      new TableColumn({ name: 'garmentType', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'conditionJson', type: 'text', isNullable: true }),
      new TableColumn({ name: 'dietaryTags', type: 'text', default: "'[]'" }),
    ];
    for (const column of columns) {
      if (!(await queryRunner.hasColumn(tablePath, column.name))) {
        await queryRunner.addColumn(tablePath, column);
      }
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'catalog.menu_item';
    if (!(await queryRunner.hasTable(tablePath))) return;
    const names = [
      'dietaryTags',
      'conditionJson',
      'garmentType',
      'dailyMarketPrice',
      'turnaround',
      'dosage',
      'expiryDate',
      'sku',
      'imageContentType',
      'imageKey',
      'addonGroups',
    ];
    for (const name of names) {
      if (await queryRunner.hasColumn(tablePath, name)) await queryRunner.dropColumn(tablePath, name);
    }
  }
}
