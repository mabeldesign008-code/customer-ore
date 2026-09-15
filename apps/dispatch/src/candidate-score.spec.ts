import { VehicleType, VendorType } from '@ore/contracts';
import {
  DEFAULT_SCORING_WEIGHTS,
  parseScoringWeights,
  pickupEtaMin,
  vehicleSuitability,
  isMarketLoad,
  scoreCandidate,
  CandidateRiderStats,
  acceptanceProbability,
  ACCEPTANCE_PRIOR_RATE,
} from './candidate-score';

/**
 * Dispatch decides who earns money. It had seven tests. This covers the ranking arithmetic —
 * the part that silently changes who gets offered work when a weight or a clamp is wrong.
 */
describe('candidate scoring', () => {
  const rider = (over: Partial<CandidateRiderStats> = {}): CandidateRiderStats => ({
    idleSince: null,
    reliabilityScore: 1,
    rating: 4,
    offerCount: 0,
    declineCount: 0,
    timeoutCount: 0,
    cancellationCount: 0,
    ...over,
  });

  const facts = (distanceKm: number, etaMin = 10, suit = 1) => ({ distanceKm, etaMin, vehicleSuitability: suit });
  const W = DEFAULT_SCORING_WEIGHTS;
  const NOW = new Date('2026-09-04T12:00:00.000Z').getTime();

  describe('ordering — lower is better', () => {
    it('prefers the nearer rider, all else equal', () => {
      const near = scoreCandidate(rider(), facts(1), W, NOW);
      const far = scoreCandidate(rider(), facts(9), W, NOW);
      expect(near).toBeLessThan(far);
    });

    it('prefers the rider who has been idle longer, at equal distance', () => {
      const waiting = scoreCandidate(rider({ idleSince: new Date(NOW - 60 * 60_000) }), facts(3), W, NOW);
      const justFreed = scoreCandidate(rider({ idleSince: new Date(NOW) }), facts(3), W, NOW);
      expect(waiting).toBeLessThan(justFreed);
    });

    it('prefers the more reliable rider', () => {
      const good = scoreCandidate(rider({ reliabilityScore: 1.5 }), facts(3), W, NOW);
      const poor = scoreCandidate(rider({ reliabilityScore: 0.5 }), facts(3), W, NOW);
      expect(good).toBeLessThan(poor);
    });

    it('prefers the higher-rated rider', () => {
      const five = scoreCandidate(rider({ rating: 5 }), facts(3), W, NOW);
      const three = scoreCandidate(rider({ rating: 3 }), facts(3), W, NOW);
      expect(five).toBeLessThan(three);
    });

    it('penalises declines, timeouts and cancellations', () => {
      const clean = scoreCandidate(rider(), facts(3), W, NOW);
      expect(scoreCandidate(rider({ declineCount: 5 }), facts(3), W, NOW)).toBeGreaterThan(clean);
      expect(scoreCandidate(rider({ timeoutCount: 5 }), facts(3), W, NOW)).toBeGreaterThan(clean);
      expect(scoreCandidate(rider({ cancellationCount: 5 }), facts(3), W, NOW)).toBeGreaterThan(clean);
    });

    it('prefers the better-suited vehicle', () => {
      const ideal = scoreCandidate(rider(), facts(3, 10, 1), W, NOW);
      const marginal = scoreCandidate(rider(), facts(3, 10, 0.4), W, NOW);
      expect(ideal).toBeLessThan(marginal);
    });

    it('lets a long ETA outweigh a short straight-line distance', () => {
      // A bicycle 3 km away takes ~12.9 min; a car 4 km away takes ~8.6 min. The car wins
      // despite being further, which is the whole point of scoring ETA rather than distance.
      const slowNear = scoreCandidate(rider(), facts(3, pickupEtaMin(3, VehicleType.BICYCLE)), W, NOW);
      const fastFar = scoreCandidate(rider(), facts(4, pickupEtaMin(4, VehicleType.CAR)), W, NOW);
      expect(fastFar).toBeLessThan(slowNear);
    });

    it('breaks an ETA tie on distance', () => {
      // Bicycle speed (14 kph) is almost exactly half car speed (28 kph), so a bicycle at d and
      // a car at 2d arrive together. When ETA ties, the nearer rider wins — which keeps the
      // shorter physical trip, and that is the right tiebreak.
      const bike = scoreCandidate(rider(), facts(2, pickupEtaMin(2, VehicleType.BICYCLE)), W, NOW);
      const car = scoreCandidate(rider(), facts(4, pickupEtaMin(4, VehicleType.CAR)), W, NOW);
      expect(pickupEtaMin(2, VehicleType.BICYCLE)).toBeCloseTo(pickupEtaMin(4, VehicleType.CAR), 6);
      expect(bike).toBeLessThan(car);
    });
  });

  describe('clamps — no single signal may dominate', () => {
    it('caps the idle-time credit at four hours', () => {
      const fourHours = scoreCandidate(rider({ idleSince: new Date(NOW - 240 * 60_000) }), facts(3), W, NOW);
      const twoDays = scoreCandidate(rider({ idleSince: new Date(NOW - 2880 * 60_000) }), facts(3), W, NOW);
      expect(twoDays).toBeCloseTo(fourHours, 10);
    });

    it('caps the reliability bonus at ±1 so an inflated score cannot buy every order', () => {
      const two = scoreCandidate(rider({ reliabilityScore: 2 }), facts(3), W, NOW);
      const hundred = scoreCandidate(rider({ reliabilityScore: 100 }), facts(3), W, NOW);
      expect(hundred).toBeCloseTo(two, 10);
    });

    it('caps the rating bonus at ±1 in both directions', () => {
      const five = scoreCandidate(rider({ rating: 5 }), facts(3), W, NOW);
      const ten = scoreCandidate(rider({ rating: 10 }), facts(3), W, NOW);
      expect(ten).toBeCloseTo(five, 10);

      const three = scoreCandidate(rider({ rating: 3 }), facts(3), W, NOW);
      const zero = scoreCandidate(rider({ rating: 0 }), facts(3), W, NOW);
      expect(zero).toBeCloseTo(three, 10);
    });

    it('caps the cancellation counter at 20 so a bad history is not a permanent ban', () => {
      const twenty = scoreCandidate(rider({ cancellationCount: 20 }), facts(3), W, NOW);
      const thousands = scoreCandidate(rider({ cancellationCount: 5000 }), facts(3), W, NOW);
      expect(thousands).toBeCloseTo(twenty, 10);
    });

    it('bounds the refusal penalty however bad the record', () => {
      // Refusals used to be clamped counts, which measured tenure as much as behaviour and
      // saturated: past 20, every rider looked identical. They are now a rate, so the term is
      // bounded by construction — a certain refuser pays the full weight and no more.
      const perfect = scoreCandidate(rider({ offerCount: 1000, declineCount: 0, timeoutCount: 0 }), facts(3), W, NOW);
      const hopeless = scoreCandidate(rider({ offerCount: 5000, declineCount: 5000, timeoutCount: 0 }), facts(3), W, NOW);

      expect(hopeless - perfect).toBeLessThanOrEqual((W.declinePenalty + W.timeoutPenalty) * 20 + 1e-9);
    });

    it('distinguishes a selective veteran from a rider who refuses everything', () => {
      // The old clamped counts could not: 20 declines out of 500 offers and 20 out of 20 both
      // pinned at the cap and scored the same.
      const veteran = scoreCandidate(rider({ offerCount: 500, declineCount: 20 }), facts(3), W, NOW);
      const refuser = scoreCandidate(rider({ offerCount: 20, declineCount: 20 }), facts(3), W, NOW);

      expect(veteran).toBeLessThan(refuser);
    });

    it('never treats a future idleSince as negative idle time', () => {
      const future = scoreCandidate(rider({ idleSince: new Date(NOW + 60 * 60_000) }), facts(3), W, NOW);
      const none = scoreCandidate(rider({ idleSince: null }), facts(3), W, NOW);
      expect(future).toBeCloseTo(none, 10);
    });
  });

  describe('defaults for missing rider data', () => {
    it('treats a null reliability as neutral 1.0', () => {
      expect(scoreCandidate(rider({ reliabilityScore: null }), facts(3), W, NOW))
        .toBeCloseTo(scoreCandidate(rider({ reliabilityScore: 1 }), facts(3), W, NOW), 10);
    });

    it('treats a null rating as neutral 4.0 — a new rider is neither rewarded nor punished', () => {
      expect(scoreCandidate(rider({ rating: null }), facts(3), W, NOW))
        .toBeCloseTo(scoreCandidate(rider({ rating: 4 }), facts(3), W, NOW), 10);
    });
  });

  describe('weight overrides', () => {
    it('uses defaults when the env var is absent', () => {
      expect(parseScoringWeights(undefined)).toEqual(DEFAULT_SCORING_WEIGHTS);
    });

    it('merges a partial override over the defaults', () => {
      const w = parseScoringWeights(JSON.stringify({ distance: 0.9 }));
      expect(w.distance).toBe(0.9);
      expect(w.rating).toBe(DEFAULT_SCORING_WEIGHTS.rating);
    });

    it('falls back wholesale on malformed JSON rather than crashing dispatch', () => {
      expect(parseScoringWeights('{not json')).toEqual(DEFAULT_SCORING_WEIGHTS);
    });

    it('drops non-finite weights, which would turn every score into NaN', () => {
      const w = parseScoringWeights(JSON.stringify({ distance: 'heavy', idleTime: null, rating: 0.4 }));
      expect(w.distance).toBe(DEFAULT_SCORING_WEIGHTS.distance);
      expect(w.idleTime).toBe(DEFAULT_SCORING_WEIGHTS.idleTime);
      expect(w.rating).toBe(0.4);
      expect(Object.values(w).every(Number.isFinite)).toBe(true);
    });

    it('actually changes the ranking when distance is weighted up', () => {
      const heavy = parseScoringWeights(JSON.stringify({ distance: 5 }));
      const spread = scoreCandidate(rider(), facts(10), heavy, NOW) - scoreCandidate(rider(), facts(1), heavy, NOW);
      const base = scoreCandidate(rider(), facts(10), W, NOW) - scoreCandidate(rider(), facts(1), W, NOW);
      expect(spread).toBeGreaterThan(base);
    });

    it('does not let a mutated result leak into later calls', () => {
      const a = parseScoringWeights(undefined);
      a.distance = 99;
      expect(parseScoringWeights(undefined).distance).toBe(DEFAULT_SCORING_WEIGHTS.distance);
    });
  });
});

describe('vehicle suitability', () => {
  const s = (vehicle: VehicleType, weightKg = 0, market = false) => vehicleSuitability({ vehicle, weightKg, isMarketLoad: market });

  it('rejects anything but a car above 35 kg', () => {
    expect(s(VehicleType.MOTORBIKE, 36)).toBe(0);
    expect(s(VehicleType.BICYCLE, 36)).toBe(0);
    expect(s(VehicleType.CAR, 36)).toBe(1);
  });

  it('rejects a bicycle above 15 kg', () => {
    expect(s(VehicleType.BICYCLE, 15)).toBe(0.75);
    expect(s(VehicleType.BICYCLE, 16)).toBe(0);
  });

  it('rejects a bicycle on a market run at any weight', () => {
    expect(s(VehicleType.BICYCLE, 0, true)).toBe(0);
  });

  it('downgrades but still allows a motorbike between 20 and 35 kg', () => {
    expect(s(VehicleType.MOTORBIKE, 20)).toBe(1);
    expect(s(VehicleType.MOTORBIKE, 21)).toBe(0.4);
    expect(s(VehicleType.MOTORBIKE, 35)).toBe(0.4);
  });

  it('prefers a car for market runs', () => {
    expect(s(VehicleType.CAR, 0, true)).toBe(1);
    expect(s(VehicleType.MOTORBIKE, 0, true)).toBe(1);
  });

  it('scores a bicycle slightly below a motorbike on an ordinary light order', () => {
    expect(s(VehicleType.BICYCLE, 1)).toBe(0.75);
    expect(s(VehicleType.MOTORBIKE, 1)).toBe(1);
  });

  it('checks the boundaries exactly — 35 kg is allowed, 36 is not', () => {
    expect(s(VehicleType.MOTORBIKE, 35)).toBe(0.4);
    expect(s(VehicleType.MOTORBIKE, 35.01)).toBe(0);
  });

  it('recognises a market load by vendor type or by the MK service code', () => {
    expect(isMarketLoad(VendorType.MARKET, 'FD')).toBe(true);
    expect(isMarketLoad(VendorType.FOOD, 'mk')).toBe(true);
    expect(isMarketLoad(VendorType.FOOD, 'FD')).toBe(false);
    expect(isMarketLoad(undefined, undefined)).toBe(false);
  });
});

describe('pickup ETA', () => {
  it('is faster by car than by motorbike, and slowest by bicycle', () => {
    expect(pickupEtaMin(10, VehicleType.CAR)).toBeLessThan(pickupEtaMin(10, VehicleType.MOTORBIKE));
    expect(pickupEtaMin(10, VehicleType.MOTORBIKE)).toBeLessThan(pickupEtaMin(10, VehicleType.BICYCLE));
  });

  it('never returns less than one minute, even for a rider at the door', () => {
    expect(pickupEtaMin(0, VehicleType.CAR)).toBe(1);
    expect(pickupEtaMin(0.01, VehicleType.BICYCLE)).toBe(1);
  });

  it('scales linearly with distance', () => {
    expect(pickupEtaMin(20, VehicleType.CAR)).toBeCloseTo(2 * pickupEtaMin(10, VehicleType.CAR), 10);
  });
});

/**
 * Refusals used to enter the score as raw lifetime counts clamped at 20, which measured tenure
 * as much as behaviour: 20 declines out of 500 offers scored exactly as badly as 20 out of 20,
 * and every long-serving rider eventually pinned at the clamp where the signal stopped
 * distinguishing anyone from anyone.
 */
describe('acceptanceProbability', () => {
  const r = (offerCount: number, declineCount = 0, timeoutCount = 0) => ({ offerCount, declineCount, timeoutCount });

  it('starts at the prior for a rider with no history', () => {
    expect(acceptanceProbability(r(0))).toBeCloseTo(ACCEPTANCE_PRIOR_RATE, 10);
  });

  it('barely moves on a sample of two', () => {
    // A rider who declined their only two offers has a raw rate of 0%, which is a statement
    // about a sample of two, not about the rider.
    expect(acceptanceProbability(r(2, 2))).toBeGreaterThan(0.5);
  });

  it('converges on the true rate as evidence accumulates', () => {
    expect(acceptanceProbability(r(1000, 1000))).toBeLessThan(0.01);
    expect(acceptanceProbability(r(1000, 0))).toBeGreaterThan(0.99);
  });

  it('ranks a selective veteran above a consistent refuser', () => {
    expect(acceptanceProbability(r(500, 20))).toBeGreaterThan(acceptanceProbability(r(20, 20)));
  });

  it('treats a timeout as a refusal', () => {
    // From the order's point of view they are the same event: the window burns and the customer
    // waits. Treating silence as neutral would reward it over an honest, immediate decline.
    expect(acceptanceProbability(r(100, 0, 50))).toBeCloseTo(acceptanceProbability(r(100, 50, 0)), 10);
  });

  it('does not read a legacy rider with no offer count as flawless', () => {
    // Rows written before `offerCount` existed have refusals and a zero denominator. Dividing by
    // the offer count alone would score them as a perfect 100% acceptance record.
    expect(acceptanceProbability(r(0, 30))).toBeLessThan(0.25);
  });

  it('stays within [0, 1]', () => {
    for (const [o, d, t] of [[0, 0, 0], [1, 0, 0], [1, 1, 1], [10, 50, 50], [1e6, 0, 0], [-5, -5, -5]] as const) {
      const p = acceptanceProbability(r(o, d, t));
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });

  it('survives non-finite counters rather than poisoning every score with NaN', () => {
    const p = acceptanceProbability({ offerCount: NaN, declineCount: Infinity, timeoutCount: undefined as never });
    expect(Number.isFinite(p)).toBe(true);
  });

  it('recovers as a rider starts accepting again', () => {
    // A clamped lifetime counter never falls, so a bad month was permanent. A rate does fall.
    const afterBadRun = acceptanceProbability(r(20, 15));
    const afterRecovery = acceptanceProbability(r(200, 15));
    expect(afterRecovery).toBeGreaterThan(afterBadRun);
  });
});
