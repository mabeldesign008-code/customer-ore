import { MigrationInterface, QueryRunner, Table, TableColumn, TableIndex } from 'typeorm';

/** Adds campaign budgets and idempotent checkout redemptions. */
export class AddPromotionBudgets1760000000015 implements MigrationInterface {
  name = 'AddPromotionBudgets1760000000015';

  async up(queryRunner: QueryRunner): Promise<void> {
    const promotionTable = 'catalog.vendor_promotion';
    if (!(await queryRunner.hasTable(promotionTable))) throw new Error(`${promotionTable} does not exist`);
    const columns = [
      new TableColumn({ name: 'budgetPesewas', type: 'int', isNullable: true }),
      new TableColumn({ name: 'redemptionLimit', type: 'int', isNullable: true }),
      new TableColumn({ name: 'spentPesewas', type: 'int', default: 0 }),
      new TableColumn({ name: 'redemptionsUsed', type: 'int', default: 0 }),
    ];
    for (const column of columns) if (!(await queryRunner.hasColumn(promotionTable, column.name))) await queryRunner.addColumn(promotionTable, column);

    const redemptionTable = 'catalog.promotion_redemption';
    if (await queryRunner.hasTable(redemptionTable) && !(await queryRunner.hasColumn(redemptionTable, 'customerId'))) await queryRunner.addColumn(redemptionTable, new TableColumn({ name: 'customerId', type: 'varchar', isNullable: true }));
    if (!(await queryRunner.hasTable(redemptionTable))) {
      await queryRunner.createTable(new Table({
        schema: 'catalog',
        name: 'promotion_redemption',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'orderId', type: 'varchar', isUnique: true },
          { name: 'promotionId', type: 'varchar' },
          { name: 'customerId', type: 'varchar', isNullable: true },
          { name: 'discountPesewas', type: 'int' },
          { name: 'status', type: 'varchar', default: "'REDEEMED'" },
          { name: 'createdAt', type: 'timestamp without time zone', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp without time zone', default: 'now()' },
        ],
      }));
    }
    const table = await queryRunner.getTable(redemptionTable);
    if (table && !table.indices.some((index) => index.name === 'IDX_promotion_redemption_promotion_status')) {
      await queryRunner.createIndex(redemptionTable, new TableIndex({ name: 'IDX_promotion_redemption_promotion_status', columnNames: ['promotionId', 'status'] }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('catalog.promotion_redemption', true);
    const promotionTable = 'catalog.vendor_promotion';
    if (await queryRunner.hasTable(promotionTable)) for (const name of ['redemptionsUsed', 'spentPesewas', 'redemptionLimit', 'budgetPesewas']) if (await queryRunner.hasColumn(promotionTable, name)) await queryRunner.dropColumn(promotionTable, name);
  }
}
