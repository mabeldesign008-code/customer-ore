import { DataSource } from 'typeorm';
import { runSeed } from '../../../libs/seed/src/run';

/**
 * The seed runner, against the database it claims to be seeding.
 *
 * F-SEED-1: `run.ts` opened six datasources hardcoded to `type: 'sqlite'` with filenames like
 * `./ore-auth.sqlite`. It read `DB_TYPE`, printed "Active DB mode: postgres", and then wrote
 * every row into sqlite files in the current working directory. It exited 0 and printed a
 * hardcoded summary claiming 5 admins, 15 vendors and 50 orders. A Postgres environment could be
 * seeded repeatedly and stay completely empty, with no error anywhere.
 *
 * Fixed by building the datasources with `dataSourceOptions()` — the same factory the services
 * use — so the seeder follows DB_TYPE like everything else.
 */
const DB_URL = process.env.DB_VERIFY_URL ?? '';
const describeIf = DB_URL ? describe : describe.skip;

describeIf('seed runner — writes to the configured database', () => {
  let ds: DataSource;
  const original = { ...process.env };

  beforeAll(async () => {
    ds = new DataSource({ type: 'postgres', url: DB_URL });
    await ds.initialize();
  });

  afterAll(async () => {
    process.env = original;
    if (ds?.isInitialized) await ds.destroy();
  });

  it('lands rows in Postgres, not in a stray sqlite file', async () => {
    process.env.DB_TYPE = 'postgres';
    process.env.DATABASE_URL = DB_URL;
    // Not production: the seeder relies on `synchronize` in a fresh dev/staging database and
    // must not try to run service migrations it does not own.
    process.env.NODE_ENV = 'development';

    const summary = await runSeed();

    // The summary must be derived from the database, so these two agree by construction only if
    // the writes really happened where the config said.
    expect(summary.users).toBeGreaterThan(0);
    expect(summary.vendors).toBeGreaterThan(0);
    expect(summary.orders).toBeGreaterThan(0);

    const count = async (table: string) => {
      const [r] = (await ds.query(`SELECT count(*)::int AS c FROM ${table}`)) as Array<{ c: number }>;
      return r.c;
    };
    expect(await count('auth."user"')).toBe(summary.users);
    expect(await count('catalog.vendor')).toBe(summary.vendors);
    expect(await count('catalog.menu_item')).toBe(summary.menuItems);
    expect(await count('dispatch.rider')).toBe(summary.riders);
    expect(await count('"order"."order"')).toBe(summary.orders);
  });

  it('is idempotent — a second run does not duplicate or fail', async () => {
    // The counter alignment at the end of the run used raw `INSERT OR REPLACE`, sqlite-only
    // syntax that aborted Postgres with a bare `syntax error at or near "OR"` *after* most of
    // the data was already committed — a half-seeded database and a non-zero exit.
    process.env.DB_TYPE = 'postgres';
    process.env.DATABASE_URL = DB_URL;
    process.env.NODE_ENV = 'development';

    const first = await runSeed();
    const second = await runSeed();
    expect(second).toEqual(first);

    const [{ c }] = (await ds.query(
      `SELECT count(*)::int AS c FROM auth.id_counter WHERE key = $1`,
      [`ORC-${new Date().getFullYear()}`],
    )) as Array<{ c: number }>;
    expect(c).toBe(1);
  });
});
