"use strict";
/** Pure doc §4 vendor-settlement rules — no DB access, unit-testable.
 *  Weekly cycle (Mon cutoff), min GHS 100, rolling reserve, negative-balance offset,
 *  daily payout cap GHS 10,000. Kept in @ore/contracts (shared, single source of truth). */
Object.defineProperty(exports, "__esModule", { value: true });
exports.vendorSettlementPlan = vendorSettlementPlan;
exports.payoutChunks = payoutChunks;
exports.mondayBoundary = mondayBoundary;
/** Doc §4: pay debt first, hold rolling reserve, settle the rest; below min → roll over. */
function vendorSettlementPlan(input) {
    const debtAppliedPesewas = Math.min(input.owedPesewas, input.grossPesewas);
    const netPesewas = input.grossPesewas - debtAppliedPesewas;
    if (netPesewas < input.minPesewas) {
        return { eligible: false, netPesewas, debtAppliedPesewas, reservePesewas: 0, payoutPesewas: 0 };
    }
    const reservePesewas = Math.round((netPesewas * input.reservePct) / 100);
    return { eligible: true, netPesewas, debtAppliedPesewas, reservePesewas, payoutPesewas: netPesewas - reservePesewas };
}
/** Doc §4 daily cap (GHS 10,000) — a payout larger than the cap splits into per-day chunks. */
function payoutChunks(payoutPesewas, dailyCapPesewas) {
    if (payoutPesewas <= 0 || dailyCapPesewas <= 0)
        return [];
    const chunks = [];
    let remaining = payoutPesewas;
    while (remaining > 0) {
        const take = Math.min(remaining, dailyCapPesewas);
        chunks.push(take);
        remaining -= take;
    }
    return chunks;
}
/** Monday 00:00 UTC boundary — settlement cycle end (doc §4: Monday cutoff, Sunday close). */
function mondayBoundary(at) {
    const d = new Date(at);
    d.setUTCHours(0, 0, 0, 0);
    const daysSinceMonday = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
    d.setUTCDate(d.getUTCDate() - daysSinceMonday);
    return d;
}
//# sourceMappingURL=settlement-policy.js.map