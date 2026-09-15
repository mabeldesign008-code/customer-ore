export interface CatalogPromotion {
  id: string;
  title: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  minimumSubtotalPesewas: number;
}

/** Choose a vendor campaign. A present `promotions` array means the customer opted in explicitly. */
export function pickPromotion(
  active: CatalogPromotion[],
  requestedId: string | undefined,
  promotionsSpecified: boolean,
): { promotion: CatalogPromotion | null; warning?: string } {
  if (promotionsSpecified) {
    if (!requestedId) return { promotion: null };
    const match = active.find((row) => row.id === requestedId);
    if (!match) return { promotion: null, warning: 'That promotion is no longer available. Charged full price.' };
    return { promotion: match };
  }
  return { promotion: active[0] ?? null };
}

export function discountPesewasFor(promotion: CatalogPromotion, subtotalPesewas: number, vendorSharePesewas: number): number {
  if (subtotalPesewas < promotion.minimumSubtotalPesewas) return 0;
  const raw = promotion.discountType === 'PERCENT'
    ? Math.round((subtotalPesewas * promotion.discountValue) / 100)
    : promotion.discountValue;
  return Math.min(vendorSharePesewas, raw);
}
