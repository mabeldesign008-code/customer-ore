import { splitLegCredits, DeliveryLegShare } from './delivery-leg-split';

/**
 * Regression cover for the bug where a laundry order's collection rider was never paid.
 *
 * `order.riderFeePesewas` was overwritten by each dispatch of the same order, and the ledger
 * credited `order.riderId` — whoever happened to be assigned at delivery. On a laundry order
 * that is the returning rider, so the rider who collected the laundry and carried it to the
 * vendor received nothing at all: no error, no journal entry, just silence.
 */
describe('splitLegCredits', () => {
  const leg = (id: string, riderId: string, grossPesewas: number): DeliveryLegShare => ({ id, riderId, grossPesewas });

  describe('the laundry two-leg case', () => {
    it('pays BOTH riders — the collection rider is not dropped', () => {
      const legs = [leg('a1', 'rider-collect', 800), leg('a2', 'rider-return', 800)];

      const shares = splitLegCredits(legs, 1600);

      expect(shares).toHaveLength(2);
      expect(shares.map((s) => s.riderId).sort()).toEqual(['rider-collect', 'rider-return']);
      // The whole point: the collection rider gets real money.
      expect(shares.find((s) => s.riderId === 'rider-collect')!.creditPesewas).toBe(800);
      expect(shares.find((s) => s.riderId === 'rider-return')!.creditPesewas).toBe(800);
    });

    it('splits in proportion to each leg, not evenly', () => {
      // A short collection hop and a long return trip are not worth the same.
      const legs = [leg('a1', 'rider-collect', 500), leg('a2', 'rider-return', 1500)];

      const shares = splitLegCredits(legs, 2000);

      expect(shares[0].creditPesewas).toBe(500);
      expect(shares[1].creditPesewas).toBe(1500);
    });

    it('still pays both riders after withholding has reduced the net', () => {
      // Gross 2000, withheld 150, so 1850 is shared out.
      const legs = [leg('a1', 'rider-collect', 1000), leg('a2', 'rider-return', 1000)];

      const shares = splitLegCredits(legs, 1850);

      expect(shares.every((s) => s.creditPesewas > 0)).toBe(true);
      expect(shares.reduce((s, l) => s + l.creditPesewas, 0)).toBe(1850);
    });
  });

  describe('reassignment after pickup', () => {
    it('pays the rider who started and the rider who finished', () => {
      const legs = [leg('a1', 'rider-first', 400), leg('a2', 'rider-second', 1200)];

      const shares = splitLegCredits(legs, 1600);

      expect(shares).toEqual([
        { id: 'a1', riderId: 'rider-first', creditPesewas: 400 },
        { id: 'a2', riderId: 'rider-second', creditPesewas: 1200 },
      ]);
    });
  });

  describe('money is conserved', () => {
    it('parts sum exactly to the whole, with the residue on the last leg', () => {
      // 1000 across three equal legs does not divide evenly.
      const legs = [leg('a1', 'r1', 100), leg('a2', 'r2', 100), leg('a3', 'r3', 100)];

      const shares = splitLegCredits(legs, 1000);

      expect(shares.map((s) => s.creditPesewas)).toEqual([333, 333, 334]);
      expect(shares.reduce((s, l) => s + l.creditPesewas, 0)).toBe(1000);
    });

    it('conserves the total across many awkward splits', () => {
      for (const total of [1, 7, 99, 101, 1234, 99999]) {
        for (const n of [1, 2, 3, 5, 7]) {
          const legs = Array.from({ length: n }, (_, i) => leg(`a${i}`, `r${i}`, 100 + i * 37));
          const shares = splitLegCredits(legs, total);
          expect(shares.reduce((s, l) => s + l.creditPesewas, 0)).toBe(total);
        }
      }
    });

    it('never produces a negative share', () => {
      const legs = [leg('a1', 'r1', 1), leg('a2', 'r2', 100000)];
      const shares = splitLegCredits(legs, 5);
      expect(shares.every((s) => s.creditPesewas >= 0)).toBe(true);
      expect(shares.reduce((s, l) => s + l.creditPesewas, 0)).toBe(5);
    });
  });

  describe('single leg — the ordinary case must not regress', () => {
    it('gives the whole credit to the only rider', () => {
      const shares = splitLegCredits([leg('a1', 'rider-only', 1200)], 1150);
      expect(shares).toEqual([{ id: 'a1', riderId: 'rider-only', creditPesewas: 1150 }]);
    });
  });

  describe('degenerate input', () => {
    it('returns nothing when there are no legs, so the caller can fall back', () => {
      expect(splitLegCredits([], 1000)).toEqual([]);
    });

    it('returns nothing when every leg is worth zero', () => {
      expect(splitLegCredits([leg('a1', 'r1', 0), leg('a2', 'r2', 0)], 1000)).toEqual([]);
    });

    it('drops zero-value legs rather than diluting the payable ones', () => {
      const shares = splitLegCredits([leg('a1', 'r1', 0), leg('a2', 'r2', 500)], 500);
      expect(shares).toEqual([{ id: 'a2', riderId: 'r2', creditPesewas: 500 }]);
    });

    it('pays nothing when the net credit is zero or negative', () => {
      expect(splitLegCredits([leg('a1', 'r1', 500)], 0)).toEqual([]);
      expect(splitLegCredits([leg('a1', 'r1', 500)], -100)).toEqual([]);
    });
  });
});
