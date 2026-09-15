/** Money = integer pesewas (GHS 1 = 100 pesewas). NEVER use floats for money. */

export function pesewasToGhs(pesewas: number): number {
  return Math.round(pesewas) / 100;
}

export function ghsToPesewas(ghs: number): number {
  return Math.round(ghs * 100);
}

export function formatGhs(pesewas: number): string {
  return `GHS ${pesewasToGhs(pesewas).toFixed(2)}`;
}

/** Round percentage of an amount in pesewas (always rounds to whole pesewa). */
export function pctOf(pesewas: number, percent: number): number {
  return Math.round((pesewas * percent) / 100);
}

/**
 * Commission rates are carried in basis points: 1 bp = 0.01%, so 18% is 1800.
 *
 * A rate is not money, but it decides money, and storing it as a float meant a rate could not
 * always be written and read back as the same number — 17.7 is not representable in binary
 * floating point. Recomputing a vendor's share from the stored rate could then disagree with the
 * figure the customer was charged, by a pesewa, on some orders and not others. Reconciling that
 * after the fact is far more expensive than the integer column that prevents it.
 *
 * Basis points also give the arithmetic somewhere to go. A 25% premium discount on 18% is 13.5%,
 * which whole percentages cannot express: the old code rounded it to 14% and quietly took an
 * extra 0.5pp off the vendor on every premium order.
 */
export function bpsOf(pesewas: number, bps: number): number {
  return Math.round((pesewas * bps) / 10_000);
}

/** 18 → 1800. Rounds, because a configured percentage may carry decimals. */
export function pctToBps(percent: number): number {
  return Math.round(percent * 100);
}

/** 1800 → 18. For display and for the API, which still speaks percentages. */
export function bpsToPct(bps: number): number {
  return bps / 100;
}

/** Sum of pesewa amounts. */
export function sumPesewas(amounts: number[]): number {
  return amounts.reduce((acc, a) => acc + Math.round(a), 0);
}

export interface MoneyBreakdown {
  subtotalPesewas: number; // sum of item snapshots
  deliveryFeePesewas: number; // customer delivery fee (doc formula)
  serviceFeePesewas: number; // platform service charge to customer
  commissionBps: number; // per-category vendor commission, in basis points (1800 = 18%)
  vendorSharePesewas: number; // net to vendor after commission
  riderFeePesewas: number; // rider payout — filled at DISPATCH (distance-based)
  pspFeePesewas: number; // paystack fee (filled after charge)
  totalPesewas: number; // what the customer pays (or collects at door for COD)
  feePolicyVersion: number; // audit: which pricing rules produced this order (doc §15)
}

export function emptyBreakdown(): MoneyBreakdown {
  return {
    subtotalPesewas: 0,
    deliveryFeePesewas: 0,
    serviceFeePesewas: 0,
    commissionBps: 0,
    vendorSharePesewas: 0,
    riderFeePesewas: 0,
    pspFeePesewas: 0,
    totalPesewas: 0,
    feePolicyVersion: 1,
  };
}

/**
 * Per-ORDER money breakdown at checkout (vendor side).
 * Rider payout is intentionally NOT set here — it's computed at dispatch from real
 * pickup + delivery distances (doc §2.4: customer fee and rider payout are separate).
 */
export function computeBreakdown(params: {
  subtotalPesewas: number;
  distanceKm: number;
  feePolicy: {
    version: number;
    serviceFeePct: number;
    serviceFeeWaiveAbovePesewas?: number;
    deliveryBasePesewas: number;
    deliveryPerKmPesewas: number;
    deliverySurgePct: number;
    deliverySurgeMultiplier?: number;
    priorityFeePerKmPesewas?: number;
    categoryAdjustmentPesewas: Record<string, number>;
    commissionByType: Record<string, number>;
  };
  vendorType: string;
  serviceLevel?: 'STANDARD' | 'SCHEDULED' | 'PRIORITY';
  surgeMultiplier?: number;
}): MoneyBreakdown {
  const { subtotalPesewas, distanceKm, feePolicy, vendorType } = params;
  const serviceFeePesewas = feePolicy.serviceFeeWaiveAbovePesewas !== undefined && subtotalPesewas > feePolicy.serviceFeeWaiveAbovePesewas
    ? 0
    : pctOf(subtotalPesewas, feePolicy.serviceFeePct);

  const base = feePolicy.deliveryBasePesewas;
  const dist = Math.round(distanceKm * feePolicy.deliveryPerKmPesewas);
  const catAdj = feePolicy.categoryAdjustmentPesewas[vendorType] ?? 0;
  const priority = params.serviceLevel === 'PRIORITY' ? Math.round(distanceKm * (feePolicy.priorityFeePerKmPesewas ?? 0)) : 0;
  const preSurge = sumPesewas([base, dist, catAdj, priority]);
  const multiplier = clampSurgeMultiplier(params.surgeMultiplier ?? feePolicy.deliverySurgeMultiplier ?? 1);
  const surge = Math.max(0, Math.round(preSurge * (multiplier - 1))) + pctOf(preSurge, feePolicy.deliverySurgePct);
  const deliveryFeePesewas = sumPesewas([preSurge, surge]);

  const commissionBps = pctToBps(feePolicy.commissionByType[vendorType] ?? 0);
  const vendorSharePesewas = subtotalPesewas - bpsOf(subtotalPesewas, commissionBps);

  const totalPesewas = sumPesewas([subtotalPesewas, deliveryFeePesewas, serviceFeePesewas]);

  return {
    subtotalPesewas,
    deliveryFeePesewas,
    serviceFeePesewas,
    commissionBps,
    vendorSharePesewas,
    riderFeePesewas: 0,
    pspFeePesewas: 0,
    totalPesewas,
    feePolicyVersion: feePolicy.version,
  };
}

function clampSurgeMultiplier(value: number): number {
  const allowed = [1, 1.2, 1.3, 1.5];
  return allowed.reduce((closest, current) => Math.abs(current - value) < Math.abs(closest - value) ? current : closest, 1);
}
