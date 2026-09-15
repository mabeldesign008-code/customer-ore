"use strict";
/** Fee policy — single source of truth for money math (ore doc §2.4, §4). Overridable via env.
 *  Two SEPARATE formulas (doc: customer fee and rider payout are independent decisions):
 *    Customer Delivery Fee = Base + Distance×PerKm + CategoryLoad + Priority/Surge
 *    Rider Fulfilment Fee = (RiderBase + PickupKm×PickupPerKm + DeliveryKm×DeliveryPerKm + LoadAllowance)×ServiceLevel + incentives/exceptions
 *  Vendor commission is per-category (food 18%, grocery 12%, market 10%,
 *  pharmacy 10%, shop 12%, laundry 12%). Parcel/errand are not vendor stores. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sumPesewas = exports.pctOf = void 0;
exports.feePolicyFromEnv = feePolicyFromEnv;
exports.customerDeliveryFee = customerDeliveryFee;
exports.riderPayout = riderPayout;
exports.commissionPct = commissionPct;
exports.serviceCodeFor = serviceCodeFor;
const money_1 = require("./money");
Object.defineProperty(exports, "pctOf", { enumerable: true, get: function () { return money_1.pctOf; } });
Object.defineProperty(exports, "sumPesewas", { enumerable: true, get: function () { return money_1.sumPesewas; } });
const enums_1 = require("./enums");
const DEFAULT_CATEGORY_ADJ = {
    [enums_1.VendorType.FOOD]: 0,
    [enums_1.VendorType.GROCERY]: 0,
    [enums_1.VendorType.MARKET]: 0,
    [enums_1.VendorType.PHARMACY]: 0,
    [enums_1.VendorType.SHOP]: 0,
    [enums_1.VendorType.LAUNDRY]: 0,
    [enums_1.VendorType.PARCEL]: 0,
    [enums_1.VendorType.ERRAND]: 0,
};
const DEFAULT_LOAD_ALLOWANCE = {
    ...DEFAULT_CATEGORY_ADJ,
    [enums_1.VendorType.MARKET]: (0, money_1.ghsToPesewas)(2),
    [enums_1.VendorType.LAUNDRY]: (0, money_1.ghsToPesewas)(2),
    [enums_1.VendorType.PARCEL]: (0, money_1.ghsToPesewas)(1),
};
const DEFAULT_PAYOUT_MULTIPLIER_BY_SERVICE_LEVEL = {
    STANDARD: 1,
    SCHEDULED: 1,
    PRIORITY: 1.15,
};
const DEFAULT_CANCELLATION_TREATMENT = {
    BEFORE_VENDOR_ACCEPT_CUSTOMER_FEE_PCT: 0,
    AFTER_VENDOR_ACCEPT_CUSTOMER_FEE_PCT: 25,
    AFTER_PICKUP_CUSTOMER_FEE_PCT: 100,
    VENDOR_FAULT_CUSTOMER_FEE_PCT: 0,
    VENDOR_FAULT_VENDOR_COMMISSION_PCT: 0,
    RIDER_FAULT_RIDER_PAYOUT_PCT: 0,
};
function feePolicyFromEnv(env) {
    return {
        version: num(env.FEE_POLICY_VERSION, 1),
        serviceFeePct: num(env.SERVICE_FEE_PCT, 2),
        serviceFeeWaiveAbovePesewas: num(env.SERVICE_FEE_WAIVE_ABOVE_PESEWAS, (0, money_1.ghsToPesewas)(499)),
        deliveryBasePesewas: num(env.DELIVERY_BASE_PESEWAS, (0, money_1.ghsToPesewas)(4)),
        deliveryPerKmPesewas: num(env.DELIVERY_PER_KM_PESEWAS, (0, money_1.ghsToPesewas)(2)),
        deliverySurgePct: num(env.DELIVERY_SURGE_PCT, 0),
        deliverySurgeMultiplier: clampSurgeMultiplier(num(env.DELIVERY_SURGE_MULTIPLIER, 1)),
        priorityFeePerKmPesewas: num(env.PRIORITY_FEE_PER_KM_PESEWAS, (0, money_1.ghsToPesewas)(1)),
        categoryAdjustmentPesewas: parseMap(env.CATEGORY_ADJUSTMENT_PESEWAS, DEFAULT_CATEGORY_ADJ),
        riderBasePesewas: num(env.RIDER_BASE_PESEWAS, (0, money_1.ghsToPesewas)(4)),
        riderPickupPerKmPesewas: num(env.RIDER_PICKUP_PER_KM_PESEWAS, (0, money_1.ghsToPesewas)(1)),
        riderDeliveryPerKmPesewas: num(env.RIDER_DELIVERY_PER_KM_PESEWAS, (0, money_1.ghsToPesewas)(2.5)),
        loadAllowancePesewas: parseMap(env.LOAD_ALLOWANCE_PESEWAS, DEFAULT_LOAD_ALLOWANCE),
        payoutMultiplierByServiceLevel: normalizeServiceLevelMultipliers(parseMap(env.PAYOUT_MULTIPLIER_BY_SERVICE_LEVEL, DEFAULT_PAYOUT_MULTIPLIER_BY_SERVICE_LEVEL)),
        cancellationTreatment: parseMap(env.CANCELLATION_TREATMENT_JSON, DEFAULT_CANCELLATION_TREATMENT),
        commissionByType: parseMap(env.COMMISSION_BY_TYPE_JSON, { ...enums_1.CategoryCommission }),
    };
}
/** Customer delivery fee — extract: base + distance×rate + category load + priority/surge. */
function customerDeliveryFee(policy, distanceKm, vendorType, opts = 0) {
    const surgePct = typeof opts === 'number' ? opts : opts.surgePct ?? 0;
    const serviceLevel = typeof opts === 'number' ? 'STANDARD' : opts.serviceLevel ?? 'STANDARD';
    const surgeMultiplier = typeof opts === 'number' ? policy.deliverySurgeMultiplier : clampSurgeMultiplier(opts.surgeMultiplier ?? policy.deliverySurgeMultiplier);
    const base = policy.deliveryBasePesewas;
    const dist = Math.round(distanceKm * policy.deliveryPerKmPesewas);
    const catAdj = policy.categoryAdjustmentPesewas[vendorType] ?? 0;
    const priority = serviceLevel === 'PRIORITY' ? Math.round(distanceKm * policy.priorityFeePerKmPesewas) : 0;
    const preSurge = (0, money_1.sumPesewas)([base, dist, catAdj, priority]);
    const multiplierSurge = Math.max(0, Math.round(preSurge * (surgeMultiplier - 1)));
    const pctSurge = (0, money_1.pctOf)(preSurge, policy.deliverySurgePct + surgePct);
    return (0, money_1.sumPesewas)([preSurge, multiplierSurge, pctSurge]);
}
/** Rider fulfilment fee — doc §2.4.2. Computed at dispatch from real distances, service level and approved incentives/exceptions. */
function riderPayout(policy, pickupKm, deliveryKm, vendorType, opts = {}) {
    const base = policy.riderBasePesewas;
    const pickup = Math.round(pickupKm * policy.riderPickupPerKmPesewas);
    const delivery = Math.round(deliveryKm * policy.riderDeliveryPerKmPesewas);
    const load = policy.loadAllowancePesewas[vendorType] ?? 0;
    const beforeLevel = (0, money_1.sumPesewas)([base, pickup, delivery, load]);
    const multiplier = Math.max(0, policy.payoutMultiplierByServiceLevel[opts.serviceLevel ?? 'STANDARD'] ?? 1);
    const levelAdjusted = Math.round(beforeLevel * multiplier);
    return (0, money_1.sumPesewas)([levelAdjusted, Math.max(0, opts.approvedIncentivePesewas ?? 0), Math.max(0, opts.exceptionPesewas ?? 0)]);
}
/** Vendor commission pct for a category. */
function commissionPct(policy, vendorType) {
    return policy.commissionByType[vendorType] ?? 0;
}
function serviceCodeFor(vendorType) {
    return enums_1.SERVICE_CODE[vendorType] ?? 'OT';
}
function parseMap(raw, dflt) {
    if (!raw)
        return { ...dflt };
    try {
        const parsed = JSON.parse(raw);
        return { ...dflt, ...parsed };
    }
    catch {
        return { ...dflt };
    }
}
function num(v, dflt) {
    const n = Number(v);
    return Number.isFinite(n) && v !== undefined && v !== '' ? n : dflt;
}
function normalizeServiceLevelMultipliers(raw) {
    return {
        ...DEFAULT_PAYOUT_MULTIPLIER_BY_SERVICE_LEVEL,
        ...Object.fromEntries(Object.entries(raw).map(([key, value]) => [key.toUpperCase(), Number.isFinite(value) ? value : 1])),
    };
}
function clampSurgeMultiplier(value) {
    // Extract-approved levels are 1.0, 1.2, 1.3 and 1.5; env can pin one of them.
    const allowed = [1, 1.2, 1.3, 1.5];
    return allowed.reduce((closest, current) => Math.abs(current - value) < Math.abs(closest - value) ? current : closest, 1);
}
//# sourceMappingURL=fees.js.map