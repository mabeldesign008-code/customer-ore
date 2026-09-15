import { VehicleType, VendorType } from '@ore/contracts';

/** Relative weights applied to each ranking signal. Overridable via env. */
export interface DispatchScoringWeights {
  distance: number;
  idleTime: number;
  reliability: number;
  rating: number;
  declinePenalty: number;
  timeoutPenalty: number;
  vehicleSuitability: number;
  pickupEta: number;
}

/**
 * The pure half of candidate selection: how good is this rider for this order?
 *
 * Kept free of NestJS and TypeORM so the ranking can be reasoned about and tested directly,
 * the same way `demand-score.ts` treats rider positioning. `validateCandidateEligibility` owns
 * everything that needs a database; this file owns the arithmetic.
 */

export const DEFAULT_SCORING_WEIGHTS: DispatchScoringWeights = {
  distance: 0.30,
  idleTime: 0.15,
  reliability: 0.20,
  rating: 0.05,
  declinePenalty: 0.12,
  timeoutPenalty: 0.10,
  vehicleSuitability: 0.05,
  pickupEta: 0.15,
};

/**
 * Weights from `DISPATCH_SCORING_WEIGHTS_JSON`, falling back to defaults.
 *
 * Non-finite overrides are dropped rather than accepted: a `NaN` weight would poison every
 * score into `NaN` and silently randomise dispatch order. Malformed JSON falls back whole.
 */
export function parseScoringWeights(raw: string | undefined): DispatchScoringWeights {
  if (!raw) return { ...DEFAULT_SCORING_WEIGHTS };
  try {
    const parsed = JSON.parse(raw) as Partial<DispatchScoringWeights>;
    const clean = Object.fromEntries(Object.entries(parsed).filter(([, v]) => Number.isFinite(v)));
    return { ...DEFAULT_SCORING_WEIGHTS, ...clean } as DispatchScoringWeights;
  } catch {
    return { ...DEFAULT_SCORING_WEIGHTS };
  }
}

/** Straight-line pickup ETA. Bicycles are slower than cars; motorbikes sit between. */
export function pickupEtaMin(distanceKm: number, vehicle: VehicleType): number {
  const speedKph = vehicle === VehicleType.BICYCLE ? 14 : vehicle === VehicleType.CAR ? 28 : 24;
  return Math.max(1, (distanceKm / speedKph) * 60);
}

export interface SuitabilityInput {
  vehicle: VehicleType;
  weightKg: number;
  isMarketLoad: boolean;
}

/**
 * How well the vehicle fits the load, from 0 (cannot carry it) to 1 (ideal).
 *
 * Zero is a hard rejection, not a low score — `validateCandidateEligibility` turns it into
 * `vehicle_unsuitable`. Market runs mean bulk, so bicycles are excluded outright and cars are
 * preferred.
 */
export function vehicleSuitability({ vehicle, weightKg, isMarketLoad }: SuitabilityInput): number {
  if (weightKg > 35 && vehicle !== VehicleType.CAR) return 0;
  if ((weightKg > 15 || isMarketLoad) && vehicle === VehicleType.BICYCLE) return 0;
  if (weightKg > 20 && vehicle === VehicleType.MOTORBIKE) return 0.4;
  if (isMarketLoad && vehicle === VehicleType.CAR) return 1;
  if (vehicle === VehicleType.BICYCLE) return 0.75;
  return 1;
}

/** True when the order is a market run, by vendor type or by service code. */
export function isMarketLoad(vendorType: VendorType | string | undefined, serviceCode: string | undefined): boolean {
  return vendorType === VendorType.MARKET || (serviceCode ?? '').toUpperCase() === 'MK';
}

export interface CandidateFacts {
  distanceKm: number;
  etaMin: number;
  vehicleSuitability: number;
}

export interface CandidateRiderStats {
  idleSince: Date | null;
  reliabilityScore: number | null;
  rating: number | null;
  offerCount: number;
  declineCount: number;
  timeoutCount: number;
  cancellationCount: number;
}

/**
 * Prior strength for the acceptance-rate estimate, in pseudo-offers.
 *
 * A rider who has declined their only two offers has a raw acceptance rate of 0%, which is a
 * statement about a sample of two, not about the rider. Blending toward the prior means the
 * estimate starts neutral and moves only as evidence accumulates — after ~30 real offers the
 * prior is worth a sixth of the estimate, and after 200 it is noise.
 */
export const ACCEPTANCE_PRIOR_OFFERS = 6;
export const ACCEPTANCE_PRIOR_RATE = 0.8;

/**
 * Probability this rider accepts an offer, smoothed toward a neutral prior.
 *
 * Replaces the raw decline and timeout counts. Those were absolute and clamped at 20, so they
 * measured *tenure* as much as behaviour: a rider with 500 deliveries and 20 declines scored
 * exactly as badly as one with 20 deliveries and 20 declines, and every long-serving rider
 * eventually pinned at the clamp, where the signal stops distinguishing anyone from anyone.
 *
 * A timeout counts against acceptance the same as a decline. From the order's point of view they
 * are the same event — the offer window burns and the customer waits — and treating silence as
 * neutral would reward it over an honest, immediate decline.
 */
export function acceptanceProbability(rider: Pick<CandidateRiderStats, 'offerCount' | 'declineCount' | 'timeoutCount'>): number {
  const offers = Math.max(0, finite(rider.offerCount));
  const refused = Math.max(0, finite(rider.declineCount)) + Math.max(0, finite(rider.timeoutCount));
  // Legacy rows have counters but no offer count. Taking refusals as the denominator's floor
  // keeps them from reading as a flawless 100% acceptance record.
  const denominator = Math.max(offers, refused);
  const accepted = Math.max(0, denominator - refused);

  return (
    (accepted + ACCEPTANCE_PRIOR_RATE * ACCEPTANCE_PRIOR_OFFERS) /
    (denominator + ACCEPTANCE_PRIOR_OFFERS)
  );
}

/**
 * Rank a candidate. **Lower is better** — this is a cost, not a rating.
 *
 * Distance and ETA push the cost up. Idle time, reliability above 1.0 and rating above 4.0 pull
 * it down, so a rider who has been waiting and performs well wins ties. Declines, timeouts and
 * cancellations push it up.
 *
 * Every unbounded input is clamped: idle time at 240 minutes, the reliability and rating bonuses
 * to ±1, and the cancellation counter at 20. Without those clamps a single rider with a long idle
 * streak or a large cancellation count would dominate the ordering regardless of distance.
 *
 * Refusals enter as a *rate*, not a count — see `acceptanceProbability`. The scale factor of 20
 * keeps the term's range identical to the clamped counters it replaced, so the existing weights
 * still mean what they meant.
 */
export function scoreCandidate(rider: CandidateRiderStats, facts: CandidateFacts, weights: DispatchScoringWeights, now: number = Date.now()): number {
  const idleMin = rider.idleSince ? Math.max(0, (now - rider.idleSince.getTime()) / 60_000) : 0;
  const reliabilityBonus = clamp((rider.reliabilityScore ?? 1) - 1, -1, 1);
  const ratingBonus = clamp((rider.rating ?? 4) - 4, -1, 1);

  return (
    facts.distanceKm * weights.distance +
    facts.etaMin * weights.pickupEta -
    Math.min(idleMin, 240) * 0.01 * weights.idleTime -
    reliabilityBonus * weights.reliability -
    ratingBonus * weights.rating +
    // One term for both, scaled by the two penalties that used to be applied separately. A
    // certain accepter pays nothing; a certain refuser pays the full weight.
    (1 - acceptanceProbability(rider)) * (weights.declinePenalty + weights.timeoutPenalty) * 20 +
    Math.min(rider.cancellationCount, 20) * 0.08 -
    facts.vehicleSuitability * weights.vehicleSuitability
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function finite(v: number | null | undefined): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}
