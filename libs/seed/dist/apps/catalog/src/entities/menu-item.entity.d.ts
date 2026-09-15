export declare class MenuItem {
    id: string;
    vendorId: string;
    name: string;
    category: string;
    pricePesewas: number;
    prepTimeMin: number;
    unit: string;
    stock: number | null;
    prescriptionOnly: boolean;
    available: boolean;
    modifiers: string[];
    /** Structured variant/add-on groups with pesewa price adjustments. */
    addonGroups: Record<string, unknown>[] | null;
    imageKey: string | null;
    imageContentType: string | null;
    sku: string | null;
    expiryDate: Date | null;
    /** Pharmacy-specific dosage/strength, e.g. 500mg or 10ml. */
    dosage: string | null;
    /** Laundry-specific service turnaround, e.g. 24h Express. */
    turnaround: string | null;
    /** Market-specific flag indicating that the price is refreshed daily. */
    dailyMarketPrice: boolean;
    /** Laundry-specific garment/service classification. */
    garmentType: string | null;
    /** Laundry intake/inspection metadata; state is retained with the item. */
    conditionJson: Record<string, unknown> | null;
    /** Food dietary tags and other vertical-specific searchable labels. */
    dietaryTags: string[];
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=menu-item.entity.d.ts.map