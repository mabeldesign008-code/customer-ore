/** Shared enums — the vocabulary of the whole platform. Keep in sync with docs. */

export enum Role {
  CUSTOMER = 'customer',
  VENDOR = 'vendor',
  RIDER = 'rider',
  ADMIN = 'admin',
}

export enum ApplicationStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  VERIFICATION_PENDING = 'VERIFICATION_PENDING',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REQUIRES_ACTION = 'REQUIRES_ACTION',
  SUSPENDED = 'SUSPENDED',
}

export enum SmileIdStatus {
  NOT_STARTED = 'NOT_STARTED',
  PROCESSING = 'PROCESSING',
  APPROVED = 'APPROVED',
  FAILED = 'FAILED',
  QUEUED_FOR_MANUAL = 'QUEUED_FOR_MANUAL',
}

export enum GhanaIdType {
  GHANA_CARD = 'GHANA_CARD',
  PASSPORT = 'PASSPORT',
  DRIVERS_LICENSE = 'DRIVERS_LICENSE',
}

/** Per-vendor order lifecycle (see docs/01 §2 state machine). */
export enum PrescriptionStatus {
  NOT_REQUIRED = 'NOT_REQUIRED',
  PENDING_UPLOAD = 'PENDING_UPLOAD',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum OrderStatus {
  AWAITING_RECIPIENT = 'AWAITING_RECIPIENT', // gift order (doc §3 Case 2): recipient must confirm location before the order begins
  PENDING_PAYMENT = 'PENDING_PAYMENT', // prepaid only, waiting for Paystack webhook
  CONFIRMED = 'CONFIRMED', // paid (prepaid) or COD accepted, vendor notified
  ACCEPTED = 'ACCEPTED', // vendor accepted, prep timer running
  PREPARING = 'PREPARING', // kitchen cooking
  READY_FOR_PICKUP = 'READY_FOR_PICKUP', // vendor handed over to dispatch window
  RIDER_ASSIGNED = 'RIDER_ASSIGNED',
  RIDER_EN_ROUTE_TO_VENDOR = 'RIDER_EN_ROUTE_TO_VENDOR',
  RIDER_AT_VENDOR = 'RIDER_AT_VENDOR',
  PICKED_UP = 'PICKED_UP',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  OTP_VERIFIED = 'OTP_VERIFIED',
  DELIVERED = 'DELIVERED',
  WAITING_FOR_RIDER = 'WAITING_FOR_RIDER', // no rider found yet
  REJECTED = 'REJECTED', // vendor declined
  CANCELLED = 'CANCELLED', // any pre-pickup abort (refund matrix)
  FAILED_DELIVERY = 'FAILED_DELIVERY', // customer unreachable at the door
}

export enum PaymentMethod {
  PREPAID = 'PREPAID',
  COD = 'COD',
}

export enum CheckoutPaymentStatus {
  INITIATED = 'INITIATED',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  FULLY_REFUNDED = 'FULLY_REFUNDED',
}

export enum RefundStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
}

export enum RiderStatus {
  OFFLINE = 'OFFLINE',
  PAUSED = 'PAUSED',
  AVAILABLE = 'AVAILABLE',
  OFFERED = 'OFFERED', // has a pending offer
  ASSIGNED = 'ASSIGNED',
  EN_ROUTE_TO_VENDOR = 'EN_ROUTE_TO_VENDOR',
  AT_VENDOR = 'AT_VENDOR',
  PICKED_UP = 'PICKED_UP',
  DELIVERING = 'DELIVERING',
  RETURNING = 'RETURNING', // failed delivery, returning to vendor
}

/** Public Rider identifier lifecycle. The Rider ID itself remains immutable except through audited correction. */
export enum RiderIdentifierStatus {
  UNASSIGNED = 'UNASSIGNED',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum OfferStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED',
  SUPERSEDED = 'SUPERSEDED', // cancelled before answer (order died)
}

export enum VehicleType {
  BICYCLE = 'BICYCLE',
  MOTORBIKE = 'MOTORBIKE',
  CAR = 'CAR',
}

export enum CodCashStatus {
  EXPECTED = 'EXPECTED', // order delivered COD, cash owed by rider
  COLLECTED = 'COLLECTED', // rider recorded collection
  REMITTED = 'REMITTED', // rider transferred net to platform
  FLAGGED = 'FLAGGED', // mismatch / SLA breach
}

/** Doc §5 Rider — COD exposure tiers (limits configurable via env). */
export enum RiderCodTier {
  NEW = 'NEW',
  EXPERIENCED = 'EXPERIENCED',
  SENIOR = 'SENIOR',
}

/** Doc §5 Rider — COD cash-control ladder. CLEAR is the only fully-eligible state. */
export enum RiderCodStatus {
  CLEAR = 'CLEAR', // fully eligible for COD
  WARNING = 'WARNING', // outstanding COD overdue ≥24h — reminder, still eligible
  SUSPENDED = 'SUSPENDED', // overdue ≥48h — blocked from new COD orders
  INVESTIGATION = 'INVESTIGATION', // overdue ≥72h — offline, no new orders
  TERMINATED = 'TERMINATED', // overdue >72h — rider deactivated
}

/** Doc §5 Rider wallet — withdrawal lifecycle (money out, webhook/transfer = truth). */
export enum WithdrawalStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  PROCESSING = 'PROCESSING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REJECTED = 'REJECTED',
}

/** Doc §4 Vendor — weekly settlement lifecycle (money out via Paystack Transfers). */
export enum VendorSettlementStatus {
  READY = 'READY', // computed, awaiting admin payout execution
  PAID = 'PAID',
  FAILED = 'FAILED', // transfer failed — retryable
  REVERSED = 'REVERSED', // instant reversal on fault (doc §4) → vendor owes the amount
}

/** Doc §Payment — customer-raised issue on a delivered order. */
export enum DisputeReason {
  MISSING_ITEM = 'MISSING_ITEM',
  WRONG_ITEM = 'WRONG_ITEM',
  DAMAGED = 'DAMAGED',
  QUALITY = 'QUALITY',
  NEVER_DELIVERED = 'NEVER_DELIVERED',
  OVERCHARGED = 'OVERCHARGED',
  OTHER = 'OTHER',
}

export enum DisputeStatus {
  OPEN = 'OPEN',
  INVESTIGATING = 'INVESTIGATING',
  RESOLVED_REFUND = 'RESOLVED_REFUND', // full refund granted
  RESOLVED_PARTIAL = 'RESOLVED_PARTIAL', // partial refund granted
  RESOLVED_NO_REFUND = 'RESOLVED_NO_REFUND', // dismissed — no refund
  CLOSED = 'CLOSED', // closed by admin without money movement (e.g. customer withdrew)
}

/** Doc §Payment fault matrix — who bears the cost of a resolution. */
export enum FaultParty {
  VENDOR = 'VENDOR',
  RIDER = 'RIDER',
  PLATFORM = 'PLATFORM',
  CUSTOMER = 'CUSTOMER',
}

/** Refund priority (doc §Payment): wallet credit first, then original payment method. */
export enum RefundMethod {
  WALLET = 'WALLET',
  ORIGINAL = 'ORIGINAL',
}

/** Doc §Payment — bank/PSP-initiated dispute (freeze → evidence → won/lost). */
export enum ChargebackStatus {
  OPEN = 'OPEN', // received — funds frozen
  FROZEN = 'FROZEN',
  WON = 'WON', // dismissed — platform keeps the funds
  LOST = 'LOST', // platform refunds to the bank
}

/** Doc §2 — dispatch grouping/batching: one rider, multiple pickups/drops. */
export enum BatchType {
  GROUP_VENDORS = 'GROUP_VENDORS', // same customer, several nearby vendors (grouped under ETA threshold)
  BATCH_CUSTOMERS = 'BATCH_CUSTOMERS', // several customers, route-compatible (2–3 at launch)
}

export enum BatchStatus {
  PENDING = 'PENDING', // offers are out, no rider has accepted yet
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  RELEASED = 'RELEASED',
}

/** Doc §Errands — task-based orders (not catalogue): buy-and-deliver, bill pay, multi-stop. */
export enum OrderType {
  CATALOGUE = 'CATALOGUE',
  ERRAND = 'ERRAND',
  PARCEL = 'PARCEL',
}

/** Escrow lifecycle for an errand — money is held before the rider shops (no fronting). */
export enum ErrandStatus {
  AWAITING_PAYMENT = 'AWAITING_PAYMENT',
  CONFIRMED = 'CONFIRMED', // escrow charged (webhook = truth)
  DISPATCHING = 'DISPATCHING',
  ASSIGNED = 'ASSIGNED',
  SHOPPING = 'SHOPPING', // rider at the shop, buying within the budget
  PURCHASED = 'PURCHASED', // receipt(s) submitted ≤ budget
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}

export enum SubstitutionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/** Doc §Errands trust tiers — how much errand value a rider may carry at once. */
export enum ErrandTrustTier {
  NEW = 'NEW', // GHS 300
  VERIFIED = 'VERIFIED', // GHS 1,000
  TRUSTED = 'TRUSTED', // GHS 3,000
  CAP = 'CAP', // GHS 5,000
}

export enum GeocoderSource {
  AUTO_DETECT = 'AUTO_DETECT',
  GOOGLE_MAPS = 'GOOGLE_MAPS',
  /**
   * OpenStreetMap Nominatim. Distinct from GOOGLE_MAPS on purpose (audit S-10): the
   * geocoder falls back to Nominatim when Google fails, and it used to report
   * `GOOGLE_MAPS` regardless — so a dead or quota-exhausted Google key was
   * indistinguishable from a working one, and Nominatim results (different accuracy,
   * different ToS: 1 req/s, no heavy production use) were attributed to a provider
   * that never saw the request. Provenance is the whole point of this field.
   */
  OPENSTREETMAP = 'OPENSTREETMAP',
  WHAT3WORDS = 'WHAT3WORDS',
  GHANA_GPS = 'GHANA_GPS',
  MANUAL = 'MANUAL',
}

export enum CartStatus {
  ACTIVE = 'ACTIVE',
  CHECKED_OUT = 'CHECKED_OUT',
  ABANDONED = 'ABANDONED',
}

export const ORDER_ACTIVE_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING_PAYMENT,
  OrderStatus.CONFIRMED,
  OrderStatus.ACCEPTED,
  OrderStatus.PREPARING,
  OrderStatus.READY_FOR_PICKUP,
  OrderStatus.RIDER_ASSIGNED,
  OrderStatus.RIDER_EN_ROUTE_TO_VENDOR,
  OrderStatus.RIDER_AT_VENDOR,
  OrderStatus.PICKED_UP,
  OrderStatus.OUT_FOR_DELIVERY,
  OrderStatus.OTP_VERIFIED,
  OrderStatus.WAITING_FOR_RIDER,
];

export const ORDER_TERMINAL_STATUSES: OrderStatus[] = [
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
  OrderStatus.REJECTED,
  OrderStatus.FAILED_DELIVERY,
];

/**
 * Ore services.
 * Catalogue vendors (customer → vendor → rider): FOOD, GROCERY, MARKET, PHARMACY, SHOP, LAUNDRY.
 * Request services (customer → rider only, no vendor store): PARCEL, ERRAND.
 * PARCEL / ERRAND stay on this enum as order sentinels (`vendorId` = 'PARCEL' | 'ERRAND').
 */
export enum VendorType {
  FOOD = 'FOOD',
  GROCERY = 'GROCERY',
  MARKET = 'MARKET',
  PHARMACY = 'PHARMACY',
  SHOP = 'SHOP',
  LAUNDRY = 'LAUNDRY',
  PARCEL = 'PARCEL',
  ERRAND = 'ERRAND',
}

export const CATALOGUE_VENDOR_TYPES: readonly VendorType[] = [
  VendorType.FOOD,
  VendorType.GROCERY,
  VendorType.MARKET,
  VendorType.PHARMACY,
  VendorType.SHOP,
  VendorType.LAUNDRY,
];

export const REQUEST_SERVICE_TYPES: readonly VendorType[] = [
  VendorType.PARCEL,
  VendorType.ERRAND,
];

export function isCatalogueVendorType(value: string | null | undefined): value is VendorType {
  return !!value && (CATALOGUE_VENDOR_TYPES as readonly string[]).includes(value);
}

/** Service codes: FO, GR, MK, PH, SH, LD, PR, ER. */
export const SERVICE_CODE: Record<VendorType, string> = {
  [VendorType.FOOD]: 'FO',
  [VendorType.GROCERY]: 'GR',
  [VendorType.MARKET]: 'MK',
  [VendorType.PHARMACY]: 'PH',
  [VendorType.SHOP]: 'SH',
  [VendorType.LAUNDRY]: 'LD',
  [VendorType.PARCEL]: 'PR',
  [VendorType.ERRAND]: 'ER',
};

/** Vendor commission % for catalogue types. Parcel/errand are platform fees, not a store cut. */
export const CategoryCommission: Record<VendorType, number> = {
  [VendorType.FOOD]: 18,
  [VendorType.GROCERY]: 12,
  [VendorType.MARKET]: 10,
  [VendorType.PHARMACY]: 10,
  [VendorType.SHOP]: 12,
  [VendorType.LAUNDRY]: 12,
  // Request-only services; no standard vendor commission applies unless an approved exception config overrides it.
  [VendorType.PARCEL]: 0,
  [VendorType.ERRAND]: 0,
};

/** Doc §8 Referral — customer referral + milestone/bonus program states. */
export enum ReferralStatus {
  PENDING = 'PENDING', // referee claimed a code, awaiting first qualifying order
  QUALIFIED = 'QUALIFIED', // first successful non-refunded order ≥ min met — credits due
  CREDITED = 'CREDITED', // referrer + referee credited
  EXPIRED = 'EXPIRED', // never qualified
  BLOCKED = 'BLOCKED', // fraud hold
}

export enum VendorPlan {
  STANDARD = 'STANDARD',
  PREMIUM = 'PREMIUM',
}

export enum VendorPenaltyLevel {
  WARNING = 'WARNING',
  FINANCIAL = 'FINANCIAL',
  SUSPENSION_24H = 'SUSPENSION_24H',
  SUSPENSION_72H = 'SUSPENSION_72H',
  SUSPENSION_7D = 'SUSPENSION_7D',
  PERMANENT = 'PERMANENT',
}

export enum StoryKind {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
}
