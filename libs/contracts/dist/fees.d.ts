/** Fee policy — single source of truth for money math (ore doc §2.4, §4). Overridable via env.
 *  Two SEPARATE formulas (doc: customer fee and rider payout are independent decisions):
 *    Customer Delivery Fee = Base + Distance×PerKm + CategoryLoad + Priority/Surge
 *    Rider Fulfilment Fee = (RiderBase + PickupKm×PickupPerKm + DeliveryKm×DeliveryPerKm + LoadAllowance)×ServiceLevel + incentives/exceptions
 *  Vendor commission is per-category (food 18%, grocery 12%, market 10%,
 *  pharmacy 10%, shop 12%, laundry 12%). Parcel/errand are not vendor stores. */
import { pctOf, sumPesewas, MoneyBreakdown } from './money';
import { VendorType } from './enums';
export type ServiceLevel = 'STANDARD' | 'SCHEDULED' | 'PRIORITY';
export interface FeePolicy {
    version: number;
    serviceFeePct: number;
    serviceFeeWaiveAbovePesewas: number;
    deliveryBasePesewas: number;
    deliveryPerKmPesewas: number;
    deliverySurgePct: number;
    deliverySurgeMultiplier: number;
    priorityFeePerKmPesewas: number;
    categoryAdjustmentPesewas: Record<string, number>;
    riderBasePesewas: number;
    riderPickupPerKmPesewas: number;
    riderDeliveryPerKmPesewas: number;
    loadAllowancePesewas: Record<string, number>;
    payoutMultiplierByServiceLevel: Record<ServiceLevel | string, number>;
    cancellationTreatment: Record<string, number>;
    commissionByType: Record<string, number>;
}
export declare function feePolicyFromEnv(env: Record<string, string | undefined>): FeePolicy;
/** Customer delivery fee — extract: base + distance×rate + category load + priority/surge. */
export declare function customerDeliveryFee(policy: FeePolicy, distanceKm: number, vendorType: VendorType | string, opts?: number | {
    surgePct?: number;
    surgeMultiplier?: number;
    serviceLevel?: ServiceLevel;
}): number;
/** Rider fulfilment fee — doc §2.4.2. Computed at dispatch from real distances, service level and approved incentives/exceptions. */
export declare function riderPayout(policy: FeePolicy, pickupKm: number, deliveryKm: number, vendorType: VendorType | string, opts?: {
    serviceLevel?: ServiceLevel;
    approvedIncentivePesewas?: number;
    exceptionPesewas?: number;
}): number;
/** Vendor commission pct for a category. */
export declare function commissionPct(policy: FeePolicy, vendorType: VendorType | string): number;
export declare function serviceCodeFor(vendorType: VendorType): string;
export { pctOf, sumPesewas };
export type { MoneyBreakdown };
//# sourceMappingURL=fees.d.ts.map