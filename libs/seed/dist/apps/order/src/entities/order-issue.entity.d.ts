/** Vendor/customer order issue report; resolution remains an operations workflow. */
export declare class OrderIssue {
    id: string;
    orderId: string;
    vendorId: string;
    reporterUserId: string;
    category: string;
    note: string | null;
    status: string;
    resolutionNote: string | null;
    resolvedBy: string | null;
    resolvedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=order-issue.entity.d.ts.map