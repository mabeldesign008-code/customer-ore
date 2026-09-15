/**
 * Live prep-time estimation.
 *
 * The order's `prepTimeMin` is a static number: max item prep time plus a packing buffer, set by
 * the vendor when they created the menu. Dispatch times the whole handover off it — `scheduleT5`
 * sends a rider to arrive `prepTimeMin - dispatchLeadMin` after acceptance — so when the estimate
 * is wrong the cost lands on someone. Too low and the rider waits at the counter, unpaid, while
 * their next order goes to somebody else. Too high and the food sits under a heat lamp and the
 * customer's ETA slips for no reason.
 *
 * A kitchen's actual throughput is not a property of its menu. It is a property of how many
 * orders are on the pass right now and how that kitchen has been coping for the last hour. Both
 * signals already exist in this system; nothing was reading them.
 *
 * This is the cheap version of what Deliveroo's Frank and Glovo's eTP do — no model, no feature
 * store, just the two signals that carry most of the variance. It is deliberately a pure
 * function so the policy is testable and reviewable on its own.
 */

export interface PrepTimeSignals {
  /** Orders accepted but not yet ready at this vendor, right now. */
  queueDepth: number;
  /**
   * Fraction of recent orders that missed their promised ready time, in [0, 1].
   * Swiggy calls this the restaurant stress signal.
   */
  lateRate: number;
  /** How many orders `lateRate` was computed from. Small samples must not swing the estimate. */
  sampleSize: number;
  /**
   * Typical concurrent orders this kitchen handles without slowing down. Below this, queue depth
   * says nothing — a kitchen with four hobs is not slower because two of them are lit.
   */
  parallelCapacity?: number;
}

export interface PrepTimeAdjustment {
  /** What dispatch should actually plan against. */
  estimatedPrepTimeMin: number;
  /** The vendor's static estimate, unchanged. */
  basePrepTimeMin: number;
  /** Minutes added by queue depth. */
  queueMinutes: number;
  /** Minutes added by recent lateness. */
  stressMinutes: number;
  /** Whether the signals were trusted at all, and if not, why. */
  reason: 'adjusted' | 'insufficient_sample' | 'no_signal';
}

export interface PrepTimeConfig {
  /** Extra minutes per backlogged order beyond capacity. */
  minutesPerQueuedOrder: number;
  /** Extra minutes at a 100% late rate. */
  maxStressMinutes: number;
  /** Below this many recent orders, the late rate is noise. */
  minSampleSize: number;
  /** Ceiling on total adjustment, as a multiple of the base estimate. */
  maxMultiplier: number;
  /** Absolute ceiling, so a runaway signal cannot park a rider for an hour. */
  maxPrepTimeMin: number;
  defaultParallelCapacity: number;
}

export const DEFAULT_PREP_TIME_CONFIG: PrepTimeConfig = {
  minutesPerQueuedOrder: 1.5,
  maxStressMinutes: 10,
  minSampleSize: 5,
  // A kitchen that is genuinely struggling can take twice as long; beyond that the estimate is
  // no longer an estimate and the order needs a human, not a bigger number.
  maxMultiplier: 2,
  maxPrepTimeMin: 90,
  defaultParallelCapacity: 3,
};

/**
 * Adjust a static prep-time estimate using live kitchen signals.
 *
 * Only ever increases the estimate. Predicting a kitchen will be *faster* than it said requires
 * far more confidence than two coarse signals provide, and being early is the expensive
 * direction: the rider waits, and waiting riders are the thing that makes a courier network
 * unprofitable.
 */
export function estimatePrepTime(
  basePrepTimeMin: number,
  signals: Partial<PrepTimeSignals> | null | undefined,
  config: Partial<PrepTimeConfig> = {},
): PrepTimeAdjustment {
  const cfg = { ...DEFAULT_PREP_TIME_CONFIG, ...config };
  const base = Number.isFinite(basePrepTimeMin) && basePrepTimeMin > 0 ? basePrepTimeMin : 0;
  const nothing = (reason: PrepTimeAdjustment['reason']): PrepTimeAdjustment => ({
    estimatedPrepTimeMin: Math.round(base),
    basePrepTimeMin: Math.round(base),
    queueMinutes: 0,
    stressMinutes: 0,
    reason,
  });

  if (!signals) return nothing('no_signal');

  const queueDepth = finite(signals.queueDepth, 0);
  const lateRate = clamp(finite(signals.lateRate, 0), 0, 1);
  const sampleSize = Math.max(0, finite(signals.sampleSize, 0));
  const capacity = Math.max(1, finite(signals.parallelCapacity, cfg.defaultParallelCapacity));

  // Only the backlog *beyond* what the kitchen runs in parallel costs time.
  const backlog = Math.max(0, queueDepth - capacity);
  const queueMinutes = backlog * cfg.minutesPerQueuedOrder;

  // A late rate from three orders is a coincidence. Ignoring the sample size here is how a
  // vendor gets permanently penalised for one bad lunch service.
  const haveSample = sampleSize >= cfg.minSampleSize;
  const stressMinutes = haveSample ? lateRate * cfg.maxStressMinutes : 0;

  if (queueMinutes === 0 && stressMinutes === 0) {
    return nothing(haveSample || queueDepth > 0 ? 'adjusted' : 'insufficient_sample');
  }

  const ceiling = Math.min(base * cfg.maxMultiplier, cfg.maxPrepTimeMin);
  const raw = base + queueMinutes + stressMinutes;
  const estimated = Math.round(Math.min(raw, Math.max(base, ceiling)));

  return {
    estimatedPrepTimeMin: estimated,
    basePrepTimeMin: Math.round(base),
    queueMinutes: round1(queueMinutes),
    stressMinutes: round1(stressMinutes),
    reason: 'adjusted',
  };
}

function finite(v: number | undefined, dflt: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : dflt;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
