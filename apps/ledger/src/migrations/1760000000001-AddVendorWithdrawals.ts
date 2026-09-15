import { MigrationInterface, QueryRunner, Table, TableColumn, TableIndex } from 'typeorm';

/** Adds optional early Vendor payout requests and the balance hold column. */
export class AddVendorWithdrawals1760000000001 implements MigrationInterface {
  name = 'AddVendorWithdrawals1760000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    const balanceTable = 'ledger.vendor_balance';
    if (await queryRunner.hasTable(balanceTable) && !(await queryRunner.hasColumn(balanceTable, 'withdrawalHeldPesewas'))) await queryRunner.addColumn(balanceTable, new TableColumn({ name: 'withdrawalHeldPesewas', type: 'int', default: 0 }));
    const tablePath = 'ledger.vendor_withdrawal';
    if (!(await queryRunner.hasTable(tablePath))) {
      await queryRunner.createTable(new Table({
        schema: 'ledger',
        name: 'vendor_withdrawal',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'vendorId', type: 'varchar' },
          { name: 'amountPesewas', type: 'int' },
          { name: 'destination', type: 'varchar' },
          { name: 'status', type: 'varchar', default: "'REQUESTED'" },
          { name: 'transferReference', type: 'varchar', isNullable: true },
          { name: 'note', type: 'text', isNullable: true },
          { name: 'processedAt', type: 'timestamp with time zone', isNullable: true },
          { name: 'createdAt', type: 'timestamp without time zone', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp without time zone', default: 'now()' },
        ],
      }));
    }
    const table = await queryRunner.getTable(tablePath);
    if (table && !table.indices.some((index) => index.name === 'IDX_vendor_withdrawal_vendor_status')) await queryRunner.createIndex(tablePath, new TableIndex({ name: 'IDX_vendor_withdrawal_vendor_status', columnNames: ['vendorId', 'status'] }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('ledger.vendor_withdrawal', true);
    const balanceTable = 'ledger.vendor_balance';
    if (await queryRunner.hasTable(balanceTable) && await queryRunner.hasColumn(balanceTable, 'withdrawalHeldPesewas')) await queryRunner.dropColumn(balanceTable, 'withdrawalHeldPesewas');
  }
}
