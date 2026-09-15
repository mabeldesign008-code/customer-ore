/**
 * Baseline schema for the `referral` service, generated from its entity definitions.
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

export class BaselineReferral1750000000000 implements MigrationInterface {
  name = 'BaselineReferral1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const driver = queryRunner.connection.options.type;
    if (driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs') return; // sqlite dev uses synchronize

    await queryRunner.query('CREATE SCHEMA IF NOT EXISTS "referral"');
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    const statements: string[] = [
      "CREATE TABLE \"referral\".\"referral_code\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"userId\" character varying NOT NULL, \"code\" character varying NOT NULL, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"UQ_216bc0facfff259de04e1d39af8\" UNIQUE (\"userId\"), CONSTRAINT \"UQ_e2228930b1cc8b983445357b1b8\" UNIQUE (\"code\"), CONSTRAINT \"PK_669df184f201c602c986bacd804\" PRIMARY KEY (\"id\"))",
      "CREATE TABLE \"referral\".\"referral\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"code\" character varying NOT NULL, \"referrerUserId\" character varying NOT NULL, \"referrerPhone\" character varying NOT NULL, \"refereePhone\" character varying NOT NULL, \"refereeUserId\" character varying, \"status\" character varying NOT NULL DEFAULT 'PENDING', \"fraudFlags\" text, \"qualifiedAt\" TIMESTAMP, \"creditedAt\" TIMESTAMP, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_a2d3e935a6591168066defec5ad\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_0f5f932d3ce562bdfdaa9e118f\" ON \"referral\".\"referral\" (\"status\") ",
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
