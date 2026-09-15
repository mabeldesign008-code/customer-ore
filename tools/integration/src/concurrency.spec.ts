import { DataSource } from 'typeorm';
import { NatsBus } from '@ore/bus';
import { OutboxStore, OutboxBus, ensureOutboxTable, PgConsumerDedupe, withAdvisoryLock } from '@ore/core';

/**
 * Concurrency, against a real Postgres and a real NATS.
 *
 * Every primitive here exists solely to be correct when several replicas race. A unit test with a
 * mocked repository cannot fail these — `FOR UPDATE SKIP LOCKED`, `ON CONFLICT DO NOTHING` and
 * `pg_try_advisory_xact_lock` only mean anything when two real transactions collide. Until now
 * nothing in this repo had ever run two of anything at the same time.
 */
const NATS_URL = process.env.NATS_URL ?? '';
const DB_URL = process.env.DB_VERIFY_URL ?? '';
const SCHEMA = 'itest';

const describeIf = NATS_URL && DB_URL ? describe : describe.skip;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const uniq = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

async function until(fn: () => boolean | Promise<boolean>, ms = 30_000, step = 100): Promise<boolean> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (await fn()) return true;
    await wait(step);
  }
  return false;
}

describeIf('concurrency — real Postgres + real NATS', () => {
  /** Separate DataSources, because separate pools are what separate replicas actually have. */
  const pools: DataSource[] = [];
  const buses: NatsBus[] = [];

  let ds: DataSource;

  /** Postgres caps connections, so each simulated replica gets the smallest pool that works. */
  const newPool = async (poolSize = 1) => {
    const p = new DataSource({ type: 'postgres', url: DB_URL, poolSize });
    await p.initialize();
    pools.push(p);
    return p;
  };

  beforeAll(async () => {
    ds = await newPool();
    await ds.query(`CREATE SCHEMA IF NOT EXISTS "${SCHEMA}"`);
    await ensureOutboxTable(ds, SCHEMA);
  });

  // Replica pools are per-test; keeping them all open would exhaust `max_connections`.
  afterEach(async () => {
    for (const p of pools.splice(1)) if (p.isInitialized) await p.destroy();
  });

  afterAll(async () => {
    for (const b of buses) await b.close().catch(() => undefined);
    for (const p of pools) if (p.isInitialized) await p.destroy();
  });

  describe('outbox relay — the claim must be exclusive', () => {
    beforeEach(async () => {
      await ds.query(`TRUNCATE "${SCHEMA}"."ore_outbox"`);
    });

    it('gives 8 concurrent relays disjoint batches, every row claimed exactly once', async () => {
      // The bug this pins: `claim()` once only touched `updatedAt`, leaving the row `pending`, so
      // every relay replica selected the same batch and published the same events. At-least-once
      // quietly became exactly-N-times, N = replica count. For a payment.captured event that is
      // N ledger postings.
      const total = 400;
      const values = Array.from({ length: total }, (_, i) => `('env-${uniq()}-${i}', 'order.delivered', '{}'::jsonb, 'pending', 0)`).join(',');
      await ds.query(`INSERT INTO "${SCHEMA}"."ore_outbox" ("envelopeId","eventName",payload,status,attempts) VALUES ${values}`);

      const relays = await Promise.all(Array.from({ length: 8 }, () => newPool(5).then((p) => new OutboxStore(p, SCHEMA))));
      // 5 rounds each, all in flight together, batch of 20 so they genuinely overlap.
      const batches = await Promise.all(
        relays.flatMap((store) => Array.from({ length: 5 }, () => store.claim(20))),
      );

      const claimed = batches.flat().map((r) => r.id);
      expect(claimed.length).toBe(total);
      expect(new Set(claimed).size).toBe(total); // no id claimed twice

      const [{ count }] = (await ds.query(
        `SELECT count(*)::int AS count FROM "${SCHEMA}"."ore_outbox" WHERE status = 'claiming'`,
      )) as Array<{ count: number }>;
      expect(count).toBe(total);
    });

    it('never blocks a relay behind another relay (SKIP LOCKED, not FOR UPDATE)', async () => {
      // If the inner select were a plain `FOR UPDATE`, the second relay would wait on the first
      // instead of taking different rows — turning a horizontal scale-out into a serial queue.
      const values = Array.from({ length: 50 }, (_, i) => `('env-${uniq()}-${i}', 'order.delivered', '{}'::jsonb, 'pending', 0)`).join(',');
      await ds.query(`INSERT INTO "${SCHEMA}"."ore_outbox" ("envelopeId","eventName",payload,status,attempts) VALUES ${values}`);

      const a = new OutboxStore(await newPool(), SCHEMA);
      const b = new OutboxStore(await newPool(), SCHEMA);
      const started = Date.now();
      const [ra, rb] = await Promise.all([a.claim(25), b.claim(25)]);
      const elapsed = Date.now() - started;

      expect(ra.length + rb.length).toBe(50);
      expect(new Set([...ra, ...rb].map((r) => r.id)).size).toBe(50);
      expect(elapsed).toBeLessThan(2_000);
    });

    it('reclaims a batch stranded by a relay that died mid-publish', async () => {
      await ds.query(
        `INSERT INTO "${SCHEMA}"."ore_outbox" ("envelopeId","eventName",payload,status,attempts,"claimedAt")
         VALUES ('env-stranded-${uniq()}', 'order.delivered', '{}'::jsonb, 'claiming', 0, now() - interval '10 minutes')`,
      );
      const rows = await new OutboxStore(ds, SCHEMA).claim(10);
      expect(rows.length).toBe(1);
    });

    it('leaves a freshly claimed row alone', async () => {
      await ds.query(
        `INSERT INTO "${SCHEMA}"."ore_outbox" ("envelopeId","eventName",payload,status,attempts,"claimedAt")
         VALUES ('env-inflight-${uniq()}', 'order.delivered', '{}'::jsonb, 'claiming', 0, now())`,
      );
      expect(await new OutboxStore(ds, SCHEMA).claim(10)).toHaveLength(0);
    });
  });

  describe('outbox → NATS, end to end', () => {
    it('carries a published event from the outbox table onto the bus and into a consumer', async () => {
      // The whole point of the outbox is that the row commits with the business data and the
      // relay delivers it afterwards. This is the first time that path has run over real
      // infrastructure rather than a stub bus.
      await ds.query(`TRUNCATE "${SCHEMA}"."ore_outbox"`);

      const svc = `itest-outbox-${uniq()}`;
      const inner = new NatsBus(NATS_URL, svc);
      await inner.connect();
      buses.push(inner);

      const received: unknown[] = [];
      await inner.subscribe('order.delivered' as never, async (env: { payload: unknown }) => {
        received.push(env.payload);
      });

      const outbox = new OutboxBus(inner, ds, SCHEMA);
      const envelopeId = `evt-${uniq()}`;
      await outbox.publish('order.delivered' as never, { orderId: 'outbox-1' }, { envelopeId });

      // Nothing on the bus yet — the event is durably in Postgres, which is the guarantee.
      await wait(300);
      expect(received).toHaveLength(0);
      const pending = (await ds.query(
        `SELECT status FROM "${SCHEMA}"."ore_outbox" WHERE "envelopeId" = $1`,
        [envelopeId],
      )) as Array<{ status: string }>;
      expect(pending[0]?.status).toBe('pending');

      await outbox.flush();

      expect(await until(() => received.length === 1)).toBe(true);
      expect(received[0]).toEqual({ orderId: 'outbox-1' });
      const after = (await ds.query(
        `SELECT status, attempts FROM "${SCHEMA}"."ore_outbox" WHERE "envelopeId" = $1`,
        [envelopeId],
      )) as Array<{ status: string; attempts: number }>;
      expect(after[0]).toEqual({ status: 'sent', attempts: 1 });

      outbox.stop();
    });

    it('returns a row to pending when the publish fails, so the next cycle retries it', async () => {
      await ds.query(`TRUNCATE "${SCHEMA}"."ore_outbox"`);
      const failing = {
        publish: jest.fn().mockRejectedValue(new Error('bus down')),
        subscribe: jest.fn(),
        close: jest.fn(),
      };
      const outbox = new OutboxBus(failing as never, ds, SCHEMA);
      const envelopeId = `evt-${uniq()}`;
      await outbox.publish('order.delivered' as never, { orderId: 'retry-1' }, { envelopeId });
      await outbox.flush();

      const [row] = (await ds.query(
        `SELECT status, attempts, error FROM "${SCHEMA}"."ore_outbox" WHERE "envelopeId" = $1`,
        [envelopeId],
      )) as Array<{ status: string; attempts: number; error: string }>;
      // Back to pending, not stuck in `claiming` — otherwise one transient error stalls the row
      // for the full 60 s reclaim window instead of 1.5 s.
      expect(row.status).toBe('pending');
      expect(row.attempts).toBe(1);
      expect(row.error).toBe('bus down');
      outbox.stop();
    });
  });

  describe('consumer dedupe under a real race', () => {
    it('lets exactly one of 20 simultaneous takers win the same envelope', async () => {
      const dedupes = await Promise.all(Array.from({ length: 20 }, () => newPool().then((p) => new PgConsumerDedupe(p, SCHEMA))));
      const envelopeId = `evt-race-${uniq()}`;
      const results = await Promise.all(dedupes.map((d) => d.take(envelopeId)));
      expect(results.filter(Boolean)).toHaveLength(1);
    });

    it('makes the envelope claimable again exactly once after a release', async () => {
      const envelopeId = `evt-release-${uniq()}`;
      const a = new PgConsumerDedupe(pools[0], SCHEMA);
      expect(await a.take(envelopeId)).toBe(true);
      expect(await a.take(envelopeId)).toBe(false);
      await a.release(envelopeId);

      const racers = await Promise.all(Array.from({ length: 10 }, () => newPool().then((p) => new PgConsumerDedupe(p, SCHEMA))));
      const results = await Promise.all(racers.map((d) => d.take(envelopeId)));
      expect(results.filter(Boolean)).toHaveLength(1);
    });
  });

  describe('leader lock for periodic jobs', () => {
    it('runs a sweep on exactly one of 12 replicas ticking together', async () => {
      // Every replica gets its own setInterval, so without this a reconciliation sweep or a payout
      // run fires once per replica per tick.
      const job = `itest-sweep-${uniq()}`;
      const replicas = await Promise.all(Array.from({ length: 12 }, () => newPool()));
      let ran = 0;
      const outcomes = await Promise.all(
        replicas.map((p) =>
          withAdvisoryLock(p, job, async () => {
            ran += 1;
            await wait(400); // hold it long enough that the others really overlap
          }),
        ),
      );
      expect(ran).toBe(1);
      expect(outcomes.filter((o) => o.ran)).toHaveLength(1);
    });

    it('frees the lock when the job throws, so the next tick is not wedged', async () => {
      const job = `itest-throw-${uniq()}`;
      await expect(
        withAdvisoryLock(pools[0], job, async () => {
          throw new Error('sweep blew up');
        }),
      ).rejects.toThrow('sweep blew up');

      // Transaction-scoped, so the rollback released it. A session-scoped lock on a pooled
      // connection would still be held here.
      const second = await withAdvisoryLock(await newPool(), job, async () => 'ok');
      expect(second).toEqual({ ran: true, result: 'ok' });
    });

    it('does not let two different jobs block each other', async () => {
      const [a, b] = await Promise.all([
        withAdvisoryLock(await newPool(), `itest-a-${uniq()}`, async () => {
          await wait(300);
          return 'a';
        }),
        withAdvisoryLock(await newPool(), `itest-b-${uniq()}`, async () => {
          await wait(300);
          return 'b';
        }),
      ]);
      expect([a.ran, b.ran]).toEqual([true, true]);
    });
  });

  describe('the conditional stock decrement cannot oversell', () => {
    // `UPDATE ... SET stock = stock - :qty WHERE stock >= :qty` is the pattern catalog uses to
    // reserve inventory. Its whole safety argument is that Postgres re-evaluates the predicate
    // against the row it just locked, so a losing writer matches 0 rows rather than going
    // negative. That argument has never been executed.
    const table = `"${SCHEMA}"."itest_stock"`;

    beforeAll(async () => {
      await ds.query(`CREATE TABLE IF NOT EXISTS ${table} (id text PRIMARY KEY, stock integer)`);
    });

    it('sells exactly the 10 units in stock to 40 simultaneous buyers', async () => {
      const id = `item-${uniq()}`;
      await ds.query(`INSERT INTO ${table} (id, stock) VALUES ($1, 10)`, [id]);
      const buyers = await Promise.all(Array.from({ length: 40 }, () => newPool()));

      const results = await Promise.all(
        buyers.map(async (p) => {
          const r = await p.query(
            `UPDATE ${table} SET stock = stock - 1 WHERE id = $1 AND stock IS NOT NULL AND stock >= 1`,
            [id],
          );
          return Array.isArray(r) ? (r[1] as number) : 0;
        }),
      );

      expect(results.filter((n) => n === 1)).toHaveLength(10);
      const [row] = (await ds.query(`SELECT stock FROM ${table} WHERE id = $1`, [id])) as Array<{ stock: number }>;
      expect(row.stock).toBe(0); // never negative
    });
  });
});
