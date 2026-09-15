/**
 * Splitting delivery earnings across the legs of one order.
 *
 * Rider pay is per-assignment, not per-order. A laundry order is collected by one rider and
 * returned by another. A reassignment after pickup leaves two riders each owed for the distance
 * they covered. The order carries a single net credit (gross fees + tip + peak, less
 * withholding); this decides who gets what share of it.
 *
 * Kept pure and free of NestJS/TypeORM so the rounding behaviour can be tested directly — the
 * same convention the rest of the money code follows.
 */

export interface DeliveryLegShare {
  /** Assignment id — the idempotency key for "this leg has been paid". */
  id: string;
  riderId: string;
  /** What this leg was promised at offer time, before withholding. */
  grossPesewas: number;
}

export interface LegCredit {
  id: string;
  riderId: string;
  creditPesewas: number;
}

/**
 * Apportion `netCreditPesewas` across `legs` in proportion to each leg's gross.
 *
 * Every part is a whole number of pesewas and the parts always sum exactly to the total: each
 * share is floored and the rounding residue goes to the last leg. That mirrors how the tax
 * engine places its residue on the final line, and it means the ledger can never create or
 * destroy a pesewa by splitting.
 *
 * Legs with zero gross are dropped rather than paid nothing, so they do not dilute the split.
 * If nothing is payable the result is empty and the caller decides how to degrade.
 */
export function splitLegCredits(legs: DeliveryLegShare[], netCreditPesewas: number): LegCredit[] {
  if (netCreditPesewas <= 0) return [];

  const payable = legs.filter((l) => l.grossPesewas > 0);
  if (payable.length === 0) return [];

  const grossTotal = payable.reduce((sum, l) => sum + l.grossPesewas, 0);
  if (grossTotal <= 0) return [];

  const out: LegCredit[] = [];
  let allocated = 0;

  for (let i = 0; i < payable.length; i++) {
    const leg = payable[i];
    const isLast = i === payable.length - 1;
    const share = isLast
      ? netCreditPesewas - allocated
      : Math.floor((netCreditPesewas * leg.grossPesewas) / grossTotal);
    allocated += share;
    out.push({ id: leg.id, riderId: leg.riderId, creditPesewas: share });
  }

  return out;
}
