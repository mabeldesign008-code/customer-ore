/**
 * Ore Tax Engine primitives.
 *
 * Core rule: moving through Paystack or appearing in Ore's system is never enough
 * to make an amount Ore revenue, Ore output VAT, or WHT-able. Every component is
 * classified first; unclear components become review cases.
 */

export type TaxPartyType =
  | 'CUSTOMER'
  | 'VENDOR'
  | 'DELIVERY_PARTNER'
  | 'INDEPENDENT_DELIVERY_PARTNER'
  | 'FLEET_DELIVERY_PARTNER'
  | 'FLEET_PARTNER'
  | 'ORE'
  | 'PAYSTACK'
  | 'EMPLOYEE'
  | 'LANDLORD'
  | 'OTHER_SUPPLIER';

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

export const DEFAULT_GHANA_VAT_LEVY_RULES: TaxRuleConfig[] = [
  { ruleId: 'GH-VAT-STD-2026', taxType: 'VAT', supplierType: 'ORE', payerType: 'ANY', residentStatus: 'ANY', transactionType: 'ANY', rateBps: 1500, taxBase: 'TAXABLE_AMOUNT', effectiveFrom: '2026-01-01T00:00:00.000Z', active: true, version: 1 },
  { ruleId: 'GH-NHIL-STD-2026', taxType: 'NHIL', supplierType: 'ORE', payerType: 'ANY', residentStatus: 'ANY', transactionType: 'ANY', rateBps: 250, taxBase: 'TAXABLE_AMOUNT', effectiveFrom: '2026-01-01T00:00:00.000Z', active: true, version: 1 },
  { ruleId: 'GH-GETFUND-STD-2026', taxType: 'GETFUND', supplierType: 'ORE', payerType: 'ANY', residentStatus: 'ANY', transactionType: 'ANY', rateBps: 250, taxBase: 'TAXABLE_AMOUNT', effectiveFrom: '2026-01-01T00:00:00.000Z', active: true, version: 1 },
];

export function validateTaxComponent(component: TaxComponentInput): { ok: true } | { ok: false; reason: string } {
  if (!component.transactionId) return { ok: false, reason: 'transaction_id_missing' };
  if (!component.componentType) return { ok: false, reason: 'component_type_missing' };
  if (!component.payerType || !component.payeeType || !component.supplierType) return { ok: false, reason: 'party_classification_missing' };
  if (component.supplierType === 'PAYSTACK') return { ok: false, reason: 'paystack_cannot_be_supplier_or_revenue_owner' };
  if (!component.revenueOwner) return { ok: false, reason: 'revenue_owner_missing' };
  if (component.revenueOwner === 'ORE' && component.supplierType !== 'ORE') return { ok: false, reason: 'ore_revenue_owner_requires_ore_supplier' };
  if (!component.taxCategory) return { ok: false, reason: 'tax_category_missing' };
  if (!component.paymentProcessor) return { ok: false, reason: 'payment_processor_missing' };
  if (!component.settlementMethod) return { ok: false, reason: 'settlement_method_missing' };
  if (!component.contractType) return { ok: false, reason: 'contract_type_missing' };
  if (!component.transactionType) return { ok: false, reason: 'transaction_type_missing' };
  if (!component.residentStatus) return { ok: false, reason: 'resident_status_missing' };
  if (!Number.isInteger(component.grossAmountPesewas) || component.grossAmountPesewas < 0) return { ok: false, reason: 'gross_amount_invalid' };
  if (component.taxableAmountPesewas != null && (!Number.isInteger(component.taxableAmountPesewas) || component.taxableAmountPesewas < 0)) return { ok: false, reason: 'taxable_amount_invalid' };
  return { ok: true };
}

export function evaluateVat(params: {
  component: TaxComponentInput;
  rules: TaxRuleConfig[];
  pricingMode?: TaxPricingMode;
  asOf?: string | Date;
}): VatEvaluationResult {
  const component = params.component;
  const mode = params.pricingMode ?? component.pricingMode ?? 'INCLUSIVE';
  const taxCategory = component.taxCategory ?? 'OUT_OF_SCOPE';
  if (component.revenueOwner !== 'ORE') {
    return { vatStatus: 'NOT_ORE_SUPPLY', taxableValuePesewas: 0, taxAmountPesewas: 0, netRevenuePesewas: component.grossAmountPesewas, lines: [] };
  }
  if (taxCategory !== 'TAXABLE') {
    return { vatStatus: taxCategory, taxableValuePesewas: 0, taxAmountPesewas: 0, netRevenuePesewas: component.grossAmountPesewas, lines: [] };
  }
  const rules = activeRules(params.rules, params.asOf ?? component.transactionDate ?? new Date())
    .filter((rule) => ['VAT', 'NHIL', 'GETFUND'].includes(rule.taxType) && matches(rule, component));
  if (rules.length === 0) {
    return { vatStatus: 'REVIEW_REQUIRED', taxableValuePesewas: 0, taxAmountPesewas: 0, netRevenuePesewas: 0, lines: [], reviewReason: 'no_active_vat_levy_rules' };
  }
  const grossTaxable = Math.max(0, component.taxableAmountPesewas ?? component.grossAmountPesewas);
  const totalRateBps = rules.reduce((sum, rule) => sum + Math.max(0, rule.rateBps), 0);
  const taxableValuePesewas = mode === 'INCLUSIVE'
    ? Math.round((grossTaxable * 10_000) / (10_000 + totalRateBps))
    : grossTaxable;
  const lines = rules.map((rule) => ({
    taxType: rule.taxType as VatLine['taxType'],
    ruleId: rule.ruleId,
    rateBps: rule.rateBps,
    taxableValuePesewas,
    taxAmountPesewas: Math.round((taxableValuePesewas * rule.rateBps) / 10_000),
  }));
  let taxAmountPesewas = lines.reduce((sum, line) => sum + line.taxAmountPesewas, 0);
  if (mode === 'INCLUSIVE') {
    const expected = grossTaxable - taxableValuePesewas;
    const delta = expected - taxAmountPesewas;
    if (delta !== 0 && lines.length > 0) {
      lines[lines.length - 1] = { ...lines[lines.length - 1], taxAmountPesewas: lines[lines.length - 1].taxAmountPesewas + delta };
      taxAmountPesewas = expected;
    }
  }
  return {
    vatStatus: 'TAXABLE',
    taxableValuePesewas,
    taxAmountPesewas,
    netRevenuePesewas: mode === 'INCLUSIVE' ? grossTaxable - taxAmountPesewas : grossTaxable,
    lines,
  };
}

export function evaluateWht(params: {
  component: TaxComponentInput;
  rules: TaxRuleConfig[];
  cumulative?: WhtCumulativeContext | null;
  asOf?: string | Date;
}): WhtEvaluationResult {
  const component = params.component;
  const validation = validateTaxComponent(component);
  if (!validation.ok) {
    return { whtStatus: 'REVIEW_REQUIRED', rateBps: 0, taxBasePesewas: 0, whtAmountPesewas: 0, reviewReason: validation.reason };
  }
  if (component.payerType !== 'ORE') {
    return { whtStatus: 'NOT_APPLICABLE', rateBps: 0, taxBasePesewas: 0, whtAmountPesewas: 0, reviewReason: 'ore_is_not_legal_payer' };
  }
  if (component.payeeType === 'EMPLOYEE') {
    return { whtStatus: 'NOT_APPLICABLE', rateBps: 0, taxBasePesewas: 0, whtAmountPesewas: 0, reviewReason: 'employee_flow_uses_paye_not_supplier_wht' };
  }
  if (component.residentStatus === 'UNKNOWN') {
    return { whtStatus: 'REVIEW_REQUIRED', rateBps: 0, taxBasePesewas: 0, whtAmountPesewas: 0, reviewReason: 'resident_status_unknown_for_ore_paid_supplier' };
  }
  const rules = activeRules(params.rules, params.asOf ?? component.transactionDate ?? new Date())
    .filter((rule) => (rule.taxType === 'WHT' || rule.taxType === 'RENT_WHT') && matches(rule, component));
  const rule = rules[0];
  if (!rule) {
    return { whtStatus: 'NOT_APPLICABLE', rateBps: 0, taxBasePesewas: 0, whtAmountPesewas: 0, reviewReason: 'no_matching_active_wht_rule' };
  }
  if (rule.exemption) {
    return { whtStatus: 'EXEMPT', ruleId: rule.ruleId, taxType: rule.taxType as Extract<TaxType, 'WHT' | 'RENT_WHT'>, rateBps: rule.rateBps, taxBasePesewas: 0, whtAmountPesewas: 0, thresholdType: rule.thresholdType ?? null, thresholdAmountPesewas: rule.thresholdAmountPesewas ?? null, certificateRequired: !!rule.certificateRequired };
  }
  const thresholdType = rule.thresholdType ?? 'NO_THRESHOLD_RULE';
  const thresholdAmount = Math.max(0, rule.thresholdAmountPesewas ?? 0);
  const amount = amountForBase(component, rule.taxBase ?? 'TAXABLE_AMOUNT');
  let qualifies = false;
  let taxBasePesewas = amount;
  let cumulative: WhtCumulativeContext | null | undefined = params.cumulative;

  if (thresholdType === 'NO_THRESHOLD_RULE') {
    qualifies = true;
  } else if (thresholdType === 'TRANSACTION_THRESHOLD') {
    qualifies = amount >= thresholdAmount;
  } else {
    if (!cumulative) {
      return {
        whtStatus: 'REVIEW_REQUIRED',
        ruleId: rule.ruleId,
        taxType: rule.taxType as Extract<TaxType, 'WHT' | 'RENT_WHT'>,
        rateBps: rule.rateBps,
        taxBasePesewas: 0,
        whtAmountPesewas: 0,
        thresholdType,
        thresholdAmountPesewas: thresholdAmount,
        reviewReason: 'cumulative_threshold_data_missing',
      };
    }
    qualifies = cumulative.postTransactionCumulativeAmountPesewas >= thresholdAmount;
    if ((rule.taxBase ?? 'TAXABLE_AMOUNT') === 'AMOUNT_OVER_THRESHOLD') {
      taxBasePesewas = Math.max(0, cumulative.postTransactionCumulativeAmountPesewas - Math.max(thresholdAmount, cumulative.priorCumulativeAmountPesewas));
    }
    cumulative = {
      ...cumulative,
      thresholdReachedFlag: cumulative.priorCumulativeAmountPesewas < thresholdAmount && cumulative.postTransactionCumulativeAmountPesewas >= thresholdAmount,
      thresholdTriggerTransactionId:
        cumulative.priorCumulativeAmountPesewas < thresholdAmount && cumulative.postTransactionCumulativeAmountPesewas >= thresholdAmount
          ? component.transactionId
          : cumulative.thresholdTriggerTransactionId ?? null,
    };
  }

  if (!qualifies) {
    return {
      whtStatus: 'THRESHOLD_NOT_MET',
      ruleId: rule.ruleId,
      taxType: rule.taxType as Extract<TaxType, 'WHT' | 'RENT_WHT'>,
      rateBps: rule.rateBps,
      taxBasePesewas: 0,
      whtAmountPesewas: 0,
      thresholdType,
      thresholdAmountPesewas: thresholdAmount,
      thresholdReachedFlag: cumulative?.thresholdReachedFlag ?? false,
      certificateRequired: !!rule.certificateRequired,
      cumulative: cumulative ?? null,
    };
  }

  return {
    whtStatus: 'APPLIES',
    ruleId: rule.ruleId,
    taxType: rule.taxType as Extract<TaxType, 'WHT' | 'RENT_WHT'>,
    rateBps: rule.rateBps,
    taxBasePesewas,
    whtAmountPesewas: Math.round((taxBasePesewas * rule.rateBps) / 10_000),
    thresholdType,
    thresholdAmountPesewas: thresholdAmount,
    thresholdReachedFlag: cumulative?.thresholdReachedFlag ?? (thresholdType === 'NO_THRESHOLD_RULE' || thresholdType === 'TRANSACTION_THRESHOLD'),
    certificateRequired: !!rule.certificateRequired,
    cumulative: cumulative ?? null,
  };
}

export function buildOrderTaxScenario(input: OrderTaxInput): OrderTaxScenario {
  const transactionId = `order:${input.orderId}:final`;
  const paymentProcessor: PaymentProcessor = input.paymentProcessor ?? (input.paymentMethod === 'COD' ? 'CASH' : 'PAYSTACK');
  const settlementMethod: SettlementMethod = input.settlementMethod ?? (input.paymentMethod === 'COD' ? 'COD_CASH' : 'INTERNAL_LEDGER');
  const transactionDate = input.transactionDate ?? new Date();
  const pricingMode = input.pricingMode ?? 'INCLUSIVE';
  const vendorResidentStatus: ResidentStatus = input.vendorResidentStatus ?? 'UNKNOWN';
  const vendorProductValue = Math.max(0, input.subtotalPesewas - Math.max(0, input.promotionDiscountPesewas ?? 0));
  const vendorProceeds = Math.max(0, input.vendorSharePesewas);
  const oreCommission = Math.max(0, vendorProductValue - vendorProceeds);
  const oreServiceFee = Math.max(0, input.serviceFeePesewas);
  // Existing Ore orders keep platformFeePesewas as a legacy/vendor-side field that is
  // not part of the customer gross. Do not turn it into additional Ore revenue unless a
  // future contract explicitly includes it in a classified component.
  const orePlatformFee = 0;
  const deliveryCharge = Math.max(0, input.deliveryFeePesewas);
  const deliveryPartnerEarning = Math.max(0, input.riderFeePesewas ?? 0);
  const deliveryMargin = Math.max(0, deliveryCharge - deliveryPartnerEarning);
  const deliveryShortfall = Math.max(0, deliveryPartnerEarning - deliveryCharge);
  const riderTip = Math.max(0, input.tipPesewas ?? 0);
  const peak = Math.max(0, input.peakPayPesewas ?? 0);
  const errandBudget = Math.max(0, input.errandBudgetPesewas ?? 0);
  const errandSpent = Math.max(0, Math.min(errandBudget, input.errandSpentPesewas ?? 0));
  const errandUnspent = Math.max(0, errandBudget - errandSpent);
  const dpType = normalizeDeliveryPartnerType(input.deliveryPartnerType);
  const dpId = input.deliveryPartnerId ?? input.riderId ?? null;
  const dpResidentStatus: ResidentStatus = input.deliveryPartnerResidentStatus ?? 'UNKNOWN';
  const dpCustomerSupplyContract = input.deliveryPartnerContractType
    ?? (dpType === 'FLEET_DELIVERY_PARTNER' ? 'CUSTOMER_FLEET_DELIVERY_SUPPLY' : 'CUSTOMER_INDEPENDENT_DELIVERY_SUPPLY');
  const orePaidDeliveryPartnerReviewReason = !dpId
    ? 'delivery_partner_profile_missing'
    : dpResidentStatus === 'UNKNOWN'
      ? 'delivery_partner_resident_status_unknown'
      : null;
  const reviewReasons: string[] = [];
  const components: TaxComponentInput[] = [];
  const push = (component: Omit<TaxComponentInput, 'transactionId' | 'orderId' | 'customerId' | 'paymentProcessor' | 'settlementMethod' | 'transactionDate' | 'pricingMode'>) => {
    const full: TaxComponentInput = {
      ...component,
      transactionId,
      orderId: input.orderId,
      customerId: input.customerId,
      paymentProcessor,
      settlementMethod,
      transactionDate,
      pricingMode,
    };
    const validation = validateTaxComponent(full);
    if (!validation.ok || full.classificationStatus === 'REVIEW_REQUIRED') {
      full.classificationStatus = 'REVIEW_REQUIRED';
      full.reviewReason = full.reviewReason ?? (validation.ok ? 'classification_requires_review' : validation.reason);
      reviewReasons.push(`${full.componentType}:${full.reviewReason}`);
    } else {
      full.classificationStatus = 'RESOLVED';
    }
    components.push(full);
  };

  if (vendorProductValue > 0) {
    push({
      componentType: 'vendor_gross_sale',
      payerType: 'CUSTOMER', payerId: input.customerId,
      payeeType: 'VENDOR', payeeId: input.vendorId,
      supplierType: 'VENDOR', supplierId: input.vendorId,
      grossAmountPesewas: vendorProductValue,
      taxableAmountPesewas: 0,
      taxCategory: 'NOT_ORE_SUPPLY',
      revenueOwner: 'VENDOR',
      contractType: 'CUSTOMER_VENDOR_MARKETPLACE_SUPPLY',
      transactionType: 'GOODS',
      residentStatus: vendorResidentStatus,
    });
  }

  if (vendorProceeds > 0) {
    push({
      componentType: 'vendor_proceeds_settlement',
      payerType: 'CUSTOMER', payerId: input.customerId,
      payeeType: 'VENDOR', payeeId: input.vendorId,
      supplierType: 'VENDOR', supplierId: input.vendorId,
      grossAmountPesewas: vendorProceeds,
      taxableAmountPesewas: 0,
      taxCategory: 'NOT_ORE_SUPPLY',
      revenueOwner: 'VENDOR',
      contractType: 'PAYSTACK_DISTRIBUTES_CUSTOMER_FUNDS',
      transactionType: 'GOODS',
      residentStatus: vendorResidentStatus,
    });
  }

  if (oreCommission > 0) {
    push({
      componentType: 'ore_commission',
      payerType: 'VENDOR', payerId: input.vendorId,
      payeeType: 'ORE', payeeId: 'ORE',
      supplierType: 'ORE', supplierId: 'ORE',
      grossAmountPesewas: oreCommission,
      taxableAmountPesewas: oreCommission,
      taxCategory: 'TAXABLE',
      revenueOwner: 'ORE',
      contractType: 'VENDOR_COMMISSION',
      transactionType: 'COMMISSION',
      residentStatus: 'RESIDENT',
    });
  }

  if (oreServiceFee > 0) {
    push({
      componentType: input.orderType === 'ERRAND' ? 'ore_errand_service_fee' : 'ore_service_fee',
      payerType: 'CUSTOMER', payerId: input.customerId,
      payeeType: 'ORE', payeeId: 'ORE',
      supplierType: 'ORE', supplierId: 'ORE',
      grossAmountPesewas: oreServiceFee,
      taxableAmountPesewas: oreServiceFee,
      taxCategory: 'TAXABLE',
      revenueOwner: 'ORE',
      contractType: 'ORE_CUSTOMER_SERVICE_FEE',
      transactionType: 'GENERAL_SERVICES',
      residentStatus: 'RESIDENT',
    });
  }

  if (orePlatformFee > 0) {
    push({
      componentType: 'ore_platform_fee',
      payerType: 'CUSTOMER', payerId: input.customerId,
      payeeType: 'ORE', payeeId: 'ORE',
      supplierType: 'ORE', supplierId: 'ORE',
      grossAmountPesewas: orePlatformFee,
      taxableAmountPesewas: orePlatformFee,
      taxCategory: 'TAXABLE',
      revenueOwner: 'ORE',
      contractType: 'ORE_PLATFORM_FEE',
      transactionType: 'GENERAL_SERVICES',
      residentStatus: 'RESIDENT',
    });
  }

  if (deliveryPartnerEarning > 0) {
    push({
      componentType: 'delivery_partner_earning',
      payerType: 'CUSTOMER', payerId: input.customerId,
      payeeType: dpType, payeeId: dpId,
      supplierType: dpType, supplierId: dpId,
      grossAmountPesewas: deliveryPartnerEarning,
      taxableAmountPesewas: 0,
      taxCategory: 'NOT_ORE_SUPPLY',
      revenueOwner: dpType === 'FLEET_DELIVERY_PARTNER' ? 'FLEET_DELIVERY_PARTNER' : 'DELIVERY_PARTNER',
      contractType: dpCustomerSupplyContract,
      transactionType: 'GENERAL_SERVICES',
      residentStatus: dpResidentStatus,
      reviewReason: dpId ? null : 'delivery_partner_profile_missing',
      classificationStatus: dpId ? 'RESOLVED' : 'REVIEW_REQUIRED',
    });
  }

  if (deliveryMargin > 0) {
    push({
      componentType: input.serviceLevel === 'PRIORITY' ? 'ore_priority_delivery_margin' : 'ore_delivery_margin',
      payerType: 'CUSTOMER', payerId: input.customerId,
      payeeType: 'ORE', payeeId: 'ORE',
      supplierType: 'ORE', supplierId: 'ORE',
      grossAmountPesewas: deliveryMargin,
      taxableAmountPesewas: deliveryMargin,
      taxCategory: input.oreDeliveryMarginContracted ? 'TAXABLE' : 'OUT_OF_SCOPE',
      revenueOwner: input.oreDeliveryMarginContracted ? 'ORE' : null,
      contractType: input.oreDeliveryMarginContracted ? 'ORE_CONTRACTED_DELIVERY_MARGIN' : null,
      transactionType: 'GENERAL_SERVICES',
      residentStatus: 'RESIDENT',
      classificationStatus: input.oreDeliveryMarginContracted ? 'RESOLVED' : 'REVIEW_REQUIRED',
      reviewReason: input.oreDeliveryMarginContracted ? null : 'delivery_margin_without_contractual_ore_entitlement',
    });
  }

  if (deliveryShortfall > 0) {
    push({
      componentType: 'ore_delivery_incentive_shortfall',
      payerType: 'ORE', payerId: 'ORE',
      payeeType: dpType, payeeId: dpId,
      supplierType: dpType, supplierId: dpId,
      grossAmountPesewas: deliveryShortfall,
      taxableAmountPesewas: deliveryShortfall,
      taxCategory: 'NOT_ORE_SUPPLY',
      revenueOwner: dpType === 'FLEET_DELIVERY_PARTNER' ? 'FLEET_DELIVERY_PARTNER' : 'DELIVERY_PARTNER',
      contractType: 'ORE_APPROVED_DELIVERY_INCENTIVE',
      transactionType: 'GENERAL_SERVICES',
      residentStatus: dpResidentStatus,
      reviewReason: orePaidDeliveryPartnerReviewReason,
      classificationStatus: orePaidDeliveryPartnerReviewReason ? 'REVIEW_REQUIRED' : 'RESOLVED',
    });
  }

  if (riderTip > 0) {
    push({
      componentType: 'rider_tip_pass_through',
      payerType: 'CUSTOMER', payerId: input.customerId,
      payeeType: dpType, payeeId: dpId,
      supplierType: dpType, supplierId: dpId,
      grossAmountPesewas: riderTip,
      taxableAmountPesewas: 0,
      taxCategory: 'NOT_ORE_SUPPLY',
      revenueOwner: dpType === 'FLEET_DELIVERY_PARTNER' ? 'FLEET_DELIVERY_PARTNER' : 'DELIVERY_PARTNER',
      contractType: 'CUSTOMER_TIP_PASS_THROUGH',
      transactionType: 'GENERAL_SERVICES',
      residentStatus: dpResidentStatus,
      reviewReason: dpId ? null : 'delivery_partner_profile_missing',
      classificationStatus: dpId ? 'RESOLVED' : 'REVIEW_REQUIRED',
    });
  }

  if (peak > 0) {
    push({
      componentType: 'ore_peak_pay_incentive',
      payerType: 'ORE', payerId: 'ORE',
      payeeType: dpType, payeeId: dpId,
      supplierType: dpType, supplierId: dpId,
      grossAmountPesewas: peak,
      taxableAmountPesewas: peak,
      taxCategory: 'NOT_ORE_SUPPLY',
      revenueOwner: dpType === 'FLEET_DELIVERY_PARTNER' ? 'FLEET_DELIVERY_PARTNER' : 'DELIVERY_PARTNER',
      contractType: 'ORE_APPROVED_PEAK_INCENTIVE',
      transactionType: 'GENERAL_SERVICES',
      residentStatus: dpResidentStatus,
      reviewReason: orePaidDeliveryPartnerReviewReason,
      classificationStatus: orePaidDeliveryPartnerReviewReason ? 'REVIEW_REQUIRED' : 'RESOLVED',
    });
  }

  if (errandBudget > 0) {
    push({
      componentType: 'errand_budget_escrow',
      payerType: 'CUSTOMER', payerId: input.customerId,
      payeeType: 'OTHER_SUPPLIER', payeeId: null,
      supplierType: 'OTHER_SUPPLIER', supplierId: null,
      grossAmountPesewas: errandBudget,
      taxableAmountPesewas: 0,
      taxCategory: 'OUT_OF_SCOPE',
      revenueOwner: 'OTHER',
      contractType: 'CUSTOMER_ERRAND_SHOP_BUDGET_ESCROW',
      transactionType: 'GOODS',
      residentStatus: 'UNKNOWN',
    });
  }

  return {
    transactionId,
    orderId: input.orderId,
    pricingMode,
    components,
    reviewRequired: reviewReasons.length > 0,
    reviewReasons,
    vendorProductValuePesewas: vendorProductValue,
    oreCommissionGrossPesewas: oreCommission,
    oreServiceFeeGrossPesewas: oreServiceFee,
    orePlatformFeeGrossPesewas: orePlatformFee,
    deliveryPartnerEarningPesewas: deliveryPartnerEarning,
    deliveryMarginGrossPesewas: deliveryMargin,
    deliveryShortfallIncentivePesewas: deliveryShortfall,
    riderTipPesewas: riderTip,
    orePeakIncentivePesewas: peak,
    errandSpentReimbursementPesewas: errandSpent,
    errandUnspentCreditPesewas: errandUnspent,
  };
}

export function taxPeriodFor(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function activeRules(rules: TaxRuleConfig[], asOf: string | Date): TaxRuleConfig[] {
  const t = asOf instanceof Date ? asOf.getTime() : new Date(asOf).getTime();
  return rules
    .filter((rule) => rule.active !== false)
    .filter((rule) => new Date(rule.effectiveFrom).getTime() <= t)
    .filter((rule) => !rule.effectiveTo || new Date(rule.effectiveTo).getTime() >= t)
    .sort((a, b) => (b.version ?? 0) - (a.version ?? 0));
}

function matches(rule: TaxRuleConfig, component: TaxComponentInput): boolean {
  const supplierType = rule.supplierType ?? 'ANY';
  const payerType = rule.payerType ?? 'ANY';
  const payeeType = rule.payeeType ?? 'ANY';
  const residentStatus = rule.residentStatus ?? 'ANY';
  const transactionType = rule.transactionType ?? 'ANY';
  const contractType = rule.contractType ?? 'ANY';
  return (supplierType === 'ANY' || supplierType === component.supplierType)
    && (payerType === 'ANY' || payerType === component.payerType)
    && (payeeType === 'ANY' || payeeType === component.payeeType)
    && (residentStatus === 'ANY' || residentStatus === component.residentStatus)
    && (transactionType === 'ANY' || transactionType === component.transactionType)
    && (contractType === 'ANY' || contractType === component.contractType);
}

function amountForBase(component: TaxComponentInput, base: TaxBase): number {
  if (base === 'GROSS_AMOUNT') return component.grossAmountPesewas;
  if (base === 'TAXABLE_AMOUNT') return component.taxableAmountPesewas ?? component.grossAmountPesewas;
  return component.taxableAmountPesewas ?? component.grossAmountPesewas;
}

function normalizeDeliveryPartnerType(value: TaxPartyType | null | undefined): TaxPartyType {
  if (value === 'FLEET_DELIVERY_PARTNER') return 'FLEET_DELIVERY_PARTNER';
  if (value === 'DELIVERY_PARTNER') return 'DELIVERY_PARTNER';
  if (value === 'INDEPENDENT_DELIVERY_PARTNER') return 'INDEPENDENT_DELIVERY_PARTNER';
  return 'INDEPENDENT_DELIVERY_PARTNER';
}
