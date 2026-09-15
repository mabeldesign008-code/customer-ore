export type AssignmentStatus = 'ACTIVE' | 'COMPLETED' | 'RELEASED';
export declare class Assignment {
    id: string;
    orderId: string;
    riderId: string;
    offerId: string | null;
    batchId: string | null;
    pickupDistanceKm: number;
    score: number;
    source: string;
    /**
     * What this rider earns for THIS leg, fixed at the moment the offer was accepted.
     *
     * Rider pay is per-assignment, not per-order: a laundry order has a collection leg and a
     * return leg worked by two different riders, and a reassignment after pickup leaves two
     * riders each owed for the distance they actually covered. The order-level
     * `riderFeePesewas` is the SUM across legs (what the order costs Ore); this is the split
     * (what each rider is owed). Booking earnings from the order-level field alone paid only
     * whoever happened to be assigned at delivery.
     */
    riderFeePesewas: number;
    peakPayPesewas: number;
    /** Set when the ledger has credited this leg, so a redelivery cannot pay it twice. */
    earningsPostedAt: Date | null;
    validationJson: Record<string, unknown> | null;
    status: AssignmentStatus;
    assignedAt: Date;
    /**
     * When the rider confirmed pickup, inside the vendor's geofence.
     *
     * Recorded so delivery time can be decomposed into legs rather than measured only end to end.
     * A single "45 minutes" figure cannot say whether the kitchen was slow, the rider was far, or
     * the rider stood at the counter waiting — and those three have completely different fixes.
     * Every ETA model worth the name (Swiggy's four-leg decomposition, Deliveroo's Frank) is built
     * on per-leg history, and none of it existed here.
     */
    pickedUpAt: Date | null;
    completedAt: Date | null;
}
//# sourceMappingURL=assignment.entity.d.ts.map