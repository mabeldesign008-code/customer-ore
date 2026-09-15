import { boundingBox } from './geo-filter';
import { buildDispatchHarness, makeRider, makeOrderSnapshot, DispatchHarness } from './dispatch-test-harness';
import { RiderStatus } from '@ore/contracts';

/**
 * The bounding box is only ever allowed to *over*-select. If it ever excludes a rider who is
 * genuinely within the radius, dispatch silently stops offering that rider work — a failure that
 * would look like "no riders available" rather than like a bug.
 */
describe('boundingBox', () => {
  const ACCRA = { lat: 5.6037, lng: -0.187 };

  /** Great-circle distance, the same measure the exact eligibility check uses. */
  const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(h));
  };

  const inBox = (p: { lat: number; lng: number }, box: ReturnType<typeof boundingBox>) =>
    p.lat >= box.minLat && p.lat <= box.maxLat && p.lng >= box.minLng && p.lng <= box.maxLng;

  it('contains every point inside the radius — the property that matters', () => {
    for (const radiusKm of [1, 5, 15, 50]) {
      const box = boundingBox(ACCRA, radiusKm);
      for (let i = 0; i < 4000; i++) {
        // Sample uniformly across the disc, plus a margin so points near the edge are covered.
        const bearing = Math.random() * 2 * Math.PI;
        const dist = Math.random() * radiusKm;
        const dLat = (dist * Math.cos(bearing)) / 111.195;
        const dLng = (dist * Math.sin(bearing)) / (111.195 * Math.cos((ACCRA.lat * Math.PI) / 180));
        const p = { lat: ACCRA.lat + dLat, lng: ACCRA.lng + dLng };
        if (haversineKm(ACCRA, p) <= radiusKm) {
          expect(inBox(p, box)).toBe(true);
        }
      }
    }
  });

  it('excludes points far outside the radius, which is the whole point', () => {
    const box = boundingBox(ACCRA, 5);
    // Kumasi, ~200 km away.
    expect(inBox({ lat: 6.6885, lng: -1.6244 }, box)).toBe(false);
  });

  it('grows with the radius', () => {
    const small = boundingBox(ACCRA, 2);
    const large = boundingBox(ACCRA, 20);
    expect(large.maxLat - large.minLat).toBeGreaterThan(small.maxLat - small.minLat);
    expect(large.maxLng - large.minLng).toBeGreaterThan(small.maxLng - small.minLng);
  });

  it('is centred on the origin', () => {
    const box = boundingBox(ACCRA, 10);
    expect((box.minLat + box.maxLat) / 2).toBeCloseTo(ACCRA.lat, 9);
    expect((box.minLng + box.maxLng) / 2).toBeCloseTo(ACCRA.lng, 9);
  });

  it('widens longitude at higher latitudes, where a degree spans less ground', () => {
    const equator = boundingBox({ lat: 0, lng: 0 }, 10);
    const oslo = boundingBox({ lat: 59.9, lng: 10.7 }, 10);
    expect(oslo.maxLng - oslo.minLng).toBeGreaterThan(equator.maxLng - equator.minLng);
    // Latitude spans the same distance everywhere.
    expect(oslo.maxLat - oslo.minLat).toBeCloseTo(equator.maxLat - equator.minLat, 9);
  });

  describe('degenerate cases fall back to no longitude filter', () => {
    it('near the pole', () => {
      expect(boundingBox({ lat: 89.9999999, lng: 0 }, 10).degenerate).toBe(true);
    });

    it('for a radius wide enough to wrap the globe', () => {
      const box = boundingBox(ACCRA, 40_000);
      expect(box.degenerate).toBe(true);
      expect(box.minLng).toBe(-180);
      expect(box.maxLng).toBe(180);
    });

    it('near the antimeridian, rather than producing a range that excludes the wrap', () => {
      expect(boundingBox({ lat: 0, lng: 179.99 }, 50).degenerate).toBe(true);
    });

    it('for a zero, negative or non-finite radius', () => {
      expect(boundingBox(ACCRA, 0).degenerate).toBe(true);
      expect(boundingBox(ACCRA, -5).degenerate).toBe(true);
      expect(boundingBox(ACCRA, NaN).degenerate).toBe(true);
    });

    it('for a non-finite origin', () => {
      expect(boundingBox({ lat: NaN, lng: 0 }, 10).degenerate).toBe(true);
    });
  });

  it('never produces a latitude outside ±90', () => {
    for (const lat of [-89.9, 0, 89.9]) {
      const box = boundingBox({ lat, lng: 0 }, 500);
      expect(box.minLat).toBeGreaterThanOrEqual(-90);
      expect(box.maxLat).toBeLessThanOrEqual(90);
    }
  });
});

describe('DispatchService.buildPool — scaling', () => {
  let h: DispatchHarness;

  const ORIGIN = { lat: 5.6037, lng: -0.187 };

  const buildPool = (radiusKm = 5, attempt = 0) =>
    (h.service as never as { buildPool: Function })
      .buildPool(makeOrderSnapshot(), ORIGIN, radiusKm, false, attempt) as Promise<unknown[]>;

  /** A query builder that records what it was asked and returns `riders`. */
  const stubQueryBuilder = (riders: unknown[]) => {
    const captured: { where: unknown[]; params: Record<string, unknown> } = { where: [], params: {} };
    const qb: Record<string, unknown> = {
      where: jest.fn((sql: string, p: Record<string, unknown> = {}) => { captured.where.push(sql); Object.assign(captured.params, p); return qb; }),
      andWhere: jest.fn((sql: string, p: Record<string, unknown> = {}) => { captured.where.push(sql); Object.assign(captured.params, p); return qb; }),
      getMany: jest.fn().mockResolvedValue(riders),
    };
    h.riders.createQueryBuilder.mockReturnValue(qb as never);
    return captured;
  };

  beforeEach(async () => {
    h = await buildDispatchHarness();
    h.exclusions.find.mockResolvedValue([]);
    h.assignments.find.mockResolvedValue([]);
    h.audit.save.mockImplementation(async (a: unknown) => a);
    h.audit.create.mockImplementation((a: unknown) => a);
  });

  afterEach(async () => {
    await h.module.close();
    jest.restoreAllMocks();
  });

  it('narrows the candidate set in SQL instead of loading every rider', async () => {
    const captured = stubQueryBuilder([makeRider()]);

    await buildPool(5);

    expect(h.riders.find).not.toHaveBeenCalled();
    expect(captured.where.join(' ')).toContain('rider.status = :status');
    expect(captured.where.join(' ')).toContain('BETWEEN :minLat AND :maxLat');
    expect(captured.params.status).toBe(RiderStatus.AVAILABLE);
  });

  it('still includes riders with no recorded position, so an outage is visible', async () => {
    const captured = stubQueryBuilder([]);

    await buildPool(5);

    // A fleet-wide location-reporting failure must surface as `missing_location` rejections,
    // not as a mysteriously empty pool.
    expect(captured.where.join(' ')).toContain('rider.lat IS NULL');
  });

  it('falls back to an unfiltered load when the box is degenerate', async () => {
    h.riders.find.mockResolvedValue([]);
    h.riders.createQueryBuilder.mockClear();

    await buildPool(40_000);

    expect(h.riders.find).toHaveBeenCalledWith({ where: { status: RiderStatus.AVAILABLE } });
    expect(h.riders.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('fetches active assignments once for the whole pool, not once per rider', async () => {
    const riders = Array.from({ length: 25 }, (_, i) => makeRider({ id: `rider-${i}` }));
    stubQueryBuilder(riders);
    h.assignments.find.mockResolvedValue([]);

    await buildPool(5);

    // One batched lookup, regardless of pool size — this was 25 queries before.
    expect(h.assignments.find).toHaveBeenCalledTimes(1);
    const call = h.assignments.find.mock.calls[0][0] as { where: { riderId: unknown; status: string } };
    expect(call.where.status).toBe('ACTIVE');
  });

  it('applies each rider their own active assignments from the batch', async () => {
    const riders = [makeRider({ id: 'busy' }), makeRider({ id: 'free' })];
    stubQueryBuilder(riders);
    h.assignments.find.mockResolvedValue([{ id: 'a1', riderId: 'busy', orderId: 'other', status: 'ACTIVE' }]);
    jest.spyOn(h.service as never, 'activeRouteExtraKm' as never).mockResolvedValue(0 as never);

    const pool = (await buildPool(5)) as Array<{ rider: { id: string } }>;

    // The busy rider is rejected for a route conflict; the free one survives.
    expect(pool.map((c) => c.rider.id)).toEqual(['free']);
  });

  it('writes all rejections in a single insert rather than one per rider', async () => {
    const riders = Array.from({ length: 12 }, (_, i) => makeRider({ id: `r${i}`, verified: false }));
    stubQueryBuilder(riders);

    await buildPool(5);

    expect(h.audit.save).toHaveBeenCalledTimes(1);
    expect(h.audit.save.mock.calls[0][0]).toHaveLength(12);
  });

  it('writes nothing at all when every rider is eligible', async () => {
    stubQueryBuilder([makeRider({ id: 'a' }), makeRider({ id: 'b' })]);

    await buildPool(5);

    expect(h.audit.save).not.toHaveBeenCalled();
  });

  it('returns candidates sorted best-first', async () => {
    stubQueryBuilder([
      makeRider({ id: 'far', lat: ORIGIN.lat + 0.03, lng: ORIGIN.lng }),
      makeRider({ id: 'near', lat: ORIGIN.lat, lng: ORIGIN.lng }),
    ]);

    const pool = (await buildPool(10)) as Array<{ rider: { id: string }; score: number }>;

    expect(pool.map((c) => c.rider.id)).toEqual(['near', 'far']);
    expect(pool[0].score).toBeLessThanOrEqual(pool[1].score);
  });

  it('skips the assignment query entirely when the box matches nobody', async () => {
    stubQueryBuilder([]);

    const pool = await buildPool(5);

    expect(pool).toEqual([]);
    expect(h.assignments.find).not.toHaveBeenCalled();
  });
});
