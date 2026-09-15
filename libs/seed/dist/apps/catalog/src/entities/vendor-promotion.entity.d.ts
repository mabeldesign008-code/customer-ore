/** Vendor campaign management record. Checkout application is a separate pricing contract. */
export declare class VendorPromotion {
    id: string;
    vendorId: string;
    title: string;
    /** Optional customer-facing code. Unique when set. */
    code: string | null;
    discountType: 'PERCENT' | 'FIXED';
    discountValue: number;
    minimumSubtotalPesewas: number;
    budgetPesewas: number | null;
    redemptionLimit: number | null;
    spentPesewas: number;
    redemptionsUsed: number;
    startsAt: Date;
    endsAt: Date;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=vendor-promotion.entity.d.ts.map