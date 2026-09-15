import { BatchStatus, BatchType, BatchRouteStop } from '@ore/contracts';
/** Doc §2 — a grouped/batched delivery: one rider, N pickups, M drops.
 *  Orders keep their own assignments + fees (per-order fees unchanged); the batch
 *  coordinates the shared route. */
export declare class Batch {
    id: string;
    type: BatchType;
    riderId: string | null;
    status: BatchStatus;
    orderIds: string[];
    pickupOrder: BatchRouteStop[];
    dropOrder: BatchRouteStop[];
    totalRiderFeePesewas: number;
    codExposurePesewas: number;
    /**
     * Per-order fee split for this batch, keyed by order id.
     *
     * The offer carries the batch total, but each order's assignment must record what THAT order
     * is worth — the ledger pays per leg, per order. Without this, every assignment in a batch of
     * three would claim the whole batch fee.
     */
    feeByOrderJson: Record<string, {
        fee: number;
        peak: number;
    }> | null;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=batch.entity.d.ts.map