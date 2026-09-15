"use strict";
/** Money = integer pesewas (GHS 1 = 100 pesewas). NEVER use floats for money. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.pesewasToGhs = pesewasToGhs;
exports.ghsToPesewas = ghsToPesewas;
exports.formatGhs = formatGhs;
exports.pctOf = pctOf;
exports.bpsOf = bpsOf;
exports.pctToBps = pctToBps;
exports.bpsToPct = bpsToPct;
exports.sumPesewas = sumPesewas;
exports.emptyBreakdown = emptyBreakdown;
exports.computeBreakdown = computeBreakdown;
function pesewasToGhs(pesewas) {
    return Math.round(pesewas) / 100;
}
function ghsToPesewas(ghs) {
    return Math.round(ghs * 100);
}
function formatGhs(pesewas) {
    return `GHS ${pesewasToGhs(pesewas).toFixed(2)}`;
}
/** Round percentage of an amount in pesewas (always rounds to whole pesewa). */
function pctOf(pesewas, percent) {
    return Math.round((pesewas * percent) / 100);
}
/**
 * Commission rates are carried in basis points: 1 bp = 0.01%, so 18% is 1800.
 *
 * A rate is not money, but it decides money, and storing it as a float meant a rate could not
 * always be written and read back as the same number — 17.7 is not representable in binary
 * floating point. Recomputing a vendor's share from the stored rate could then disagree with the
 * figure the customer was charged, by a pesewa, on some orders and not others. Reconciling that
 * after the fact is far more expensive than the integer column that prevents it.
 *
 * Basis points also give the arithmetic somewhere to go. A 25% premium discount on 18% is 13.5%,
 * which whole percentages cannot express: the old code rounded it to 14% and quietly took an
 * extra 0.5pp off the vendor on every premium order.
 */
function bpsOf(pesewas, bps) {
    return Math.round((pesewas * bps) / 10_000);
}
/** 18 → 1800. Rounds, because a configured percentage may carry decimals. */
function pctToBps(percent) {
    return Math.round(percent * 100);
}
/** 1800 → 18. For display and for the API, which still speaks percentages. */
function bpsToPct(bps) {
    return bps / 100;
}
/** Sum of pesewa amounts. */
function sumPesewas(amounts) {
    return amounts.reduce((acc, a) => acc + Math.round(a), 0);
}
function emptyBreakdown() {
    return {
        subtotalPesewas: 0,
        deliveryFeePesewas: 0,
        serviceFeePesewas: 0,
        commissionBps: 0,
        vendorSharePesewas: 0,
        riderFeePesewas: 0,
        pspFeePesewas: 0,
        totalPesewas: 0,
        feePolicyVersion: 1,
    };
}
/**
 * Per-ORDER money breakdown at checkout (vendor side).
 * Rider payout is intentionally NOT set here — it's computed at dispatch from real
 * pickup + delivery distances (doc §2.4: customer fee and rider payout are separate).
 */
function computeBreakdown(params) {
    const { subtotalPesewas, distanceKm, feePolicy, vendorType } = params;
    const serviceFeePesewas = feePolicy.serviceFeeWaiveAbovePesewas !== undefined && subtotalPesewas > feePolicy.serviceFeeWaiveAbovePesewas
        ? 0
        : pctOf(subtotalPesewas, feePolicy.serviceFeePct);
    const base = feePolicy.deliveryBasePesewas;
    const dist = Math.round(distanceKm * feePolicy.deliveryPerKmPesewas);
    const catAdj = feePolicy.categoryAdjustmentPesewas[vendorType] ?? 0;
    const priority = params.serviceLevel === 'PRIORITY' ? Math.round(distanceKm * (feePolicy.priorityFeePerKmPesewas ?? 0)) : 0;
    const preSurge = sumPesewas([base, dist, catAdj, priority]);
    const multiplier = clampSurgeMultiplier(params.surgeMultiplier ?? feePolicy.deliverySurgeMultiplier ?? 1);
    const surge = Math.max(0, Math.round(preSurge * (multiplier - 1))) + pctOf(preSurge, feePolicy.deliverySurgePct);
    const deliveryFeePesewas = sumPesewas([preSurge, surge]);
    const commissionBps = pctToBps(feePolicy.commissionByType[vendorType] ?? 0);
    const vendorSharePesewas = subtotalPesewas - bpsOf(subtotalPesewas, commissionBps);
    const totalPesewas = sumPesewas([subtotalPesewas, deliveryFeePesewas, serviceFeePesewas]);
    return {
        subtotalPesewas,
        deliveryFeePesewas,
        serviceFeePesewas,
        commissionBps,
        vendorSharePesewas,
        riderFeePesewas: 0,
        pspFeePesewas: 0,
        totalPesewas,
        feePolicyVersion: feePolicy.version,
    };
}
function clampSurgeMultiplier(value) {
    const allowed = [1, 1.2, 1.3, 1.5];
    return allowed.reduce((closest, current) => Math.abs(current - value) < Math.abs(closest - value) ? current : closest, 1);
}
//# sourceMappingURL=money.js.map