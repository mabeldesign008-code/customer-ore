/** Doc §Payment — customer wallet credit (ledger-based; instant, no PSP round trip).
 *  Refund priority: wallet credit first. */
export declare class CustomerCredit {
    id: string;
    userId: string;
    creditPesewas: number;
    lifetimeCreditedPesewas: number;
    lifetimeUsedPesewas: number;
    version: number;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=customer-credit.entity.d.ts.map