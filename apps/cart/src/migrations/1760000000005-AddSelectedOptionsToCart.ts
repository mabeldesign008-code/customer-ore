import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/** Stores selected catalogue variants and their per-unit price adjustment in cart lines. */
export class AddSelectedOptionsToCart1760000000005 implements MigrationInterface {
  name = 'AddSelectedOptionsToCart1760000000005';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'cart.cart_item';
    if (!(await queryRunner.hasTable(tablePath))) throw new Error(`${tablePath} does not exist`);
    if (!(await queryRunner.hasColumn(tablePath, 'selectedOptions'))) {
      await queryRunner.addColumn(tablePath, new TableColumn({ name: 'selectedOptions', type: 'text', default: "'[]'" }));
    }
    if (!(await queryRunner.hasColumn(tablePath, 'optionsTotalPesewas'))) {
      await queryRunner.addColumn(tablePath, new TableColumn({ name: 'optionsTotalPesewas', type: 'int', default: 0 }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'cart.cart_item';
    if (!(await queryRunner.hasTable(tablePath))) return;
    if (await queryRunner.hasColumn(tablePath, 'optionsTotalPesewas')) await queryRunner.dropColumn(tablePath, 'optionsTotalPesewas');
    if (await queryRunner.hasColumn(tablePath, 'selectedOptions')) await queryRunner.dropColumn(tablePath, 'selectedOptions');
  }
}
