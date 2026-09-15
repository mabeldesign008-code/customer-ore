import { OutboxStore, OutboxBus } from './outbox';
import { DataSource } from 'typeorm';

/**
 * The outbox is the only thing standing between a committed business change and a lost event,
 * so its claim semantics are worth pinning precisely.
 *
 * `claim()` used to set `updatedAt` and nothing else — the row stayed `pending`, so every relay
 * replica selected the same batch and published the same events. The outbox promised
 * at-least-once and delivered N-times-once, where N is the replica count.
 */
describe('OutboxStore.claim', () => {
  const captured: Array<{ sql: string; params: unknown[] }> = [];

  const ds = (rows: unknown[] = []) => {
    captured.length = 0;
    return {
      query: jest.fn(async (sql: string, params: unknown[] = []) => {
        captured.push({ sql, params });
        return rows;
      }),
      options: { type: 'postgres' },
    } as unknown as DataSource;
  };

  const sqlOf = () => captured.map((c) => c.sql).join('\n');

  it('takes an exclusive claim rather than merely touching the row', async () => {
    await new OutboxStore(ds(), 'order').claim();

    // Without the status transition, a second relay reading the table still sees `pending`.
    expect(sqlOf()).toContain("SET status = 'claiming'");
  });

  it('uses SKIP LOCKED so concurrent relays take disjoint batches instead of blocking', async () => {
    await new OutboxStore(ds(), 'order').claim();

    expect(sqlOf()).toContain('FOR UPDATE SKIP LOCKED');
  });

  it('reclaims rows abandoned by a relay that died mid-publish', async () => {
    await new OutboxStore(ds(), 'order').claim();

    // Without this, a crashed relay strands its batch in `claiming` forever — which is the very
    // "event silently never sent" failure the outbox exists to prevent.
    expect(sqlOf()).toContain("status = 'claiming' AND \"claimedAt\" <");
  });

  it('still only claims rows with attempts left', async () => {
    const store = new OutboxStore(ds(), 'order');
    await store.claim();

    expect(sqlOf()).toContain('attempts < $2');
    expect(captured[0].params[1]).toBe(10);
  });

  it('claims oldest-first so event order is preserved', async () => {
    await new OutboxStore(ds(), 'order').claim();
    expect(sqlOf()).toContain('ORDER BY "createdAt" ASC');
  });

  it('honours the batch limit', async () => {
    await new OutboxStore(ds(), 'order').claim(7);
    expect(captured[0].params[0]).toBe(7);
  });

  it('passes a stale-claim cutoff in the past', async () => {
    await new OutboxStore(ds(), 'order').claim();
    const cutoff = captured[0].params[2] as Date;
    expect(cutoff).toBeInstanceOf(Date);
    expect(cutoff.getTime()).toBeLessThan(Date.now());
  });

  it('unwraps the pg driver\'s [[rows], affected] shape', async () => {
    const row = { id: '1', envelopeId: 'e1', eventName: 'x', payload: {}, status: 'claiming', attempts: 0 };
    const store = new OutboxStore(ds([[row], 1]) as DataSource, 'order');

    await expect(store.claim()).resolves.toEqual([row]);
  });

  it('passes a plain row array through unchanged', async () => {
    const row = { id: '1', envelopeId: 'e1', eventName: 'x', payload: {}, status: 'claiming', attempts: 0 };
    const store = new OutboxStore(ds([row]) as DataSource, 'order');

    await expect(store.claim()).resolves.toEqual([row]);
  });
});

describe('OutboxStore.markSent / markFailure', () => {
  const captured: Array<{ sql: string; params: unknown[] }> = [];
  const ds = () => {
    captured.length = 0;
    return {
      query: jest.fn(async (sql: string, params: unknown[] = []) => { captured.push({ sql, params }); return []; }),
      options: { type: 'postgres' },
    } as unknown as DataSource;
  };

  it('clears the claim when a row is sent', async () => {
    await new OutboxStore(ds(), 'order').markSent('id-1');
    expect(captured[0].sql).toContain("status = 'sent'");
    expect(captured[0].sql).toContain('"claimedAt" = NULL');
  });

  it('releases a failed row back to pending so the next cycle retries it promptly', async () => {
    await new OutboxStore(ds(), 'order').markFailure('id-1', 'nats down');

    // Leaving it in `claiming` would stall the retry until the reclaim window expired — turning
    // a 1.5-second retry into a minute-long gap.
    expect(captured[0].sql).toContain("ELSE 'pending'");
    expect(captured[0].sql).toContain('"claimedAt" = NULL');
  });

  it('buries a row that has exhausted its attempts', async () => {
    await new OutboxStore(ds(), 'order').markFailure('id-1', 'boom');
    expect(captured[0].sql).toContain("THEN 'failed'");
    expect(captured[0].params[2]).toBe(10);
  });

  it('truncates the error so one enormous message cannot bloat the table', async () => {
    await new OutboxStore(ds(), 'order').markFailure('id-1', 'x'.repeat(5_000));
    expect((captured[0].params[1] as string).length).toBe(500);
  });
});

describe('OutboxBus relay', () => {
  const makeBus = () => ({
    publish: jest.fn().mockResolvedValue(undefined),
    publishRaw: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn(),
    flush: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
  });

  const row = (over: Record<string, unknown> = {}) => ({
    id: 'row-1', envelopeId: 'env-1', eventName: 'order.created',
    payload: { a: 1 }, status: 'claiming', attempts: 0, error: null,
    createdAt: new Date(), updatedAt: new Date(), ...over,
  });

  const build = (inner: ReturnType<typeof makeBus>) => {
    const ds = { query: jest.fn().mockResolvedValue([]), options: { type: 'postgres' } } as unknown as DataSource;
    const bus = new OutboxBus(inner as never, ds, 'order');
    return { bus, ds };
  };

  it('publishes a claimed event and marks it sent', async () => {
    const inner = makeBus();
    const { bus } = build(inner);
    const store = (bus as never as { store: { claim: jest.Mock; markSent: jest.Mock; markFailure: jest.Mock } }).store;
    store.claim = jest.fn().mockResolvedValue([row()]);
    store.markSent = jest.fn().mockResolvedValue(undefined);
    store.markFailure = jest.fn().mockResolvedValue(undefined);

    await bus.flush();

    expect(inner.publish).toHaveBeenCalledWith('order.created', { a: 1 }, { envelopeId: 'env-1' });
    expect(store.markSent).toHaveBeenCalledWith('row-1');
    expect(store.markFailure).not.toHaveBeenCalled();
  });

  it('records a failure without marking the event sent', async () => {
    const inner = makeBus();
    inner.publish.mockRejectedValue(new Error('nats unreachable'));
    const { bus } = build(inner);
    const store = (bus as never as { store: { claim: jest.Mock; markSent: jest.Mock; markFailure: jest.Mock } }).store;
    store.claim = jest.fn().mockResolvedValue([row()]);
    store.markSent = jest.fn().mockResolvedValue(undefined);
    store.markFailure = jest.fn().mockResolvedValue(undefined);

    await bus.flush();

    expect(store.markSent).not.toHaveBeenCalled();
    expect(store.markFailure).toHaveBeenCalledWith('row-1', 'nats unreachable');
  });

  it('copies an exhausted event to the DLQ rather than dropping it', async () => {
    const inner = makeBus();
    inner.publish.mockRejectedValue(new Error('poison'));
    const { bus } = build(inner);
    const store = (bus as never as { store: { claim: jest.Mock; markSent: jest.Mock; markFailure: jest.Mock } }).store;
    // attempts 9 → this failure is the tenth and last.
    store.claim = jest.fn().mockResolvedValue([row({ attempts: 9 })]);
    store.markSent = jest.fn().mockResolvedValue(undefined);
    store.markFailure = jest.fn().mockResolvedValue(undefined);

    await bus.flush();

    expect(inner.publishRaw).toHaveBeenCalledWith('ore.dlq.order.created', expect.stringContaining('env-1'));
  });

  it('does not DLQ an event that still has attempts left', async () => {
    const inner = makeBus();
    inner.publish.mockRejectedValue(new Error('transient'));
    const { bus } = build(inner);
    const store = (bus as never as { store: { claim: jest.Mock; markSent: jest.Mock; markFailure: jest.Mock } }).store;
    store.claim = jest.fn().mockResolvedValue([row({ attempts: 2 })]);
    store.markSent = jest.fn().mockResolvedValue(undefined);
    store.markFailure = jest.fn().mockResolvedValue(undefined);

    await bus.flush();

    expect(inner.publishRaw).not.toHaveBeenCalled();
  });

  it('keeps processing the batch after one event fails', async () => {
    const inner = makeBus();
    inner.publish.mockRejectedValueOnce(new Error('one bad event')).mockResolvedValue(undefined);
    const { bus } = build(inner);
    const store = (bus as never as { store: { claim: jest.Mock; markSent: jest.Mock; markFailure: jest.Mock } }).store;
    store.claim = jest.fn().mockResolvedValue([row({ id: 'a' }), row({ id: 'b', envelopeId: 'env-2' })]);
    store.markSent = jest.fn().mockResolvedValue(undefined);
    store.markFailure = jest.fn().mockResolvedValue(undefined);

    await bus.flush();

    expect(store.markFailure).toHaveBeenCalledWith('a', 'one bad event');
    expect(store.markSent).toHaveBeenCalledWith('b');
  });

  it('enqueues rather than publishing directly, so the write joins the caller\'s transaction', async () => {
    const inner = makeBus();
    const { bus } = build(inner);
    const store = (bus as never as { store: { enqueue: jest.Mock } }).store;
    store.enqueue = jest.fn().mockResolvedValue(undefined);

    await bus.publish('order.created' as never, { a: 1 });

    expect(inner.publish).not.toHaveBeenCalled();
    expect(store.enqueue).toHaveBeenCalled();
  });
});
