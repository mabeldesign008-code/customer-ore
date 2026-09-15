"use strict";
/** Pure doc §5 wallet + COD-control rules — no DB access, unit-testable.
 *  Kept separate from the service so the money rules are the single source of truth. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.codTierFor = codTierFor;
exports.codLimitPesewas = codLimitPesewas;
exports.nextCodTier = nextCodTier;
exports.codLimitDecision = codLimitDecision;
exports.codEscalationStep = codEscalationStep;
exports.withdrawablePesewas = withdrawablePesewas;
exports.withdrawalPlan = withdrawalPlan;
const enums_1 = require("./enums");
/** Tier by completed deliveries (promotion only — demotion is admin-only). */
function codTierFor(completedDeliveries, cfg) {
    if (completedDeliveries >= cfg.seniorDeliveries)
        return enums_1.RiderCodTier.SENIOR;
    if (completedDeliveries >= cfg.experiencedDeliveries)
        return enums_1.RiderCodTier.EXPERIENCED;
    return enums_1.RiderCodTier.NEW;
}
function codLimitPesewas(tier, cfg) {
    switch (tier) {
        case enums_1.RiderCodTier.SENIOR:
            return cfg.seniorLimitPesewas;
        case enums_1.RiderCodTier.EXPERIENCED:
            return cfg.experiencedLimitPesewas;
        default:
            return cfg.newLimitPesewas;
    }
}
/** Next higher tier if the delivery count now qualifies (else null). */
function nextCodTier(current, completedDeliveries, cfg) {
    const should = codTierFor(completedDeliveries, cfg);
    const rank = { NEW: 0, EXPERIENCED: 1, SENIOR: 2 };
    return rank[should] > rank[current] ? should : null;
}
/** Doc §5: remit at 90% of tier limit; resume below 70% (hysteresis prevents flapping). */
function codLimitDecision(opts) {
    const triggerAtPesewas = Math.round((opts.tierLimitPesewas * opts.triggerPct) / 100);
    const unblockBelowPesewas = Math.round((opts.tierLimitPesewas * opts.unblockPct) / 100);
    return {
        shouldBlock: opts.outstandingPesewas >= triggerAtPesewas,
        shouldUnblock: opts.currentlyBlocked && opts.outstandingPesewas < unblockBelowPesewas,
        triggerAtPesewas,
        unblockBelowPesewas,
    };
}
/** Doc §5 ladder: 24h warning → 48h COD suspension → 72h investigation → >72h termination. */
function codEscalationStep(ageHours, t) {
    if (ageHours > t.terminateH)
        return enums_1.RiderCodStatus.TERMINATED;
    if (ageHours >= t.investigateH)
        return enums_1.RiderCodStatus.INVESTIGATION;
    if (ageHours >= t.suspendH)
        return enums_1.RiderCodStatus.SUSPENDED;
    if (ageHours >= t.warningH)
        return enums_1.RiderCodStatus.WARNING;
    return enums_1.RiderCodStatus.CLEAR;
}
/** Withdrawable per doc §5: cleared − COD cash owed − locked, never negative. */
function withdrawablePesewas(cleared, cashOwed, locked) {
    return Math.max(0, cleared - cashOwed - locked);
}
/** Doc §5 withdrawal rules: min GHS 50, daily cap GHS 2,000, 1 free payout/day then GHS 2. */
function withdrawalPlan(opts) {
    if (opts.amountPesewas < opts.minPesewas)
        return { ok: false, reason: 'below_min' };
    // new day resets the daily window
    const freshDay = opts.withdrawalDay !== opts.today;
    const withdrawnToday = freshDay ? 0 : opts.withdrawnTodayPesewas;
    const countToday = freshDay ? 0 : opts.withdrawalsTodayCount;
    if (withdrawnToday + opts.amountPesewas > opts.dailyCapPesewas)
        return { ok: false, reason: 'exceeds_cap' };
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
//# sourceMappingURL=wallet-policy.js.map