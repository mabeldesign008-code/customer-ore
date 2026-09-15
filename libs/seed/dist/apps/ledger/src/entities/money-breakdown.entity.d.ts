/** Per-order money breakdown — the G10 split, recorded at checkout, settled later. */
export declare class MoneyBreakdown {
    id: string;
    orderId: string;
    subtotalPesewas: number;
    deliveryFeePesewas: number;
    serviceFeePesewas: number;
    platformFeePesewas: number;
    vendorSharePesewas: number;
    riderFeePesewas: number;
    pspFeePesewas: number;
    totalPesewas: number;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=money-breakdown.entity.d.ts.map