import { DataSource } from 'typeorm';
import { NatsBus } from '@ore/bus';
import { PgConsumerDedupe } from '@ore/core';
import { connect, StringCodec, AckPolicy, DeliverPolicy } from 'nats';

/**
 * The reliability layer, against a real NATS JetStream and a real Postgres.
 *
 * Everything here was previously covered only by unit tests with mocked buses and mocked
 * repositories — which is exactly the kind of coverage that says a thing works right up until it
 * meets a broker that really redelivers and a database that really commits.
 *
 * Needs `NATS_URL` and `DB_VERIFY_URL`; skips silently otherwise.
 */
const NATS_URL = process.env.NATS_URL ?? '';
const DB_URL = process.env.DB_VERIFY_URL ?? '';
const SCHEMA = 'itest';

const describeIf = NATS_URL && DB_URL ? describe : describe.skip;

const sc = StringCodec();
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Poll until `fn` is true, so the test tracks the broker instead of guessing at sleeps. */
async function until(fn: () => boolean | Promise<boolean>, ms = 30_000, step = 100): Promise<boolean> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (await fn()) return true;
    await wait(step);
  }
  return false;
}

describeIf('event delivery — real NATS + real Postgres', () => {
  let ds: DataSource;
  let buses: NatsBus[] = [];

  beforeAll(async () => {
    ds = new DataSource({ type: 'postgres', url: DB_URL });
    await ds.initialize();
    await ds.query(`CREATE SCHEMA IF NOT EXISTS "${SCHEMA}"`);
  });

  afterAll(async () => {
    for (const b of buses) await b.close().catch(() => undefined);
    if (ds?.isInitialized) await ds.destroy();
  });

  afterEach(async () => {
    for (const b of buses) await b.close().catch(() => undefined);
    buses = [];
  });

  /** A bus wired exactly the way OreCoreModule wires one. */
  const wiredBus = async (service: string) => {
    const bus = new NatsBus(NATS_URL, service);
    await bus.connect();
    const dedupe = new PgConsumerDedupe(ds, SCHEMA);
    bus.setClaimReleaser((id) => dedupe.release(id));
    buses.push(bus);
    return { bus, dedupe };
  };

  const uniq = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  describe('F-BUS-1 — a failed handler must not swallow its event', () => {
    it('reprocesses the event after the first attempt throws', async () => {
      // The regression, end to end. Before the fix the dedupe claim survived the failure, NATS
      // redelivered, the handler saw "already taken", returned, and the message was acked — the
      // event lost with no retry and no dead letter. For the ledger that was a delivered order
      // whose rider and vendor were never paid.
      const svc = `itest-fail-${uniq()}`;
      const { bus, dedupe } = await wiredBus(svc);

      const attempts: string[] = [];
      let done = false;
      await bus.subscribe('order.delivered' as never, async (env) => {
        if (!(await dedupe.take(env.id))) return;
        attempts.push(env.id);
        if (attempts.length === 1) throw new Error('transient failure');
        done = true;
      });

      const envelopeId = `evt-${uniq()}`;
      await bus.publish('order.delivered' as never, { orderId: 'o1' }, { envelopeId });

      const ok = await until(() => done);
      expect(ok).toBe(true);
      expect(attempts.length).toBeGreaterThanOrEqual(2);
      expect(new Set(attempts).size).toBe(1); // same envelope, redelivered
    });

    it('still suppresses a genuine duplicate after the handler succeeds', async () => {
      // The other half. Releasing on failure must not weaken dedupe on success, or the ledger
      // would post the same delivery twice.
      const svc = `itest-dupe-${uniq()}`;
      const { bus, dedupe } = await wiredBus(svc);

      let runs = 0;
      await bus.subscribe('order.delivered' as never, async (env) => {
        if (!(await dedupe.take(env.id))) return;
        runs += 1;
      });

      const envelopeId = `evt-${uniq()}`;
      await bus.publish('order.delivered' as never, { orderId: 'o2' }, { envelopeId });
      await until(() => runs === 1);
      await bus.publish('order.delivered' as never, { orderId: 'o2' }, { envelopeId });
      await wait(2_000);

      expect(runs).toBe(1);
    });

    it('shares the claim across replicas, so only one of them does the work', async () => {
      // Two processes, one Postgres dedupe table. This is what the in-memory Set could never do.
      const svc = `itest-replica-${uniq()}`;
      const a = await wiredBus(svc);
      const b = await wiredBus(svc);

      let runs = 0;
      const handler = (d: PgConsumerDedupe) => async (env: { id: string }) => {
        if (!(await d.take(env.id))) return;
        runs += 1;
      };
      await a.bus.subscribe('order.delivered' as never, handler(a.dedupe) as never);
      await b.bus.subscribe('order.delivered' as never, handler(b.dedupe) as never);

      await a.bus.publish('order.delivered' as never, { orderId: 'o3' }, { envelopeId: `evt-${uniq()}` });
      await wait(3_000);

      expect(runs).toBe(1);
    });
  });

  describe('dead letter queue', () => {
    it('lands a permanently failing event in ORE_EVENTS_DLQ and stops redelivering', async () => {
      const svc = `itest-dlq-${uniq()}`;
      const { bus, dedupe } = await wiredBus(svc);
      const eventName = 'order.delivered';

      let attempts = 0;
      await bus.subscribe(eventName as never, async (env) => {
        if (!(await dedupe.take(env.id))) return;
        attempts += 1;
        throw new Error('poison');
      });

      // Read the DLQ directly rather than trusting a log line.
      const nc = await connect({ servers: NATS_URL });
      const jsm = await nc.jetstreamManager();
      const durable = `itest-dlq-reader-${uniq()}`.replace(/[^a-z0-9-]/gi, '');
      await jsm.consumers.add('ORE_EVENTS_DLQ', {
        durable_name: durable,
        ack_policy: AckPolicy.Explicit,
        deliver_policy: DeliverPolicy.New,
        filter_subject: `ore.dlq.${eventName}`,
      });

      const envelopeId = `evt-${uniq()}`;
      await bus.publish(eventName as never, { orderId: 'poison' }, { envelopeId });

      const js = nc.jetstream();
      const consumer = await js.consumers.get('ORE_EVENTS_DLQ', durable);
      let found: string | null = null;
      const deadline = Date.now() + 90_000;
      while (Date.now() < deadline && !found) {
        const msgs = await consumer.fetch({ max_messages: 5, expires: 2_000 });
        for await (const m of msgs) {
          const body = JSON.parse(sc.decode(m.data)) as { raw?: string };
          if (body.raw?.includes(envelopeId)) found = body.raw;
          m.ack();
        }
      }

      await jsm.consumers.delete('ORE_EVENTS_DLQ', durable).catch(() => undefined);
      await nc.close();

      expect(found).toContain(envelopeId);
      // maxDeliver is 10: it must give up rather than redeliver a poison message forever.
      expect(attempts).toBe(10);

      // And having released its claim each time, the envelope is still claimable — the DLQ copy
      // can be replayed once the underlying fault is fixed.
      expect(await dedupe.take(envelopeId)).toBe(true);
    }, 150_000);
  });
});
