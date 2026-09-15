import { lateRate, prepTimeSignals, queueDepth, VendorSignalOrder } from './vendor-signals';

const at = (iso: string) => iso;
const order = (over: Partial<VendorSignalOrder> = {}): VendorSignalOrder => ({
  orderId: 'o1',
  status: 'PREPARING',
  prepTimeMin: 20,
  timeline: [],
  ...over,
});

/** A kitchen's throughput is a property of its current load, not of its menu. */
describe('queueDepth', () => {
  it('counts orders the kitchen is actively working on', () => {
    expect(
      queueDepth([
        order({ status: 'ACCEPTED' }),
        order({ status: 'PREPARING' }),
        order({ status: 'CONFIRMED' }),
      ]),
    ).toBe(3);
  });

  it('ignores orders that have left the kitchen', () => {
    expect(
      queueDepth([
        order({ status: 'PREPARING' }),
        order({ status: 'READY_FOR_PICKUP' }),
        order({ status: 'PICKED_UP' }),
        order({ status: 'DELIVERED' }),
        order({ status: 'CANCELLED' }),
      ]),
    ).toBe(1);
  });

  it('ignores orders the kitchen has not seen yet', () => {
    expect(queueDepth([order({ status: 'PENDING_PAYMENT' }), order({ status: 'AWAITING_RECIPIENT' })])).toBe(0);
  });

  it('is zero for an idle kitchen', () => {
    expect(queueDepth([])).toBe(0);
  });

  it('is derived from status rather than a stored counter', () => {
    // A counter incremented on accept and decremented on ready is one missed event away from
    // claiming a kitchen is permanently busy, and it would take a manual reset to notice.
    const orders = [order({ status: 'PREPARING' }), order({ status: 'PREPARING' })];
    expect(queueDepth(orders)).toBe(2);
    orders[0].status = 'READY_FOR_PICKUP';
    expect(queueDepth(orders)).toBe(1);
  });
});

describe('lateRate', () => {
  const now = new Date('2026-09-04T12:00:00Z');
  const done = (acceptedIso: string, readyIso: string, prepTimeMin: number): VendorSignalOrder =>
    order({
      status: 'DELIVERED',
      prepTimeMin,
      timeline: [
        { to: 'ACCEPTED', at: at(acceptedIso) },
        { to: 'READY_FOR_PICKUP', at: at(readyIso) },
      ],
    });

  it('is zero when every order beat its promise', () => {
    const r = lateRate([done('2026-09-04T11:00:00Z', '2026-09-04T11:15:00Z', 20)], now);
    expect(r.lateRate).toBe(0);
    expect(r.sampleSize).toBe(1);
  });

  it('counts an order that overran its promise', () => {
    const r = lateRate([done('2026-09-04T11:00:00Z', '2026-09-04T11:40:00Z', 20)], now);
    expect(r.lateRate).toBe(1);
  });

  it('compares against what was promised, not a fixed target', () => {
    // A vendor who honestly declares 40 minutes and takes 40 is not late, and treating them as
    // late would punish exactly the honest estimate the system wants.
    const honest = done('2026-09-04T11:00:00Z', '2026-09-04T11:40:00Z', 40);
    const optimistic = done('2026-09-04T11:00:00Z', '2026-09-04T11:40:00Z', 15);

    expect(lateRate([honest], now).lateRate).toBe(0);
    expect(lateRate([optimistic], now).lateRate).toBe(1);
  });

  it('reports the proportion across a mixed batch', () => {
    const r = lateRate(
      [
        done('2026-09-04T11:00:00Z', '2026-09-04T11:15:00Z', 20),
        done('2026-09-04T11:00:00Z', '2026-09-04T11:40:00Z', 20),
        done('2026-09-04T11:00:00Z', '2026-09-04T11:50:00Z', 20),
        done('2026-09-04T11:00:00Z', '2026-09-04T11:10:00Z', 20),
      ],
      now,
    );
    expect(r.lateRate).toBe(0.5);
    expect(r.sampleSize).toBe(4);
  });

  it('only looks at the recent window', () => {
    // Yesterday's lunch rush says nothing about whether the kitchen is coping right now.
    const stale = done('2026-09-03T11:00:00Z', '2026-09-03T12:00:00Z', 20);
    expect(lateRate([stale], now).sampleSize).toBe(0);
  });

  it('ignores orders that never reached the kitchen door', () => {
    // An order cancelled before anyone started cooking says nothing about this kitchen's speed,
    // and counting it would punish vendors for their customers' behaviour.
    const abandoned = order({ status: 'CANCELLED', timeline: [{ to: 'CANCELLED', at: at('2026-09-04T11:30:00Z') }] });
    expect(lateRate([abandoned], now).sampleSize).toBe(0);
  });

  it('accepts WAITING_FOR_RIDER as a ready signal', () => {
    const o = order({
      prepTimeMin: 10,
      timeline: [
        { to: 'ACCEPTED', at: at('2026-09-04T11:00:00Z') },
        { to: 'WAITING_FOR_RIDER', at: at('2026-09-04T11:30:00Z') },
      ],
    });
    expect(lateRate([o], now)).toEqual({ lateRate: 1, sampleSize: 1 });
  });

  it('survives a malformed timestamp instead of producing NaN', () => {
    const broken = order({
      timeline: [
        { to: 'ACCEPTED', at: 'not-a-date' },
        { to: 'READY_FOR_PICKUP', at: at('2026-09-04T11:30:00Z') },
      ],
    });
    expect(lateRate([broken], now)).toEqual({ lateRate: 0, sampleSize: 0 });
  });

  it('reports an empty sample rather than dividing by zero', () => {
    expect(lateRate([], now)).toEqual({ lateRate: 0, sampleSize: 0 });
  });
});

describe('prepTimeSignals', () => {
  const now = new Date('2026-09-04T12:00:00Z');

  it('bundles both signals', () => {
    const orders: VendorSignalOrder[] = [
      order({ status: 'PREPARING' }),
      order({ status: 'PREPARING' }),
      order({
        status: 'DELIVERED',
        prepTimeMin: 15,
        timeline: [
          { to: 'ACCEPTED', at: at('2026-09-04T11:00:00Z') },
          { to: 'READY_FOR_PICKUP', at: at('2026-09-04T11:30:00Z') },
        ],
      }),
    ];

    expect(prepTimeSignals(orders, undefined, now)).toEqual({ queueDepth: 2, lateRate: 1, sampleSize: 1 });
  });

  it('passes through a vendor-specific parallel capacity', () => {
    expect(prepTimeSignals([], 6, now).parallelCapacity).toBe(6);
  });

  it('omits capacity when the vendor has not declared one', () => {
    expect(prepTimeSignals([], undefined, now).parallelCapacity).toBeUndefined();
  });

  it('is safe on an empty order list', () => {
    expect(prepTimeSignals([], undefined, now)).toEqual({ queueDepth: 0, lateRate: 0, sampleSize: 0 });
  });
});
