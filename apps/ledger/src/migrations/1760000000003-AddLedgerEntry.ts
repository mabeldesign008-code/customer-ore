import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddLedgerEntry1760000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // sqlite spells it `datetime`; Postgres has no such type, and TypeORM passes the string
    // straight through, so the generated DDL failed with `syntax error at or near "NOT"`.
    const driver = queryRunner.connection.options.type;
    const isSqlite = driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs';
    const tsType = isSqlite ? 'datetime' : 'timestamp';

    if (!isSqlite) {
      await queryRunner.query('CREATE SCHEMA IF NOT EXISTS "ledger"');
      await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    }

    await queryRunner.createTable(
      new Table({
        name: 'ledger_entry',
        columns: [
          {
            // `varchar` + the uuid generation strategy makes the Postgres driver emit no type at
            // all — `"id" NOT NULL DEFAULT uuid_generate_v4()` — which fails to parse. sqlite has
            // no uuid type, so the two dialects need different columns for the same thing.
            name: 'id',
            type: isSqlite ? 'varchar' : 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
            ...(isSqlite ? {} : { default: 'uuid_generate_v4()' }),
          },
          {
            name: 'orderId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'account',
            type: 'varchar',
          },
          {
            name: 'debitPesewas',
            type: 'int',
            default: 0,
          },
          {
            name: 'creditPesewas',
            type: 'int',
            default: 0,
          },
          {
            name: 'ref',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'metaJson',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: tsType,
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('ledger_entry');
  }
}
