export type StockReservationStatus = 'RESERVED' | 'CONSUMED' | 'RELEASED';
/** Idempotent inventory reservation used by confirmed Vendor orders. */
export declare class StockReservation {
    id: string;
    orderId: string;
    itemId: string;
    qty: number;
    status: StockReservationStatus;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=stock-reservation.entity.d.ts.map