"use strict";
/** Shared enums — the vocabulary of the whole platform. Keep in sync with docs. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoryKind = exports.VendorPenaltyLevel = exports.VendorPlan = exports.ReferralStatus = exports.CategoryCommission = exports.SERVICE_CODE = exports.REQUEST_SERVICE_TYPES = exports.CATALOGUE_VENDOR_TYPES = exports.VendorType = exports.ORDER_TERMINAL_STATUSES = exports.ORDER_ACTIVE_STATUSES = exports.CartStatus = exports.GeocoderSource = exports.ErrandTrustTier = exports.SubstitutionStatus = exports.ErrandStatus = exports.OrderType = exports.BatchStatus = exports.BatchType = exports.ChargebackStatus = exports.RefundMethod = exports.FaultParty = exports.DisputeStatus = exports.DisputeReason = exports.VendorSettlementStatus = exports.WithdrawalStatus = exports.RiderCodStatus = exports.RiderCodTier = exports.CodCashStatus = exports.VehicleType = exports.OfferStatus = exports.RiderIdentifierStatus = exports.RiderStatus = exports.RefundStatus = exports.CheckoutPaymentStatus = exports.PaymentMethod = exports.OrderStatus = exports.PrescriptionStatus = exports.GhanaIdType = exports.SmileIdStatus = exports.ApplicationStatus = exports.Role = void 0;
exports.isCatalogueVendorType = isCatalogueVendorType;
var Role;
(function (Role) {
    Role["CUSTOMER"] = "customer";
    Role["VENDOR"] = "vendor";
    Role["RIDER"] = "rider";
    Role["ADMIN"] = "admin";
})(Role || (exports.Role = Role = {}));
var ApplicationStatus;
(function (ApplicationStatus) {
    ApplicationStatus["DRAFT"] = "DRAFT";
    ApplicationStatus["IN_PROGRESS"] = "IN_PROGRESS";
    ApplicationStatus["VERIFICATION_PENDING"] = "VERIFICATION_PENDING";
    ApplicationStatus["PENDING_REVIEW"] = "PENDING_REVIEW";
    ApplicationStatus["APPROVED"] = "APPROVED";
    ApplicationStatus["REJECTED"] = "REJECTED";
    ApplicationStatus["REQUIRES_ACTION"] = "REQUIRES_ACTION";
    ApplicationStatus["SUSPENDED"] = "SUSPENDED";
})(ApplicationStatus || (exports.ApplicationStatus = ApplicationStatus = {}));
var SmileIdStatus;
(function (SmileIdStatus) {
    SmileIdStatus["NOT_STARTED"] = "NOT_STARTED";
    SmileIdStatus["PROCESSING"] = "PROCESSING";
    SmileIdStatus["APPROVED"] = "APPROVED";
    SmileIdStatus["FAILED"] = "FAILED";
    SmileIdStatus["QUEUED_FOR_MANUAL"] = "QUEUED_FOR_MANUAL";
})(SmileIdStatus || (exports.SmileIdStatus = SmileIdStatus = {}));
var GhanaIdType;
(function (GhanaIdType) {
    GhanaIdType["GHANA_CARD"] = "GHANA_CARD";
    GhanaIdType["PASSPORT"] = "PASSPORT";
    GhanaIdType["DRIVERS_LICENSE"] = "DRIVERS_LICENSE";
})(GhanaIdType || (exports.GhanaIdType = GhanaIdType = {}));
/** Per-vendor order lifecycle (see docs/01 §2 state machine). */
var PrescriptionStatus;
(function (PrescriptionStatus) {
    PrescriptionStatus["NOT_REQUIRED"] = "NOT_REQUIRED";
    PrescriptionStatus["PENDING_UPLOAD"] = "PENDING_UPLOAD";
    PrescriptionStatus["SUBMITTED"] = "SUBMITTED";
    PrescriptionStatus["APPROVED"] = "APPROVED";
    PrescriptionStatus["REJECTED"] = "REJECTED";
})(PrescriptionStatus || (exports.PrescriptionStatus = PrescriptionStatus = {}));
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["AWAITING_RECIPIENT"] = "AWAITING_RECIPIENT";
    OrderStatus["PENDING_PAYMENT"] = "PENDING_PAYMENT";
    OrderStatus["CONFIRMED"] = "CONFIRMED";
    OrderStatus["ACCEPTED"] = "ACCEPTED";
    OrderStatus["PREPARING"] = "PREPARING";
    OrderStatus["READY_FOR_PICKUP"] = "READY_FOR_PICKUP";
    OrderStatus["RIDER_ASSIGNED"] = "RIDER_ASSIGNED";
    OrderStatus["RIDER_EN_ROUTE_TO_VENDOR"] = "RIDER_EN_ROUTE_TO_VENDOR";
    OrderStatus["RIDER_AT_VENDOR"] = "RIDER_AT_VENDOR";
    OrderStatus["PICKED_UP"] = "PICKED_UP";
    OrderStatus["OUT_FOR_DELIVERY"] = "OUT_FOR_DELIVERY";
    OrderStatus["OTP_VERIFIED"] = "OTP_VERIFIED";
    OrderStatus["DELIVERED"] = "DELIVERED";
    OrderStatus["WAITING_FOR_RIDER"] = "WAITING_FOR_RIDER";
    OrderStatus["REJECTED"] = "REJECTED";
    OrderStatus["CANCELLED"] = "CANCELLED";
    OrderStatus["FAILED_DELIVERY"] = "FAILED_DELIVERY";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["PREPAID"] = "PREPAID";
    PaymentMethod["COD"] = "COD";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var CheckoutPaymentStatus;
(function (CheckoutPaymentStatus) {
    CheckoutPaymentStatus["INITIATED"] = "INITIATED";
    CheckoutPaymentStatus["SUCCESS"] = "SUCCESS";
    CheckoutPaymentStatus["FAILED"] = "FAILED";
    CheckoutPaymentStatus["PARTIALLY_REFUNDED"] = "PARTIALLY_REFUNDED";
    CheckoutPaymentStatus["FULLY_REFUNDED"] = "FULLY_REFUNDED";
})(CheckoutPaymentStatus || (exports.CheckoutPaymentStatus = CheckoutPaymentStatus = {}));
var RefundStatus;
(function (RefundStatus) {
    RefundStatus["PENDING"] = "PENDING";
    RefundStatus["PROCESSING"] = "PROCESSING";
    RefundStatus["PROCESSED"] = "PROCESSED";
    RefundStatus["FAILED"] = "FAILED";
})(RefundStatus || (exports.RefundStatus = RefundStatus = {}));
var RiderStatus;
(function (RiderStatus) {
    RiderStatus["OFFLINE"] = "OFFLINE";
    RiderStatus["PAUSED"] = "PAUSED";
    RiderStatus["AVAILABLE"] = "AVAILABLE";
    RiderStatus["OFFERED"] = "OFFERED";
    RiderStatus["ASSIGNED"] = "ASSIGNED";
    RiderStatus["EN_ROUTE_TO_VENDOR"] = "EN_ROUTE_TO_VENDOR";
    RiderStatus["AT_VENDOR"] = "AT_VENDOR";
    RiderStatus["PICKED_UP"] = "PICKED_UP";
    RiderStatus["DELIVERING"] = "DELIVERING";
    RiderStatus["RETURNING"] = "RETURNING";
})(RiderStatus || (exports.RiderStatus = RiderStatus = {}));
/** Public Rider identifier lifecycle. The Rider ID itself remains immutable except through audited correction. */
var RiderIdentifierStatus;
(function (RiderIdentifierStatus) {
    RiderIdentifierStatus["UNASSIGNED"] = "UNASSIGNED";
    RiderIdentifierStatus["ACTIVE"] = "ACTIVE";
    RiderIdentifierStatus["ARCHIVED"] = "ARCHIVED";
})(RiderIdentifierStatus || (exports.RiderIdentifierStatus = RiderIdentifierStatus = {}));
var OfferStatus;
(function (OfferStatus) {
    OfferStatus["PENDING"] = "PENDING";
    OfferStatus["ACCEPTED"] = "ACCEPTED";
    OfferStatus["DECLINED"] = "DECLINED";
    OfferStatus["EXPIRED"] = "EXPIRED";
    OfferStatus["SUPERSEDED"] = "SUPERSEDED";
})(OfferStatus || (exports.OfferStatus = OfferStatus = {}));
var VehicleType;
(function (VehicleType) {
    VehicleType["BICYCLE"] = "BICYCLE";
    VehicleType["MOTORBIKE"] = "MOTORBIKE";
    VehicleType["CAR"] = "CAR";
})(VehicleType || (exports.VehicleType = VehicleType = {}));
var CodCashStatus;
(function (CodCashStatus) {
    CodCashStatus["EXPECTED"] = "EXPECTED";
    CodCashStatus["COLLECTED"] = "COLLECTED";
    CodCashStatus["REMITTED"] = "REMITTED";
    CodCashStatus["FLAGGED"] = "FLAGGED";
})(CodCashStatus || (exports.CodCashStatus = CodCashStatus = {}));
/** Doc §5 Rider — COD exposure tiers (limits configurable via env). */
var RiderCodTier;
(function (RiderCodTier) {
    RiderCodTier["NEW"] = "NEW";
    RiderCodTier["EXPERIENCED"] = "EXPERIENCED";
    RiderCodTier["SENIOR"] = "SENIOR";
})(RiderCodTier || (exports.RiderCodTier = RiderCodTier = {}));
/** Doc §5 Rider — COD cash-control ladder. CLEAR is the only fully-eligible state. */
var RiderCodStatus;
(function (RiderCodStatus) {
    RiderCodStatus["CLEAR"] = "CLEAR";
    RiderCodStatus["WARNING"] = "WARNING";
    RiderCodStatus["SUSPENDED"] = "SUSPENDED";
    RiderCodStatus["INVESTIGATION"] = "INVESTIGATION";
    RiderCodStatus["TERMINATED"] = "TERMINATED";
})(RiderCodStatus || (exports.RiderCodStatus = RiderCodStatus = {}));
/** Doc §5 Rider wallet — withdrawal lifecycle (money out, webhook/transfer = truth). */
var WithdrawalStatus;
(function (WithdrawalStatus) {
    WithdrawalStatus["REQUESTED"] = "REQUESTED";
    WithdrawalStatus["APPROVED"] = "APPROVED";
    WithdrawalStatus["PROCESSING"] = "PROCESSING";
    WithdrawalStatus["PAID"] = "PAID";
    WithdrawalStatus["FAILED"] = "FAILED";
    WithdrawalStatus["REJECTED"] = "REJECTED";
})(WithdrawalStatus || (exports.WithdrawalStatus = WithdrawalStatus = {}));
/** Doc §4 Vendor — weekly settlement lifecycle (money out via Paystack Transfers). */
var VendorSettlementStatus;
(function (VendorSettlementStatus) {
    VendorSettlementStatus["READY"] = "READY";
    VendorSettlementStatus["PAID"] = "PAID";
    VendorSettlementStatus["FAILED"] = "FAILED";
    VendorSettlementStatus["REVERSED"] = "REVERSED";
})(VendorSettlementStatus || (exports.VendorSettlementStatus = VendorSettlementStatus = {}));
/** Doc §Payment — customer-raised issue on a delivered order. */
var DisputeReason;
(function (DisputeReason) {
    DisputeReason["MISSING_ITEM"] = "MISSING_ITEM";
    DisputeReason["WRONG_ITEM"] = "WRONG_ITEM";
    DisputeReason["DAMAGED"] = "DAMAGED";
    DisputeReason["QUALITY"] = "QUALITY";
    DisputeReason["NEVER_DELIVERED"] = "NEVER_DELIVERED";
    DisputeReason["OVERCHARGED"] = "OVERCHARGED";
    DisputeReason["OTHER"] = "OTHER";
})(DisputeReason || (exports.DisputeReason = DisputeReason = {}));
var DisputeStatus;
(function (DisputeStatus) {
    DisputeStatus["OPEN"] = "OPEN";
    DisputeStatus["INVESTIGATING"] = "INVESTIGATING";
    DisputeStatus["RESOLVED_REFUND"] = "RESOLVED_REFUND";
    DisputeStatus["RESOLVED_PARTIAL"] = "RESOLVED_PARTIAL";
    DisputeStatus["RESOLVED_NO_REFUND"] = "RESOLVED_NO_REFUND";
    DisputeStatus["CLOSED"] = "CLOSED";
})(DisputeStatus || (exports.DisputeStatus = DisputeStatus = {}));
/** Doc §Payment fault matrix — who bears the cost of a resolution. */
var FaultParty;
(function (FaultParty) {
    FaultParty["VENDOR"] = "VENDOR";
    FaultParty["RIDER"] = "RIDER";
    FaultParty["PLATFORM"] = "PLATFORM";
    FaultParty["CUSTOMER"] = "CUSTOMER";
})(FaultParty || (exports.FaultParty = FaultParty = {}));
/** Refund priority (doc §Payment): wallet credit first, then original payment method. */
var RefundMethod;
(function (RefundMethod) {
    RefundMethod["WALLET"] = "WALLET";
    RefundMethod["ORIGINAL"] = "ORIGINAL";
})(RefundMethod || (exports.RefundMethod = RefundMethod = {}));
/** Doc §Payment — bank/PSP-initiated dispute (freeze → evidence → won/lost). */
var ChargebackStatus;
(function (ChargebackStatus) {
    ChargebackStatus["OPEN"] = "OPEN";
    ChargebackStatus["FROZEN"] = "FROZEN";
    ChargebackStatus["WON"] = "WON";
    ChargebackStatus["LOST"] = "LOST";
})(ChargebackStatus || (exports.ChargebackStatus = ChargebackStatus = {}));
/** Doc §2 — dispatch grouping/batching: one rider, multiple pickups/drops. */
var BatchType;
(function (BatchType) {
    BatchType["GROUP_VENDORS"] = "GROUP_VENDORS";
    BatchType["BATCH_CUSTOMERS"] = "BATCH_CUSTOMERS";
})(BatchType || (exports.BatchType = BatchType = {}));
var BatchStatus;
(function (BatchStatus) {
    BatchStatus["PENDING"] = "PENDING";
    BatchStatus["ACTIVE"] = "ACTIVE";
    BatchStatus["COMPLETED"] = "COMPLETED";
    BatchStatus["RELEASED"] = "RELEASED";
})(BatchStatus || (exports.BatchStatus = BatchStatus = {}));
/** Doc §Errands — task-based orders (not catalogue): buy-and-deliver, bill pay, multi-stop. */
var OrderType;
(function (OrderType) {
    OrderType["CATALOGUE"] = "CATALOGUE";
    OrderType["ERRAND"] = "ERRAND";
    OrderType["PARCEL"] = "PARCEL";
})(OrderType || (exports.OrderType = OrderType = {}));
/** Escrow lifecycle for an errand — money is held before the rider shops (no fronting). */
var ErrandStatus;
(function (ErrandStatus) {
    ErrandStatus["AWAITING_PAYMENT"] = "AWAITING_PAYMENT";
    ErrandStatus["CONFIRMED"] = "CONFIRMED";
    ErrandStatus["DISPATCHING"] = "DISPATCHING";
    ErrandStatus["ASSIGNED"] = "ASSIGNED";
    ErrandStatus["SHOPPING"] = "SHOPPING";
    ErrandStatus["PURCHASED"] = "PURCHASED";
    ErrandStatus["DELIVERED"] = "DELIVERED";
    ErrandStatus["CANCELLED"] = "CANCELLED";
    ErrandStatus["FAILED"] = "FAILED";
})(ErrandStatus || (exports.ErrandStatus = ErrandStatus = {}));
var SubstitutionStatus;
(function (SubstitutionStatus) {
    SubstitutionStatus["PENDING"] = "PENDING";
    SubstitutionStatus["APPROVED"] = "APPROVED";
    SubstitutionStatus["REJECTED"] = "REJECTED";
})(SubstitutionStatus || (exports.SubstitutionStatus = SubstitutionStatus = {}));
/** Doc §Errands trust tiers — how much errand value a rider may carry at once. */
var ErrandTrustTier;
(function (ErrandTrustTier) {
    ErrandTrustTier["NEW"] = "NEW";
    ErrandTrustTier["VERIFIED"] = "VERIFIED";
    ErrandTrustTier["TRUSTED"] = "TRUSTED";
    ErrandTrustTier["CAP"] = "CAP";
})(ErrandTrustTier || (exports.ErrandTrustTier = ErrandTrustTier = {}));
var GeocoderSource;
(function (GeocoderSource) {
    GeocoderSource["AUTO_DETECT"] = "AUTO_DETECT";
    GeocoderSource["GOOGLE_MAPS"] = "GOOGLE_MAPS";
    /**
     * OpenStreetMap Nominatim. Distinct from GOOGLE_MAPS on purpose (audit S-10): the
     * geocoder falls back to Nominatim when Google fails, and it used to report
     * `GOOGLE_MAPS` regardless — so a dead or quota-exhausted Google key was
     * indistinguishable from a working one, and Nominatim results (different accuracy,
     * different ToS: 1 req/s, no heavy production use) were attributed to a provider
     * that never saw the request. Provenance is the whole point of this field.
     */
    GeocoderSource["OPENSTREETMAP"] = "OPENSTREETMAP";
    GeocoderSource["WHAT3WORDS"] = "WHAT3WORDS";
    GeocoderSource["GHANA_GPS"] = "GHANA_GPS";
    GeocoderSource["MANUAL"] = "MANUAL";
})(GeocoderSource || (exports.GeocoderSource = GeocoderSource = {}));
var CartStatus;
(function (CartStatus) {
    CartStatus["ACTIVE"] = "ACTIVE";
    CartStatus["CHECKED_OUT"] = "CHECKED_OUT";
    CartStatus["ABANDONED"] = "ABANDONED";
})(CartStatus || (exports.CartStatus = CartStatus = {}));
exports.ORDER_ACTIVE_STATUSES = [
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
exports.ORDER_TERMINAL_STATUSES = [
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
var VendorType;
(function (VendorType) {
    VendorType["FOOD"] = "FOOD";
    VendorType["GROCERY"] = "GROCERY";
    VendorType["MARKET"] = "MARKET";
    VendorType["PHARMACY"] = "PHARMACY";
    VendorType["SHOP"] = "SHOP";
    VendorType["LAUNDRY"] = "LAUNDRY";
    VendorType["PARCEL"] = "PARCEL";
    VendorType["ERRAND"] = "ERRAND";
})(VendorType || (exports.VendorType = VendorType = {}));
exports.CATALOGUE_VENDOR_TYPES = [
    VendorType.FOOD,
    VendorType.GROCERY,
    VendorType.MARKET,
    VendorType.PHARMACY,
    VendorType.SHOP,
    VendorType.LAUNDRY,
];
exports.REQUEST_SERVICE_TYPES = [
    VendorType.PARCEL,
    VendorType.ERRAND,
];
function isCatalogueVendorType(value) {
    return !!value && exports.CATALOGUE_VENDOR_TYPES.includes(value);
}
/** Service codes: FO, GR, MK, PH, SH, LD, PR, ER. */
exports.SERVICE_CODE = {
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
exports.CategoryCommission = {
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
var ReferralStatus;
(function (ReferralStatus) {
    ReferralStatus["PENDING"] = "PENDING";
    ReferralStatus["QUALIFIED"] = "QUALIFIED";
    ReferralStatus["CREDITED"] = "CREDITED";
    ReferralStatus["EXPIRED"] = "EXPIRED";
    ReferralStatus["BLOCKED"] = "BLOCKED";
})(ReferralStatus || (exports.ReferralStatus = ReferralStatus = {}));
var VendorPlan;
(function (VendorPlan) {
    VendorPlan["STANDARD"] = "STANDARD";
    VendorPlan["PREMIUM"] = "PREMIUM";
})(VendorPlan || (exports.VendorPlan = VendorPlan = {}));
var VendorPenaltyLevel;
(function (VendorPenaltyLevel) {
    VendorPenaltyLevel["WARNING"] = "WARNING";
    VendorPenaltyLevel["FINANCIAL"] = "FINANCIAL";
    VendorPenaltyLevel["SUSPENSION_24H"] = "SUSPENSION_24H";
    VendorPenaltyLevel["SUSPENSION_72H"] = "SUSPENSION_72H";
    VendorPenaltyLevel["SUSPENSION_7D"] = "SUSPENSION_7D";
    VendorPenaltyLevel["PERMANENT"] = "PERMANENT";
})(VendorPenaltyLevel || (exports.VendorPenaltyLevel = VendorPenaltyLevel = {}));
var StoryKind;
(function (StoryKind) {
    StoryKind["IMAGE"] = "IMAGE";
    StoryKind["VIDEO"] = "VIDEO";
})(StoryKind || (exports.StoryKind = StoryKind = {}));
//# sourceMappingURL=enums.js.map