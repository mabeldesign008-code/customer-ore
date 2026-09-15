import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/** Snapshots the Vendor-funded promotion applied at checkout. */
export class AddOrderPromotions1760000000010 implements MigrationInterface {
  name = 'AddOrderPromotions1760000000010';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'order.order';
    if (!(await queryRunner.hasTable(tablePath))) throw new Error(`${tablePath} does not exist`);
    const columns = [
      new TableColumn({ name: 'promotionId', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'promotionTitle', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'promotionDiscountPesewas', type: 'int', default: 0 }),
    ];
    for (const column of columns) if (!(await queryRunner.hasColumn(tablePath, column.name))) await queryRunner.addColumn(tablePath, column);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'order.order';
    if (!(await queryRunner.hasTable(tablePath))) return;
    for (const name of ['promotionDiscountPesewas', 'promotionTitle', 'promotionId']) if (await queryRunner.hasColumn(tablePath, name)) await queryRunner.dropColumn(tablePath, name);
  }
}
