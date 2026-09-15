import { ResidentStatus, TaxBase, TaxPartyType, TaxType, ThresholdType, TransactionType } from '@ore/contracts';
/** Versioned tax/WHT rule table. Rates are data, not posting-code constants. */
export declare class TaxRule {
    id: string;
    ruleId: string;
    taxType: TaxType;
    supplierType: TaxPartyType | 'ANY' | null;
    payerType: TaxPartyType | 'ANY' | null;
    payeeType: TaxPartyType | 'ANY' | null;
    residentStatus: ResidentStatus | 'ANY' | null;
    transactionType: TransactionType | 'ANY' | null;
    contractType: string | null;
    thresholdType: ThresholdType | null;
    thresholdAmountPesewas: number | null;
    /** Basis points: 15% = 1500, 2.5% = 250, 7% = 700. */
    rateBps: number;
    taxBase: TaxBase;
    effectiveFrom: Date;
    effectiveTo: Date | null;
    exemption: boolean;
    certificateRequired: boolean;
    active: boolean;
    version: number;
    updatedBy: string | null;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=tax-rule.entity.d.ts.map