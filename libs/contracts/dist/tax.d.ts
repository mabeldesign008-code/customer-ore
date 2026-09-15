/**
 * Ore Tax Engine primitives.
 *
 * Core rule: moving through Paystack or appearing in Ore's system is never enough
 * to make an amount Ore revenue, Ore output VAT, or WHT-able. Every component is
 * classified first; unclear components become review cases.
 */
export type TaxPartyType = 'CUSTOMER' | 'VENDOR' | 'DELIVERY_PARTNER' | 'INDEPENDENT_DELIVERY_PARTNER' | 'FLEET_DELIVERY_PARTNER' | 'FLEET_PARTNER' | 'ORE' | 'PAYSTACK' | 'EMPLOYEE' | 'LANDLORD' | 'OTHER_SUPPLIER';
export type RevenueOwner = 'ORE' | 'VENDOR' | 'DELIVERY_PARTNER' | 'FLEET_DELIVERY_PARTNER' | 'OTHER';
export type TaxCategory = 'TAXABLE' | 'ZERO_RATED' | 'EXEMPT' | 'OUT_OF_SCOPE' | 'NOT_ORE_SUPPLY';
export type VatStatus = 'TAXABLE' | 'ZERO_RATED' | 'EXEMPT' | 'OUT_OF_SCOPE' | 'NOT_ORE_SUPPLY' | 'REVIEW_REQUIRED';
export type WhtStatus = 'APPLIES' | 'NOT_APPLICABLE' | 'THRESHOLD_NOT_MET' | 'EXEMPT' | 'REVIEW_REQUIRED';
export type TaxClassificationStatus = 'RESOLVED' | 'REVIEW_REQUIRED';
export type TaxType = 'VAT' | 'NHIL' | 'GETFUND' | 'WHT' | 'WITHHOLDING_VAT' | 'PAYE' | 'SSNIT' | 'CIT' | 'RENT_WHT';
export type TransactionType = 'GOODS' | 'WORKS' | 'GENERAL_SERVICES' | 'RENT' | 'DIRECTOR_FEES' | 'COMMISSION' | 'NON_RESIDENT_SERVICES';
export type ThresholdType = 'TRANSACTION_THRESHOLD' | 'ANNUAL_CUMULATIVE_THRESHOLD' | 'SUPPLIER_CATEGORY_THRESHOLD' | 'NO_THRESHOLD_RULE';
export type TaxBase = 'GROSS_AMOUNT' | 'TAXABLE_AMOUNT' | 'AMOUNT_OVER_THRESHOLD';
export type ResidentStatus = 'RESIDENT' | 'NON_RESIDENT' | 'UNKNOWN';
export type TaxPricingMode = 'INCLUSIVE' | 'EXCLUSIVE';
export type SettlementMethod = 'PAYSTACK_SPLIT' | 'PAYSTACK_TRANSFER' | 'COD_CASH' | 'WALLET' | 'BANK_TRANSFER' | 'INTERNAL_LEDGER' | 'NONE';
export type PaymentProcessor = 'PAYSTACK' | 'CASH' | 'INTERNAL' | 'NONE';
export interface TaxRuleConfig {
    ruleId: string;
    taxType: TaxType;
    supplierType?: TaxPartyType | 'ANY';
    payerType?: TaxPartyType | 'ANY';
    payeeType?: TaxPartyType | 'ANY';
    residentStatus?: ResidentStatus | 'ANY';
    transactionType?: TransactionType | 'ANY';
    contractType?: string;
    thresholdType?: ThresholdType;
    thresholdAmountPesewas?: number;
    rateBps: number;
    taxBase?: TaxBase;
    effectiveFrom: string | Date;
    effectiveTo?: string | Date | null;
    exemption?: boolean;
    certificateRequired?: boolean;
    active?: boolean;
    version?: number;
}
export interface TaxComponentInput {
    transactionId: string;
    orderId?: string | null;
    componentType: string;
    payerType?: TaxPartyType | null;
    payerId?: string | null;
    payeeType?: TaxPartyType | null;
    payeeId?: string | null;
    supplierType?: TaxPartyType | null;
    supplierId?: string | null;
    customerId?: string | null;
    grossAmountPesewas: number;
    taxableAmountPesewas?: number | null;
    taxCategory?: TaxCategory | null;
    revenueOwner?: RevenueOwner | null;
    paymentProcessor?: PaymentProcessor | null;
    settlementMethod?: SettlementMethod | null;
    contractType?: string | null;
    transactionType?: TransactionType | null;
    residentStatus?: ResidentStatus | null;
    transactionDate?: string | Date | null;
    pricingMode?: TaxPricingMode | null;
    classificationStatus?: TaxClassificationStatus;
    reviewReason?: string | null;
    metadata?: Record<string, unknown> | null;
}
export interface VatLine {
    taxType: Extract<TaxType, 'VAT' | 'NHIL' | 'GETFUND'>;
    ruleId: string;
    rateBps: number;
    taxableValuePesewas: number;
    taxAmountPesewas: number;
}
export interface VatEvaluationResult {
    vatStatus: VatStatus;
    taxableValuePesewas: number;
    taxAmountPesewas: number;
    netRevenuePesewas: number;
    lines: VatLine[];
    reviewReason?: string;
}
export interface WhtCumulativeContext {
    supplierId: string;
    supplierType: TaxPartyType;
    transactionType: TransactionType;
    taxYear: number;
    currentTransactionAmountPesewas: number;
    priorCumulativeAmountPesewas: number;
    postTransactionCumulativeAmountPesewas: number;
    thresholdReachedFlag: boolean;
    thresholdTriggerTransactionId?: string | null;
}
export interface WhtEvaluationResult {
    whtStatus: WhtStatus;
    ruleId?: string | null;
    rateBps: number;
    taxBasePesewas: number;
    whtAmountPesewas: number;
    taxType?: Extract<TaxType, 'WHT' | 'RENT_WHT'> | null;
    thresholdType?: ThresholdType | null;
    thresholdAmountPesewas?: number | null;
    thresholdReachedFlag?: boolean;
    certificateRequired?: boolean;
    reviewReason?: string;
    cumulative?: WhtCumulativeContext | null;
}
export interface OrderTaxInput {
    orderId: string;
    customerId: string;
    vendorId: string;
    vendorType?: string | null;
    vendorResidentStatus?: ResidentStatus | null;
    orderType?: string | null;
    paymentMethod?: 'PREPAID' | 'COD' | string | null;
    subtotalPesewas: number;
    promotionDiscountPesewas?: number | null;
    vendorSharePesewas: number;
    deliveryFeePesewas: number;
    serviceFeePesewas: number;
    platformFeePesewas?: number | null;
    riderId?: string | null;
    riderFeePesewas?: number | null;
    tipPesewas?: number | null;
    peakPayPesewas?: number | null;
    serviceLevel?: 'STANDARD' | 'SCHEDULED' | 'PRIORITY' | string | null;
    errandBudgetPesewas?: number | null;
    errandSpentPesewas?: number | null;
    oreDeliveryMarginContracted: boolean;
    deliveryPartnerType?: TaxPartyType | null;
    deliveryPartnerId?: string | null;
    fleetPartnerId?: string | null;
    deliveryPartnerContractType?: string | null;
    deliveryPartnerResidentStatus?: ResidentStatus | null;
    pricingMode?: TaxPricingMode;
    paymentProcessor?: PaymentProcessor;
    settlementMethod?: SettlementMethod;
    transactionDate?: string | Date | null;
}
export interface OrderTaxScenario {
    transactionId: string;
    orderId: string;
    pricingMode: TaxPricingMode;
    components: TaxComponentInput[];
    reviewRequired: boolean;
    reviewReasons: string[];
    vendorProductValuePesewas: number;
    oreCommissionGrossPesewas: number;
    oreServiceFeeGrossPesewas: number;
    orePlatformFeeGrossPesewas: number;
    deliveryPartnerEarningPesewas: number;
    deliveryMarginGrossPesewas: number;
    deliveryShortfallIncentivePesewas: number;
    riderTipPesewas: number;
    orePeakIncentivePesewas: number;
    errandSpentReimbursementPesewas: number;
    errandUnspentCreditPesewas: number;
}
export declare const DEFAULT_GHANA_VAT_LEVY_RULES: TaxRuleConfig[];
export declare function validateTaxComponent(component: TaxComponentInput): {
    ok: true;
} | {
    ok: false;
    reason: string;
};
export declare function evaluateVat(params: {
    component: TaxComponentInput;
    rules: TaxRuleConfig[];
    pricingMode?: TaxPricingMode;
    asOf?: string | Date;
}): VatEvaluationResult;
export declare function evaluateWht(params: {
    component: TaxComponentInput;
    rules: TaxRuleConfig[];
    cumulative?: WhtCumulativeContext | null;
    asOf?: string | Date;
}): WhtEvaluationResult;
export declare function buildOrderTaxScenario(input: OrderTaxInput): OrderTaxScenario;
export declare function taxPeriodFor(date: Date): string;
//# sourceMappingURL=tax.d.ts.map