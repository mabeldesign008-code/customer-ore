"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allocatePspCharge = allocatePspCharge;
/** Split a PSP charge across prepaid orders. Last row absorbs rounding so the sum equals the charge. */
function allocatePspCharge(prepaid, prepaidTotal, pspChargePesewas) {
    if (prepaid.length === 0 || prepaidTotal <= 0 || pspChargePesewas <= 0)
        return [];
    const allocations = prepaid.map((o) => ({
        orderId: o.orderId,
        allocatedPesewas: Math.round((o.totalPesewas / prepaidTotal) * pspChargePesewas),
    }));
    const allocatedSum = allocations.reduce((s, a) => s + a.allocatedPesewas, 0);
    allocations[allocations.length - 1].allocatedPesewas = Math.max(0, allocations[allocations.length - 1].allocatedPesewas + (pspChargePesewas - allocatedSum));
    return allocations;
}
//# sourceMappingURL=checkout.allocate.js.map