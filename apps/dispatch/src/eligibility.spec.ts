import { RiderStatus, RiderCodStatus, RiderCodTier, ErrandTrustTier, PaymentMethod, OrderType, VendorType, VehicleType } from '@ore/contracts';
import { buildDispatchHarness, makeRider, makeOrderSnapshot, DispatchHarness } from './dispatch-test-harness';

/**
 * Every reason a rider can be refused an order.
 *
 * This gate decides who is allowed to earn. Each test moves exactly one field away from an
 * otherwise-eligible rider, so a failure names the gate that broke rather than leaving a pile
 * of overlapping rejections to untangle.
 */
describe('DispatchService.validateCandidateEligibility', () => {
  let h: DispatchHarness;

  // The pickup point, and a rider sitting right on top of it.
  const ORIGIN = { lat: 5.6037, lng: -0.187 };
  const RADIUS_KM = 5;

  beforeEach(async () => {
    h = await buildDispatchHarness();
    // Default: no active work, so `route_conflict_active_assignment` stays quiet.
    h.assignments.find.mockResolvedValue([]);
  });

  afterEach(async () => {
    await h.module.close();
    jest.restoreAllMocks();
  });

  const validate = (rider = makeRider(), order = makeOrderSnapshot(), isCod = false, opts = {}) =>
    (h.service as never as { validateCandidateEligibility: Function })
      .validateCandidateEligibility(rider, order, ORIGIN, RADIUS_KM, isCod, opts) as Promise<{
        ok: boolean; reasons: string[]; distanceKm?: number; score: number;
        vehicleSuitability: number; codExposurePesewas: number; etaMin?: number; routeExtraKm: number;
      }>;

  it('accepts an eligible rider with no reasons at all', async () => {
    const res = await validate();

    expect(res.ok).toBe(true);
    expect(res.reasons).toEqual([]);
    expect(res.distanceKm).toBe(0);
    expect(res.vehicleSuitability).toBe(1);
    expect(Number.isFinite(res.score)).toBe(true);
  });

  describe('availability', () => {
    it('refuses a rider who is not AVAILABLE', async () => {
      const res = await validate(makeRider({ status: RiderStatus.DELIVERING }));
      expect(res.reasons).toContain('not_available');
      expect(res.ok).toBe(false);
    });

    it('refuses an OFFERED rider by default, but allows one when the caller opts in', async () => {
      const offered = makeRider({ status: RiderStatus.OFFERED });

      expect((await validate(offered)).reasons).toContain('not_available');
      expect((await validate(offered, makeOrderSnapshot(), false, { allowOffered: true })).reasons)
        .not.toContain('not_available');
    });

    it('refuses a rider with no known location', async () => {
      const res = await validate(makeRider({ lat: null, lng: null }));
      expect(res.reasons).toContain('missing_location');
      // With no location there is no distance or ETA to report, rather than a bogus zero.
      expect(res.distanceKm).toBeUndefined();
      expect(res.etaMin).toBeUndefined();
    });

    it('refuses an unverified rider', async () => {
      expect((await validate(makeRider({ verified: false }))).reasons).toContain('not_verified');
    });

    it('refuses a rider without an issued identifier', async () => {
      expect((await validate(makeRider({ riderIdentifier: null }))).reasons).toContain('missing_rider_identifier');
    });
  });

  describe('time-based blocks', () => {
    const future = new Date(Date.now() + 60 * 60_000);
    const past = new Date(Date.now() - 60 * 60_000);

    it('refuses a paused rider, and allows one whose pause has lapsed', async () => {
      expect((await validate(makeRider({ pausedUntil: future }))).reasons).toContain('paused');
      expect((await validate(makeRider({ pausedUntil: past }))).reasons).not.toContain('paused');
    });

    it('refuses a rider in cooldown, and allows one whose cooldown has lapsed', async () => {
      expect((await validate(makeRider({ cooldownUntil: future }))).reasons).toContain('cooldown');
      expect((await validate(makeRider({ cooldownUntil: past }))).reasons).not.toContain('cooldown');
    });

    it('reports the specific restriction reason rather than a generic one', async () => {
      const res = await validate(makeRider({ restrictedUntil: future, restrictionReason: 'documents_expired' }));
      expect(res.reasons).toContain('documents_expired');
    });

    it('falls back to a generic reason when a restriction has no stated cause', async () => {
      const res = await validate(makeRider({ restrictedUntil: future, restrictionReason: null }));
      expect(res.reasons).toContain('restricted');
    });
  });

  describe('per-order exclusion', () => {
    it('refuses a rider already excluded from this order', async () => {
      const res = await validate(makeRider(), makeOrderSnapshot(), false, { excluded: new Set(['rider-1']) });
      expect(res.reasons).toContain('excluded_for_order');
    });

    it('ignores an exclusion set that names someone else', async () => {
      const res = await validate(makeRider(), makeOrderSnapshot(), false, { excluded: new Set(['rider-other']) });
      expect(res.reasons).not.toContain('excluded_for_order');
    });
  });

  describe('COD gates', () => {
    it('refuses a rider under investigation or terminated, even for a prepaid order', async () => {
      expect((await validate(makeRider({ codStatus: RiderCodStatus.INVESTIGATION }))).reasons).toContain('cod_investigation');
      expect((await validate(makeRider({ codStatus: RiderCodStatus.TERMINATED }))).reasons).toContain('cod_terminated');
    });

    it('applies cod_blocked and cod_suspended only to COD orders', async () => {
      const blocked = makeRider({ codBlocked: true });
      const suspended = makeRider({ codStatus: RiderCodStatus.SUSPENDED });

      expect((await validate(blocked, makeOrderSnapshot(), false)).reasons).not.toContain('cod_blocked');
      expect((await validate(suspended, makeOrderSnapshot(), false)).reasons).not.toContain('cod_suspended');

      const codOrder = makeOrderSnapshot({ paymentMethod: PaymentMethod.COD });
      expect((await validate(blocked, codOrder, true)).reasons).toContain('cod_blocked');
      expect((await validate(suspended, codOrder, true)).reasons).toContain('cod_suspended');
    });

    it('refuses when this order would push the rider past their COD limit', async () => {
      const rider = makeRider({ maxCodLimitPesewas: 50_000 });
      const codOrder = makeOrderSnapshot({ paymentMethod: PaymentMethod.COD, totalPesewas: 20_000 });
      // Already carrying 40 000; 40 000 + 20 000 > 50 000.
      jest.spyOn(h.service as never, 'activeCodExposurePesewas' as never).mockResolvedValue(40_000 as never);

      const res = await validate(rider, codOrder, true);

      expect(res.reasons).toContain('cod_limit_exceeded');
      expect(res.codExposurePesewas).toBe(40_000);
    });

    it('allows a COD order that lands exactly on the limit', async () => {
      const rider = makeRider({ maxCodLimitPesewas: 60_000 });
      const codOrder = makeOrderSnapshot({ paymentMethod: PaymentMethod.COD, totalPesewas: 20_000 });
      jest.spyOn(h.service as never, 'activeCodExposurePesewas' as never).mockResolvedValue(40_000 as never);

      expect((await validate(rider, codOrder, true)).reasons).not.toContain('cod_limit_exceeded');
    });

    it('reports zero exposure and runs no COD query for a prepaid order', async () => {
      const spy = jest.spyOn(h.service as never, 'activeCodExposurePesewas' as never);
      const res = await validate(makeRider(), makeOrderSnapshot(), false);

      expect(res.codExposurePesewas).toBe(0);
      expect(spy).not.toHaveBeenCalled();
    });

    it('falls back to the tier limit when the rider has no explicit cap', async () => {
      // maxCodLimitPesewas 0 means "use the tier", and NEW defaults to ₵1 000.
      const rider = makeRider({ maxCodLimitPesewas: 0, codTier: RiderCodTier.NEW });
      const codOrder = makeOrderSnapshot({ paymentMethod: PaymentMethod.COD, totalPesewas: 10_000 });
      jest.spyOn(h.service as never, 'activeCodExposurePesewas' as never).mockResolvedValue(95_000 as never);

      expect((await validate(rider, codOrder, true)).reasons).toContain('cod_limit_exceeded');
    });
  });

  describe('errand trust limits', () => {
    const errand = (budgetPesewas: number) =>
      makeOrderSnapshot({ orderType: OrderType.ERRAND, errandJson: { budgetPesewas } });

    it('refuses an errand that would exceed the tier limit', async () => {
      // NEW tier caps at ₵300 = 30 000 pesewas.
      jest.spyOn(h.service as never, 'activeErrandCarry' as never).mockResolvedValue(25_000 as never);

      const res = await validate(makeRider({ errandTrustTier: ErrandTrustTier.NEW }), errand(10_000));

      expect(res.reasons).toContain('errand_trust_limit_exceeded');
    });

    it('allows the same errand for a rider on a higher trust tier', async () => {
      jest.spyOn(h.service as never, 'activeErrandCarry' as never).mockResolvedValue(25_000 as never);

      const res = await validate(makeRider({ errandTrustTier: ErrandTrustTier.TRUSTED }), errand(10_000));

      expect(res.reasons).not.toContain('errand_trust_limit_exceeded');
    });

    it('does not apply errand limits to a normal delivery', async () => {
      const spy = jest.spyOn(h.service as never, 'activeErrandCarry' as never);
      await validate(makeRider(), makeOrderSnapshot());
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('distance and vehicle', () => {
    it('refuses a rider outside the search radius', async () => {
      // ~0.9° of latitude is far beyond a 5 km radius.
      const res = await validate(makeRider({ lat: ORIGIN.lat + 0.9, lng: ORIGIN.lng }));
      expect(res.reasons).toContain('outside_radius');
    });

    it('accepts a rider just inside the radius', async () => {
      // ~0.018° ≈ 2 km.
      const res = await validate(makeRider({ lat: ORIGIN.lat + 0.018, lng: ORIGIN.lng }));
      expect(res.reasons).not.toContain('outside_radius');
      expect(res.ok).toBe(true);
    });

    it('refuses a bicycle for a market run', async () => {
      const res = await validate(
        makeRider({ vehicle: VehicleType.BICYCLE }),
        makeOrderSnapshot({ vendorType: VendorType.MARKET, serviceCode: 'MK' }),
      );
      expect(res.reasons).toContain('vehicle_unsuitable');
      expect(res.vehicleSuitability).toBe(0);
    });

    it('refuses a motorbike for a parcel over 35 kg but accepts a car', async () => {
      const heavy = makeOrderSnapshot({ parcelJson: { weightKg: 40 } });

      expect((await validate(makeRider({ vehicle: VehicleType.MOTORBIKE }), heavy)).reasons).toContain('vehicle_unsuitable');
      expect((await validate(makeRider({ vehicle: VehicleType.CAR }), heavy)).reasons).not.toContain('vehicle_unsuitable');
    });

    it('rounds the reported distance and ETA rather than emitting raw floats', async () => {
      const res = await validate(makeRider({ lat: ORIGIN.lat + 0.018, lng: ORIGIN.lng }));

      expect(res.distanceKm).toBe(Number(res.distanceKm!.toFixed(1)));
      expect(res.etaMin).toBe(Number(res.etaMin!.toFixed(1)));
    });
  });

  describe('route conflicts', () => {
    it('refuses a rider who already has active work', async () => {
      h.assignments.find.mockResolvedValue([{ id: 'a1', orderId: 'other', riderId: 'rider-1', status: 'ACTIVE' }]);
      jest.spyOn(h.service as never, 'activeRouteExtraKm' as never).mockResolvedValue(0 as never);

      const res = await validate();

      expect(res.reasons).toContain('route_conflict_active_assignment');
    });

    it('additionally refuses when the detour is too long', async () => {
      h.assignments.find.mockResolvedValue([{ id: 'a1', orderId: 'other', riderId: 'rider-1', status: 'ACTIVE' }]);
      jest.spyOn(h.service as never, 'activeRouteExtraKm' as never).mockResolvedValue(99 as never);

      const res = await validate();

      expect(res.reasons).toContain('route_extra_too_high');
      expect(res.routeExtraKm).toBe(99);
    });

    it('treats a detour computation failure as zero rather than refusing the rider twice', async () => {
      h.assignments.find.mockResolvedValue([{ id: 'a1', orderId: 'other', riderId: 'rider-1', status: 'ACTIVE' }]);
      jest.spyOn(h.service as never, 'activeRouteExtraKm' as never).mockRejectedValue(new Error('maps down') as never);

      const res = await validate();

      expect(res.routeExtraKm).toBe(0);
      expect(res.reasons).not.toContain('route_extra_too_high');
    });
  });

  describe('reporting', () => {
    it('collects every applicable reason, not just the first', async () => {
      const res = await validate(makeRider({ status: RiderStatus.DELIVERING, verified: false, riderIdentifier: null }));

      expect(res.reasons).toEqual(expect.arrayContaining(['not_available', 'not_verified', 'missing_rider_identifier']));
      expect(res.reasons.length).toBeGreaterThanOrEqual(3);
    });

    it('still scores an ineligible rider, so rejections stay auditable and comparable', async () => {
      const res = await validate(makeRider({ verified: false }));

      expect(res.ok).toBe(false);
      expect(Number.isFinite(res.score)).toBe(true);
    });

    it('substitutes a finite penalty score for a rider with no location', async () => {
      const res = await validate(makeRider({ lat: null, lng: null }));

      // An infinite distance would make the score NaN and corrupt the ordering of the whole pool.
      expect(Number.isFinite(res.score)).toBe(true);
    });
  });
});
