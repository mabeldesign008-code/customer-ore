/** Idempotent promotion redemption tied to an order. */
export declare class PromotionRedemption {
    id: string;
    orderId: string;
    promotionId: string;
    customerId: string | null;
    discountPesewas: number;
    status: 'REDEEMED' | 'RELEASED';
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=promotion-redemption.entity.d.ts.map