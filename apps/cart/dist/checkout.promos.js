"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickPromotion = pickPromotion;
exports.discountPesewasFor = discountPesewasFor;
/** Choose a vendor campaign. A present `promotions` array means the customer opted in explicitly. */
function pickPromotion(active, requestedId, promotionsSpecified) {
    if (promotionsSpecified) {
        if (!requestedId)
            return { promotion: null };
        const match = active.find((row) => row.id === requestedId);
        if (!match)
            return { promotion: null, warning: 'That promotion is no longer available. Charged full price.' };
        return { promotion: match };
    }
    return { promotion: active[0] ?? null };
}
function discountPesewasFor(promotion, subtotalPesewas, vendorSharePesewas) {
    if (subtotalPesewas < promotion.minimumSubtotalPesewas)
        return 0;
    const raw = promotion.discountType === 'PERCENT'
        ? Math.round((subtotalPesewas * promotion.discountValue) / 100)
        : promotion.discountValue;
    return Math.min(vendorSharePesewas, raw);
}
//# sourceMappingURL=checkout.promos.js.map