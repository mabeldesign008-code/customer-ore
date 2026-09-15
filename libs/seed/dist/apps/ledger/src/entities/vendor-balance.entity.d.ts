/** Vendor running balances (doc §4): accrued lifetime earnings, rolling reserve held,
 *  negative-balance carry (owed), lifetime paid out. Pending = unsettled VendorEarning rows. */
export declare class VendorBalance {
    id: string;
    vendorId: string;
    accruedPesewas: number;
    reservePesewas: number;
    owedPesewas: number;
    withdrawalHeldPesewas: number;
    paidOutPesewas: number;
    bonusPesewas: number;
    version: number;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=vendor-balance.entity.d.ts.map