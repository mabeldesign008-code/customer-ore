/** Fee policy — single source of truth for money math (ore doc §2.4, §4). Overridable via env.
 *  Two SEPARATE formulas (doc: customer fee and rider payout are independent decisions):
 *    Customer Delivery Fee = Base + Distance×PerKm + CategoryLoad + Priority/Surge
 *    Rider Fulfilment Fee = (RiderBase + PickupKm×PickupPerKm + DeliveryKm×DeliveryPerKm + LoadAllowance)×ServiceLevel + incentives/exceptions
 *  Vendor commission is per-category (food 18%, grocery 12%, market 10%,
 *  pharmacy 10%, shop 12%, laundry 12%). Parcel/errand are not vendor stores. */

import { ghsToPesewas, pctOf, sumPesewas, MoneyBreakdown } from './money';
import { VendorType, SERVICE_CODE, CategoryCommission } from './enums';

export type ServiceLevel = 'STANDARD' | 'SCHEDULED' | 'PRIORITY';

export interface FeePolicy {
  version: number; // version id stored on orders for audit (doc: version-control pricing rules)
  serviceFeePct: number; // platform service charge to customer
  serviceFeeWaiveAbovePesewas: number; // waived when subtotal exceeds this threshold
  // customer delivery fee formula
  deliveryBasePesewas: number;
  deliveryPerKmPesewas: number;
  deliverySurgePct: number; // legacy percentage surge adjustment, default 0
  deliverySurgeMultiplier: number; // configured surge levels, e.g. 1.0/1.2/1.3/1.5
  priorityFeePerKmPesewas: number; // priority load charged per delivery km
  categoryAdjustmentPesewas: Record<string, number>; // extra charge by category/service
  // rider fulfilment fee formula (kept independent of customer delivery fee)
  riderBasePesewas: number;
  riderPickupPerKmPesewas: number;
  riderDeliveryPerKmPesewas: number;
  loadAllowancePesewas: Record<string, number>; // heavy/fragile/multi-bag allowance
  payoutMultiplierByServiceLevel: Record<ServiceLevel | string, number>; // standard/scheduled/priority approved share logic
  cancellationTreatment: Record<string, number>; // policy percentages/charges by cancellation stage/reason code
  // per-category vendor commission (%)
  commissionByType: Record<string, number>;
}

const DEFAULT_CATEGORY_ADJ: Record<string, number> = {
  [VendorType.FOOD]: 0,
  [VendorType.GROCERY]: 0,
  [VendorType.MARKET]: 0,
  [VendorType.PHARMACY]: 0,
  [VendorType.SHOP]: 0,
  [VendorType.LAUNDRY]: 0,
  [VendorType.PARCEL]: 0,
  [VendorType.ERRAND]: 0,
};

const DEFAULT_LOAD_ALLOWANCE: Record<string, number> = {
  ...DEFAULT_CATEGORY_ADJ,
  [VendorType.MARKET]: ghsToPesewas(2),
  [VendorType.LAUNDRY]: ghsToPesewas(2),
  [VendorType.PARCEL]: ghsToPesewas(1),
};

const DEFAULT_PAYOUT_MULTIPLIER_BY_SERVICE_LEVEL: Record<ServiceLevel, number> = {
  STANDARD: 1,
  SCHEDULED: 1,
  PRIORITY: 1.15,
};

const DEFAULT_CANCELLATION_TREATMENT: Record<string, number> = {
  BEFORE_VENDOR_ACCEPT_CUSTOMER_FEE_PCT: 0,
  AFTER_VENDOR_ACCEPT_CUSTOMER_FEE_PCT: 25,
  AFTER_PICKUP_CUSTOMER_FEE_PCT: 100,
  VENDOR_FAULT_CUSTOMER_FEE_PCT: 0,
  VENDOR_FAULT_VENDOR_COMMISSION_PCT: 0,
  RIDER_FAULT_RIDER_PAYOUT_PCT: 0,
};

export function feePolicyFromEnv(env: Record<string, string | undefined>): FeePolicy {
  return {
    version: num(env.FEE_POLICY_VERSION, 1),
    serviceFeePct: num(env.SERVICE_FEE_PCT, 2),
    serviceFeeWaiveAbovePesewas: num(env.SERVICE_FEE_WAIVE_ABOVE_PESEWAS, ghsToPesewas(499)),
    deliveryBasePesewas: num(env.DELIVERY_BASE_PESEWAS, ghsToPesewas(4)),
    deliveryPerKmPesewas: num(env.DELIVERY_PER_KM_PESEWAS, ghsToPesewas(2)),
    deliverySurgePct: num(env.DELIVERY_SURGE_PCT, 0),
    deliverySurgeMultiplier: clampSurgeMultiplier(num(env.DELIVERY_SURGE_MULTIPLIER, 1)),
    priorityFeePerKmPesewas: num(env.PRIORITY_FEE_PER_KM_PESEWAS, ghsToPesewas(1)),
    categoryAdjustmentPesewas: parseMap(env.CATEGORY_ADJUSTMENT_PESEWAS, DEFAULT_CATEGORY_ADJ),
    riderBasePesewas: num(env.RIDER_BASE_PESEWAS, ghsToPesewas(4)),
    riderPickupPerKmPesewas: num(env.RIDER_PICKUP_PER_KM_PESEWAS, ghsToPesewas(1)),
    riderDeliveryPerKmPesewas: num(env.RIDER_DELIVERY_PER_KM_PESEWAS, ghsToPesewas(2.5)),
    loadAllowancePesewas: parseMap(env.LOAD_ALLOWANCE_PESEWAS, DEFAULT_LOAD_ALLOWANCE),
    payoutMultiplierByServiceLevel: normalizeServiceLevelMultipliers(parseMap(env.PAYOUT_MULTIPLIER_BY_SERVICE_LEVEL, DEFAULT_PAYOUT_MULTIPLIER_BY_SERVICE_LEVEL)),
    cancellationTreatment: parseMap(env.CANCELLATION_TREATMENT_JSON, DEFAULT_CANCELLATION_TREATMENT),
    commissionByType: parseMap(env.COMMISSION_BY_TYPE_JSON, { ...CategoryCommission }),
  };
}

/** Customer delivery fee — extract: base + distance×rate + category load + priority/surge. */
export function customerDeliveryFee(
  policy: FeePolicy,
  distanceKm: number,
  vendorType: VendorType | string,
  opts: number | { surgePct?: number; surgeMultiplier?: number; serviceLevel?: ServiceLevel } = 0,
): number {
  const surgePct = typeof opts === 'number' ? opts : opts.surgePct ?? 0;
  const serviceLevel = typeof opts === 'number' ? 'STANDARD' : opts.serviceLevel ?? 'STANDARD';
  const surgeMultiplier = typeof opts === 'number' ? policy.deliverySurgeMultiplier : clampSurgeMultiplier(opts.surgeMultiplier ?? policy.deliverySurgeMultiplier);
  const base = policy.deliveryBasePesewas;
  const dist = Math.round(distanceKm * policy.deliveryPerKmPesewas);
  const catAdj = policy.categoryAdjustmentPesewas[vendorType] ?? 0;
  const priority = serviceLevel === 'PRIORITY' ? Math.round(distanceKm * policy.priorityFeePerKmPesewas) : 0;
  const preSurge = sumPesewas([base, dist, catAdj, priority]);
  const multiplierSurge = Math.max(0, Math.round(preSurge * (surgeMultiplier - 1)));
  const pctSurge = pctOf(preSurge, policy.deliverySurgePct + surgePct);
  return sumPesewas([preSurge, multiplierSurge, pctSurge]);
}

/** Rider fulfilment fee — doc §2.4.2. Computed at dispatch from real distances, service level and approved incentives/exceptions. */
export function riderPayout(
  policy: FeePolicy,
  pickupKm: number,
  deliveryKm: number,
  vendorType: VendorType | string,
  opts: { serviceLevel?: ServiceLevel; approvedIncentivePesewas?: number; exceptionPesewas?: number } = {},
): number {
  const base = policy.riderBasePesewas;
  const pickup = Math.round(pickupKm * policy.riderPickupPerKmPesewas);
  const delivery = Math.round(deliveryKm * policy.riderDeliveryPerKmPesewas);
  const load = policy.loadAllowancePesewas[vendorType] ?? 0;
  const beforeLevel = sumPesewas([base, pickup, delivery, load]);
  const multiplier = Math.max(0, policy.payoutMultiplierByServiceLevel[opts.serviceLevel ?? 'STANDARD'] ?? 1);
  const levelAdjusted = Math.round(beforeLevel * multiplier);
  return sumPesewas([levelAdjusted, Math.max(0, opts.approvedIncentivePesewas ?? 0), Math.max(0, opts.exceptionPesewas ?? 0)]);
}

/** Vendor commission pct for a category. */
export function commissionPct(policy: FeePolicy, vendorType: VendorType | string): number {
  return policy.commissionByType[vendorType] ?? 0;
}

export function serviceCodeFor(vendorType: VendorType): string {
  return SERVICE_CODE[vendorType] ?? 'OT';
}

function parseMap(raw: string | undefined, dflt: Record<string, number>): Record<string, number> {
  if (!raw) return { ...dflt };
  try {
    const parsed = JSON.parse(raw) as Partial<Record<VendorType, number>>;
    return { ...dflt, ...parsed };
  } catch {
    return { ...dflt };
  }
}

function num(v: string | undefined, dflt: number): number {
  const n = Number(v);
  return Number.isFinite(n) && v !== undefined && v !== '' ? n : dflt;
}

function normalizeServiceLevelMultipliers(raw: Record<string, number>): Record<ServiceLevel | string, number> {
  return {
    ...DEFAULT_PAYOUT_MULTIPLIER_BY_SERVICE_LEVEL,
    ...Object.fromEntries(Object.entries(raw).map(([key, value]) => [key.toUpperCase(), Number.isFinite(value) ? value : 1])),
  };
}

function clampSurgeMultiplier(value: number): number {
  // Extract-approved levels are 1.0, 1.2, 1.3 and 1.5; env can pin one of them.
  const allowed = [1, 1.2, 1.3, 1.5];
  return allowed.reduce((closest, current) => Math.abs(current - value) < Math.abs(closest - value) ? current : closest, 1);
}

export { pctOf, sumPesewas };
export type { MoneyBreakdown };
