import { DeliveryAddressDto, OrderStatus, OrderType, PaymentMethod } from '@ore/contracts';
/** Doc §Errands — escrow + buy-and-deliver state stored on the order. */
export interface ParcelJson {
    sender: {
        name: string;
        phone: string;
        address: DeliveryAddressDto;
    };
    recipient: {
        name: string;
        phone: string;
        address: DeliveryAddressDto;
    };
    category: string;
    weightKg: number;
    dimensionsCm: {
        length: number;
        width: number;
        height: number;
    } | null;
    declaredValuePesewas: number;
    description: string;
    fragile: boolean;
    sealed: boolean;
    pickupMode: 'MEET_DOOR' | 'MEET_CURB';
    proofMode: 'PIN' | 'SIGNATURE' | 'PHOTO' | 'PIN_AND_PHOTO';
    prohibitedItemsAcknowledged: boolean;
    parcelStatus: string;
    returnReason: string | null;
    pickedUpAt: string | null;
    deliveredAt: string | null;
}
export interface ErrandJson {
    task: string;
    shopName: string | null;
    shopLat: number;
    shopLng: number;
    budgetPesewas: number;
    escrowPesewas: number;
    errandStatus: string;
    spentPesewas: number;
    receipts: {
        amountPesewas: number;
        photoKey: string;
        note: string | null;
        at: string;
    }[];
    substitution: {
        item: string;
        pricePesewas: number;
        status: string;
    } | null;
    trustTier: string | null;
    compensationPesewas: number;
    shoppedAt: string | null;
    purchasedAt: string | null;
}
export declare class Order {
    id: string;
    ref: string;
    checkoutId: string;
    orderType: OrderType;
    errandJson: ErrandJson | null;
    parcelJson: ParcelJson | null;
    /** Doc §3 Case 2 — gift/order-for-someone: recipient confirms the drop before dispatch. */
    recipientJson: {
        name: string;
        phone: string;
        status: 'AWAITING_CONFIRMATION' | 'CONFIRMED';
        token: string;
        confirmedAt: string | null;
        address: DeliveryAddressDto | null;
    } | null;
    /** Indexed gift-link token (same value as recipientJson.token) so confirm does not scan rows. */
    giftToken: string | null;
    customerPhone: string | null;
    vendorId: string;
    vendorName: string;
    vendorType: string;
    serviceCode: string;
    feePolicyVersion: number;
    /**
     * Vendor commission in basis points (1800 = 18%).
     *
     * Was `float`. A rate is not money, but it decides money: 17.7 has no exact binary float
     * representation, so recomputing a vendor's share from the stored rate could disagree with
     * what the customer was actually charged — on some orders and not others, which is the
     * expensive kind of discrepancy to chase.
     */
    commissionBps: number;
    customerId: string;
    paymentMethod: PaymentMethod;
    status: OrderStatus;
    prescriptionStatus: string;
    prescriptionKey: string | null;
    prescriptionContentType: string | null;
    prescriptionReviewNote: string | null;
    conditionJson: Record<string, unknown> | null;
    /** Market/weight fulfillment snapshot; financial adjustments are not applied without a payment contract. */
    marketFulfillmentJson: {
        recordedAt: string;
        lines: {
            orderItemId: string;
            actualQuantity: number;
            unit: string;
            actualPricePesewas: number | null;
            note: string | null;
        }[];
    } | null;
    laundryStage: string | null;
    addressJson: DeliveryAddressDto;
    /** Snapshot of the Vendor branch used for fulfilment. Null for legacy orders. */
    pickupJson: {
        locationId: string | null;
        name: string;
        address: string | null;
        lat: number;
        lng: number;
    } | null;
    prepTimeMin: number;
    originalPrepTimeMin: number | null;
    prepTimeExtendedByMin: number;
    prepExtensionCount: number;
    lastPrepExtendedAt: Date | null;
    lastPrepExtendedBy: string | null;
    lastPrepExtensionReason: string | null;
    subtotalPesewas: number;
    deliveryFeePesewas: number;
    serviceFeePesewas: number;
    platformFeePesewas: number;
    vendorSharePesewas: number;
    riderFeePesewas: number;
    totalPesewas: number;
    promotionId: string | null;
    promotionTitle: string | null;
    promotionDiscountPesewas: number;
    /** Customer-paid rider tip. Credited to the assigned rider on delivery. */
    tipPesewas: number;
    /** Platform-funded peak pay. Credited to the assigned rider on delivery. Not charged to the customer. */
    peakPayPesewas: number;
    note: string | null;
    leaveAtDoor: boolean;
    dropNote: string | null;
    scheduledFor: Date | null;
    serviceLevel: 'STANDARD' | 'SCHEDULED' | 'PRIORITY';
    deliverySignatureKey: string | null;
    deliverySignatureContentType: string | null;
    riderId: string | null;
    otpHash: string | null;
    /**
     * Delivery OTP at rest — AES-256-GCM encrypted with the service key (never plaintext).
     * The plaintext is shown to the order owner on demand (G21) and to the gift recipient
     * via SMS by the notification service (which calls the internal reveal endpoint).
     */
    otpCipher: string | null;
    otpAttempts: number;
    acceptedAt: Date | null;
    readyAt: Date | null;
    pickedUpAt: Date | null;
    deliveredAt: Date | null;
    deliveryProofKey: string | null;
    deliveryProofContentType: string | null;
    cancelledAt: Date | null;
    cancelReason: string | null;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=order.entity.d.ts.map