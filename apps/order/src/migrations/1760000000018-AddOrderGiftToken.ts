import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddOrderGiftToken1760000000018 implements MigrationInterface {
  name = 'AddOrderGiftToken1760000000018';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'order.order';
    if (!(await queryRunner.hasTable(tablePath))) throw new Error(`${tablePath} does not exist`);
    if (!(await queryRunner.hasColumn(tablePath, 'giftToken'))) {
      await queryRunner.addColumn(tablePath, new TableColumn({
        name: 'giftToken',
        type: 'varchar',
        length: '64',
        isNullable: true,
      }));
    }
    const table = await queryRunner.getTable(tablePath);
    if (!table?.indices.some((index) => index.name === 'order_gift_token_uidx')) {
      await queryRunner.createIndex(tablePath, new TableIndex({
        name: 'order_gift_token_uidx',
        columnNames: ['giftToken'],
        isUnique: true,
        where: '"giftToken" IS NOT NULL',
      }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'order.order';
    const table = await queryRunner.getTable(tablePath);
    if (table?.indices.some((index) => index.name === 'order_gift_token_uidx')) {
      await queryRunner.dropIndex(tablePath, 'order_gift_token_uidx');
    }
    if (await queryRunner.hasColumn(tablePath, 'giftToken')) {
      await queryRunner.dropColumn(tablePath, 'giftToken');
    }
  }
}
