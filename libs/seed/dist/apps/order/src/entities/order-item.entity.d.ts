export declare class OrderItem {
    id: string;
    orderId: string;
    itemId: string;
    name: string;
    qty: number;
    unit: string | null;
    unitPricePesewas: number;
    prepTimeMin: number;
    modifiers: string[];
    selectedOptions: Record<string, unknown>[];
    optionsTotalPesewas: number;
    prescriptionOnly: boolean;
    createdAt: Date;
}
//# sourceMappingURL=order-item.entity.d.ts.map