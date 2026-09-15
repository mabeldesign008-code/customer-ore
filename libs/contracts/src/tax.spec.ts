import {
  DEFAULT_GHANA_VAT_LEVY_RULES,
  buildOrderTaxScenario,
  evaluateVat,
  evaluateWht,
  TaxComponentInput,
  TaxRuleConfig,
} from './tax';

describe('Ore tax engine contracts', () => {
  const oreServiceComponent: TaxComponentInput = {
    transactionId: 'tx-1',
    componentType: 'ore_service_fee',
    payerType: 'CUSTOMER',
    payerId: 'cust-1',
    payeeType: 'ORE',
    payeeId: 'ORE',
    supplierType: 'ORE',
    supplierId: 'ORE',
    customerId: 'cust-1',
    grossAmountPesewas: 12_000,
    taxableAmountPesewas: 12_000,
    taxCategory: 'TAXABLE',
    revenueOwner: 'ORE',
    paymentProcessor: 'PAYSTACK',
    settlementMethod: 'INTERNAL_LEDGER',
    contractType: 'ORE_CUSTOMER_SERVICE_FEE',
    transactionType: 'GENERAL_SERVICES',
    residentStatus: 'RESIDENT',
    transactionDate: '2026-09-01T00:00:00.000Z',
    pricingMode: 'INCLUSIVE',
  };

  it('extracts VAT/NHIL/GETFund from tax-inclusive Ore-owned prices without adding tax again', () => {
    const result = evaluateVat({ component: oreServiceComponent, rules: DEFAULT_GHANA_VAT_LEVY_RULES, pricingMode: 'INCLUSIVE' });
    expect(result.vatStatus).toBe('TAXABLE');
    expect(result.taxableValuePesewas).toBe(10_000);
    expect(result.taxAmountPesewas).toBe(2_000);
    expect(result.netRevenuePesewas).toBe(10_000);
    expect(result.lines.map((line) => [line.taxType, line.taxAmountPesewas])).toEqual([
      ['VAT', 1_500],
      ['NHIL', 250],
      ['GETFUND', 250],
    ]);
  });

  it('calculates tax-exclusive VAT/NHIL/GETFund by adding configured rates to the taxable value', () => {
    const result = evaluateVat({ component: { ...oreServiceComponent, grossAmountPesewas: 10_000, taxableAmountPesewas: 10_000, pricingMode: 'EXCLUSIVE' }, rules: DEFAULT_GHANA_VAT_LEVY_RULES, pricingMode: 'EXCLUSIVE' });
    expect(result.taxableValuePesewas).toBe(10_000);
    expect(result.taxAmountPesewas).toBe(2_000);
    expect(result.netRevenuePesewas).toBe(10_000);
  });

  it('does not VAT vendor product value or delivery-partner earnings even when Paystack handles the cash', () => {
    const vendorComponent: TaxComponentInput = {
      ...oreServiceComponent,
      transactionId: 'tx-2',
      componentType: 'vendor_gross_sale',
      payerType: 'CUSTOMER',
      payeeType: 'VENDOR',
      supplierType: 'VENDOR',
      supplierId: 'vendor-1',
      grossAmountPesewas: 10_000,
      taxableAmountPesewas: 0,
      taxCategory: 'NOT_ORE_SUPPLY',
      revenueOwner: 'VENDOR',
      contractType: 'CUSTOMER_VENDOR_MARKETPLACE_SUPPLY',
      transactionType: 'GOODS',
    };
    const result = evaluateVat({ component: vendorComponent, rules: DEFAULT_GHANA_VAT_LEVY_RULES });
    expect(result.vatStatus).toBe('NOT_ORE_SUPPLY');
    expect(result.taxAmountPesewas).toBe(0);
  });

  it('logs vendor settlement WHT as not applicable when Ore is not the legal payer', () => {
    const vendorSettlement = buildOrderTaxScenario({
      orderId: 'order-1',
      customerId: 'cust-1',
      vendorId: 'vendor-1',
      subtotalPesewas: 10_000,
      vendorSharePesewas: 8_500,
      deliveryFeePesewas: 1_000,
      serviceFeePesewas: 500,
      riderFeePesewas: 800,
      oreDeliveryMarginContracted: true,
      paymentMethod: 'PREPAID',
    }).components.find((component) => component.componentType === 'vendor_proceeds_settlement')!;
    const result = evaluateWht({ component: vendorSettlement, rules: [] });
    expect(result.whtStatus).toBe('NOT_APPLICABLE');
    expect(result.reviewReason).toBe('ore_is_not_legal_payer');
  });

  it('uses contract type as part of WHT rule matching', () => {
    const rule: TaxRuleConfig = {
      ruleId: 'WHT-DP-INCENTIVE',
      taxType: 'WHT',
      supplierType: 'INDEPENDENT_DELIVERY_PARTNER',
      payerType: 'ORE',
      payeeType: 'INDEPENDENT_DELIVERY_PARTNER',
      residentStatus: 'RESIDENT',
      transactionType: 'GENERAL_SERVICES',
      contractType: 'ORE_APPROVED_PEAK_INCENTIVE',
      thresholdType: 'NO_THRESHOLD_RULE',
      rateBps: 500,
      taxBase: 'TAXABLE_AMOUNT',
      effectiveFrom: '2026-01-01T00:00:00.000Z',
      active: true,
    };
    const peakIncentive: TaxComponentInput = {
      ...oreServiceComponent,
      transactionId: 'dp-incentive-1',
      componentType: 'ore_peak_pay_incentive',
      payerType: 'ORE',
      payerId: 'ORE',
      payeeType: 'INDEPENDENT_DELIVERY_PARTNER',
      payeeId: 'rider-1',
      supplierType: 'INDEPENDENT_DELIVERY_PARTNER',
      supplierId: 'rider-1',
      revenueOwner: 'DELIVERY_PARTNER',
      taxCategory: 'NOT_ORE_SUPPLY',
      grossAmountPesewas: 20_000,
      taxableAmountPesewas: 20_000,
      contractType: 'ORE_APPROVED_PEAK_INCENTIVE',
      transactionType: 'GENERAL_SERVICES',
    };
    const result = evaluateWht({ component: peakIncentive, rules: [rule] });
    expect(result.whtStatus).toBe('APPLIES');
    expect(result.taxType).toBe('WHT');
    expect(result.whtAmountPesewas).toBe(1_000);

    const differentContract = evaluateWht({
      component: { ...peakIncentive, contractType: 'ORE_APPROVED_DELIVERY_INCENTIVE' },
      rules: [rule],
    });
    expect(differentContract.whtStatus).toBe('NOT_APPLICABLE');
  });

  it('routes cumulative WHT rules to review if year-to-date data is unavailable', () => {
    const rule: TaxRuleConfig = {
      ruleId: 'WHT-SERVICES-YTD',
      taxType: 'WHT',
      supplierType: 'OTHER_SUPPLIER',
      payerType: 'ORE',
      residentStatus: 'RESIDENT',
      transactionType: 'GENERAL_SERVICES',
      thresholdType: 'ANNUAL_CUMULATIVE_THRESHOLD',
      thresholdAmountPesewas: 100_000,
      rateBps: 750,
      taxBase: 'TAXABLE_AMOUNT',
      effectiveFrom: '2026-01-01T00:00:00.000Z',
      active: true,
    };
    const supplierPayment: TaxComponentInput = {
      ...oreServiceComponent,
      transactionId: 'supplier-payment-1',
      componentType: 'supplier_invoice_payment',
      payerType: 'ORE',
      payerId: 'ORE',
      payeeType: 'OTHER_SUPPLIER',
      payeeId: 'supplier-1',
      supplierType: 'OTHER_SUPPLIER',
      supplierId: 'supplier-1',
      revenueOwner: 'OTHER',
      taxCategory: 'OUT_OF_SCOPE',
      grossAmountPesewas: 75_000,
      taxableAmountPesewas: 75_000,
      contractType: 'ORE_SUPPLIER_PROCUREMENT',
      transactionType: 'GENERAL_SERVICES',
    };
    const result = evaluateWht({ component: supplierPayment, rules: [rule] });
    expect(result.whtStatus).toBe('REVIEW_REQUIRED');
    expect(result.reviewReason).toBe('cumulative_threshold_data_missing');
  });

  it('separates delivery charge, partner earning, Ore margin, incentive shortfall and tips', () => {
    const scenario = buildOrderTaxScenario({
      orderId: 'order-2',
      customerId: 'cust-1',
      vendorId: 'vendor-1',
      subtotalPesewas: 10_000,
      vendorSharePesewas: 8_500,
      deliveryFeePesewas: 1_000,
      serviceFeePesewas: 500,
      riderFeePesewas: 1_200,
      tipPesewas: 300,
      peakPayPesewas: 200,
      riderId: 'rider-1',
      deliveryPartnerResidentStatus: 'RESIDENT',
      oreDeliveryMarginContracted: true,
      paymentMethod: 'PREPAID',
    });
    expect(scenario.deliveryMarginGrossPesewas).toBe(0);
    expect(scenario.deliveryShortfallIncentivePesewas).toBe(200);
    expect(scenario.components.find((component) => component.componentType === 'rider_tip_pass_through')?.revenueOwner).toBe('DELIVERY_PARTNER');
    const shortfall = scenario.components.find((component) => component.componentType === 'ore_delivery_incentive_shortfall');
    expect(shortfall?.taxCategory).toBe('NOT_ORE_SUPPLY');
    expect(shortfall?.supplierType).toBe('INDEPENDENT_DELIVERY_PARTNER');
    expect(shortfall?.payerType).toBe('ORE');
  });

  it('routes Ore-paid supplier incentives to review when delivery-partner residency is unknown', () => {
    const scenario = buildOrderTaxScenario({
      orderId: 'order-dp-residency-review',
      customerId: 'cust-1',
      vendorId: 'vendor-1',
      subtotalPesewas: 0,
      vendorSharePesewas: 0,
      deliveryFeePesewas: 1_000,
      serviceFeePesewas: 0,
      riderFeePesewas: 1_200,
      riderId: 'rider-1',
      oreDeliveryMarginContracted: true,
      paymentMethod: 'PREPAID',
    });
    expect(scenario.reviewRequired).toBe(true);
    expect(scenario.reviewReasons.join('|')).toContain('delivery_partner_resident_status_unknown');
  });

  it('requires review for delivery margin if no contract says Ore earned it', () => {
    const scenario = buildOrderTaxScenario({
      orderId: 'order-3',
      customerId: 'cust-1',
      vendorId: 'vendor-1',
      subtotalPesewas: 0,
      vendorSharePesewas: 0,
      deliveryFeePesewas: 1_000,
      serviceFeePesewas: 0,
      riderFeePesewas: 500,
      riderId: 'rider-1',
      oreDeliveryMarginContracted: false,
      paymentMethod: 'PREPAID',
    });
    expect(scenario.reviewRequired).toBe(true);
    expect(scenario.reviewReasons.join('|')).toContain('delivery_margin_without_contractual_ore_entitlement');
  });
});
