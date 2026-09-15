/**
 * Baseline schema for the `notification` service, generated from its entity definitions.
 *
 * Production runs with `synchronize: false`, so migrations are the only thing that builds a
 * database — but this service's chain began by altering tables that nothing had created. A
 * fresh deploy failed at boot. Dev and test never caught it because they use
 * `synchronize: true` and skip migrations entirely.
 *
 * Every statement is guarded, so this is a no-op against a database that already has the
 * objects: safe to apply to an existing deployment as well as a new one.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class BaselineNotification1750000000000 implements MigrationInterface {
  name = 'BaselineNotification1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const driver = queryRunner.connection.options.type;
    if (driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs') return; // sqlite dev uses synchronize

    await queryRunner.query('CREATE SCHEMA IF NOT EXISTS "notification"');
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    const statements: string[] = [
      "CREATE TABLE \"notification\".\"notification_feed\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"userId\" character varying NOT NULL, \"type\" character varying NOT NULL, \"title\" character varying NOT NULL, \"body\" character varying NOT NULL, \"dataJson\" text, \"read\" boolean NOT NULL DEFAULT false, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_916163bd318675ea0c33d517f82\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_7fa3dd17c4833cc2c5712c75fa\" ON \"notification\".\"notification_feed\" (\"userId\", \"createdAt\") ",
      "CREATE TABLE \"notification\".\"device_token\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"userId\" character varying NOT NULL, \"token\" text NOT NULL, \"platform\" character varying NOT NULL, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_592ce89b9ea1a268d6140f60422\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_af4d1925641c9955a0dc0d3b04\" ON \"notification\".\"device_token\" (\"userId\", \"updatedAt\") ",
      "CREATE UNIQUE INDEX \"IDX_d959c11311d3002e4bb10d9edb\" ON \"notification\".\"device_token\" (\"token\") ",
    ];

    for (const sql of statements) {
      try {
        await queryRunner.query(sql);
      } catch (err) {
        // Already present (existing deployment) — the object this statement creates is exactly
        // what a later migration or an earlier deploy already produced. Anything else rethrows.
        const msg = (err as Error).message;
        if (!/already exists/i.test(msg)) throw err;
      }
    }
  }

  public async down(): Promise<void> {
    // Intentionally empty: dropping a service's entire schema is never what a rollback wants.
  }
}
