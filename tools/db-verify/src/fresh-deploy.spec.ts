import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';

/**
 * Fresh-deploy migration check, against a real Postgres.
 *
 * In production `synchronize` is false and `migrationsRun` is true, so the migrations are the
 * *only* thing that builds a new database. Everywhere else `synchronize: true` creates the schema
 * straight from the entities, which means the migrations are never exercised in dev or in CI —
 * the first time they run for real is the first production deploy.
 *
 * This suite gives each service an empty schema and runs its migrations in order, which is
 * exactly what that deploy does.
 *
 * Skipped automatically when no Postgres is reachable, so it never breaks the normal suite.
 * Point it at a throwaway database:
 *
 *   DB_VERIFY_URL=postgres://ore:ore@127.0.0.1:5432/oredelivery \
 *     npx jest -c tools/db-verify/jest.config.cjs
 */
const URL_ = process.env.DB_VERIFY_URL ?? '';
const APPS = path.join(__dirname, '..', '..', '..', 'apps');

const SERVICES = fs
  .readdirSync(APPS)
  .filter((s) => fs.existsSync(path.join(APPS, s, 'src', 'migrations')))
  .sort();

async function loadMigrations(svc: string): Promise<Function[]> {
  const dir = path.join(APPS, svc, 'src', 'migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.ts')).sort();
  const out: Function[] = [];
  for (const f of files) {
    const mod = (await import(path.join(dir, f))) as Record<string, unknown>;
    for (const k of Object.keys(mod)) {
      if (typeof mod[k] === 'function') out.push(mod[k] as Function);
    }
  }
  return out;
}

const describeIfDb = URL_ ? describe : describe.skip;

describeIfDb('fresh production deploy — migrations against real Postgres', () => {
  const results: Record<string, { applied: number; total: number; error?: string }> = {};

  afterAll(() => {
    const rows = Object.entries(results).map(
      ([svc, r]) => `  ${r.error ? 'FAIL' : 'ok  '} ${svc.padEnd(14)} ${r.applied}/${r.total}${r.error ? `  ${r.error}` : ''}`,
    );
    console.log(`\nfresh-deploy migration results:\n${rows.join('\n')}\n`);
  });

  for (const svc of SERVICES) {
    it(`${svc}: builds its schema from an empty database`, async () => {
      const migrations = await loadMigrations(svc);
      const schema = svc;

      const admin = new DataSource({ type: 'postgres', url: URL_ });
      await admin.initialize();
      await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await admin.query(`CREATE SCHEMA "${schema}"`);
      await admin.destroy();

      const ds = new DataSource({
        type: 'postgres',
        url: URL_,
        schema,
        entities: [],
        migrations,
        migrationsRun: false,
        synchronize: false,
        logging: false,
      });
      await ds.initialize();

      let error: string | undefined;
      let applied = 0;
      try {
        // One at a time, so the report names the migration that broke rather than the service.
        for (const m of migrations) {
          try {
            await ds.runMigrations({ transaction: 'each' });
            applied = migrations.length;
            break;
          } catch (err) {
            const done = await ds.query(`SELECT name FROM "${schema}"."migrations" ORDER BY id`).catch(() => []);
            applied = (done as unknown[]).length;
            error = `[${migrations[applied]?.name ?? '?'}] ${(err as Error).message.split('\n')[0].slice(0, 120)}`;
            break;
          }
        }
      } finally {
        await ds.destroy();
      }

      results[svc] = { applied, total: migrations.length, error };
      if (error) throw new Error(`${svc}: ${error}`);
      expect(applied).toBe(migrations.length);

      // Re-run against the database it just built. A deploy that cannot be retried after a
      // partial failure — or that breaks when a pod restarts mid-rollout — is not a deploy.
      const again = new DataSource({
        type: 'postgres', url: URL_, schema, entities: [], migrations,
        migrationsRun: false, synchronize: false, logging: false,
      });
      await again.initialize();
      try {
        const reapplied = await again.runMigrations({ transaction: 'each' });
        expect(reapplied).toHaveLength(0); // all already recorded
      } finally {
        await again.destroy();
      }
    });
  }
});
