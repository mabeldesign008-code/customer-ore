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
export declare function codTierFor(completedDeliveries: number, cfg: CodTierConfig): RiderCodTier;
export declare function codLimitPesewas(tier: RiderCodTier, cfg: CodTierConfig): number;
/** Next higher tier if the delivery count now qualifies (else null). */
export declare function nextCodTier(current: RiderCodTier, completedDeliveries: number, cfg: CodTierConfig): RiderCodTier | null;
export interface CodLimitDecision {
    shouldBlock: boolean;
    shouldUnblock: boolean;
    triggerAtPesewas: number;
    unblockBelowPesewas: number;
}
/** Doc §5: remit at 90% of tier limit; resume below 70% (hysteresis prevents flapping). */
export declare function codLimitDecision(opts: {
    outstandingPesewas: number;
    tierLimitPesewas: number;
    triggerPct: number;
    unblockPct: number;
    currentlyBlocked: boolean;
}): CodLimitDecision;
export interface EscalationThresholds {
    warningH: number;
    suspendH: number;
    investigateH: number;
    terminateH: number;
}
/** Doc §5 ladder: 24h warning → 48h COD suspension → 72h investigation → >72h termination. */
export declare function codEscalationStep(ageHours: number, t: EscalationThresholds): RiderCodStatus;
/** Withdrawable per doc §5: cleared − COD cash owed − locked, never negative. */
export declare function withdrawablePesewas(cleared: number, cashOwed: number, locked: number): number;
export type WithdrawalPlan = {
    ok: true;
    feePesewas: number;
    withdrawnTodayPesewas: number;
    withdrawalsTodayCount: number;
    withdrawalDay: string;
} | {
    ok: false;
    reason: 'below_min' | 'exceeds_cap' | 'insufficient';
};
/** Doc §5 withdrawal rules: min GHS 50, daily cap GHS 2,000, 1 free payout/day then GHS 2. */
export declare function withdrawalPlan(opts: {
    amountPesewas: number;
    clearedPesewas: number;
    cashOwedPesewas: number;
    lockedPesewas: number;
    today: string;
    withdrawalDay: string | null;
    withdrawnTodayPesewas: number;
    withdrawalsTodayCount: number;
    freePerDay: number;
    feePesewas: number;
    minPesewas: number;
    dailyCapPesewas: number;
}): WithdrawalPlan;
//# sourceMappingURL=wallet-policy.d.ts.map