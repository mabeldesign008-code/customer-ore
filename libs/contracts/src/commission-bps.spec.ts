import { bpsOf, bpsToPct, pctToBps, pctOf } from './money';

/**
 * Commission is carried in basis points (1 bp = 0.01%, so 18% = 1800) rather than as a float
 * percentage. A rate is not money, but it decides money: stored as a float it could not always
 * be written and read back as the same number, so recomputing a vendor's share from the stored
 * rate could disagree with what the customer was charged — on some orders and not others.
 */
describe('basis-point commission', () => {
  describe('pctToBps', () => {
    it('converts whole percentages', () => {
      expect(pctToBps(18)).toBe(1800);
      expect(pctToBps(0)).toBe(0);
      expect(pctToBps(100)).toBe(10_000);
    });

    it('converts fractional percentages exactly', () => {
      expect(pctToBps(13.5)).toBe(1350);
      expect(pctToBps(17.7)).toBe(1770);
      expect(pctToBps(0.01)).toBe(1);
    });

    it('round-trips through bpsToPct', () => {
      for (const pct of [0, 1, 13.5, 17.7, 18, 22.25, 100]) {
        expect(bpsToPct(pctToBps(pct))).toBe(pct);
      }
    });

    it('survives a float that cannot be represented exactly', () => {
      // 17.7 in binary floating point is 17.699999999999999289…; the whole reason the column is
      // an integer is so that value cannot reach the database.
      expect(pctToBps(0.1 + 0.2)).toBe(30);
      expect(Number.isInteger(pctToBps(17.7))).toBe(true);
    });
  });

  describe('bpsOf', () => {
    it('takes the right share of a subtotal', () => {
      expect(bpsOf(10_000, 1800)).toBe(1800); // 18% of GHS 100
      expect(bpsOf(10_000, 0)).toBe(0);
      expect(bpsOf(0, 1800)).toBe(0);
    });

    it('always returns whole pesewas', () => {
      for (const bps of [1, 333, 1350, 1777, 9999]) {
        expect(Number.isInteger(bpsOf(12_345, bps))).toBe(true);
      }
    });

    it('agrees with the old percentage helper wherever that one was exact', () => {
      // The migration must not move money on existing whole-percent rates.
      for (const pct of [0, 5, 10, 15, 18, 20, 25]) {
        for (const subtotal of [1, 99, 100, 1234, 10_000, 987_654]) {
          expect(bpsOf(subtotal, pctToBps(pct))).toBe(pctOf(subtotal, pct));
        }
      }
    });

    it('expresses a rate whole percentages could not', () => {
      // 25% off an 18% commission is 13.5%. In whole percent it rounded to 14%, so every
      // premium order quietly took an extra half a point off the vendor.
      const subtotal = 20_000; // GHS 200
      const premiumBps = Math.round(1800 * 0.75);

      expect(premiumBps).toBe(1350);
      expect(bpsOf(subtotal, premiumBps)).toBe(2700); // GHS 27.00, the correct 13.5%
      expect(pctOf(subtotal, 14)).toBe(2800); // what the vendor used to be charged
    });

    it('rounds half away from zero, consistently with the rest of the money helpers', () => {
      // 1 bp of 50 pesewas is 0.005 → 0. 1 bp of 15 000 is 1.5 → 2.
      expect(bpsOf(50, 1)).toBe(0);
      expect(bpsOf(15_000, 1)).toBe(2);
    });

    it('never loses or invents a pesewa when splitting a subtotal', () => {
      for (const subtotal of [1, 7, 99, 100, 101, 9_999, 123_457]) {
        for (const bps of [0, 1, 1350, 1800, 10_000]) {
          const commission = bpsOf(subtotal, bps);
          const vendorShare = subtotal - commission;
          expect(commission + vendorShare).toBe(subtotal);
          expect(commission).toBeGreaterThanOrEqual(0);
          expect(vendorShare).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });
});
