/**
 * Generates a baseline migration per service from its entity metadata.
 *
 * Run with:
 *   DB_VERIFY_URL=postgres://... npx jest -c tools/db-verify/jest.config.cjs generate-baseline
 *
 * Why this is needed: in production `synchronize` is false and the migrations are the only
 * thing that builds the database — but most services' chains start by *altering* tables nothing
 * ever created, because dev and test use `synchronize: true` and never exercise them. A fresh
 * deploy of those services fails at boot.
 *
 * The generated baseline is guarded per table, so it is a no-op against a database that already
 * has them. That makes it safe to add to an existing deployment as well as a new one.
 */
import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';

const URL_ = process.env.DB_VERIFY_URL ?? '';
const ROOT = path.join(__dirname, '..', '..', '..');
const APPS = path.join(ROOT, 'apps');

/**
 * Every service that owns entities. The timestamp sorts before all existing migrations, so the
 * baseline runs first and later migrations become no-ops on a fresh database while staying
 * unchanged for an existing one.
 */
const NEEDS_BASELINE = fs
  .readdirSync(APPS)
  .filter((s) => fs.existsSync(path.join(APPS, s, 'src', 'entities')))
  .filter((s) => fs.existsSync(path.join(APPS, s, 'src', 'migrations')))
  .sort();
const BASELINE_TS = 1750000000000;

const describeIfDb = URL_ && process.env.GENERATE_BASELINE ? describe : describe.skip;

describeIfDb('generate baseline migrations', () => {
  for (const svc of NEEDS_BASELINE) {
    it(`${svc}`, async () => {
      const mod = (await import(path.join(APPS, svc, 'src', 'entities'))) as Record<string, unknown>;
      const entities = Object.values(mod).filter(
        (v): v is Function => typeof v === 'function' && Reflect.hasMetadata?.('design:type', v.prototype ?? {}) !== undefined,
      );

      // The entities hardcode `@Entity({ schema: '<svc>' })`, so the schema builder always
      // diffs against the real schema and ignores the datasource's `schema` option. It must
      // therefore start genuinely empty, or the "baseline" comes out as a diff against
      // whatever half-built state a previous run left behind.
      const scratch = svc;
      const admin = new DataSource({ type: 'postgres', url: URL_ });
      await admin.initialize();
      await admin.query(`DROP SCHEMA IF EXISTS "${scratch}" CASCADE`);
      await admin.query(`CREATE SCHEMA "${scratch}"`);
      await admin.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      await admin.destroy();

      const ds = new DataSource({
        type: 'postgres',
        url: URL_,
        schema: scratch,
        entities: entities as never[],
        synchronize: false,
        logging: false,
      });
      await ds.initialize();

      const sqlInMemory = await ds.driver.createSchemaBuilder().log();
      const ups = sqlInMemory.upQueries.map((q) => q.query);
      await ds.destroy();

      // Rewrite the scratch schema name to the real one, and split by statement kind so each
      // can be guarded independently.
      const rewritten = ups.map((q) => q.split(`"${scratch}"`).join(`"${svc}"`));

      const cls = `Baseline${svc[0].toUpperCase()}${svc.slice(1)}${BASELINE_TS}`;
      const body = rewritten.map((q) => '      ' + JSON.stringify(q) + ',').join('\n');

      const file = `/**
 * Baseline schema for the \`${svc}\` service, generated from its entity definitions.
 *
 * Production runs with \`synchronize: false\`, so migrations are the only thing that builds a
 * database — but this service's chain began by altering tables that nothing had created. A
 * fresh deploy failed at boot. Dev and test never caught it because they use
 * \`synchronize: true\` and skip migrations entirely.
 *
 * Every statement is guarded, so this is a no-op against a database that already has the
 * objects: safe to apply to an existing deployment as well as a new one.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class ${cls} implements MigrationInterface {
  name = '${cls}';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const driver = queryRunner.connection.options.type;
    if (driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs') return; // sqlite dev uses synchronize

    await queryRunner.query('CREATE SCHEMA IF NOT EXISTS "${svc}"');
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    const statements: string[] = [
${body}
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
`;
      const out = path.join(APPS, svc, 'src', 'migrations', `${BASELINE_TS}-Baseline${svc[0].toUpperCase()}${svc.slice(1)}.ts`);
      fs.writeFileSync(out, file);
      console.log(`  wrote ${path.relative(ROOT, out)} (${rewritten.length} statements)`);
      expect(rewritten.length).toBeGreaterThan(0);
    });
  }
});
