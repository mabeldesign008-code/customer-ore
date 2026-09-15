/** Immutable credit log — the idempotency key for wallet credits (no double refund). */
export declare class CustomerCreditLog {
    id: string;
    userId: string;
    amountPesewas: number;
    ref: string;
    kind: string;
    expiresAt: Date | null;
    expiredAt: Date | null;
    reason: string;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=customer-credit-log.entity.d.ts.map