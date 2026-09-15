import { checkoutSchema } from '@ore/contracts';
import { discountPesewasFor, pickPromotion } from './checkout.promos';
import { allocatePspCharge } from './checkout.allocate';

const checkoutBase = {
  address: { label: 'Home', lat: 5.1053, lng: -1.2466, source: 'CUSTOMER' },
};

const tenOff: Parameters<typeof pickPromotion>[0][number] = {
  id: 'promo-10',
  title: '10% off',
  discountType: 'PERCENT',
  discountValue: 10,
  minimumSubtotalPesewas: 2000,
};

const fiveCedis: Parameters<typeof pickPromotion>[0][number] = {
  id: 'promo-5',
  title: 'GHS 5 off',
  discountType: 'FIXED',
  discountValue: 500,
  minimumSubtotalPesewas: 0,
};

describe('pickPromotion', () => {
  it('auto-applies the first active campaign when the customer sent no list', () => {
    expect(pickPromotion([tenOff, fiveCedis], undefined, false).promotion?.id).toBe('promo-10');
  });

  it('applies none when the customer sent an empty list', () => {
    expect(pickPromotion([tenOff], undefined, true).promotion).toBeNull();
  });

  it('applies a requested id that is still active', () => {
    expect(pickPromotion([tenOff, fiveCedis], 'promo-5', true).promotion?.id).toBe('promo-5');
  });

  it('falls back to full price when the requested id is gone', () => {
    const result = pickPromotion([tenOff], 'missing', true);
    expect(result.promotion).toBeNull();
    expect(result.warning).toMatch(/no longer available/i);
  });
});

describe('discountPesewasFor', () => {
  it('returns 0 below the minimum subtotal', () => {
    expect(discountPesewasFor(tenOff, 1500, 1200)).toBe(0);
  });

  it('caps a percent discount at the vendor share', () => {
    expect(discountPesewasFor(tenOff, 10_000, 700)).toBe(700);
  });

  it('applies a fixed discount in pesewas', () => {
    expect(discountPesewasFor(fiveCedis, 2000, 1800)).toBe(500);
  });
});

describe('checkoutSchema promotions', () => {
  it('omits promotions when the customer sent none (auto-apply)', () => {
    expect(checkoutSchema.parse(checkoutBase).promotions).toBeUndefined();
  });

  it('keeps an empty list so checkout applies none', () => {
    expect(checkoutSchema.parse({ ...checkoutBase, promotions: [] }).promotions).toEqual([]);
  });

  it('accepts a vendor/promotion pair', () => {
    expect(checkoutSchema.parse({
      ...checkoutBase,
      promotions: [{ vendorId: 'vendor-1', promotionId: 'promo-10' }],
    }).promotions).toEqual([{ vendorId: 'vendor-1', promotionId: 'promo-10' }]);
  });
});

describe('checkoutSchema tips', () => {
  it('omits tips when the customer sent none', () => {
    expect(checkoutSchema.parse(checkoutBase).tips).toBeUndefined();
  });

  it('accepts a per-vendor tip in pesewas', () => {
    expect(checkoutSchema.parse({
      ...checkoutBase,
      tips: [{ vendorId: 'vendor-1', tipPesewas: 500 }],
    }).tips).toEqual([{ vendorId: 'vendor-1', tipPesewas: 500 }]);
  });

  it('rejects a tip above GHS 500', () => {
    expect(() => checkoutSchema.parse({
      ...checkoutBase,
      tips: [{ vendorId: 'vendor-1', tipPesewas: 50_001 }],
    })).toThrow();
  });
});

describe('allocatePspCharge', () => {
  it('sums exactly to the PSP charge after rounding', () => {
    const prepaid = [
      { orderId: 'a', totalPesewas: 1000 },
      { orderId: 'b', totalPesewas: 2000 },
      { orderId: 'c', totalPesewas: 3000 },
    ];
    const allocations = allocatePspCharge(prepaid, 6000, 1000);
    expect(allocations.reduce((s, a) => s + a.allocatedPesewas, 0)).toBe(1000);
    expect(allocations.map((a) => a.orderId)).toEqual(['a', 'b', 'c']);
  });
});
