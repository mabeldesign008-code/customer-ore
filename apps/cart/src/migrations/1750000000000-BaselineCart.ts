/**
 * Baseline schema for the `cart` service, generated from its entity definitions.
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

export class BaselineCart1750000000000 implements MigrationInterface {
  name = 'BaselineCart1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const driver = queryRunner.connection.options.type;
    if (driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs') return; // sqlite dev uses synchronize

    await queryRunner.query('CREATE SCHEMA IF NOT EXISTS "cart"');
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    const statements: string[] = [
      "CREATE TABLE \"cart\".\"cart\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"customerId\" character varying NOT NULL, \"status\" character varying NOT NULL DEFAULT 'ACTIVE', \"checkoutId\" character varying, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_c524ec48751b9b5bcfbf6e59be7\" PRIMARY KEY (\"id\"))",
      "CREATE TABLE \"cart\".\"cart_item\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"cartId\" character varying NOT NULL, \"vendorId\" character varying NOT NULL, \"itemId\" character varying NOT NULL, \"itemName\" character varying NOT NULL, \"qty\" integer NOT NULL, \"unitPricePesewas\" integer NOT NULL, \"modifiers\" text NOT NULL DEFAULT '[]', \"selectedOptions\" text NOT NULL DEFAULT '[]', \"optionsTotalPesewas\" integer NOT NULL DEFAULT '0', \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_bd94725aa84f8cf37632bcde997\" PRIMARY KEY (\"id\"))",
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
