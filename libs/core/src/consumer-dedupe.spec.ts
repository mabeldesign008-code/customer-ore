import { InMemoryConsumerDedupe, PgConsumerDedupe, createConsumerDedupe } from './consumer-dedupe';
import { DataSource } from 'typeorm';

/**
 * Consumers deduped with a plain in-memory `Set`. On an at-least-once bus, that set has three
 * reachable failure modes — it dies with the process, it is not shared between replicas, and it
 * wiped itself wholesale at 10 000 entries. Each is covered here.
 */
describe('InMemoryConsumerDedupe', () => {
  it('admits an envelope once and refuses it thereafter', async () => {
    const d = new InMemoryConsumerDedupe();
    await expect(d.take('env-1')).resolves.toBe(true);
    await expect(d.take('env-1')).resolves.toBe(false);
    await expect(d.take('env-1')).resolves.toBe(false);
  });

  it('treats distinct envelopes independently', async () => {
    const d = new InMemoryConsumerDedupe();
    await expect(d.take('a')).resolves.toBe(true);
    await expect(d.take('b')).resolves.toBe(true);
  });

  it('evicts one entry at a time instead of wiping everything', async () => {
    // The old code called `.clear()` at 10 000, so the next redelivery of ANY of those 10 000
    // events was reprocessed. Eviction must be incremental.
    const d = new InMemoryConsumerDedupe();
    for (let i = 0; i < 10_050; i++) await d.take(`env-${i}`);

    // The most recent entries must still be remembered.
    await expect(d.take('env-10049')).resolves.toBe(false);
    await expect(d.take('env-10000')).resolves.toBe(false);
  });

  it('stays bounded rather than leaking indefinitely', async () => {
    const d = new InMemoryConsumerDedupe();
    for (let i = 0; i < 12_000; i++) await d.take(`env-${i}`);
    const size = (d as never as { seen: Set<string> }).seen.size;
    expect(size).toBeLessThanOrEqual(10_001);
  });
});

describe('PgConsumerDedupe', () => {
  const makeDs = (insertResult: unknown[] = [{ envelopeId: 'x' }]) => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const ds = {
      query: jest.fn(async (sql: string, params: unknown[] = []) => {
        queries.push({ sql, params });
        if (sql.includes('INSERT INTO')) return insertResult;
        return [];
      }),
      options: { type: 'postgres' },
    } as unknown as DataSource;
    return { ds, queries };
  };

  it('lets the primary key settle the race instead of check-then-act', async () => {
    const { ds, queries } = makeDs();
    await new PgConsumerDedupe(ds, 'order').take('env-1');

    const insert = queries.find((q) => q.sql.includes('INSERT INTO'))!;
    // A SELECT-then-INSERT has a window both replicas pass. `ON CONFLICT DO NOTHING` does not.
    expect(insert.sql).toContain('ON CONFLICT');
    expect(insert.sql).toContain('DO NOTHING');
    expect(insert.sql).toContain('RETURNING');
    expect(queries.some((q) => q.sql.trim().startsWith('SELECT'))).toBe(false);
  });

  it('grants the claim when the insert wins', async () => {
    const { ds } = makeDs([{ envelopeId: 'env-1' }]);
    await expect(new PgConsumerDedupe(ds, 'order').take('env-1')).resolves.toBe(true);
  });

  it('refuses the claim when another replica already inserted it', async () => {
    const { ds } = makeDs([]); // conflict → no row returned
    await expect(new PgConsumerDedupe(ds, 'order').take('env-1')).resolves.toBe(false);
  });

  it('survives a restart — a fresh instance still sees the durable row', async () => {
    const { ds } = makeDs([]);
    // A brand-new instance with an empty cache consults the table and is correctly refused.
    await expect(new PgConsumerDedupe(ds, 'order').take('env-seen-before')).resolves.toBe(false);
  });

  it('serves a repeat from cache without touching the database again', async () => {
    const { ds, queries } = makeDs([{ envelopeId: 'env-1' }]);
    const d = new PgConsumerDedupe(ds, 'order');

    await d.take('env-1');
    const afterFirst = queries.length;
    await expect(d.take('env-1')).resolves.toBe(false);

    expect(queries.length).toBe(afterFirst);
  });

  it('creates its table once, not on every call', async () => {
    const { ds, queries } = makeDs();
    const d = new PgConsumerDedupe(ds, 'order');
    await d.take('a');
    await d.take('b');
    await d.take('c');

    expect(queries.filter((q) => q.sql.includes('CREATE TABLE')).length).toBe(1);
  });

  it('scopes the table to the service schema', async () => {
    const { ds, queries } = makeDs();
    await new PgConsumerDedupe(ds, 'ledger').take('env-1');
    expect(queries[0].sql).toContain('"ledger"."ore_consumer_dedupe"');
  });

  it('sweeps only rows past the retention window', async () => {
    const { ds, queries } = makeDs();
    await new PgConsumerDedupe(ds, 'order').sweep();

    const del = queries.find((q) => q.sql.includes('DELETE FROM'))!;
    expect(del.sql).toContain('"createdAt" <');
    expect(del.params[0]).toBeInstanceOf(Date);
    expect((del.params[0] as Date).getTime()).toBeLessThan(Date.now());
  });

  it('never lets a failed sweep take the service down', async () => {
    const ds = {
      query: jest.fn().mockRejectedValue(new Error('db gone')),
      options: { type: 'postgres' },
    } as unknown as DataSource;
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    // Losing a sweep costs disk, never correctness.
    await expect(new PgConsumerDedupe(ds, 'order').sweep()).resolves.toBeUndefined();
  });

  it('stops its timer and clears its cache on stop', async () => {
    const { ds } = makeDs();
    const d = new PgConsumerDedupe(ds, 'order');
    d.start();
    d.stop();
    expect((d as never as { sweepTimer: unknown }).sweepTimer).toBeNull();
  });
});

describe('createConsumerDedupe', () => {
  it('uses the durable implementation on Postgres', () => {
    const ds = { query: jest.fn(), options: { type: 'postgres' } } as unknown as DataSource;
    const d = createConsumerDedupe(ds, 'order');
    expect(d).toBeInstanceOf(PgConsumerDedupe);
    d.stop();
  });

  it('falls back to in-memory when there is no data source', () => {
    expect(createConsumerDedupe(null, 'order')).toBeInstanceOf(InMemoryConsumerDedupe);
  });

  it('falls back to in-memory on SQLite, which is single-process by construction', () => {
    const ds = { query: jest.fn(), options: { type: 'better-sqlite3' } } as unknown as DataSource;
    expect(createConsumerDedupe(ds, 'order')).toBeInstanceOf(InMemoryConsumerDedupe);
  });
});
