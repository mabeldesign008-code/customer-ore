import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import {
  DEFAULT_GHANA_VAT_LEVY_RULES,
  PaymentProcessor,
  RevenueOwner,
  SettlementMethod,
  ResidentStatus,
  TaxCategory,
  TaxComponentInput,
  TaxPartyType,
  TaxPricingMode,
  TaxRuleConfig,
  TaxType,
  TransactionType,
  WhtCumulativeContext,
  WhtStatus,
  buildOrderTaxScenario,
  evaluateVat,
  evaluateWht,
  taxPeriodFor,
  validateTaxComponent,
} from '@ore/contracts';
import { JwtPayload } from '@ore/core';
import { TaxRule, TaxTransaction, WhtDecision, TaxLedger, TaxReviewCase } from './entities';

export interface LedgerTaxOrder {
  id: string;
  customerId: string;
  vendorId: string;
  vendorType?: string | null;
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
  errandJson?: { budgetPesewas?: number; spentPesewas?: number } | null;
}

export interface DeliveryPartnerTaxProfile {
  deliveryPartnerId?: string | null;
  deliveryPartnerType?: TaxPartyType | null;
  fleetPartnerId?: string | null;
  contractType?: string | null;
  residentStatus?: ResidentStatus | null;
}

export interface OrderTaxPostingPlan {
  transactionId: string;
  oreGrossRevenuePesewas: number;
  oreNetRevenuePesewas: number;
  taxLiabilityPesewas: number;
  deliveryShortfallIncentivePesewas: number;
  orePeakIncentivePesewas: number;
  deliveryPartnerWithholdingPesewas: number;
  deliveryPartnerEarningPesewas: number;
  riderTipPesewas: number;
  errandSpentReimbursementPesewas: number;
  errandUnspentCreditPesewas: number;
  taxEntries: { account: string; creditPesewas: number; taxType: TaxType }[];
}

/**
 * Posting is blocked pending a human tax decision — a business hold, not a failure.
 *
 * The distinction matters at the bus. `onDelivered` throwing meant a delivered order with an
 * unclassified rider was redelivered ten times and then dead-lettered, every single time, by
 * design. The DLQ is where an operator looks to find genuinely broken messages, and a routine
 * compliance hold on every new rider's first deliveries buries them: on a live run, seventeen of
 * nineteen dead letters were this, not a defect.
 *
 * Retrying cannot help — nothing changes until a person resolves the review case — so the event
 * is acked once the case is durably recorded, and `replayResolvedTaxReviews` posts the money
 * when the decision is made. Still a 409 to HTTP callers, so the API contract is unchanged.
 */
export class TaxClassificationReviewRequired extends ConflictException {
  constructor(public readonly reasons: string) {
    super(`Tax classification requires review before posting: ${reasons}`);
  }
}

/** True when `err` is a deferral rather than a fault: ack it, do not retry it. */
export function isPostingDeferred(err: unknown): err is TaxClassificationReviewRequired {
  return err instanceof TaxClassificationReviewRequired;
}

@Injectable()
export class TaxEngineService {
  constructor(
    @InjectRepository(TaxRule) private readonly rules: Repository<TaxRule>,
    @InjectRepository(TaxTransaction) private readonly transactions: Repository<TaxTransaction>,
    @InjectRepository(WhtDecision) private readonly whtDecisions: Repository<WhtDecision>,
    @InjectRepository(TaxLedger) private readonly taxLedger: Repository<TaxLedger>,
    @InjectRepository(TaxReviewCase) private readonly reviewCases: Repository<TaxReviewCase>,
  ) {}

  async ensureDefaultRulesSeeded(): Promise<void> {
    for (const rule of DEFAULT_GHANA_VAT_LEVY_RULES) {
      const existing = await this.rules.findOne({ where: { ruleId: rule.ruleId } });
      if (existing) continue;
      await this.rules.save(this.rules.create({
        ruleId: rule.ruleId,
        taxType: rule.taxType,
        supplierType: rule.supplierType ?? 'ORE',
        payerType: rule.payerType ?? 'ANY',
        payeeType: rule.payeeType ?? 'ANY',
        residentStatus: rule.residentStatus ?? 'ANY',
        transactionType: rule.transactionType ?? 'ANY',
        contractType: rule.contractType ?? null,
        thresholdType: rule.thresholdType ?? null,
        thresholdAmountPesewas: rule.thresholdAmountPesewas ?? null,
        rateBps: rule.rateBps,
        taxBase: rule.taxBase ?? 'TAXABLE_AMOUNT',
        effectiveFrom: new Date(rule.effectiveFrom),
        effectiveTo: rule.effectiveTo ? new Date(rule.effectiveTo) : null,
        exemption: !!rule.exemption,
        certificateRequired: !!rule.certificateRequired,
        active: rule.active !== false,
        version: rule.version ?? 1,
      }));
    }
  }

  async orderFinalPostingPlan(params: {
    order: LedgerTaxOrder;
    deliveryPartner?: DeliveryPartnerTaxProfile | null;
    vendorResidentStatus?: ResidentStatus | null;
    oreDeliveryMarginContracted: boolean;
    pricingMode: TaxPricingMode;
    paymentProcessor: PaymentProcessor;
    settlementMethod: SettlementMethod;
    transactionDate?: Date;
  }): Promise<OrderTaxPostingPlan> {
    const order = params.order;
    const scenario = buildOrderTaxScenario({
      orderId: order.id,
      customerId: order.customerId,
      vendorId: order.vendorId,
      vendorType: order.vendorType,
      vendorResidentStatus: params.vendorResidentStatus ?? 'UNKNOWN',
      orderType: order.orderType,
      paymentMethod: order.paymentMethod,
      subtotalPesewas: order.subtotalPesewas,
      promotionDiscountPesewas: order.promotionDiscountPesewas ?? 0,
      vendorSharePesewas: order.vendorSharePesewas,
      deliveryFeePesewas: order.deliveryFeePesewas,
      serviceFeePesewas: order.serviceFeePesewas,
      platformFeePesewas: order.platformFeePesewas ?? 0,
      riderId: order.riderId ?? null,
      riderFeePesewas: order.riderFeePesewas ?? 0,
      tipPesewas: order.tipPesewas ?? 0,
      peakPayPesewas: order.peakPayPesewas ?? 0,
      serviceLevel: order.serviceLevel,
      errandBudgetPesewas: order.errandJson?.budgetPesewas ?? 0,
      errandSpentPesewas: order.errandJson?.spentPesewas ?? 0,
      oreDeliveryMarginContracted: params.oreDeliveryMarginContracted,
      deliveryPartnerType: params.deliveryPartner?.deliveryPartnerType ?? (order.riderId ? 'INDEPENDENT_DELIVERY_PARTNER' : null),
      deliveryPartnerId: params.deliveryPartner?.deliveryPartnerId ?? order.riderId ?? null,
      fleetPartnerId: params.deliveryPartner?.fleetPartnerId ?? null,
      deliveryPartnerContractType: params.deliveryPartner?.contractType ?? null,
      deliveryPartnerResidentStatus: params.deliveryPartner?.residentStatus ?? 'UNKNOWN',
      pricingMode: params.pricingMode,
      paymentProcessor: params.paymentProcessor,
      settlementMethod: params.settlementMethod,
      transactionDate: params.transactionDate ?? new Date(),
    });

    if (scenario.reviewRequired) {
      for (const reason of scenario.reviewReasons) {
        await this.openReviewCase({ transactionId: scenario.transactionId, orderId: order.id, componentType: reason.split(':')[0] ?? null, reasonCode: 'CLASSIFICATION_REVIEW_REQUIRED', reason, payload: { orderId: order.id } });
      }
      throw new TaxClassificationReviewRequired(scenario.reviewReasons.join(', '));
    }

    const existing = await this.transactions.findOne({ where: { transactionId: scenario.transactionId } });
    const rules = await this.ruleConfigs();
    const taxEntries = new Map<TaxType, number>();
    let oreNetRevenuePesewas = 0;
    let taxLiabilityPesewas = 0;
    let deliveryPartnerWithholdingPesewas = 0;
    const transactionDate = params.transactionDate ?? new Date();

    for (const component of scenario.components) {
      const vat = evaluateVat({ component, rules, pricingMode: params.pricingMode, asOf: transactionDate });
      const cumulative = await this.cumulativeContextFor(component, rules, transactionDate);
      const wht = evaluateWht({ component, rules, cumulative, asOf: transactionDate });
      if (vat.vatStatus === 'REVIEW_REQUIRED') {
        await this.openReviewCase({ transactionId: component.transactionId, orderId: order.id, componentType: component.componentType, reasonCode: 'VAT_REVIEW_REQUIRED', reason: vat.reviewReason ?? 'VAT rule missing or ambiguous', payload: { component } });
        throw new ConflictException(`VAT classification requires review for ${component.componentType}`);
      }
      if (wht.whtStatus === 'REVIEW_REQUIRED') {
        await this.openReviewCase({ transactionId: component.transactionId, orderId: order.id, componentType: component.componentType, reasonCode: 'WHT_REVIEW_REQUIRED', reason: wht.reviewReason ?? 'WHT rule missing or ambiguous', payload: { component } });
        throw new ConflictException(`WHT classification requires review for ${component.componentType}`);
      }

      if (!existing) {
        await this.transactions.save(this.transactions.create({
          transactionId: component.transactionId,
          orderId: component.orderId ?? null,
          componentType: component.componentType,
          payerType: component.payerType ?? null,
          payerId: component.payerId ?? null,
          payeeType: component.payeeType ?? null,
          payeeId: component.payeeId ?? null,
          supplierType: component.supplierType ?? null,
          supplierId: component.supplierId ?? null,
          customerId: component.customerId ?? null,
          grossAmountPesewas: component.grossAmountPesewas,
          taxableAmountPesewas: component.taxableAmountPesewas ?? 0,
          taxCategory: component.taxCategory ?? null,
          revenueOwner: component.revenueOwner ?? null,
          paymentProcessor: component.paymentProcessor ?? null,
          settlementMethod: component.settlementMethod ?? null,
          contractType: component.contractType ?? null,
          transactionType: component.transactionType ?? null,
          residentStatus: component.residentStatus ?? null,
          classificationStatus: component.classificationStatus ?? 'RESOLVED',
          whtStatus: wht.whtStatus,
          vatStatus: vat.vatStatus,
          reviewReason: component.reviewReason ?? vat.reviewReason ?? wht.reviewReason ?? null,
          metadataJson: component.metadata ?? null,
        }));
        await this.recordWhtDecision(component, wht, transactionDate);
      }

      if (wht.whtStatus === 'APPLIES' && wht.whtAmountPesewas > 0) {
        const taxType = wht.taxType ?? 'WHT';
        taxEntries.set(taxType, (taxEntries.get(taxType) ?? 0) + wht.whtAmountPesewas);
        taxLiabilityPesewas += wht.whtAmountPesewas;
        if (isDeliveryPartnerPayee(component.payeeType)) {
          deliveryPartnerWithholdingPesewas += wht.whtAmountPesewas;
        }
        if (!existing) {
          await this.taxLedger.save(this.taxLedger.create({
            orderId: order.id,
            invoiceId: null,
            partyId: component.supplierId ?? component.payeeId ?? null,
            taxType,
            taxCategory: component.taxCategory ?? 'OUT_OF_SCOPE',
            taxableValuePesewas: wht.taxBasePesewas,
            taxRateBps: wht.rateBps,
            taxAmountPesewas: wht.whtAmountPesewas,
            taxPeriod: taxPeriodFor(transactionDate),
            transactionDate,
            sourceTransaction: component.transactionId,
            sourceComponent: component.componentType,
            ruleId: wht.ruleId ?? null,
            reversalReference: null,
            paymentStatus: 'CONFIRMED',
            filingStatus: 'OPEN',
            certificateNumber: null,
            metaJson: { contractType: component.contractType, whtStatus: wht.whtStatus },
          }));
        }
      }

      if (component.revenueOwner === 'ORE' && component.taxCategory === 'TAXABLE') {
        oreNetRevenuePesewas += vat.netRevenuePesewas;
        taxLiabilityPesewas += vat.taxAmountPesewas;
        for (const line of vat.lines) {
          taxEntries.set(line.taxType, (taxEntries.get(line.taxType) ?? 0) + line.taxAmountPesewas);
          if (!existing) {
            await this.taxLedger.save(this.taxLedger.create({
              orderId: order.id,
              invoiceId: null,
              partyId: component.payerId ?? component.customerId ?? null,
              taxType: line.taxType,
              taxCategory: component.taxCategory,
              taxableValuePesewas: line.taxableValuePesewas,
              taxRateBps: line.rateBps,
              taxAmountPesewas: line.taxAmountPesewas,
              taxPeriod: taxPeriodFor(transactionDate),
              transactionDate,
              sourceTransaction: component.transactionId,
              sourceComponent: component.componentType,
              ruleId: line.ruleId,
              reversalReference: null,
              paymentStatus: 'CONFIRMED',
              filingStatus: 'OPEN',
              certificateNumber: null,
              metaJson: { pricingMode: params.pricingMode },
            }));
          }
        }
      }
    }

    return {
      transactionId: scenario.transactionId,
      oreGrossRevenuePesewas:
        scenario.oreCommissionGrossPesewas + scenario.oreServiceFeeGrossPesewas + scenario.orePlatformFeeGrossPesewas + scenario.deliveryMarginGrossPesewas,
      oreNetRevenuePesewas,
      taxLiabilityPesewas,
      deliveryShortfallIncentivePesewas: scenario.deliveryShortfallIncentivePesewas,
      orePeakIncentivePesewas: scenario.orePeakIncentivePesewas,
      deliveryPartnerWithholdingPesewas,
      deliveryPartnerEarningPesewas: scenario.deliveryPartnerEarningPesewas,
      riderTipPesewas: scenario.riderTipPesewas,
      errandSpentReimbursementPesewas: scenario.errandSpentReimbursementPesewas,
      errandUnspentCreditPesewas: scenario.errandUnspentCreditPesewas,
      taxEntries: Array.from(taxEntries.entries()).map(([taxType, creditPesewas]) => ({ taxType, creditPesewas, account: taxAccount(taxType) })),
    };
  }

  async recordRefundReview(params: { orderId: string; transactionId: string; amountPesewas: number; reason: string; component?: string | null }): Promise<void> {
    await this.openReviewCase({
      transactionId: params.transactionId,
      orderId: params.orderId,
      componentType: params.component ?? null,
      reasonCode: 'REFUND_TAX_REVIEW_REQUIRED',
      reason: params.reason,
      payload: { amountPesewas: params.amountPesewas, component: params.component ?? null },
    });
  }

  async recordClassificationReview(params: { transactionId: string; orderId?: string | null; componentType?: string | null; reason: string; payload?: Record<string, unknown> }): Promise<void> {
    await this.openReviewCase({
      transactionId: params.transactionId,
      orderId: params.orderId ?? null,
      componentType: params.componentType ?? null,
      reasonCode: 'CLASSIFICATION_REVIEW_REQUIRED',
      reason: params.reason,
      payload: params.payload,
    });
  }

  async classifyGenericComponent(component: TaxComponentInput): Promise<{ component: TaxTransaction; wht: WhtDecision | null; vatLedger: TaxLedger[] }> {
    const validation = validateTaxComponent(component);
    if (!validation.ok) {
      await this.openReviewCase({ transactionId: component.transactionId, orderId: component.orderId ?? null, componentType: component.componentType, reasonCode: 'CLASSIFICATION_REVIEW_REQUIRED', reason: validation.reason, payload: { component } });
      throw new BadRequestException(validation.reason);
    }
    const rules = await this.ruleConfigs();
    const when = component.transactionDate ? new Date(component.transactionDate) : new Date();
    const vat = evaluateVat({ component, rules, pricingMode: component.pricingMode ?? 'INCLUSIVE', asOf: when });
    const wht = evaluateWht({ component, rules, cumulative: await this.cumulativeContextFor(component, rules, when), asOf: when });
    if (vat.vatStatus === 'REVIEW_REQUIRED' || wht.whtStatus === 'REVIEW_REQUIRED') {
      await this.openReviewCase({ transactionId: component.transactionId, orderId: component.orderId ?? null, componentType: component.componentType, reasonCode: 'TAX_REVIEW_REQUIRED', reason: vat.reviewReason ?? wht.reviewReason ?? 'tax review required', payload: { component } });
      throw new ConflictException('Tax review required before posting');
    }
    const row = await this.transactions.save(this.transactions.create({
      transactionId: component.transactionId,
      orderId: component.orderId ?? null,
      componentType: component.componentType,
      payerType: component.payerType ?? null,
      payerId: component.payerId ?? null,
      payeeType: component.payeeType ?? null,
      payeeId: component.payeeId ?? null,
      supplierType: component.supplierType ?? null,
      supplierId: component.supplierId ?? null,
      customerId: component.customerId ?? null,
      grossAmountPesewas: component.grossAmountPesewas,
      taxableAmountPesewas: component.taxableAmountPesewas ?? 0,
      taxCategory: component.taxCategory ?? null,
      revenueOwner: component.revenueOwner ?? null,
      paymentProcessor: component.paymentProcessor ?? null,
      settlementMethod: component.settlementMethod ?? null,
      contractType: component.contractType ?? null,
      transactionType: component.transactionType ?? null,
      residentStatus: component.residentStatus ?? null,
      classificationStatus: 'RESOLVED',
      whtStatus: wht.whtStatus,
      vatStatus: vat.vatStatus,
      reviewReason: null,
      metadataJson: component.metadata ?? null,
    }));
    const whtRow = await this.recordWhtDecision(component, wht, when);
    const vatRows: TaxLedger[] = [];
    if (wht.whtStatus === 'APPLIES' && wht.whtAmountPesewas > 0) {
      vatRows.push(await this.taxLedger.save(this.taxLedger.create({
        orderId: component.orderId ?? null,
        invoiceId: null,
        partyId: component.supplierId ?? component.payeeId ?? null,
        taxType: wht.taxType ?? 'WHT',
        taxCategory: component.taxCategory as TaxCategory,
        taxableValuePesewas: wht.taxBasePesewas,
        taxRateBps: wht.rateBps,
        taxAmountPesewas: wht.whtAmountPesewas,
        taxPeriod: taxPeriodFor(when),
        transactionDate: when,
        sourceTransaction: component.transactionId,
        sourceComponent: component.componentType,
        ruleId: wht.ruleId ?? null,
        reversalReference: null,
        paymentStatus: 'CONFIRMED',
        filingStatus: 'OPEN',
        certificateNumber: null,
        metaJson: { contractType: component.contractType, whtStatus: wht.whtStatus },
      })));
    }
    for (const line of vat.lines) {
      vatRows.push(await this.taxLedger.save(this.taxLedger.create({
        orderId: component.orderId ?? null,
        invoiceId: null,
        partyId: component.payerId ?? component.customerId ?? null,
        taxType: line.taxType,
        taxCategory: component.taxCategory as TaxCategory,
        taxableValuePesewas: line.taxableValuePesewas,
        taxRateBps: line.rateBps,
        taxAmountPesewas: line.taxAmountPesewas,
        taxPeriod: taxPeriodFor(when),
        transactionDate: when,
        sourceTransaction: component.transactionId,
        sourceComponent: component.componentType,
        ruleId: line.ruleId,
        reversalReference: null,
        paymentStatus: 'CONFIRMED',
        filingStatus: 'OPEN',
        certificateNumber: null,
        metaJson: { pricingMode: component.pricingMode ?? 'INCLUSIVE' },
      })));
    }
    return { component: row, wht: whtRow, vatLedger: vatRows };
  }

  async listRules(taxType?: string): Promise<TaxRule[]> {
    return this.rules.find({ where: taxType ? { taxType: taxType as TaxType } : {}, order: { effectiveFrom: 'DESC', createdAt: 'DESC' } });
  }

  async upsertRule(actor: JwtPayload, dto: TaxRuleConfig): Promise<TaxRule> {
    if (!dto.ruleId?.trim()) throw new BadRequestException('ruleId is required');
    if (!Number.isInteger(dto.rateBps) || dto.rateBps < 0) throw new BadRequestException('rateBps must be a non-negative integer');
    const existing = await this.rules.findOne({ where: { ruleId: dto.ruleId } });
    const row = existing ?? this.rules.create({ ruleId: dto.ruleId });
    row.taxType = dto.taxType;
    row.supplierType = dto.supplierType ?? null;
    row.payerType = dto.payerType ?? null;
    row.payeeType = dto.payeeType ?? null;
    row.residentStatus = dto.residentStatus ?? null;
    row.transactionType = dto.transactionType ?? null;
    row.contractType = dto.contractType ?? null;
    row.thresholdType = dto.thresholdType ?? null;
    row.thresholdAmountPesewas = dto.thresholdAmountPesewas ?? null;
    row.rateBps = dto.rateBps;
    row.taxBase = dto.taxBase ?? 'TAXABLE_AMOUNT';
    row.effectiveFrom = new Date(dto.effectiveFrom);
    row.effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;
    row.exemption = !!dto.exemption;
    row.certificateRequired = !!dto.certificateRequired;
    row.active = dto.active !== false;
    row.version = dto.version ?? row.version ?? 1;
    row.updatedBy = actor.sub;
    return this.rules.save(row);
  }

  async listTaxLedger(query: { orderId?: string; taxType?: string; taxPeriod?: string }): Promise<TaxLedger[]> {
    const where: Record<string, unknown> = {};
    if (query.orderId) where.orderId = query.orderId;
    if (query.taxType) where.taxType = query.taxType;
    if (query.taxPeriod) where.taxPeriod = query.taxPeriod;
    return this.taxLedger.find({ where, order: { transactionDate: 'DESC', createdAt: 'DESC' }, take: 500 });
  }

  async listWhtDecisions(query: { supplierId?: string; status?: string; taxYear?: number }): Promise<WhtDecision[]> {
    const where: Record<string, unknown> = {};
    if (query.supplierId) where.supplierId = query.supplierId;
    if (query.status) where.whtStatus = query.status;
    if (query.taxYear) where.taxYear = query.taxYear;
    return this.whtDecisions.find({ where, order: { createdAt: 'DESC' }, take: 500 });
  }

  async listReviewCases(status?: string): Promise<TaxReviewCase[]> {
    return this.reviewCases.find({ where: status ? { status: status as TaxReviewCase['status'] } : {}, order: { createdAt: 'DESC' }, take: 500 });
  }

  /**
   * Resolved review cases that blocked an order posting, oldest first.
   *
   * Resolving the case updates the row and nothing else — the posting it blocked stays
   * unposted, so the rider and vendor are still unpaid after an operator has done the one
   * thing they were asked to do. The ledger sweeper uses this to re-drive them.
   */
  async resolvedOrderReviews(limit = 200): Promise<TaxReviewCase[]> {
    return this.reviewCases.find({
      where: { status: 'RESOLVED', orderId: Not(IsNull()) },
      order: { resolvedAt: 'ASC' },
      take: limit,
    });
  }

  async resolveReviewCase(actor: JwtPayload, id: string, note: string): Promise<TaxReviewCase> {
    const row = await this.reviewCases.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Tax review case not found');
    row.status = 'RESOLVED';
    row.resolvedBy = actor.sub;
    row.resolvedAt = new Date();
    row.resolutionNote = note.trim();
    return this.reviewCases.save(row);
  }

  private async ruleConfigs(): Promise<TaxRuleConfig[]> {
    let rows = await this.rules.find({ where: { active: true } });
    if (rows.length === 0) {
      await this.ensureDefaultRulesSeeded();
      rows = await this.rules.find({ where: { active: true } });
    }
    return rows.map((row) => ({
      ruleId: row.ruleId,
      taxType: row.taxType,
      supplierType: row.supplierType ?? undefined,
      payerType: row.payerType ?? undefined,
      payeeType: row.payeeType ?? undefined,
      residentStatus: row.residentStatus ?? undefined,
      transactionType: row.transactionType ?? undefined,
      contractType: row.contractType ?? undefined,
      thresholdType: row.thresholdType ?? undefined,
      thresholdAmountPesewas: row.thresholdAmountPesewas ?? undefined,
      rateBps: row.rateBps,
      taxBase: row.taxBase,
      effectiveFrom: row.effectiveFrom,
      effectiveTo: row.effectiveTo,
      exemption: row.exemption,
      certificateRequired: row.certificateRequired,
      active: row.active,
      version: row.version,
    }));
  }

  private async cumulativeContextFor(component: TaxComponentInput, rules: TaxRuleConfig[], when: Date): Promise<WhtCumulativeContext | null> {
    const rule = rules.find((candidate) => {
      if (candidate.taxType !== 'WHT' && candidate.taxType !== 'RENT_WHT') return false;
      if (candidate.thresholdType !== 'ANNUAL_CUMULATIVE_THRESHOLD' && candidate.thresholdType !== 'SUPPLIER_CATEGORY_THRESHOLD') return false;
      return (candidate.supplierType === 'ANY' || candidate.supplierType === undefined || candidate.supplierType === component.supplierType)
        && (candidate.payerType === 'ANY' || candidate.payerType === undefined || candidate.payerType === component.payerType)
        && (candidate.payeeType === 'ANY' || candidate.payeeType === undefined || candidate.payeeType === component.payeeType)
        && (candidate.transactionType === 'ANY' || candidate.transactionType === undefined || candidate.transactionType === component.transactionType)
        && (candidate.contractType === 'ANY' || candidate.contractType === undefined || candidate.contractType === component.contractType)
        && (candidate.residentStatus === 'ANY' || candidate.residentStatus === undefined || candidate.residentStatus === component.residentStatus);
    });
    if (!rule) return null;
    if (!component.supplierId || !component.supplierType || !component.transactionType) return null;
    const taxYear = when.getUTCFullYear();
    const priorRows = await this.whtDecisions.find({
      where: {
        supplierId: component.supplierId,
        supplierType: component.supplierType,
        transactionType: component.transactionType,
        taxYear,
      },
    });
    const prior = priorRows.reduce((sum, row) => sum + (row.currentTransactionAmountPesewas ?? 0), 0);
    const current = component.taxableAmountPesewas ?? component.grossAmountPesewas;
    const post = prior + current;
    const threshold = rule.thresholdAmountPesewas ?? 0;
    return {
      supplierId: component.supplierId,
      supplierType: component.supplierType,
      transactionType: component.transactionType,
      taxYear,
      currentTransactionAmountPesewas: current,
      priorCumulativeAmountPesewas: prior,
      postTransactionCumulativeAmountPesewas: post,
      thresholdReachedFlag: prior < threshold && post >= threshold,
      thresholdTriggerTransactionId: prior < threshold && post >= threshold ? component.transactionId : null,
    };
  }

  private async recordWhtDecision(component: TaxComponentInput, wht: ReturnType<typeof evaluateWht>, when: Date): Promise<WhtDecision> {
    return this.whtDecisions.save(this.whtDecisions.create({
      transactionId: component.transactionId,
      orderId: component.orderId ?? null,
      componentType: component.componentType,
      ruleId: wht.ruleId ?? null,
      whtStatus: wht.whtStatus,
      supplierId: component.supplierId ?? null,
      supplierType: component.supplierType ?? null,
      payerType: component.payerType ?? null,
      payeeType: component.payeeType ?? null,
      transactionType: component.transactionType ?? null,
      contractType: component.contractType ?? null,
      residentStatus: component.residentStatus ?? null,
      taxYear: when.getUTCFullYear(),
      currentTransactionAmountPesewas: wht.cumulative?.currentTransactionAmountPesewas ?? component.taxableAmountPesewas ?? component.grossAmountPesewas,
      priorCumulativeAmountPesewas: wht.cumulative?.priorCumulativeAmountPesewas ?? 0,
      postTransactionCumulativeAmountPesewas: wht.cumulative?.postTransactionCumulativeAmountPesewas ?? 0,
      thresholdType: wht.thresholdType ?? null,
      thresholdAmountPesewas: wht.thresholdAmountPesewas ?? null,
      thresholdReachedFlag: !!wht.thresholdReachedFlag,
      thresholdTriggerTransactionId: wht.cumulative?.thresholdTriggerTransactionId ?? null,
      rateBps: wht.rateBps,
      taxBasePesewas: wht.taxBasePesewas,
      whtAmountPesewas: wht.whtAmountPesewas,
      certificateRequired: !!wht.certificateRequired,
      certificateNumber: null,
      reviewReason: wht.reviewReason ?? null,
    }));
  }

  private async openReviewCase(params: { transactionId: string; orderId?: string | null; componentType?: string | null; reasonCode: string; reason: string; payload?: Record<string, unknown> }): Promise<void> {
    const existing = await this.reviewCases.findOne({ where: { transactionId: params.transactionId, componentType: params.componentType ?? IsNull(), reasonCode: params.reasonCode, status: 'OPEN' } });
    if (existing) return;
    await this.reviewCases.save(this.reviewCases.create({
      transactionId: params.transactionId,
      orderId: params.orderId ?? null,
      componentType: params.componentType ?? null,
      reasonCode: params.reasonCode,
      reason: params.reason,
      status: 'OPEN',
      assignedTo: null,
      resolvedBy: null,
      resolvedAt: null,
      resolutionNote: null,
      payloadJson: params.payload ?? null,
    }));
  }
}

function isDeliveryPartnerPayee(payeeType: TaxPartyType | null | undefined): boolean {
  return payeeType === 'DELIVERY_PARTNER'
    || payeeType === 'INDEPENDENT_DELIVERY_PARTNER'
    || payeeType === 'FLEET_DELIVERY_PARTNER'
    || payeeType === 'FLEET_PARTNER';
}

function taxAccount(taxType: TaxType): string {
  switch (taxType) {
    case 'VAT': return 'vat_payable';
    case 'NHIL': return 'nhil_payable';
    case 'GETFUND': return 'getfund_payable';
    case 'WHT': return 'wht_payable';
    case 'RENT_WHT': return 'rent_wht_payable';
    case 'WITHHOLDING_VAT': return 'withholding_vat_payable';
    default: return 'tax_payable';
  }
}

export type { RevenueOwner, TaxCategory, TransactionType, WhtStatus };
