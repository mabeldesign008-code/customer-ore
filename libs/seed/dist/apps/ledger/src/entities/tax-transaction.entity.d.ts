import { PaymentProcessor, RevenueOwner, SettlementMethod, TaxCategory, TaxClassificationStatus, TaxPartyType, VatStatus, WhtStatus, TransactionType, ResidentStatus } from '@ore/contracts';
/** One append-only classification row per tax-relevant transaction component. */
export declare class TaxTransaction {
    id: string;
    transactionId: string;
    orderId: string | null;
    componentType: string;
    payerType: TaxPartyType | null;
    payerId: string | null;
    payeeType: TaxPartyType | null;
    payeeId: string | null;
    supplierType: TaxPartyType | null;
    supplierId: string | null;
    customerId: string | null;
    grossAmountPesewas: number;
    taxableAmountPesewas: number;
    taxCategory: TaxCategory | null;
    revenueOwner: RevenueOwner | null;
    paymentProcessor: PaymentProcessor | null;
    settlementMethod: SettlementMethod | null;
    contractType: string | null;
    transactionType: TransactionType | null;
    residentStatus: ResidentStatus | null;
    classificationStatus: TaxClassificationStatus;
    whtStatus: WhtStatus;
    vatStatus: VatStatus;
    reviewReason: string | null;
    metadataJson: Record<string, unknown> | null;
    createdAt: Date;
}
//# sourceMappingURL=tax-transaction.entity.d.ts.map