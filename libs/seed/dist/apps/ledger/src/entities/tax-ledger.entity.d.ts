import { TaxCategory, TaxType } from '@ore/contracts';
/** ORE_TAX_LEDGER — append-only tax ledger. Filed rows are immutable by migration trigger. */
export declare class TaxLedger {
    taxTransactionId: string;
    orderId: string | null;
    invoiceId: string | null;
    partyId: string | null;
    taxType: TaxType;
    taxCategory: TaxCategory;
    taxableValuePesewas: number;
    taxRateBps: number;
    taxAmountPesewas: number;
    taxPeriod: string;
    transactionDate: Date;
    sourceTransaction: string;
    sourceComponent: string | null;
    ruleId: string | null;
    reversalReference: string | null;
    paymentStatus: string;
    filingStatus: 'OPEN' | 'FILED' | 'AMENDED' | 'CLOSED';
    certificateNumber: string | null;
    metaJson: Record<string, unknown> | null;
    createdAt: Date;
}
//# sourceMappingURL=tax-ledger.entity.d.ts.map