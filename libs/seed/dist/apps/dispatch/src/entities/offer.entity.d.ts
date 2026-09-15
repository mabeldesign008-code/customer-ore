import { OfferStatus } from '@ore/contracts';
export declare class Offer {
    id: string;
    orderId: string;
    batchId: string | null;
    riderId: string;
    vendorId: string;
    status: OfferStatus;
    expiresAt: Date;
    attempt: number;
    riderFeePesewas: number;
    /** Peak/surge incentive for this leg, fixed at offer time alongside the base fee. */
    peakPayPesewas: number;
    pickupDistanceKm: number;
    deliveryDistanceKm: number;
    score: number;
    validationJson: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=offer.entity.d.ts.map