import { MigrationInterface, QueryRunner, TableColumn, Table } from 'typeorm';

/**
 * Replay guard for money movements (audit P0).
 *
 *  - `ledger_entry.idempotencyKey` — traceability: the business key of the batch each
 *    row belongs to (NOT unique; every leg of one batch shares the key).
 *  - `ledger.ledger_idempotency` — the commit point: one row per batch, key as PK, so a
 *    redelivered/republished event can never post a second batch with the same key.
 */
export class AddLedgerIdempotencyKey1789100000002 implements MigrationInterface {
  name = 'AddLedgerIdempotencyKey1789100000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    // sqlite spells it `datetime`; Postgres has no such type and the DDL fails outright.
    const driver = queryRunner.connection.options.type;
    const isSqlite = driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs';
    const tsType = isSqlite ? 'datetime' : 'timestamp';

    const tablePath = 'ledger.ledger_entry';
    if (await queryRunner.hasTable(tablePath)) {
      if (!(await queryRunner.hasColumn(tablePath, 'idempotencyKey'))) {
        await queryRunner.addColumn(
          tablePath,
          new TableColumn({ name: 'idempotencyKey', type: 'varchar', isNullable: true }),
        );
      }
    }

    if (!(await queryRunner.hasTable('ledger.ledger_idempotency'))) {
      await queryRunner.createTable(
        new Table({
          name: 'ledger.ledger_idempotency',
          columns: [
            { name: 'id', type: 'varchar', isPrimary: true },
            { name: 'createdAt', type: tsType, default: 'CURRENT_TIMESTAMP' },
          ],
        }),
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'ledger.ledger_entry';
    if (await queryRunner.hasTable(tablePath)) {
      if (await queryRunner.hasColumn(tablePath, 'idempotencyKey')) {
        await queryRunner.dropColumn(tablePath, 'idempotencyKey');
      }
    }
    if (await queryRunner.hasTable('ledger.ledger_idempotency')) {
      await queryRunner.dropTable('ledger.ledger_idempotency');
    }
  }
}
