import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Admin sub-role. Support routing needs to tell a support rep from a finance admin —
 * both sign in as role=ADMIN and were previously indistinguishable.
 */
export class AddAdminRole1787900000000 implements MigrationInterface {
  name = 'AddAdminRole1787900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const driver = queryRunner.connection.options.type;
    const isSqlite = driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs';
    if (!isSqlite) await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "auth"`);

    const rows = await queryRunner.query(
      isSqlite ? `PRAGMA table_info("user")` : `SELECT column_name FROM information_schema.columns WHERE table_name='user' AND column_name='adminRole'`,
    );
    const exists = isSqlite
      ? (rows as Array<{ name: string }>).some((r) => r.name === 'adminRole')
      : (rows as unknown[]).length > 0;

    if (!exists) {
      await queryRunner.addColumn(
        'user',
        new TableColumn({ name: 'adminRole', type: 'varchar', isNullable: true }),
      );
    }
    // The seeded super-admin must not lose access.
    //
    // Qualified, not caught. This was `UPDATE "user"` with a `.catch(() => undefined)`, which
    // reads as defensive but is not: on Postgres the unqualified name resolves against the
    // default search_path and fails, and a failed statement poisons the whole transaction — so
    // catching the JavaScript error still left the migration unable to record itself, and the
    // entire chain aborted. Swallowing an error does not undo it.
    const userTable = isSqlite ? `"user"` : `"auth"."user"`;
    await queryRunner.query(
      `UPDATE ${userTable} SET "adminRole" = 'super_admin' WHERE "role" = 'admin' AND "adminRole" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('user', 'adminRole').catch(() => undefined);
  }
}
