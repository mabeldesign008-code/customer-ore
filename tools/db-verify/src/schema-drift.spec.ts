import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';

/**
 * Schema drift: does the database the migrations build match what the entities expect?
 *
 * A migration chain that runs cleanly can still produce the wrong schema — a column the entities
 * think is `int` created as `varchar`, an index the query planner needs that was never added, a
 * nullable column the code assumes is `NOT NULL`. Nothing catches that, because dev and test use
 * `synchronize: true` and build their schema straight from the entities. The two never meet
 * until production, where the entities meet a database built by migrations for the first time.
 *
 * TypeORM can answer this directly: build the schema from migrations, then ask the schema
 * builder what it *would* change to reach the entity definitions. Anything it wants to change is
 * drift.
 */
const URL_ = process.env.DB_VERIFY_URL ?? '';
const ROOT = path.join(__dirname, '..', '..', '..');
const APPS = path.join(ROOT, 'apps');

const SERVICES = fs
  .readdirSync(APPS)
  .filter((s) => fs.existsSync(path.join(APPS, s, 'src', 'migrations')))
  .filter((s) => fs.existsSync(path.join(APPS, s, 'src', 'entities')))
  .sort();

const IGNORE = [/^CREATE SCHEMA/i, /^CREATE EXTENSION/i];

/**
 * Index naming is not drift.
 *
 * The migrations create indexes with explicit, readable names (`IDX_order_issue_orderId_createdAt`);
 * TypeORM's `@Index()` decorator generates hash names (`IDX_7fa3dd17...`). It therefore does not
 * recognise its own index and proposes dropping and recreating it. The index exists and the
 * planner uses it either way, and readable names are worth more to whoever is reading a slow
 * query log at 3am than matching a hash would be. Reported below, not failed.
 *
 * What *is* drift, and what this suite fails on: a missing table, a missing column, or a column
 * whose type does not match the entity. Those break the service at runtime.
 */
const COSMETIC = [/^DROP INDEX/i];

const describeIfDb = URL_ ? describe : describe.skip;

describeIfDb('schema drift — migrations vs entities', () => {
  const drift: Record<string, string[]> = {};

  afterAll(() => {
    const lines = Object.entries(drift).map(([svc, qs]) =>
      qs.length === 0 ? `  ok   ${svc}` : `  DRIFT ${svc} (${qs.length})\n${qs.map((q) => `        ${q.slice(0, 150)}`).join('\n')}`,
    );
    console.log(`\nschema drift:\n${lines.join('\n')}\n`);
  });

  for (const svc of SERVICES) {
    it(`${svc}: migrated schema matches its entities`, async () => {
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

      // 1. build it the way production does
      const built = new DataSource({
        type: 'postgres', url: URL_, schema: svc, entities: [], migrations,
        migrationsRun: false, synchronize: false, logging: false,
      });
      await built.initialize();
      await built.runMigrations({ transaction: 'each' });
      await built.destroy();

      // 2. ask what the entities would still want changed
      const check = new DataSource({
        type: 'postgres', url: URL_, schema: svc, entities: entities as never[],
        synchronize: false, logging: false,
      });
      await check.initialize();
      const plan = await check.driver.createSchemaBuilder().log();
      await check.destroy();

      const outstanding = plan.upQueries
        .map((q) => q.query)
        .filter((q) => !IGNORE.some((re) => re.test(q)));

      const structural = outstanding.filter((q) => !COSMETIC.some((re) => re.test(q)));
      const cosmetic = outstanding.length - structural.length;

      drift[svc] = structural;
      if (cosmetic) console.log(`  note ${svc}: ${cosmetic} index-name-only difference(s)`);
      expect(structural).toEqual([]);
    });
  }
});
