export type TaxReviewStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED';
/** Exceptions queue: unclear classification never defaults to Ore revenue/no-WHT. */
export declare class TaxReviewCase {
    id: string;
    transactionId: string;
    orderId: string | null;
    componentType: string | null;
    reasonCode: string;
    reason: string;
    status: TaxReviewStatus;
    assignedTo: string | null;
    resolvedBy: string | null;
    resolvedAt: Date | null;
    resolutionNote: string | null;
    payloadJson: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=tax-review-case.entity.d.ts.map