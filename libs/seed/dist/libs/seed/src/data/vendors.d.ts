/** Seed vendors + menus — real Cape Coast names (TripAdvisor), Ghanaian fare, GHS prices in pesewas. */
export interface SeedMenuItem {
    name: string;
    category: string;
    pricePesewas: number;
    prepTimeMin: number;
    unit?: string;
    stock?: number | null;
    prescriptionOnly?: boolean;
    modifiers?: string[];
}
export interface SeedVendor {
    name: string;
    vendorType: string;
    lat: number;
    lng: number;
    deliveryRadiusKm: number;
    acceptsCod: boolean;
    accepting: boolean;
    maxConcurrentOrders: number;
    hours: {
        open: string;
        close: string;
    }[] | null;
    menu: SeedMenuItem[];
}
export declare const SEED_VENDORS: SeedVendor[];
//# sourceMappingURL=vendors.d.ts.map