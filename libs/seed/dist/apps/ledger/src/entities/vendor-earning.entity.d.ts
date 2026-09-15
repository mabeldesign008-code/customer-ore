/** One delivered order's vendor earnings (net of commission, doc §4).
 *  settledAt marks inclusion in a weekly settlement; null = still accruing/rolling over. */
export declare class VendorEarning {
    id: string;
    vendorId: string;
    orderId: string;
    orderRef: string | null;
    amountPesewas: number;
    settlementId: string | null;
    settledAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=vendor-earning.entity.d.ts.map