/** Event catalog (NATS JetStream streams in distributed mode; in-memory bus in dev).
 *  Every consumer MUST be idempotent on event id. */
export declare const EVENTS: {
    readonly USER_REGISTERED: "user.registered";
    readonly USER_ONBOARDED: "user.onboarded";
    readonly USER_STANDING_CHANGED: "user.standing_changed";
    readonly CHECKOUT_COMPLETED: "checkout.completed";
    readonly ORDER_CREATED: "order.created";
    readonly ORDER_CONFIRMED: "order.confirmed";
    readonly ORDER_ACCEPTED: "order.accepted";
    readonly ORDER_REJECTED: "order.rejected";
    readonly ORDER_PREP_STARTED: "order.prep_started";
    readonly ORDER_READY_FOR_PICKUP: "order.ready_for_pickup";
    readonly ORDER_DELAYED: "order.delayed";
    readonly ORDER_CANCELLED: "order.cancelled";
    readonly ORDER_PICKED_UP: "order.picked_up";
    readonly ORDER_OUT_FOR_DELIVERY: "order.out_for_delivery";
    readonly ORDER_OTP_VERIFIED: "order.otp_verified";
    readonly ORDER_DELIVERED: "order.delivered";
    readonly ORDER_FAILED_DELIVERY: "order.failed_delivery";
    readonly ORDER_WAITING_FOR_RIDER: "order.waiting_for_rider";
    readonly ORDER_ADDRESS_CORRECTED: "order.address_corrected";
    readonly PAYMENT_CHARGE_SUCCEEDED: "payment.charge_succeeded";
    readonly PAYMENT_CHARGE_FAILED: "payment.charge_failed";
    readonly PAYMENT_REFUND_PROCESSED: "payment.refund_processed";
    readonly PAYMENT_REFUND_FAILED: "payment.refund_failed";
    readonly DISPATCH_OFFER_CREATED: "dispatch.offer_created";
    readonly DISPATCH_OFFER_ACCEPTED: "dispatch.offer_accepted";
    readonly DISPATCH_OFFER_DECLINED: "dispatch.offer_declined";
    readonly DISPATCH_RIDER_ASSIGNED: "dispatch.rider_assigned";
    readonly DISPATCH_RIDER_UNASSIGNED: "dispatch.rider_unassigned";
    readonly DISPATCH_RIDER_AT_VENDOR: "dispatch.rider_at_vendor";
    readonly DISPATCH_RIDER_PICKED_UP: "dispatch.rider_picked_up";
    readonly DISPATCH_RIDER_LAUNDRY_HANDOFF: "dispatch.rider_laundry_handoff";
    readonly DISPATCH_RIDER_AT_CUSTOMER: "dispatch.rider_at_customer";
    readonly DISPATCH_RIDER_EN_ROUTE: "dispatch.rider_en_route";
    readonly DISPATCH_BATCH_CREATED: "dispatch.batch_created";
    readonly TRACKING_RIDER_LOCATION: "tracking.rider_location";
    readonly TRACKING_ETA_CHANGED: "tracking.eta_changed";
    readonly ITEM_AVAILABILITY_CHANGED: "item.availability_changed";
    readonly VENDOR_UPDATED: "vendor.updated";
    readonly LEDGER_COD_CASH_COLLECTED: "ledger.cod_cash_collected";
    readonly LEDGER_REMITTANCE_CONFIRMED: "ledger.remittance_confirmed";
    readonly LEDGER_DISCREPANCY_FLAGGED: "ledger.discrepancy_flagged";
    readonly WITHDRAWAL_REQUESTED: "wallet.withdrawal_requested";
    readonly WITHDRAWAL_APPROVED: "wallet.withdrawal_approved";
    readonly WITHDRAWAL_PAID: "wallet.withdrawal_paid";
    readonly WITHDRAWAL_FAILED: "wallet.withdrawal_failed";
    readonly WITHDRAWAL_REJECTED: "wallet.withdrawal_rejected";
    readonly RIDER_COD_STATUS_CHANGED: "rider.cod_status_changed";
    readonly PAYMENT_TRANSFER_SUCCEEDED: "payment.transfer_succeeded";
    readonly PAYMENT_TRANSFER_FAILED: "payment.transfer_failed";
    readonly VENDOR_SETTLEMENT_CREATED: "vendor.settlement_created";
    readonly VENDOR_SETTLEMENT_PAID: "vendor.settlement_paid";
    readonly VENDOR_SETTLEMENT_REVERSED: "vendor.settlement_reversed";
    readonly DISPUTE_OPENED: "dispute.opened";
    readonly DISPUTE_RESOLVED: "dispute.resolved";
    readonly CHARGEBACK_OPENED: "chargeback.opened";
    readonly CHARGEBACK_RESOLVED: "chargeback.resolved";
    readonly CUSTOMER_CREDIT_CHANGED: "customer.credit_changed";
    readonly REFERRAL_CLAIMED: "referral.claimed";
    readonly REFERRAL_CREDITED: "referral.credited";
    readonly RIDER_MILESTONE_EARNED: "referral.rider_milestone";
    readonly VENDOR_BONUS_EARNED: "referral.vendor_bonus";
    readonly VENDOR_PENALTY: "vendor.penalty";
    readonly COMMS_MESSAGE_CREATED: "comms.message_created";
};
export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
/** Envelope every event carries. Consumers dedupe on `id`. */
export interface EventEnvelope<T = unknown> {
    id: string;
    name: EventName;
    ts: string;
    zoneId: string;
    payload: T;
    /**
     * HMAC-SHA256 over the canonical form of the fields above, base64url (audit S-1).
     *
     * The bus proved forgeable end to end: an anonymous NATS client published a
     * hand-built `payment.charge_succeeded` envelope and the ledger + order consumers
     * received, acted on and ACKed it. NATS credentials now keep outsiders off the
     * broker; this signature keeps a compromised or buggy *insider* service from
     * speaking for another one, and makes "who may publish money events" a secret-key
     * property instead of a network-position property. Consumers MUST verify before
     * dispatching and dead-letter anything that fails — see libs/bus.
     */
    sig?: string;
}
export interface OrderEventPayload {
    orderId: string;
    checkoutId: string;
    status: string;
    vendorId: string;
    customerId: string;
    paymentMethod: string;
    amountPesewas: number;
    [key: string]: unknown;
}
export interface RiderEventPayload {
    riderId: string;
    orderId?: string;
    offerId?: string;
    [key: string]: unknown;
}
export interface ChargeSucceededPayload {
    reference: string;
    checkoutId: string;
    amountPesewas: number;
    pspFeePesewas: number;
    currency: string;
    channel: string;
    paidAt: string;
}
export interface RiderLocationPayload {
    riderId: string;
    orderId?: string;
    lat: number;
    lng: number;
    speedKmh?: number;
    ts: string;
}
//# sourceMappingURL=events.d.ts.map