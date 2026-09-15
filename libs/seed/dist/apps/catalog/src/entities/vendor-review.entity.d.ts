/** Customer review attached to one delivered order and Vendor response. */
export declare class VendorReview {
    id: string;
    orderId: string;
    vendorId: string;
    customerId: string;
    rating: number;
    comment: string | null;
    vendorResponse: string | null;
    respondedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=vendor-review.entity.d.ts.map