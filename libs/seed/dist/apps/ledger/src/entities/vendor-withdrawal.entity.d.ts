export type VendorWithdrawalStatus = 'REQUESTED' | 'PROCESSING' | 'PAID' | 'FAILED' | 'REJECTED';
/** Optional early Vendor payout request; scheduled settlements remain the default path. */
export declare class VendorWithdrawal {
    id: string;
    vendorId: string;
    amountPesewas: number;
    destination: string;
    status: VendorWithdrawalStatus;
    transferReference: string | null;
    note: string | null;
    processedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=vendor-withdrawal.entity.d.ts.map