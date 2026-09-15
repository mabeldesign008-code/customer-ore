/** Event catalog (NATS JetStream streams in distributed mode; in-memory bus in dev).
 *  Every consumer MUST be idempotent on event id. */

export const EVENTS = {
  // auth
  USER_REGISTERED: 'user.registered',
  USER_ONBOARDED: 'user.onboarded',
  // Broadcast when an admin changes an account's standing, so every service holding a
  // cached standing answer drops it at once instead of waiting out its TTL.
  USER_STANDING_CHANGED: 'user.standing_changed',

  // cart / checkout
  CHECKOUT_COMPLETED: 'checkout.completed',

  // order lifecycle
  ORDER_CREATED: 'order.created',
  ORDER_CONFIRMED: 'order.confirmed',
  ORDER_ACCEPTED: 'order.accepted',
  ORDER_REJECTED: 'order.rejected',
  ORDER_PREP_STARTED: 'order.prep_started',
  ORDER_READY_FOR_PICKUP: 'order.ready_for_pickup',
  ORDER_DELAYED: 'order.delayed',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_PICKED_UP: 'order.picked_up',
  ORDER_OUT_FOR_DELIVERY: 'order.out_for_delivery',
  ORDER_OTP_VERIFIED: 'order.otp_verified',
  ORDER_DELIVERED: 'order.delivered',
  ORDER_FAILED_DELIVERY: 'order.failed_delivery',
  ORDER_WAITING_FOR_RIDER: 'order.waiting_for_rider',
  ORDER_ADDRESS_CORRECTED: 'order.address_corrected',

  // payment
  PAYMENT_CHARGE_SUCCEEDED: 'payment.charge_succeeded',
  PAYMENT_CHARGE_FAILED: 'payment.charge_failed',
  PAYMENT_REFUND_PROCESSED: 'payment.refund_processed',
  PAYMENT_REFUND_FAILED: 'payment.refund_failed',

  // dispatch
  DISPATCH_OFFER_CREATED: 'dispatch.offer_created',
  DISPATCH_OFFER_ACCEPTED: 'dispatch.offer_accepted',
  DISPATCH_OFFER_DECLINED: 'dispatch.offer_declined',
  DISPATCH_RIDER_ASSIGNED: 'dispatch.rider_assigned',
  DISPATCH_RIDER_UNASSIGNED: 'dispatch.rider_unassigned',
  DISPATCH_RIDER_AT_VENDOR: 'dispatch.rider_at_vendor',
  DISPATCH_RIDER_PICKED_UP: 'dispatch.rider_picked_up',
  DISPATCH_RIDER_LAUNDRY_HANDOFF: 'dispatch.rider_laundry_handoff',
  DISPATCH_RIDER_AT_CUSTOMER: 'dispatch.rider_at_customer',
  DISPATCH_RIDER_EN_ROUTE: 'dispatch.rider_en_route',
  DISPATCH_BATCH_CREATED: 'dispatch.batch_created',

  // tracking
  TRACKING_RIDER_LOCATION: 'tracking.rider_location',
  TRACKING_ETA_CHANGED: 'tracking.eta_changed',

  // catalog
  ITEM_AVAILABILITY_CHANGED: 'item.availability_changed',
  VENDOR_UPDATED: 'vendor.updated',

  // ledger
  LEDGER_COD_CASH_COLLECTED: 'ledger.cod_cash_collected',
  LEDGER_REMITTANCE_CONFIRMED: 'ledger.remittance_confirmed',
  LEDGER_DISCREPANCY_FLAGGED: 'ledger.discrepancy_flagged',

  // wallet / rider money (doc §5)
  WITHDRAWAL_REQUESTED: 'wallet.withdrawal_requested',
  WITHDRAWAL_APPROVED: 'wallet.withdrawal_approved',
  WITHDRAWAL_PAID: 'wallet.withdrawal_paid',
  WITHDRAWAL_FAILED: 'wallet.withdrawal_failed',
  WITHDRAWAL_REJECTED: 'wallet.withdrawal_rejected',
  RIDER_COD_STATUS_CHANGED: 'rider.cod_status_changed',

  // payment money-out (Paystack Transfers; webhook/response = truth)
  PAYMENT_TRANSFER_SUCCEEDED: 'payment.transfer_succeeded',
  PAYMENT_TRANSFER_FAILED: 'payment.transfer_failed',

  // vendor settlement (doc §4)
  VENDOR_SETTLEMENT_CREATED: 'vendor.settlement_created',
  VENDOR_SETTLEMENT_PAID: 'vendor.settlement_paid',
  VENDOR_SETTLEMENT_REVERSED: 'vendor.settlement_reversed',

  // refunds / disputes / chargebacks (doc §Payment)
  DISPUTE_OPENED: 'dispute.opened',
  DISPUTE_RESOLVED: 'dispute.resolved',
  CHARGEBACK_OPENED: 'chargeback.opened',
  CHARGEBACK_RESOLVED: 'chargeback.resolved',
  CUSTOMER_CREDIT_CHANGED: 'customer.credit_changed',

  // referral (doc §8)
  REFERRAL_CLAIMED: 'referral.claimed',
  REFERRAL_CREDITED: 'referral.credited',
  RIDER_MILESTONE_EARNED: 'referral.rider_milestone',
  VENDOR_BONUS_EARNED: 'referral.vendor_bonus',
  VENDOR_PENALTY: 'vendor.penalty',

  // comms (order threads + Ore Support)
  COMMS_MESSAGE_CREATED: 'comms.message_created',
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

/** Envelope every event carries. Consumers dedupe on `id`. */
export interface EventEnvelope<T = unknown> {
  id: string; // `<source>.<uuid>` — the idempotency key
  name: EventName;
  ts: string; // ISO
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
