import { MigrationInterface, QueryRunner, Table } from 'typeorm';

/** Customer wallet top-up charges (Paystack initialize + webhook credit). */
export class AddWalletTopUp1760000000016 implements MigrationInterface {
  name = 'AddWalletTopUp1760000000016';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'payment.wallet_top_up';
    if (await queryRunner.hasTable(tablePath)) return;
    await queryRunner.createTable(
      new Table({
        schema: 'payment',
        name: 'wallet_top_up',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'userId', type: 'varchar' },
          { name: 'reference', type: 'varchar', isUnique: true },
          { name: 'amountPesewas', type: 'int' },
          { name: 'currency', type: 'varchar', default: "'GHS'" },
          { name: 'channel', type: 'varchar', isNullable: true },
          { name: 'status', type: 'varchar', default: "'INITIATED'" },
          { name: 'paidAt', type: 'timestamp with time zone', isNullable: true },
          { name: 'createdAt', type: 'timestamp without time zone', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp without time zone', default: 'now()' },
        ],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'payment.wallet_top_up';
    if (await queryRunner.hasTable(tablePath)) await queryRunner.dropTable(tablePath, true);
  }
}
