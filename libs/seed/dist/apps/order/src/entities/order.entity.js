"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Order = void 0;
const typeorm_1 = require("typeorm");
const contracts_1 = require("@ore/contracts");
let Order = class Order {
    id;
    ref; // human/support number: ore-cc-XXXXXX
    checkoutId;
    orderType;
    errandJson; // set only for orderType=ERRAND
    parcelJson; // set only for orderType=PARCEL
    /** Doc §3 Case 2 — gift/order-for-someone: recipient confirms the drop before dispatch. */
    recipientJson;
    /** Indexed gift-link token (same value as recipientJson.token) so confirm does not scan rows. */
    giftToken;
    customerPhone; // needed to init the escrow/charge after the recipient confirms
    vendorId;
    vendorName;
    vendorType;
    serviceCode;
    feePolicyVersion;
    /**
     * Vendor commission in basis points (1800 = 18%).
     *
     * Was `float`. A rate is not money, but it decides money: 17.7 has no exact binary float
     * representation, so recomputing a vendor's share from the stored rate could disagree with
     * what the customer was actually charged — on some orders and not others, which is the
     * expensive kind of discrepancy to chase.
     */
    commissionBps;
    customerId;
    paymentMethod;
    status;
    prescriptionStatus;
    prescriptionKey;
    prescriptionContentType;
    prescriptionReviewNote;
    conditionJson;
    /** Market/weight fulfillment snapshot; financial adjustments are not applied without a payment contract. */
    marketFulfillmentJson;
    laundryStage;
    addressJson;
    /** Snapshot of the Vendor branch used for fulfilment. Null for legacy orders. */
    pickupJson;
    prepTimeMin;
    originalPrepTimeMin;
    prepTimeExtendedByMin;
    prepExtensionCount;
    lastPrepExtendedAt;
    lastPrepExtendedBy;
    lastPrepExtensionReason;
    subtotalPesewas;
    deliveryFeePesewas;
    serviceFeePesewas;
    platformFeePesewas;
    vendorSharePesewas;
    riderFeePesewas;
    totalPesewas;
    promotionId;
    promotionTitle;
    promotionDiscountPesewas;
    /** Customer-paid rider tip. Credited to the assigned rider on delivery. */
    tipPesewas;
    /** Platform-funded peak pay. Credited to the assigned rider on delivery. Not charged to the customer. */
    peakPayPesewas;
    note;
    leaveAtDoor;
    dropNote;
    scheduledFor;
    serviceLevel;
    deliverySignatureKey;
    deliverySignatureContentType;
    riderId;
    otpHash;
    /**
     * Delivery OTP at rest — AES-256-GCM encrypted with the service key (never plaintext).
     * The plaintext is shown to the order owner on demand (G21) and to the gift recipient
     * via SMS by the notification service (which calls the internal reveal endpoint).
     */
    otpCipher;
    otpAttempts;
    acceptedAt;
    readyAt;
    pickedUpAt;
    deliveredAt;
    deliveryProofKey;
    deliveryProofContentType;
    cancelledAt;
    cancelReason;
    createdAt;
    updatedAt;
};
exports.Order = Order;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Order.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Order.prototype, "ref", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Order.prototype, "checkoutId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: contracts_1.OrderType.CATALOGUE }),
    __metadata("design:type", String)
], Order.prototype, "orderType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "errandJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "parcelJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "recipientJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 64, nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "giftToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "customerPhone", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Order.prototype, "vendorId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Order.prototype, "vendorName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'FOOD' }),
    __metadata("design:type", String)
], Order.prototype, "vendorType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'FO' }),
    __metadata("design:type", String)
], Order.prototype, "serviceCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 1 }),
    __metadata("design:type", Number)
], Order.prototype, "feePolicyVersion", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Order.prototype, "commissionBps", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Order.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: contracts_1.PaymentMethod.PREPAID }),
    __metadata("design:type", String)
], Order.prototype, "paymentMethod", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: contracts_1.OrderStatus.PENDING_PAYMENT }),
    __metadata("design:type", String)
], Order.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'NOT_REQUIRED' }),
    __metadata("design:type", String)
], Order.prototype, "prescriptionStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "prescriptionKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "prescriptionContentType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "prescriptionReviewNote", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "conditionJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "marketFulfillmentJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "laundryStage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json' }),
    __metadata("design:type", Object)
], Order.prototype, "addressJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "pickupJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], Order.prototype, "prepTimeMin", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "originalPrepTimeMin", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Order.prototype, "prepTimeExtendedByMin", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Order.prototype, "prepExtensionCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "lastPrepExtendedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "lastPrepExtendedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "lastPrepExtensionReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], Order.prototype, "subtotalPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], Order.prototype, "deliveryFeePesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], Order.prototype, "serviceFeePesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], Order.prototype, "platformFeePesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], Order.prototype, "vendorSharePesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], Order.prototype, "riderFeePesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], Order.prototype, "totalPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "promotionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "promotionTitle", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Order.prototype, "promotionDiscountPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Order.prototype, "tipPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Order.prototype, "peakPayPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "note", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Order.prototype, "leaveAtDoor", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "dropNote", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "scheduledFor", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'STANDARD' }),
    __metadata("design:type", String)
], Order.prototype, "serviceLevel", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "deliverySignatureKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "deliverySignatureContentType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "riderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "otpHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "otpCipher", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Order.prototype, "otpAttempts", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "acceptedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "readyAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "pickedUpAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "deliveredAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "deliveryProofKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "deliveryProofContentType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "cancelledAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "cancelReason", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Order.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Order.prototype, "updatedAt", void 0);
exports.Order = Order = __decorate([
    (0, typeorm_1.Entity)({ schema: 'order' }),
    (0, typeorm_1.Index)(['checkoutId', 'status']),
    (0, typeorm_1.Index)('order_gift_token_uidx', ['giftToken'], { unique: true, where: `"giftToken" IS NOT NULL` })
], Order);
//# sourceMappingURL=order.entity.js.map