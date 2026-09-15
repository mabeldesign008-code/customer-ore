/** Pure doc §5 wallet + COD-control rules — no DB access, unit-testable.
 *  Kept separate from the service so the money rules are the single source of truth. */

import { RiderCodStatus, RiderCodTier } from './enums';

export interface CodTierConfig {
  newLimitPesewas: number;
  experiencedLimitPesewas: number;
  seniorLimitPesewas: number;
  experiencedDeliveries: number;
  seniorDeliveries: number;
}

/** Tier by completed deliveries (promotion only — demotion is admin-only). */
export function codTierFor(completedDeliveries: number, cfg: CodTierConfig): RiderCodTier {
  if (completedDeliveries >= cfg.seniorDeliveries) return RiderCodTier.SENIOR;
  if (completedDeliveries >= cfg.experiencedDeliveries) return RiderCodTier.EXPERIENCED;
  return RiderCodTier.NEW;
}

export function codLimitPesewas(tier: RiderCodTier, cfg: CodTierConfig): number {
  switch (tier) {
    case RiderCodTier.SENIOR:
      return cfg.seniorLimitPesewas;
    case RiderCodTier.EXPERIENCED:
      return cfg.experiencedLimitPesewas;
    default:
      return cfg.newLimitPesewas;
  }
}

/** Next higher tier if the delivery count now qualifies (else null). */
export function nextCodTier(current: RiderCodTier, completedDeliveries: number, cfg: CodTierConfig): RiderCodTier | null {
  const should = codTierFor(completedDeliveries, cfg);
  const rank: Record<RiderCodTier, number> = { NEW: 0, EXPERIENCED: 1, SENIOR: 2 };
  return rank[should] > rank[current] ? should : null;
}

export interface CodLimitDecision {
  shouldBlock: boolean; // outstanding reached the remit trigger (90% of tier limit)
  shouldUnblock: boolean; // outstanding dropped below the unblock floor (70%) after an auto-block
  triggerAtPesewas: number;
  unblockBelowPesewas: number;
}

/** Doc §5: remit at 90% of tier limit; resume below 70% (hysteresis prevents flapping). */
export function codLimitDecision(opts: {
  outstandingPesewas: number;
  tierLimitPesewas: number;
  triggerPct: number;
  unblockPct: number;
  currentlyBlocked: boolean;
}): CodLimitDecision {
  const triggerAtPesewas = Math.round((opts.tierLimitPesewas * opts.triggerPct) / 100);
  const unblockBelowPesewas = Math.round((opts.tierLimitPesewas * opts.unblockPct) / 100);
  return {
    shouldBlock: opts.outstandingPesewas >= triggerAtPesewas,
    shouldUnblock: opts.currentlyBlocked && opts.outstandingPesewas < unblockBelowPesewas,
    triggerAtPesewas,
    unblockBelowPesewas,
  };
}

export interface EscalationThresholds {
  warningH: number;
  suspendH: number;
  investigateH: number;
  terminateH: number;
}

/** Doc §5 ladder: 24h warning → 48h COD suspension → 72h investigation → >72h termination. */
export function codEscalationStep(ageHours: number, t: EscalationThresholds): RiderCodStatus {
  if (ageHours > t.terminateH) return RiderCodStatus.TERMINATED;
  if (ageHours >= t.investigateH) return RiderCodStatus.INVESTIGATION;
  if (ageHours >= t.suspendH) return RiderCodStatus.SUSPENDED;
  if (ageHours >= t.warningH) return RiderCodStatus.WARNING;
  return RiderCodStatus.CLEAR;
}

/** Withdrawable per doc §5: cleared − COD cash owed − locked, never negative. */
export function withdrawablePesewas(cleared: number, cashOwed: number, locked: number): number {
  return Math.max(0, cleared - cashOwed - locked);
}

export type WithdrawalPlan =
  | { ok: true; feePesewas: number; withdrawnTodayPesewas: number; withdrawalsTodayCount: number; withdrawalDay: string }
  | { ok: false; reason: 'below_min' | 'exceeds_cap' | 'insufficient' };

/** Doc §5 withdrawal rules: min GHS 50, daily cap GHS 2,000, 1 free payout/day then GHS 2. */
export function withdrawalPlan(opts: {
  amountPesewas: number;
  clearedPesewas: number;
  cashOwedPesewas: number;
  lockedPesewas: number;
  today: string; // yyyy-mm-dd
  withdrawalDay: string | null;
  withdrawnTodayPesewas: number;
  withdrawalsTodayCount: number;
  freePerDay: number;
  feePesewas: number;
  minPesewas: number;
  dailyCapPesewas: number;
}): WithdrawalPlan {
  if (opts.amountPesewas < opts.minPesewas) return { ok: false, reason: 'below_min' };

  // new day resets the daily window
  const freshDay = opts.withdrawalDay !== opts.today;
  const withdrawnToday = freshDay ? 0 : opts.withdrawnTodayPesewas;
  const countToday = freshDay ? 0 : opts.withdrawalsTodayCount;

  if (withdrawnToday + opts.amountPesewas > opts.dailyCapPesewas) return { ok: false, reason: 'exceeds_cap' };

  const feePesewas = countToday >= opts.freePerDay ? opts.feePesewas : 0;
  const need = opts.amountPesewas + feePesewas;
  if (withdrawablePesewas(opts.clearedPesewas, opts.cashOwedPesewas, opts.lockedPesewas) < need) {
    return { ok: false, reason: 'insufficient' };
  }

  return {
    ok: true,
    feePesewas,
    withdrawnTodayPesewas: withdrawnToday + opts.amountPesewas,
    withdrawalsTodayCount: countToday + 1,
    withdrawalDay: opts.today,
  };
}
