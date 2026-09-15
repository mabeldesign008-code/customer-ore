/** Money = integer pesewas (GHS 1 = 100 pesewas). NEVER use floats for money. */
export declare function pesewasToGhs(pesewas: number): number;
export declare function ghsToPesewas(ghs: number): number;
export declare function formatGhs(pesewas: number): string;
/** Round percentage of an amount in pesewas (always rounds to whole pesewa). */
export declare function pctOf(pesewas: number, percent: number): number;
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
export declare function bpsOf(pesewas: number, bps: number): number;
/** 18 → 1800. Rounds, because a configured percentage may carry decimals. */
export declare function pctToBps(percent: number): number;
/** 1800 → 18. For display and for the API, which still speaks percentages. */
export declare function bpsToPct(bps: number): number;
/** Sum of pesewa amounts. */
export declare function sumPesewas(amounts: number[]): number;
export interface MoneyBreakdown {
    subtotalPesewas: number;
    deliveryFeePesewas: number;
    serviceFeePesewas: number;
    commissionBps: number;
    vendorSharePesewas: number;
    riderFeePesewas: number;
    pspFeePesewas: number;
    totalPesewas: number;
    feePolicyVersion: number;
}
export declare function emptyBreakdown(): MoneyBreakdown;
/**
 * Per-ORDER money breakdown at checkout (vendor side).
 * Rider payout is intentionally NOT set here — it's computed at dispatch from real
 * pickup + delivery distances (doc §2.4: customer fee and rider payout are separate).
 */
export declare function computeBreakdown(params: {
    subtotalPesewas: number;
    distanceKm: number;
    feePolicy: {
        version: number;
        serviceFeePct: number;
        serviceFeeWaiveAbovePesewas?: number;
        deliveryBasePesewas: number;
        deliveryPerKmPesewas: number;
        deliverySurgePct: number;
        deliverySurgeMultiplier?: number;
        priorityFeePerKmPesewas?: number;
        categoryAdjustmentPesewas: Record<string, number>;
        commissionByType: Record<string, number>;
    };
    vendorType: string;
    serviceLevel?: 'STANDARD' | 'SCHEDULED' | 'PRIORITY';
    surgeMultiplier?: number;
}): MoneyBreakdown;
//# sourceMappingURL=money.d.ts.map