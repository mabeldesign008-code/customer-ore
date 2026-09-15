import { averageLegs, deliveryLegs } from './delivery-legs';

const T = (iso: string) => new Date(iso);

/**
 * The system recorded when an order was placed and when it was delivered, and nothing between.
 * A single "45 minutes" cannot say whether the kitchen was slow, the rider was far, or the rider
 * stood at the counter waiting — three problems with three different fixes.
 */
describe('deliveryLegs', () => {
  const full = {
    orderPlacedAt: T('2026-09-04T12:00:00Z'),
    assignedAt: T('2026-09-04T12:05:00Z'),
    pickedUpAt: T('2026-09-04T12:20:00Z'),
    completedAt: T('2026-09-04T12:35:00Z'),
  };

  it('splits a complete journey into its legs', () => {
    expect(deliveryLegs(full)).toEqual({
      orderToAssignMin: 5,
      toPickupMin: 15,
      lastMileMin: 15,
      totalMin: 35,
    });
  });

  it('measures the total end to end, not as the sum of legs', () => {
    // The legs are measured independently, so a gap or overlap in the middle shows up rather
    // than being papered over by addition.
    const legs = deliveryLegs({ ...full, pickedUpAt: null });
    expect(legs.totalMin).toBe(35);
    expect(legs.toPickupMin).toBeNull();
  });

  it('accepts ISO strings as readily as Dates', () => {
    expect(deliveryLegs({
      orderPlacedAt: '2026-09-04T12:00:00Z',
      assignedAt: '2026-09-04T12:05:00Z',
      pickedUpAt: '2026-09-04T12:20:00Z',
      completedAt: '2026-09-04T12:35:00Z',
    })).toEqual(deliveryLegs(full));
  });

  it('reports fractional minutes to one decimal', () => {
    expect(deliveryLegs({ ...full, assignedAt: T('2026-09-04T12:00:38Z') }).orderToAssignMin).toBe(0.6);
  });

  describe('missing data', () => {
    it('returns null rather than zero for a leg it cannot measure', () => {
      // A zero is indistinguishable from a genuinely instant leg and would drag every average it
      // entered toward optimism — the direction that costs an ETA its credibility.
      const legs = deliveryLegs({ ...full, pickedUpAt: null });
      expect(legs.toPickupMin).toBeNull();
      expect(legs.lastMileMin).toBeNull();
    });

    it('handles an order still in flight', () => {
      expect(deliveryLegs({ ...full, completedAt: null })).toEqual({
        orderToAssignMin: 5,
        toPickupMin: 15,
        lastMileMin: null,
        totalMin: null,
      });
    });

    it('handles an order not yet assigned', () => {
      expect(deliveryLegs({ orderPlacedAt: T('2026-09-04T12:00:00Z'), assignedAt: null, pickedUpAt: null, completedAt: null }))
        .toEqual({ orderToAssignMin: null, toPickupMin: null, lastMileMin: null, totalMin: null });
    });

    it('rejects an unparseable timestamp instead of producing NaN', () => {
      const legs = deliveryLegs({ ...full, assignedAt: 'not-a-date' });
      expect(legs.orderToAssignMin).toBeNull();
      expect(legs.toPickupMin).toBeNull();
      // Legs that do not depend on the broken value are still reported.
      expect(legs.lastMileMin).toBe(15);
    });
  });

  describe('clock skew', () => {
    it('discards a negative duration rather than averaging it in', () => {
      // Clocks skew between services and a rider's handset can simply be wrong. A negative
      // duration is a data problem, not a fast delivery.
      const legs = deliveryLegs({ ...full, pickedUpAt: T('2026-09-04T12:01:00Z') });
      expect(legs.toPickupMin).toBeNull();
      expect(legs.lastMileMin).toBe(34);
    });

    it('keeps a genuinely instant leg', () => {
      const legs = deliveryLegs({ ...full, assignedAt: full.orderPlacedAt });
      expect(legs.orderToAssignMin).toBe(0);
    });
  });
});

describe('averageLegs', () => {
  const legs = (o: number | null, p: number | null, l: number | null, t: number | null) => ({
    orderToAssignMin: o,
    toPickupMin: p,
    lastMileMin: l,
    totalMin: t,
  });

  it('averages each leg over the assignments where it is known', () => {
    const r = averageLegs([legs(2, 10, 20, 32), legs(4, 20, 30, 54)]);
    expect(r).toEqual({ orderToAssignMin: 3, toPickupMin: 15, lastMileMin: 25, totalMin: 43, sampleSize: 2 });
  });

  it('does not count a missing leg as zero', () => {
    // Treating it as zero would understate the leg in proportion to how often it goes
    // unrecorded — worst exactly where the data is thinnest.
    const r = averageLegs([legs(2, 10, null, null), legs(4, 20, 30, 54)]);
    expect(r.lastMileMin).toBe(30);
    expect(r.toPickupMin).toBe(15);
  });

  it('reports null for a leg no assignment recorded', () => {
    expect(averageLegs([legs(2, null, null, null)]).toPickupMin).toBeNull();
  });

  it('reports the sample size so a two-order average is not mistaken for a trend', () => {
    expect(averageLegs([legs(1, 1, 1, 3)]).sampleSize).toBe(1);
    expect(averageLegs([]).sampleSize).toBe(0);
  });

  it('is safe on an empty list', () => {
    expect(averageLegs([])).toEqual({
      orderToAssignMin: null,
      toPickupMin: null,
      lastMileMin: null,
      totalMin: null,
      sampleSize: 0,
    });
  });
});
