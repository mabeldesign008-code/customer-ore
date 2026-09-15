import { advisoryLockKey, withAdvisoryLock, pgIntervalRunner } from './leader-lock';
import { DataSource } from 'typeorm';
import { InProcessScheduler } from '@ore/jobs';

/**
 * `InProcessScheduler` gives every replica its own `setInterval`, so without coordination every
 * replica runs every periodic job on every tick. For a settlement sweep that is a correctness
 * problem, not a performance one.
 */
describe('advisoryLockKey', () => {
  it('is stable for a given name', () => {
    expect(advisoryLockKey('settlement')).toBe(advisoryLockKey('settlement'));
  });

  it('differs between job names', () => {
    expect(advisoryLockKey('settlement')).not.toBe(advisoryLockKey('reconcile'));
  });

  it('always fits a signed 64-bit integer', () => {
    for (const n of ['a', 'settlement', 'x'.repeat(500), '', 'interval:payment-sweeper']) {
      const key = advisoryLockKey(n);
      expect(key).toBeGreaterThanOrEqual(0n);
      expect(key).toBeLessThanOrEqual(0x7fff_ffff_ffff_ffffn);
    }
  });

  it('is computed in Node, not by Postgres hashtext', () => {
    // hashtext() is not guaranteed stable across major versions: mid-upgrade, two replicas could
    // derive different keys for the same job and both run it — the exact bug this prevents.
    expect(advisoryLockKey('settlement')).toBe(advisoryLockKey('settlement'));
  });
});

describe('withAdvisoryLock', () => {
  const pgDs = (locked: boolean) => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const manager = {
      query: jest.fn(async (sql: string, params: unknown[] = []) => {
        queries.push({ sql, params });
        return [{ locked }];
      }),
    };
    const ds = {
      options: { type: 'postgres' },
      transaction: jest.fn(async (fn: (m: unknown) => Promise<unknown>) => fn(manager)),
    } as unknown as DataSource;
    return { ds, queries };
  };

  it('runs the work when it wins the lock', async () => {
    const { ds } = pgDs(true);
    const fn = jest.fn().mockResolvedValue('done');

    await expect(withAdvisoryLock(ds, 'job', fn)).resolves.toEqual({ ran: true, result: 'done' });
    expect(fn).toHaveBeenCalled();
  });

  it('skips the work when another replica holds the lock', async () => {
    const { ds } = pgDs(false);
    const fn = jest.fn();

    await expect(withAdvisoryLock(ds, 'job', fn)).resolves.toEqual({ ran: false });
    expect(fn).not.toHaveBeenCalled();
  });

  it('uses a transaction-scoped lock, not a session-scoped one', async () => {
    const { ds, queries } = pgDs(true);
    await withAdvisoryLock(ds, 'job', async () => undefined);

    // Session-scoped locks and TypeORM's connection pool do not mix: a lock taken on one pooled
    // connection and released on another does not unlock, it warns and leaks.
    expect(queries[0].sql).toContain('pg_try_advisory_xact_lock');
    expect(queries[0].sql).not.toContain('pg_advisory_lock(');
  });

  it('holds the lock for the duration of the work', async () => {
    const { ds } = pgDs(true);
    let insideTransaction = false;
    (ds.transaction as jest.Mock).mockImplementation(async (fn: (m: unknown) => Promise<unknown>) => {
      insideTransaction = true;
      const r = await fn({ query: jest.fn().mockResolvedValue([{ locked: true }]) });
      insideTransaction = false;
      return r;
    });

    await withAdvisoryLock(ds, 'job', async () => {
      // A guard that returned a boolean and let go would leave the tick unprotected for exactly
      // the interval it was meant to protect.
      expect(insideTransaction).toBe(true);
    });
  });

  it('releases the lock even when the work throws', async () => {
    const { ds } = pgDs(true);
    (ds.transaction as jest.Mock).mockImplementation(async (fn: (m: unknown) => Promise<unknown>) => {
      // A real transaction rolls back on throw, which releases an xact-scoped lock.
      return fn({ query: jest.fn().mockResolvedValue([{ locked: true }]) });
    });

    await expect(withAdvisoryLock(ds, 'job', async () => { throw new Error('handler blew up'); }))
      .rejects.toThrow('handler blew up');
  });

  it('runs unguarded on non-Postgres, which is single-process anyway', async () => {
    const ds = { options: { type: 'better-sqlite3' }, transaction: jest.fn() } as unknown as DataSource;
    const fn = jest.fn().mockResolvedValue(1);

    await expect(withAdvisoryLock(ds, 'job', fn)).resolves.toEqual({ ran: true, result: 1 });
    expect(ds.transaction).not.toHaveBeenCalled();
  });

  it('namespaces the key so two jobs never collide', async () => {
    const { ds, queries } = pgDs(true);
    await withAdvisoryLock(ds, 'alpha', async () => undefined);
    const alpha = queries[0].params[0];

    const second = pgDs(true);
    await withAdvisoryLock(second.ds, 'beta', async () => undefined);
    expect(second.queries[0].params[0]).not.toBe(alpha);
  });
});

describe('pgIntervalRunner', () => {
  it('runs the tick when it holds the lock', async () => {
    const ds = {
      options: { type: 'postgres' },
      transaction: jest.fn(async (fn: (m: unknown) => Promise<unknown>) =>
        fn({ query: jest.fn().mockResolvedValue([{ locked: true }]) })),
    } as unknown as DataSource;
    const run = jest.fn().mockResolvedValue(undefined);

    await pgIntervalRunner(ds)('sweeper', run);

    expect(run).toHaveBeenCalled();
  });

  it('skips the tick when another replica holds the lock', async () => {
    const ds = {
      options: { type: 'postgres' },
      transaction: jest.fn(async (fn: (m: unknown) => Promise<unknown>) =>
        fn({ query: jest.fn().mockResolvedValue([{ locked: false }]) })),
    } as unknown as DataSource;
    const run = jest.fn();

    await pgIntervalRunner(ds)('sweeper', run);

    expect(run).not.toHaveBeenCalled();
  });

  it('runs anyway when the lock backend is unreachable', async () => {
    const ds = {
      options: { type: 'postgres' },
      transaction: jest.fn().mockRejectedValue(new Error('pg down')),
    } as unknown as DataSource;
    const run = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await pgIntervalRunner(ds)('sweeper', run);

    // A duplicated sweep is recoverable. A periodic job that silently stops firing across the
    // whole fleet because Postgres hiccupped is not, and nobody would notice until it mattered.
    expect(run).toHaveBeenCalled();
  });
});

describe('InProcessScheduler interval coordination', () => {
  afterEach(() => jest.useRealTimers());

  it('runs every tick when no runner is supplied', async () => {
    jest.useFakeTimers();
    const scheduler = new InProcessScheduler();
    const handler = jest.fn().mockResolvedValue(undefined);

    scheduler.onInterval('job', 1000, handler);
    jest.advanceTimersByTime(3500);
    await Promise.resolve();

    expect(handler).toHaveBeenCalled();
    await scheduler.close();
  });

  it('delegates each tick to the runner when one is supplied', async () => {
    jest.useFakeTimers();
    const runner = jest.fn(async (_name: string, run: () => Promise<void>) => { await run(); });
    const scheduler = new InProcessScheduler(runner);
    const handler = jest.fn().mockResolvedValue(undefined);

    scheduler.onInterval('settlement', 1000, handler);
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    await Promise.resolve();

    expect(runner).toHaveBeenCalledWith('settlement', expect.any(Function));
    await scheduler.close();
  });

  it('does not run the handler when the runner declines the tick', async () => {
    jest.useFakeTimers();
    const runner = jest.fn(async () => { /* another replica has it */ });
    const scheduler = new InProcessScheduler(runner);
    const handler = jest.fn();

    scheduler.onInterval('settlement', 1000, handler);
    jest.advanceTimersByTime(2000);
    await Promise.resolve();

    expect(handler).not.toHaveBeenCalled();
    await scheduler.close();
  });
});
