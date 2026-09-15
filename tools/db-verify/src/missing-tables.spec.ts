import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';

/**
 * Which tables do the entities declare that the migrations never create?
 *
 * This is the sharp end of schema drift. An index with the wrong name is cosmetic; a table that
 * does not exist is a service that boots and then throws on its first query. Production builds
 * its database from migrations alone, while dev and test build it from the entities via
 * `synchronize`, so a table nobody wrote a migration for works perfectly everywhere except
 * production.
 */
const URL_ = process.env.DB_VERIFY_URL ?? '';
const ROOT = path.join(__dirname, '..', '..', '..');
const APPS = path.join(ROOT, 'apps');

const SERVICES = fs
  .readdirSync(APPS)
  .filter((s) => fs.existsSync(path.join(APPS, s, 'src', 'migrations')))
  .filter((s) => fs.existsSync(path.join(APPS, s, 'src', 'entities')))
  .sort();

const describeIfDb = URL_ ? describe : describe.skip;

describeIfDb('missing tables — entities the migrations never create', () => {
  const report: Record<string, string[]> = {};

  afterAll(() => {
    const lines = Object.entries(report).map(([svc, missing]) =>
      missing.length === 0 ? `  ok   ${svc}` : `  MISSING ${svc}: ${missing.join(', ')}`,
    );
    console.log(`\nmissing tables:\n${lines.join('\n')}\n`);
  });

  for (const svc of SERVICES) {
    it(`${svc}: every entity has a table`, async () => {
      const dir = path.join(APPS, svc, 'src', 'migrations');
      const files = fs.readdirSync(dir).filter((f) => f.endsWith('.ts')).sort();
      const migrations: Function[] = [];
      for (const f of files) {
        const mod = (await import(path.join(dir, f))) as Record<string, unknown>;
        for (const k of Object.keys(mod)) if (typeof mod[k] === 'function') migrations.push(mod[k] as Function);
      }
      const entMod = (await import(path.join(APPS, svc, 'src', 'entities'))) as Record<string, unknown>;
      const entities = Object.values(entMod).filter((v): v is Function => typeof v === 'function');

      const admin = new DataSource({ type: 'postgres', url: URL_ });
      await admin.initialize();
      await admin.query(`DROP SCHEMA IF EXISTS "${svc}" CASCADE`);
      await admin.query(`CREATE SCHEMA "${svc}"`);
      await admin.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      await admin.destroy();

      const built = new DataSource({
        type: 'postgres', url: URL_, schema: svc, entities: [], migrations,
        migrationsRun: false, synchronize: false, logging: false,
      });
      await built.initialize();
      await built.runMigrations({ transaction: 'each' });
      const rows = (await built.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = $1`,
        [svc],
      )) as { table_name: string }[];
      await built.destroy();

      const present = new Set(rows.map((r) => r.table_name));

      // Ask TypeORM what table each entity maps to, rather than guessing from the class name.
      const meta = new DataSource({
        type: 'postgres', url: URL_, schema: svc, entities: entities as never[],
        synchronize: false, logging: false,
      });
      await meta.initialize();
      const expected = meta.entityMetadatas.map((m) => m.tableName);
      await meta.destroy();

      const missing = expected.filter((t) => !present.has(t)).sort();
      report[svc] = missing;
      expect(missing).toEqual([]);
    });
  }
});
