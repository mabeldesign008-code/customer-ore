import { computeBreakdown, ghsToPesewas, pesewasToGhs, pctOf, sumPesewas, formatGhs } from './money';
import { customerDeliveryFee, riderPayout, feePolicyFromEnv } from './fees';
import { VendorType } from './enums';

const policy = {
  version: 1,
  serviceFeePct: 2,
  platformFeePct: 3,
  riderFeePesewas: ghsToPesewas(10),
  deliveryBasePesewas: ghsToPesewas(4),
  deliveryPerKmPesewas: ghsToPesewas(2),
  deliveryFreeKm: 0,
  deliverySurgePct: 0,
  deliverySurgeMultiplier: 1,
  priorityFeePerKmPesewas: ghsToPesewas(1),
  serviceFeeWaiveAbovePesewas: ghsToPesewas(499),
  categoryAdjustmentPesewas: { [VendorType.FOOD]: 0, [VendorType.MARKET]: ghsToPesewas(2) } as Record<string, number>,
  commissionByType: { [VendorType.FOOD]: 18, [VendorType.MARKET]: 10 } as Record<string, number>,
};

describe('money math (doc §2.4 formulas)', () => {
  it('converts GHS ↔ pesewas losslessly', () => {
    expect(pesewasToGhs(4500)).toBe(45);
    expect(ghsToPesewas(45)).toBe(4500);
    expect(formatGhs(4500)).toBe('GHS 45.00');
    expect(pctOf(9999, 5)).toBe(500);
    expect(sumPesewas([100, 200, 350])).toBe(650);
  });

  it('customer delivery fee = base + distance×perKm (doc §2.4.1)', () => {
    const p = feePolicyFromEnv({});
    // GHS 4 + 5km × GHS 2
    expect(customerDeliveryFee(p, 5, VendorType.FOOD)).toBe(ghsToPesewas(4 + 5 * 2));
  });

  it('category adjustment adds to the delivery fee when configured (doc §2.4.1)', () => {
    const p = feePolicyFromEnv({ CATEGORY_ADJUSTMENT_PESEWAS: JSON.stringify({ MARKET: ghsToPesewas(2) }) });
    const food = customerDeliveryFee(p, 5, VendorType.FOOD);
    const market = customerDeliveryFee(p, 5, VendorType.MARKET);
    expect(market - food).toBe(ghsToPesewas(2));
  });

  it('rider payout = base + pickup km + delivery km + load allowance plus service-level share (doc §2.4.2)', () => {
    const p = feePolicyFromEnv({});
    // GHS 4 + 2km×1 + 5km×2.5 + 0
    expect(riderPayout(p, 2, 5, VendorType.FOOD)).toBe(ghsToPesewas(4 + 2 * 1 + 5 * 2.5));
    // market adds load allowance GHS 2
    expect(riderPayout(p, 2, 5, VendorType.MARKET)).toBe(ghsToPesewas(4 + 2 * 1 + 5 * 2.5 + 2));
    // priority applies the approved service-level multiplier unless an admin exception/incentive is passed.
    expect(riderPayout(p, 2, 5, VendorType.FOOD, { serviceLevel: 'PRIORITY' })).toBe(Math.round(ghsToPesewas(4 + 2 * 1 + 5 * 2.5) * 1.15));
  });

  it('checkout breakdown: commission per category, rider fee filled at dispatch', () => {
    // GHS 100 food, 5km
    const b = computeBreakdown({ subtotalPesewas: ghsToPesewas(100), distanceKm: 5, feePolicy: policy, vendorType: VendorType.FOOD });
    expect(b.subtotalPesewas).toBe(10000);
    expect(b.serviceFeePesewas).toBe(200); // 2%
    expect(b.deliveryFeePesewas).toBe(ghsToPesewas(4 + 5 * 2)); // GHS 14
    expect(b.commissionBps).toBe(1800);
    expect(b.vendorSharePesewas).toBe(10000 - 1800); // 82%
    expect(b.riderFeePesewas).toBe(0); // set at dispatch
    expect(b.totalPesewas).toBe(10000 + 1400 + 200);
    expect(b.feePolicyVersion).toBe(1);
  });

  it('market breakdown uses 10% commission + GHS 2 category adjustment', () => {
    const b = computeBreakdown({ subtotalPesewas: ghsToPesewas(100), distanceKm: 5, feePolicy: policy, vendorType: VendorType.MARKET });
    expect(b.commissionBps).toBe(1000);
    expect(b.vendorSharePesewas).toBe(10000 - 1000);
    expect(b.deliveryFeePesewas).toBe(ghsToPesewas(4 + 5 * 2 + 2));
  });

  it('waives the 2% service fee above GHS 499 and supports priority/surge levels', () => {
    const waived = computeBreakdown({ subtotalPesewas: ghsToPesewas(500), distanceKm: 5, feePolicy: policy, vendorType: VendorType.FOOD });
    expect(waived.serviceFeePesewas).toBe(0);

    const priority = customerDeliveryFee(feePolicyFromEnv({ DELIVERY_SURGE_MULTIPLIER: '1.2' }), 5, VendorType.FOOD, { serviceLevel: 'PRIORITY' });
    // base 4 + distance 10 + priority 5 = 19; level-1.2 surge adds 3.80
    expect(priority).toBe(ghsToPesewas(22.8));
  });
});
