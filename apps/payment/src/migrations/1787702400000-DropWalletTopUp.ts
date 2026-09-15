import { MigrationInterface, QueryRunner, Table } from 'typeorm';

/**
 * Drops `payment.wallet_top_up`.
 *
 * Customers never top up their wallet — they pay at checkout. The customer wallet exists
 * solely as a destination for refunds, which the customer may then withdraw or spend on a
 * later order. The top-up endpoints (`POST/GET payments/wallet/top-up`) and the
 * `WalletTopUp` entity were removed alongside this migration.
 *
 * Idempotent: safe on a fresh database where `AddWalletTopUp1760000000016` created an empty
 * table, and on one that already ran a partial drop.
 */
export class DropWalletTopUp1787702400000 implements MigrationInterface {
  name = 'DropWalletTopUp1787702400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'payment.wallet_top_up';
    if (await queryRunner.hasTable(tablePath)) await queryRunner.dropTable(tablePath, true);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
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
}
