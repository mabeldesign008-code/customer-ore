/**
 * Baseline schema for the `analytics` service, generated from its entity definitions.
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

export class BaselineAnalytics1750000000000 implements MigrationInterface {
  name = 'BaselineAnalytics1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const driver = queryRunner.connection.options.type;
    if (driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs') return; // sqlite dev uses synchronize

    await queryRunner.query('CREATE SCHEMA IF NOT EXISTS "analytics"');
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    const statements: string[] = [
      "CREATE TABLE \"analytics\".\"analytics_event\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"name\" character varying NOT NULL, \"envelopeId\" character varying NOT NULL, \"payloadJson\" text NOT NULL, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"UQ_9fe876acd99032f38fa1030a794\" UNIQUE (\"envelopeId\"), CONSTRAINT \"PK_29d5b2021997dfc387aa5a05ae6\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_25f75fd2cbf025ec885a0352c6\" ON \"analytics\".\"analytics_event\" (\"name\", \"createdAt\") ",
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
