/** Split a PSP charge across prepaid orders. Last row absorbs rounding so the sum equals the charge. */
export function allocatePspCharge(
  prepaid: { orderId: string; totalPesewas: number }[],
  prepaidTotal: number,
  pspChargePesewas: number,
): { orderId: string; allocatedPesewas: number }[] {
  if (prepaid.length === 0 || prepaidTotal <= 0 || pspChargePesewas <= 0) return [];
  const allocations = prepaid.map((o) => ({
    orderId: o.orderId,
    allocatedPesewas: Math.round((o.totalPesewas / prepaidTotal) * pspChargePesewas),
  }));
  const allocatedSum = allocations.reduce((s, a) => s + a.allocatedPesewas, 0);
  allocations[allocations.length - 1].allocatedPesewas = Math.max(
    0,
    allocations[allocations.length - 1].allocatedPesewas + (pspChargePesewas - allocatedSum),
  );
  return allocations;
}
