/**
 * Decomposing delivery time into legs.
 *
 * The system records when an order was placed and when it was delivered, and nothing in between.
 * A single "45 minutes" cannot say whether the kitchen was slow, the rider was far away, or the
 * rider stood at the counter waiting — and those three have completely different fixes. Swiggy's
 * ETA work splits the journey into four legs and models each separately, and the reason is
 * exactly this: an aggregate hides which part is broken.
 *
 * This is the measurement layer, not a model. Nothing here predicts anything; it turns the
 * timestamps the system now records into the per-leg history a model would eventually need, and
 * makes the current blind spot explicit rather than silent.
 */

export interface AssignmentTimestamps {
  /** When the customer placed the order. */
  orderPlacedAt: Date | string | null;
  /** When a rider accepted this leg. */
  assignedAt: Date | string | null;
  /** When the rider confirmed pickup inside the vendor's geofence. */
  pickedUpAt: Date | string | null;
  /** When the leg completed. */
  completedAt: Date | string | null;
}

export interface DeliveryLegs {
  /** Order placed → rider assigned. Swiggy calls this O2A. Measures dispatch, not the road. */
  orderToAssignMin: number | null;
  /**
   * Rider assigned → pickup confirmed.
   *
   * This is first mile **and** wait-at-vendor combined, because the system has no arrival
   * signal: the rider app reports pickup, which is already inside the geofence, so there is no
   * moment recorded between "set off" and "collected the food". Separating them needs a geofence
   * entry ping. Until then this number cannot distinguish a rider who drove 20 minutes from one
   * who drove 5 and waited 15 — and only the second is a prep-time problem.
   */
  toPickupMin: number | null;
  /** Pickup → delivered. The last mile. */
  lastMileMin: number | null;
  /** Order placed → delivered. What the customer experienced. */
  totalMin: number | null;
}

/**
 * Turn one assignment's timestamps into leg durations, in minutes.
 *
 * Returns `null` for any leg whose endpoints are missing or nonsensical rather than a zero or a
 * negative. A zero would be indistinguishable from a genuinely instant leg and would drag every
 * average it entered toward optimism — which, for an ETA, is the direction that costs trust.
 */
export function deliveryLegs(ts: AssignmentTimestamps): DeliveryLegs {
  const placed = toDate(ts.orderPlacedAt);
  const assigned = toDate(ts.assignedAt);
  const pickedUp = toDate(ts.pickedUpAt);
  const completed = toDate(ts.completedAt);

  return {
    orderToAssignMin: minutesBetween(placed, assigned),
    toPickupMin: minutesBetween(assigned, pickedUp),
    lastMileMin: minutesBetween(pickedUp, completed),
    totalMin: minutesBetween(placed, completed),
  };
}

/**
 * Aggregate legs across many assignments.
 *
 * Each leg is averaged over the assignments where that leg is actually known, not over all of
 * them. Treating a missing leg as zero would silently understate it in proportion to how often
 * it goes unrecorded — worst exactly where the data is thinnest.
 */
export function averageLegs(all: DeliveryLegs[]): { [K in keyof DeliveryLegs]: number | null } & { sampleSize: number } {
  const keys: (keyof DeliveryLegs)[] = ['orderToAssignMin', 'toPickupMin', 'lastMileMin', 'totalMin'];
  const out = { sampleSize: all.length } as { [K in keyof DeliveryLegs]: number | null } & { sampleSize: number };

  for (const key of keys) {
    const values = all.map((l) => l[key]).filter((v): v is number => v !== null);
    out[key] = values.length ? round1(values.reduce((a, b) => a + b, 0) / values.length) : null;
  }
  return out;
}

function toDate(v: Date | string | null | undefined): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function minutesBetween(from: Date | null, to: Date | null): number | null {
  if (!from || !to) return null;
  const min = (to.getTime() - from.getTime()) / 60_000;
  // Clocks skew between services and a rider's handset can be wrong. A negative duration is a
  // data problem, not a fast delivery, and averaging it in would quietly bias every leg it
  // touches.
  return min < 0 ? null : round1(min);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
