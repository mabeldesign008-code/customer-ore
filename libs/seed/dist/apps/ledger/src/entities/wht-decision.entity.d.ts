import { ResidentStatus, TaxPartyType, ThresholdType, TransactionType, WhtStatus } from '@ore/contracts';
/** Every WHT evaluation is logged, including not-applicable and threshold-not-met outcomes. */
export declare class WhtDecision {
    id: string;
    transactionId: string;
    orderId: string | null;
    componentType: string;
    ruleId: string | null;
    whtStatus: WhtStatus;
    supplierId: string | null;
    supplierType: TaxPartyType | null;
    payerType: TaxPartyType | null;
    payeeType: TaxPartyType | null;
    transactionType: TransactionType | null;
    contractType: string | null;
    residentStatus: ResidentStatus | null;
    taxYear: number | null;
    currentTransactionAmountPesewas: number;
    priorCumulativeAmountPesewas: number;
    postTransactionCumulativeAmountPesewas: number;
    thresholdType: ThresholdType | null;
    thresholdAmountPesewas: number | null;
    thresholdReachedFlag: boolean;
    thresholdTriggerTransactionId: string | null;
    rateBps: number;
    taxBasePesewas: number;
    whtAmountPesewas: number;
    certificateRequired: boolean;
    certificateNumber: string | null;
    reviewReason: string | null;
    createdAt: Date;
}
//# sourceMappingURL=wht-decision.entity.d.ts.map