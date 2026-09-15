"use strict";
/** Shared request/response DTOs (plain interfaces + zod schemas where validation matters). */
Object.defineProperty(exports, "__esModule", { value: true });
exports.commsVoicePresenceSchema = exports.createCommsAgentTokenSchema = exports.createCommsSupportCallSchema = exports.createCommsCallSchema = exports.createCommsVoiceTokenSchema = exports.commsVoicePlatformSchema = exports.commsVoiceTargetSchema = exports.postCommsMessageSchema = exports.createCommsThreadSchema = exports.commsThreadKindSchema = exports.locationUpdateSchema = exports.pickupSchema = exports.pickupProofMethodSchema = exports.declineOfferSchema = exports.acceptOfferSchema = exports.createRiderBlockSchema = exports.riderSessionSchema = exports.loyaltyRedeemSchema = exports.redeemVoucherSchema = exports.reorderSchema = exports.patchRiderProfileSchema = exports.riderIncidentSchema = exports.riderPauseSchema = exports.riderAvailabilitySchema = exports.confirmOtpSchema = exports.delayedOrderSchema = exports.readyOrderSchema = exports.rejectOrderSchema = exports.acceptOrderSchema = exports.checkoutSchema = exports.customerCodPolicySchema = exports.savedAddressCorrectionSchema = exports.savedAddressUpsertSchema = exports.deliveryAddressSchema = exports.addCartItemSchema = exports.selectedOptionSchema = exports.vendorStage5Schema = exports.vendorStage4Schema = exports.vendorStage3Schema = exports.vendorStage2Schema = exports.vendorStage1Schema = exports.riderStage4Schema = exports.riderStage3Schema = exports.riderStage2Schema = exports.riderStage1Schema = exports.refreshTokenSchema = exports.adminLoginSchema = exports.updateProfileSchema = exports.verifyOtpSchema = exports.requestOtpSchema = void 0;
exports.reportIssueSchema = exports.prescriptionReviewSchema = exports.uploadPrescriptionSchema = exports.codBlockSchema = exports.riderIdentifierCorrectionSchema = exports.onboardRiderSchema = exports.setRiderVerifiedSchema = exports.adminAssignSchema = exports.riderAvailabilityBodySchema = exports.registerRiderSchema = exports.rejectWithdrawalSchema = exports.verifyRemittanceSchema = exports.releaseVendorReserveSchema = exports.requestVendorWithdrawalSchema = exports.registerDeviceTokenSchema = exports.onboardVendorSchema = exports.reserveStockSchema = exports.vendorReviewResponseSchema = exports.posWebhookSchema = exports.connectPosSchema = exports.addVendorStaffSchema = exports.createVendorLocationSchema = exports.addMenuItemSchema = exports.createVendorSchema = exports.applyPenaltySchema = exports.createVendorReviewSchema = exports.createVendorPromotionSchema = exports.createStorySchema = exports.setVendorPlanSchema = exports.referralBlockSchema = exports.referralClaimSchema = exports.errandSubDecisionSchema = exports.errandSubstitutionSchema = exports.errandReceiptSchema = exports.createErrandSchema = exports.createParcelSchema = exports.adminCustomerCreditSchema = exports.resolveChargebackSchema = exports.openChargebackSchema = exports.resolveDisputeSchema = exports.openDisputeSchema = exports.vendorSettlementReverseSchema = exports.vendorSettlementPaySchema = exports.walletAdjustSchema = exports.codStatusSchema = exports.codTierSchema = exports.withdrawalRequestSchema = exports.remittanceSchema = exports.refundRequestSchema = exports.commsCallEventSchema = void 0;
exports.internalRefundSchema = exports.vendorTransferSchema = exports.transferSchema = exports.initializePaymentSchema = exports.internalSetRiderFeeSchema = exports.forceStateSchema = exports.adminCancelSchema = exports.orderCancelSchema = exports.orderDelaySchema = exports.marketFulfillmentSchema = exports.riderIncidentAttributionSchema = exports.performanceCorrectionSchema = exports.performanceHistorySearchSchema = exports.performanceReviewRunSchema = exports.performanceMetricInputSchema = exports.performanceConfigUpsertSchema = exports.performanceEngineConfigSchema = exports.performanceMetricConfigSchema = exports.deliveryPartnerTaxProfileUpsertSchema = exports.vendorTaxProfileUpsertSchema = exports.taxReviewResolveSchema = exports.taxComponentClassificationSchema = exports.taxRuleUpsertSchema = exports.orderAddressCorrectionSchema = exports.confirmGiftLocationSchema = exports.uploadDeliverySignatureSchema = exports.uploadDeliveryProofSchema = exports.laundryConditionPhotoSchema = exports.laundryConditionSchema = exports.laundryStageSchema = exports.resolveIssueSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("./enums");
// ── Auth ────────────────────────────────────────────────────────────
exports.requestOtpSchema = zod_1.z.object({
    phone: zod_1.z.string().min(8, 'Phone number required'),
    role: zod_1.z.nativeEnum(enums_1.Role).optional(),
    name: zod_1.z.string().min(2).max(80).optional(),
});
exports.verifyOtpSchema = zod_1.z.object({
    phone: zod_1.z.string(),
    code: zod_1.z.string().length(6),
    targetRole: zod_1.z.nativeEnum(enums_1.Role).optional(),
    deviceToken: zod_1.z.string().optional(),
    deviceFingerprint: zod_1.z.string().optional(),
});
exports.updateProfileSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Full name must be at least 2 characters').max(100),
    email: zod_1.z.string().email('Invalid email address').optional().nullable(),
    termsAccepted: zod_1.z.boolean().optional(),
});
exports.adminLoginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8).max(200),
    totpCode: zod_1.z.string().regex(/^\d{6}$/, 'TOTP must be 6 digits'),
});
exports.refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(16),
});
// ── Rider Staged Onboarding DTOs ─────────────────────────────────────
exports.riderStage1Schema = zod_1.z.object({
    firstName: zod_1.z.string().min(2),
    lastName: zod_1.z.string().min(2),
    dob: zod_1.z.string().refine((val) => {
        const age = (Date.now() - new Date(val).getTime()) / (365.25 * 24 * 3600 * 1000);
        return age >= 18;
    }, 'Rider must be at least 18 years old'),
    gender: zod_1.z.enum(['MALE', 'FEMALE', 'OTHER']),
    email: zod_1.z.string().email(),
    residentialAddress: zod_1.z.object({
        region: zod_1.z.string().min(2),
        city: zod_1.z.string().min(2),
        digitalAddress: zod_1.z.string().min(5), // GhanaPostGPS
        streetLandmark: zod_1.z.string().min(3),
    }),
    emergencyContact: zod_1.z.object({
        name: zod_1.z.string().min(2),
        relationship: zod_1.z.string().min(2),
        phone: zod_1.z.string().min(8),
    }),
});
exports.riderStage2Schema = zod_1.z.object({
    idType: zod_1.z.enum(['GHANA_CARD', 'PASSPORT', 'DRIVERS_LICENSE']),
    idNumber: zod_1.z.string().min(4),
    selfieBase64: zod_1.z.string().min(100),
    angleImagesBase64: zod_1.z.array(zod_1.z.string()).min(4).max(6),
});
exports.riderStage3Schema = zod_1.z.object({
    ghanaCardNumber: zod_1.z.string().min(5),
    ghanaCardFrontKey: zod_1.z.string().min(1),
    ghanaCardBackKey: zod_1.z.string().optional(),
    driversLicenseKey: zod_1.z.string().optional(),
    roadworthinessKey: zod_1.z.string().optional(),
    insuranceKey: zod_1.z.string().optional(),
});
exports.riderStage4Schema = zod_1.z.object({
    vehicleType: zod_1.z.enum(['BICYCLE', 'MOTORBIKE', 'CAR']),
    make: zod_1.z.string().optional(),
    model: zod_1.z.string().optional(),
    year: zod_1.z.number().int().optional(),
    color: zod_1.z.string().optional(),
    licensePlate: zod_1.z.string().optional(),
    vehiclePhotos: zod_1.z.array(zod_1.z.string()).optional(),
    payout: zod_1.z.object({
        type: zod_1.z.enum(['MOMO', 'BANK']),
        provider: zod_1.z.string().min(2), // MTN, Telecel, AT or Bank Name
        accountNumber: zod_1.z.string().min(6),
        accountName: zod_1.z.string().min(3),
    }),
});
// ── Vendor Staged Onboarding DTOs ────────────────────────────────────
exports.vendorStage1Schema = zod_1.z.object({
    vendorType: zod_1.z.enum([
        enums_1.VendorType.FOOD,
        enums_1.VendorType.GROCERY,
        enums_1.VendorType.MARKET,
        enums_1.VendorType.PHARMACY,
        enums_1.VendorType.SHOP,
        enums_1.VendorType.LAUNDRY,
    ]),
    vendorClass: zod_1.z.enum(['INDIVIDUAL', 'BUSINESS']).default('BUSINESS'),
});
exports.vendorStage2Schema = zod_1.z.object({
    businessName: zod_1.z.string().min(2),
    description: zod_1.z.string().min(10),
    businessPhone: zod_1.z.string().min(8),
    businessEmail: zod_1.z.string().email(),
    displayAddress: zod_1.z.object({
        region: zod_1.z.string().min(2),
        city: zod_1.z.string().min(2),
        streetAddress: zod_1.z.string().min(3),
        landmark: zod_1.z.string().min(2),
        digitalAddress: zod_1.z.string().min(5), // GhanaPostGPS
    }),
    workplaceGps: zod_1.z.object({
        lat: zod_1.z.number().min(-90).max(90),
        lng: zod_1.z.number().min(-180).max(180),
        accuracy: zod_1.z.number().max(100, 'Workplace GPS accuracy must be within 100 meters'),
        isMock: zod_1.z.boolean().refine((val) => !val, 'Mock location / GPS spoofing is prohibited'),
    }),
});
exports.vendorStage3Schema = zod_1.z.object({
    ownerName: zod_1.z.string().min(2),
    ownerRole: zod_1.z.string().min(2),
    ownerPhone: zod_1.z.string().min(8),
    ownerEmail: zod_1.z.string().email(),
    ghanaCardNumber: zod_1.z.string().min(5),
    idType: zod_1.z.enum(['GHANA_CARD', 'PASSPORT', 'DRIVERS_LICENSE']).default('GHANA_CARD'),
    selfieBase64: zod_1.z.string().min(100),
    angleImagesBase64: zod_1.z.array(zod_1.z.string()).min(4).max(6),
});
exports.vendorStage4Schema = zod_1.z.object({
    registrationNumber: zod_1.z.string().min(3),
    businessRegDocKey: zod_1.z.string().min(1),
    tinDocKey: zod_1.z.string().optional(),
    vatDocKey: zod_1.z.string().optional(),
    categoryDocs: zod_1.z.record(zod_1.z.string()).optional(),
});
exports.vendorStage5Schema = zod_1.z.object({
    payout: zod_1.z.object({
        type: zod_1.z.enum(['MOMO', 'BANK']),
        provider: zod_1.z.string().min(2),
        accountNumber: zod_1.z.string().min(6),
        accountName: zod_1.z.string().min(3),
    }),
    acceptedTerms: zod_1.z.boolean().refine((val) => val === true, 'You must accept the Vendor Payment Terms'),
});
exports.selectedOptionSchema = zod_1.z.object({
    groupId: zod_1.z.string().min(1),
    groupName: zod_1.z.string().min(1),
    optionId: zod_1.z.string().min(1),
    optionName: zod_1.z.string().min(1),
    priceAdjustmentPesewas: zod_1.z.number().int().nonnegative(),
});
exports.addCartItemSchema = zod_1.z.object({
    itemId: zod_1.z.string().min(1),
    qty: zod_1.z.number().int().min(1).max(50),
    modifiers: zod_1.z.array(zod_1.z.string()).default([]),
    selectedOptions: zod_1.z.array(exports.selectedOptionSchema).default([]),
});
exports.deliveryAddressSchema = zod_1.z.object({
    /** Human label is presentation only; lat/lng are the delivery source of truth. */
    label: zod_1.z.string().min(1).max(120),
    lat: zod_1.z.number().min(-90).max(90),
    lng: zod_1.z.number().min(-180).max(180),
    source: zod_1.z.string().min(1).max(30),
    details: zod_1.z.string().max(300).optional(),
    landmark: zod_1.z.string().max(160).optional(),
    receiverName: zod_1.z.string().min(1).max(120).optional(),
    receiverPhone: zod_1.z.string().regex(/^(\+?233|0)[1-9][0-9]{8}$/, 'Invalid Ghana receiver phone number').optional(),
    digitalAddress: zod_1.z.string().max(40).optional(),
    what3words: zod_1.z.string().regex(/^(?:\/\/\/)?[a-zA-ZÀ-ÿ.-]+\.[a-zA-ZÀ-ÿ.-]+\.[a-zA-ZÀ-ÿ.-]+$/, 'Invalid what3words address').optional(),
    deliveryInstructions: zod_1.z.string().max(500).optional(),
    confirmationSource: zod_1.z.string().max(40).optional(),
    confirmedAt: zod_1.z.string().datetime().optional(),
});
exports.savedAddressUpsertSchema = zod_1.z.object({
    label: zod_1.z.string().min(1).max(80),
    address: exports.deliveryAddressSchema,
    isDefault: zod_1.z.boolean().optional(),
    reason: zod_1.z.string().max(500).optional(),
});
exports.savedAddressCorrectionSchema = exports.savedAddressUpsertSchema.extend({
    reason: zod_1.z.string().min(5).max(500),
});
exports.customerCodPolicySchema = zod_1.z.object({
    tier: zod_1.z.enum(['NEW', 'STANDARD', 'TRUSTED', 'PREMIUM']).optional(),
    blocked: zod_1.z.boolean().optional(),
    reason: zod_1.z.string().min(5).max(500).optional(),
});
exports.checkoutSchema = zod_1.z.object({
    address: exports.deliveryAddressSchema,
    paymentMethods: zod_1.z
        .array(zod_1.z.object({ vendorId: zod_1.z.string().min(1), method: zod_1.z.nativeEnum(enums_1.PaymentMethod) }))
        .optional(), // default: all PREPAID
    note: zod_1.z.string().max(500).optional(),
    creditPesewas: zod_1.z.number().int().nonnegative().optional(), // wallet credit applied to prepaid (doc §Payment)
    /** When present, only these vendor promotions are applied. Omitted = auto-apply the best active campaign. */
    promotions: zod_1.z.array(zod_1.z.object({ vendorId: zod_1.z.string().min(1), promotionId: zod_1.z.string().min(1) })).optional(),
    /** Optional rider tip per vendor order. 100% to the assigned rider on delivery. Max GHS 500. */
    tips: zod_1.z.array(zod_1.z.object({ vendorId: zod_1.z.string().min(1), tipPesewas: zod_1.z.number().int().nonnegative().max(50_000) })).optional(),
    leaveAtDoor: zod_1.z.boolean().optional(),
    dropNote: zod_1.z.string().max(300).optional(),
    /** ISO datetime. 30 min – 7 days ahead. Dispatch waits until this minus the lead. */
    scheduledFor: zod_1.z.string().datetime().optional(),
    serviceLevel: zod_1.z.enum(['STANDARD', 'SCHEDULED', 'PRIORITY']).optional(),
    /** Optional customer voucher code. Maps onto an active Vendor promotion (6.11). */
    voucherCode: zod_1.z.string().min(3).max(32).optional(),
    recipient: zod_1.z.object({ name: zod_1.z.string().min(1).max(120), phone: zod_1.z.string().regex(/^(\+?233|0)[1-9][0-9]{8}$/, 'Invalid Ghana phone number') }).optional(), // gift (doc §3 Case 2)
});
exports.acceptOrderSchema = zod_1.z.object({ orderId: zod_1.z.string().min(1) });
exports.rejectOrderSchema = zod_1.z.object({ orderId: zod_1.z.string().min(1), reason: zod_1.z.string().optional() });
exports.readyOrderSchema = zod_1.z.object({ orderId: zod_1.z.string().min(1) });
exports.delayedOrderSchema = zod_1.z.object({
    orderId: zod_1.z.string().min(1),
    extraMinutes: zod_1.z.number().int().min(1).max(120).optional(),
    newPrepTimeMin: zod_1.z.number().int().min(1).max(720).optional(),
    reason: zod_1.z.string().min(3).max(300),
}).refine((value) => value.extraMinutes !== undefined || value.newPrepTimeMin !== undefined, {
    message: 'Provide either extraMinutes or newPrepTimeMin',
    path: ['extraMinutes'],
});
exports.confirmOtpSchema = zod_1.z.object({
    otp: zod_1.z.string().length(4),
    riderLat: zod_1.z.number(), // geofence guard: rider must be near the drop point
    riderLng: zod_1.z.number(),
});
// ── Rider / Dispatch ────────────────────────────────────────────────
exports.riderAvailabilitySchema = zod_1.z.object({
    status: zod_1.z.enum(['AVAILABLE', 'OFFLINE']),
});
exports.riderPauseSchema = zod_1.z.object({
    minutes: zod_1.z.number().int().min(1).max(120).default(30),
});
exports.riderIncidentSchema = zod_1.z.object({
    type: zod_1.z.string().min(2).max(50),
    orderId: zod_1.z.string().min(1).optional(),
    note: zod_1.z.string().max(1000).optional(),
    lat: zod_1.z.number().min(-90).max(90).optional(),
    lng: zod_1.z.number().min(-180).max(180).optional(),
    severity: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
});
exports.patchRiderProfileSchema = zod_1.z.object({
    vehicle: zod_1.z.nativeEnum(enums_1.VehicleType),
    licensePlate: zod_1.z.string().max(20).optional().nullable(),
});
exports.reorderSchema = zod_1.z.object({
    orderId: zod_1.z.string().min(1),
});
exports.redeemVoucherSchema = zod_1.z.object({
    code: zod_1.z.string().min(3).max(32),
});
exports.loyaltyRedeemSchema = zod_1.z.object({
    points: zod_1.z.number().int().positive().multipleOf(100),
});
exports.riderSessionSchema = zod_1.z.object({
    durationMin: zod_1.z.number().int().min(15).max(720).default(240),
});
exports.createRiderBlockSchema = zod_1.z.object({
    startsAt: zod_1.z.string().datetime(),
    endsAt: zod_1.z.string().datetime(),
});
exports.acceptOfferSchema = zod_1.z.object({ offerId: zod_1.z.string().min(1) });
exports.declineOfferSchema = zod_1.z.object({ offerId: zod_1.z.string().min(1) });
exports.pickupProofMethodSchema = zod_1.z.enum(['GPS', 'PICKUP_CODE', 'QR', 'VENDOR_CONFIRMATION', 'PHOTO']);
exports.pickupSchema = zod_1.z.object({
    riderLat: zod_1.z.number(),
    riderLng: zod_1.z.number(),
    proofMethod: exports.pickupProofMethodSchema.optional(),
    proofValue: zod_1.z.string().min(1).max(300).optional(),
    proofPhotoKey: zod_1.z.string().min(1).max(500).optional(),
});
// ── Tracking ────────────────────────────────────────────────────────
exports.locationUpdateSchema = zod_1.z.object({
    lat: zod_1.z.number().min(-90).max(90),
    lng: zod_1.z.number().min(-180).max(180),
    orderId: zod_1.z.string().optional(),
    speedKmh: zod_1.z.number().min(0).optional(),
});
// ── Comms (order threads + Ore Support) ─────────────────────────────
exports.commsThreadKindSchema = zod_1.z.enum(['order', 'support']);
exports.createCommsThreadSchema = zod_1.z
    .object({
    kind: exports.commsThreadKindSchema.optional(),
    orderId: zod_1.z.string().min(1).max(80).optional(),
})
    .superRefine((value, ctx) => {
    const kind = value.kind ?? 'order';
    if (kind === 'order' && !value.orderId) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['orderId'],
            message: 'orderId is required for an order thread',
        });
    }
});
exports.postCommsMessageSchema = zod_1.z.object({
    body: zod_1.z.string().min(1).max(2000),
    attachments: zod_1.z.array(zod_1.z.object({
        url: zod_1.z.string().url(),
        type: zod_1.z.string(),
        name: zod_1.z.string()
    })).optional(),
});
exports.commsVoiceTargetSchema = zod_1.z.enum(['customer', 'rider', 'vendor']);
/**
 * Device platform of the caller. Selects the Twilio Push Credential embedded in the
 * access token — Android (FCM v1) and iOS (APNs VoIP) are separate credentials and an
 * iOS token with the Android push SID simply fails to register for incoming pushes.
 */
exports.commsVoicePlatformSchema = zod_1.z.enum(['android', 'ios', 'web']);
exports.createCommsVoiceTokenSchema = zod_1.z.object({
    orderId: zod_1.z.string().min(1).max(80),
    platform: exports.commsVoicePlatformSchema.optional(),
});
exports.createCommsCallSchema = zod_1.z.object({
    orderId: zod_1.z.string().min(1).max(80),
    target: exports.commsVoiceTargetSchema,
    platform: exports.commsVoicePlatformSchema.optional(),
});
/** Support call — no order context; rings the online support agents. */
exports.createCommsSupportCallSchema = zod_1.z.object({
    platform: exports.commsVoicePlatformSchema.optional(),
    topic: zod_1.z.string().max(120).optional(),
});
/** Agent softphone registration — no order context; permission-gated (support.voice.answer). */
exports.createCommsAgentTokenSchema = zod_1.z.object({
    platform: exports.commsVoicePlatformSchema.optional(),
});
/** Agent softphone presence heartbeat (admin panel). Redis-backed with a short TTL. */
exports.commsVoicePresenceSchema = zod_1.z.object({
    online: zod_1.z.boolean(),
    /** Agent mobile to ring when no browser agent answers (E.164). */
    forwardPhone: zod_1.z.string().regex(/^\+[1-9]\d{7,15}$/, 'forwardPhone must be E.164').optional(),
});
/**
 * Client-reported call events (the Twilio status callback only sees Twilio legs; the
 * tel: fallback handoff happens entirely on the device).
 */
exports.commsCallEventSchema = zod_1.z.object({
    kind: zod_1.z.enum(['fallback_offered', 'fallback_started', 'voip_failed', 'quality_poor', 'quality_recovered']),
    detail: zod_1.z.string().max(200).optional(),
});
// ── Refunds / money ─────────────────────────────────────────────────
exports.refundRequestSchema = zod_1.z.object({
    orderId: zod_1.z.string().min(1),
    reason: zod_1.z.string().min(3).max(300),
    amountPesewas: zod_1.z.number().int().positive().optional(), // default: full allocated amount
    refundComponent: zod_1.z.enum(['UNSPECIFIED', 'VENDOR_PRODUCT', 'ORE_COMMISSION', 'ORE_SERVICE_FEE', 'DELIVERY_FEE', 'PRIORITY_FEE', 'TIP', 'ERRAND_BUDGET']).optional(),
    originalTaxStatus: zod_1.z.enum(['UNKNOWN', 'NOT_TAXED', 'TAXED_OPEN_PERIOD', 'TAXED_FILED_PERIOD']).optional(),
    taxPeriodStatus: zod_1.z.enum(['OPEN', 'FILED', 'AMENDED', 'CLOSED']).optional(),
});
exports.remittanceSchema = zod_1.z.object({
    amountPesewas: zod_1.z.number().int().positive(),
    reference: zod_1.z.string().optional(),
});
// ── Wallet / rider money (doc §5) ───────────────────────────────────
exports.withdrawalRequestSchema = zod_1.z.object({
    amountPesewas: zod_1.z.number().int().positive(),
    destination: zod_1.z.string().min(3).max(120), // e.g. "2335… MoMo" / bank account label
    reference: zod_1.z.string().optional(),
});
exports.codTierSchema = zod_1.z.object({
    tier: zod_1.z.enum(['NEW', 'EXPERIENCED', 'SENIOR']),
    reason: zod_1.z.string().optional(),
});
exports.codStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['CLEAR', 'WARNING', 'SUSPENDED', 'INVESTIGATION', 'TERMINATED']),
    reason: zod_1.z.string().optional(),
});
exports.walletAdjustSchema = zod_1.z.object({
    amountPesewas: zod_1.z.number().int().nonnegative(),
    kind: zod_1.z.enum(['credit_cleared', 'penalty', 'reversal']),
    reason: zod_1.z.string().min(3).max(300),
});
// ── Vendor settlement (doc §4) ─────────────────────────────────────
exports.vendorSettlementPaySchema = zod_1.z.object({
    note: zod_1.z.string().max(300).optional(),
});
exports.vendorSettlementReverseSchema = zod_1.z.object({
    reason: zod_1.z.string().min(3).max(300),
});
// ── Disputes / refunds / chargebacks (doc §Payment) ────────────────
exports.openDisputeSchema = zod_1.z.object({
    orderId: zod_1.z.string().min(1),
    reason: zod_1.z.enum(['MISSING_ITEM', 'WRONG_ITEM', 'DAMAGED', 'QUALITY', 'NEVER_DELIVERED', 'OVERCHARGED', 'OTHER']),
    description: zod_1.z.string().min(3).max(1000),
    evidenceKeys: zod_1.z.array(zod_1.z.string().min(1)).max(10).optional(), // media storage keys
});
exports.resolveDisputeSchema = zod_1.z.object({
    decision: zod_1.z.enum(['refund_full', 'refund_partial', 'no_refund']),
    fault: zod_1.z.enum(['VENDOR', 'RIDER', 'PLATFORM', 'CUSTOMER']).optional(),
    amountPesewas: zod_1.z.number().int().positive().optional(), // required for refund_partial
    refundMethod: zod_1.z.enum(['WALLET', 'ORIGINAL']).optional(), // default WALLET (doc §Payment priority)
    note: zod_1.z.string().max(500).optional(),
});
exports.openChargebackSchema = zod_1.z.object({
    orderId: zod_1.z.string().min(1),
    reference: zod_1.z.string().min(1), // bank/PSP chargeback reference
    amountPesewas: zod_1.z.number().int().positive(),
    reason: zod_1.z.string().min(3).max(500),
    evidenceKeys: zod_1.z.array(zod_1.z.string().min(1)).max(10).optional(),
});
exports.resolveChargebackSchema = zod_1.z.object({
    outcome: zod_1.z.enum(['won', 'lost']),
    fault: zod_1.z.enum(['VENDOR', 'RIDER', 'PLATFORM', 'CUSTOMER']).optional(),
    feesPesewas: zod_1.z.number().int().nonnegative().optional(), // PSP/bank chargeback fees allocated
    note: zod_1.z.string().max(500).optional(),
});
exports.adminCustomerCreditSchema = zod_1.z.object({
    amountPesewas: zod_1.z.number().int().positive(),
    reason: zod_1.z.string().min(3).max(300),
});
// NOTE: customer wallet top-up was intentionally REMOVED. Customers never load money into
// their wallet — they pay at checkout. The wallet exists solely as a destination for refunds,
// which the customer may then withdraw or spend on a later order.
// ── Parcel / Courier (request-only service) ─────────────────────────
const parcelAddressSchema = exports.deliveryAddressSchema;
exports.createParcelSchema = zod_1.z.object({
    sender: zod_1.z.object({
        name: zod_1.z.string().min(2).max(120),
        phone: zod_1.z.string().regex(/^(\+?233|0)[1-9][0-9]{8}$/, 'Invalid Ghana sender phone number'),
        address: parcelAddressSchema,
    }),
    recipient: zod_1.z.object({
        name: zod_1.z.string().min(2).max(120),
        phone: zod_1.z.string().regex(/^(\+?233|0)[1-9][0-9]{8}$/, 'Invalid Ghana recipient phone number'),
        address: parcelAddressSchema,
    }),
    category: zod_1.z.enum(['DOCUMENTS', 'SMALL_PACKAGE', 'MEDIUM_PACKAGE', 'LARGE_PACKAGE', 'FRAGILE']),
    weightKg: zod_1.z.number().positive().max(80),
    dimensionsCm: zod_1.z.object({ length: zod_1.z.number().positive().max(200), width: zod_1.z.number().positive().max(200), height: zod_1.z.number().positive().max(200) }).optional(),
    declaredValuePesewas: zod_1.z.number().int().nonnegative().max(500_000),
    description: zod_1.z.string().min(3).max(500),
    fragile: zod_1.z.boolean().default(false),
    sealed: zod_1.z.boolean().refine((value) => value === true, 'Parcel must be sealed before pickup'),
    pickupMode: zod_1.z.enum(['MEET_DOOR', 'MEET_CURB']).default('MEET_DOOR'),
    proofMode: zod_1.z.enum(['PIN', 'SIGNATURE', 'PHOTO', 'PIN_AND_PHOTO']).default('PIN'),
    prohibitedItemsAcknowledged: zod_1.z.literal(true),
    serviceLevel: zod_1.z.enum(['STANDARD', 'SCHEDULED', 'PRIORITY']).optional(),
    note: zod_1.z.string().max(500).optional(),
});
// ── Errands (doc §Errands) ─────────────────────────────────────────
exports.createErrandSchema = zod_1.z.object({
    task: zod_1.z.string().min(5).max(500), // what to buy/do
    shopName: zod_1.z.string().min(2).max(120).optional(),
    shopLat: zod_1.z.number().min(-90).max(90),
    shopLng: zod_1.z.number().min(-180).max(180),
    budgetPesewas: zod_1.z.number().int().positive().max(500_000), // goods budget cap (GHS ≤ 5,000)
    address: exports.deliveryAddressSchema,
    serviceLevel: zod_1.z.enum(['STANDARD', 'SCHEDULED', 'PRIORITY']).optional(),
    note: zod_1.z.string().max(500).optional(),
});
exports.errandReceiptSchema = zod_1.z.object({
    amountPesewas: zod_1.z.number().int().positive(), // ≤ remaining budget
    /** Internal callers may provide a storage key; Rider clients upload dataBase64 and receive a server-owned key. */
    photoKey: zod_1.z.string().min(1).max(200).optional(),
    dataBase64: zod_1.z.string().min(100).optional(),
    contentType: zod_1.z.string().max(80).optional(),
    note: zod_1.z.string().max(300).optional(),
}).refine((value) => !!value.photoKey || !!value.dataBase64, {
    message: 'A receipt photo is required',
    path: ['dataBase64'],
});
exports.errandSubstitutionSchema = zod_1.z.object({
    item: zod_1.z.string().min(2).max(120), // proposed substitute
    pricePesewas: zod_1.z.number().int().positive(),
});
exports.errandSubDecisionSchema = zod_1.z.object({
    approve: zod_1.z.boolean(),
});
// ── Referral (doc §8) ──────────────────────────────────────────────
exports.referralClaimSchema = zod_1.z.object({
    code: zod_1.z.string().min(4).max(20),
    phone: zod_1.z.string().regex(/^(\+?233|0)[1-9][0-9]{8}$/, 'Invalid Ghana phone number'),
});
exports.referralBlockSchema = zod_1.z.object({
    reason: zod_1.z.string().min(3).max(300),
});
// ── Vendor plans / stories / penalties (doc §4) ────────────────────
exports.setVendorPlanSchema = zod_1.z.object({
    plan: zod_1.z.enum(['STANDARD', 'PREMIUM']),
});
exports.createStorySchema = zod_1.z.object({
    kind: zod_1.z.enum(['IMAGE', 'VIDEO']),
    mediaKey: zod_1.z.string().min(1).max(300),
    muxPlaybackId: zod_1.z.string().min(1).max(200).optional(), // VIDEO only — Mux (mock: passthrough)
    caption: zod_1.z.string().max(200).optional(),
});
exports.createVendorPromotionSchema = zod_1.z.object({
    title: zod_1.z.string().min(3).max(120),
    discountType: zod_1.z.enum(['PERCENT', 'FIXED']),
    discountValue: zod_1.z.number().int().positive(),
    minimumSubtotalPesewas: zod_1.z.number().int().nonnegative().optional(),
    budgetPesewas: zod_1.z.number().int().positive().optional(),
    redemptionLimit: zod_1.z.number().int().positive().optional(),
    startsAt: zod_1.z.string().datetime(),
    endsAt: zod_1.z.string().datetime(),
    code: zod_1.z.string().min(3).max(32).regex(/^[A-Z0-9-]+$/i).optional(),
}).superRefine((value, ctx) => {
    if (value.discountType === 'PERCENT' && value.discountValue > 100) {
        ctx.addIssue({ code: zod_1.z.ZodIssueCode.too_big, maximum: 100, type: 'number', inclusive: true, path: ['discountValue'], message: 'Percentage discount cannot exceed 100' });
    }
    if (new Date(value.endsAt) <= new Date(value.startsAt)) {
        ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, path: ['endsAt'], message: 'Promotion must end after it starts' });
    }
});
exports.createVendorReviewSchema = zod_1.z.object({
    orderId: zod_1.z.string().min(1),
    rating: zod_1.z.number().int().min(1).max(5),
    comment: zod_1.z.string().max(1000).optional(),
});
exports.applyPenaltySchema = zod_1.z.object({
    level: zod_1.z.enum(['WARNING', 'FINANCIAL', 'SUSPENSION_24H', 'SUSPENSION_72H', 'SUSPENSION_7D', 'PERMANENT']),
    trigger: zod_1.z.string().min(3).max(200),
    amountPesewas: zod_1.z.number().int().nonnegative().optional(), // required for FINANCIAL
    note: zod_1.z.string().max(300).optional(),
});
// ── Catalog management (admin / vendor) ────────────────────────────
exports.createVendorSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(120),
    lat: zod_1.z.number().min(-90).max(90),
    lng: zod_1.z.number().min(-180).max(180),
    deliveryRadiusKm: zod_1.z.number().positive().max(50).optional(),
    acceptsCod: zod_1.z.boolean().optional(),
    defaultPrepTimeMin: zod_1.z.number().int().min(5).max(180).optional(),
});
exports.addMenuItemSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(120),
    category: zod_1.z.string().min(1).max(80),
    pricePesewas: zod_1.z.number().int().positive(),
    prepTimeMin: zod_1.z.number().int().min(0).max(720).optional(),
    unit: zod_1.z.string().max(40).optional(),
    stock: zod_1.z.number().int().nonnegative().optional(),
    prescriptionOnly: zod_1.z.boolean().optional(),
    description: zod_1.z.string().max(1000).optional(),
    modifiers: zod_1.z.array(zod_1.z.string().min(1).max(80)).optional(),
    addonGroups: zod_1.z.array(zod_1.z.record(zod_1.z.unknown())).optional(),
    sku: zod_1.z.string().max(80).optional(),
    expiryDate: zod_1.z.string().optional(),
    dosage: zod_1.z.string().max(200).optional(),
    turnaround: zod_1.z.string().max(100).optional(),
    dailyMarketPrice: zod_1.z.boolean().optional(),
    garmentType: zod_1.z.string().max(80).optional(),
    conditionJson: zod_1.z.record(zod_1.z.unknown()).optional(),
    dietaryTags: zod_1.z.array(zod_1.z.string().min(1).max(50)).optional(),
});
exports.createVendorLocationSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(120),
    address: zod_1.z.string().min(3).max(300),
    lat: zod_1.z.number().min(-90).max(90),
    lng: zod_1.z.number().min(-180).max(180),
    deliveryRadiusKm: zod_1.z.number().positive().max(50).optional(),
    accepting: zod_1.z.boolean().optional(),
});
exports.addVendorStaffSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1),
    displayName: zod_1.z.string().min(2).max(80),
    phone: zod_1.z.string().min(8).max(20).optional(),
    staffRole: zod_1.z.string().min(2).max(50).optional(),
});
exports.connectPosSchema = zod_1.z.object({
    provider: zod_1.z.string().min(2).max(80),
    externalStoreId: zod_1.z.string().min(1).max(200).optional(),
});
exports.posWebhookSchema = zod_1.z.object({
    event: zod_1.z.string().min(1).max(80).optional(),
    itemId: zod_1.z.string().min(1).optional(),
    stock: zod_1.z.number().int().nonnegative().optional(),
    available: zod_1.z.boolean().optional(),
});
exports.vendorReviewResponseSchema = zod_1.z.object({
    response: zod_1.z.string().min(1).max(1000),
});
// ── Catalog internal ────────────────────────────────────────────────
exports.reserveStockSchema = zod_1.z.object({
    orderId: zod_1.z.string().min(1),
    lines: zod_1.z.array(zod_1.z.object({ itemId: zod_1.z.string().min(1), qty: zod_1.z.number().int().positive() })).min(1),
});
exports.onboardVendorSchema = zod_1.z.object({
    ownerUserId: zod_1.z.string().min(1),
    name: zod_1.z.string().min(2).max(120),
    vendorType: zod_1.z.string().min(2).max(50),
    lat: zod_1.z.number().min(-90).max(90),
    lng: zod_1.z.number().min(-180).max(180),
    publicId: zod_1.z.string().min(1),
    payoutAccountJson: zod_1.z.record(zod_1.z.unknown()).nullable().optional(),
});
// ── Notification ────────────────────────────────────────────────────
exports.registerDeviceTokenSchema = zod_1.z.object({
    token: zod_1.z.string().min(10).max(500),
    platform: zod_1.z.enum(['android', 'ios']),
});
// ── Ledger admin / vendor ───────────────────────────────────────────
exports.requestVendorWithdrawalSchema = zod_1.z.object({
    amountPesewas: zod_1.z.number().int().positive(),
});
exports.releaseVendorReserveSchema = zod_1.z.object({
    amountPesewas: zod_1.z.number().int().positive(),
    reason: zod_1.z.string().min(3).max(300),
});
exports.verifyRemittanceSchema = zod_1.z.object({
    amountPesewas: zod_1.z.number().int().positive(),
});
exports.rejectWithdrawalSchema = zod_1.z.object({
    note: zod_1.z.string().max(300).optional(),
});
// ── Dispatch ────────────────────────────────────────────────────────
exports.registerRiderSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(120),
    phone: zod_1.z.string().min(8).max(20),
    vehicle: zod_1.z.nativeEnum(enums_1.VehicleType).optional(),
    licensePlate: zod_1.z.string().max(20).optional(),
    lat: zod_1.z.number().min(-90).max(90).optional(),
    lng: zod_1.z.number().min(-180).max(180).optional(),
});
exports.riderAvailabilityBodySchema = zod_1.z.object({
    status: zod_1.z.enum(['AVAILABLE', 'OFFLINE']),
});
exports.adminAssignSchema = zod_1.z.object({
    riderId: zod_1.z.string().min(1),
    reason: zod_1.z.string().min(3).max(300),
});
exports.setRiderVerifiedSchema = zod_1.z.object({
    verified: zod_1.z.boolean().default(true),
    /** Optional backend/admin-approved operating location id. City code is resolved server-side from the register. */
    approvedOperatingLocationId: zod_1.z.string().min(1).max(80).optional(),
});
exports.onboardRiderSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1),
    name: zod_1.z.string().min(2).max(120),
    phone: zod_1.z.string().min(8).max(20),
    vehicle: zod_1.z.nativeEnum(enums_1.VehicleType).optional(),
    licensePlate: zod_1.z.string().max(20).optional().nullable(),
    approvedOperatingLocationId: zod_1.z.string().min(1).max(80).optional(),
    approvalActorId: zod_1.z.string().min(1).max(120).optional(),
    sourceApplicationId: zod_1.z.string().min(1).max(120).optional(),
});
exports.riderIdentifierCorrectionSchema = zod_1.z.object({
    reason: zod_1.z.string().min(10).max(1000),
    approvalReference: zod_1.z.string().min(3).max(120),
    /** Optional corrected approved operating location id. The sequence is still database-generated. */
    approvedOperatingLocationId: zod_1.z.string().min(1).max(80).optional(),
});
exports.codBlockSchema = zod_1.z.object({
    blocked: zod_1.z.boolean(),
});
// ── Order management ────────────────────────────────────────────────
exports.uploadPrescriptionSchema = zod_1.z.object({
    dataBase64: zod_1.z.string().min(100),
    contentType: zod_1.z.string().max(80).optional(),
});
exports.prescriptionReviewSchema = zod_1.z.object({
    note: zod_1.z.string().max(500).optional(),
});
exports.reportIssueSchema = zod_1.z.object({
    category: zod_1.z.string().min(2).max(50).optional(),
    note: zod_1.z.string().max(1000).optional(),
});
exports.resolveIssueSchema = zod_1.z.object({
    status: zod_1.z.string().min(2).max(50).optional(),
    note: zod_1.z.string().max(500).optional(),
});
exports.laundryStageSchema = zod_1.z.object({
    stage: zod_1.z.string().min(2).max(80),
});
exports.laundryConditionSchema = zod_1.z.object({
    condition: zod_1.z.record(zod_1.z.unknown()),
});
exports.laundryConditionPhotoSchema = zod_1.z.object({
    dataBase64: zod_1.z.string().min(100),
    contentType: zod_1.z.string().max(80).optional(),
});
exports.uploadDeliveryProofSchema = zod_1.z.object({
    photoBase64: zod_1.z.string().min(100),
    contentType: zod_1.z.string().max(80).optional(),
});
exports.uploadDeliverySignatureSchema = zod_1.z.object({
    signatureBase64: zod_1.z.string().min(100),
    contentType: zod_1.z.string().max(80).optional(),
});
exports.confirmGiftLocationSchema = exports.deliveryAddressSchema.extend({
    source: zod_1.z.string().min(1).max(30).default('RECIPIENT'),
    confirmationSource: zod_1.z.string().max(40).default('RECIPIENT_LINK'),
});
exports.orderAddressCorrectionSchema = zod_1.z.object({
    address: exports.deliveryAddressSchema,
    reason: zod_1.z.string().min(5).max(500),
    source: zod_1.z.string().max(40).default('SUPPORT_CORRECTION'),
});
exports.taxRuleUpsertSchema = zod_1.z.object({
    ruleId: zod_1.z.string().min(2).max(120),
    taxType: zod_1.z.enum(['VAT', 'NHIL', 'GETFUND', 'WHT', 'WITHHOLDING_VAT', 'PAYE', 'SSNIT', 'CIT', 'RENT_WHT']),
    supplierType: zod_1.z.enum(['CUSTOMER', 'VENDOR', 'DELIVERY_PARTNER', 'INDEPENDENT_DELIVERY_PARTNER', 'FLEET_DELIVERY_PARTNER', 'FLEET_PARTNER', 'ORE', 'PAYSTACK', 'EMPLOYEE', 'LANDLORD', 'OTHER_SUPPLIER', 'ANY']).optional(),
    payerType: zod_1.z.enum(['CUSTOMER', 'VENDOR', 'DELIVERY_PARTNER', 'INDEPENDENT_DELIVERY_PARTNER', 'FLEET_DELIVERY_PARTNER', 'FLEET_PARTNER', 'ORE', 'PAYSTACK', 'EMPLOYEE', 'LANDLORD', 'OTHER_SUPPLIER', 'ANY']).optional(),
    payeeType: zod_1.z.enum(['CUSTOMER', 'VENDOR', 'DELIVERY_PARTNER', 'INDEPENDENT_DELIVERY_PARTNER', 'FLEET_DELIVERY_PARTNER', 'FLEET_PARTNER', 'ORE', 'PAYSTACK', 'EMPLOYEE', 'LANDLORD', 'OTHER_SUPPLIER', 'ANY']).optional(),
    residentStatus: zod_1.z.enum(['RESIDENT', 'NON_RESIDENT', 'UNKNOWN', 'ANY']).optional(),
    transactionType: zod_1.z.enum(['GOODS', 'WORKS', 'GENERAL_SERVICES', 'RENT', 'DIRECTOR_FEES', 'COMMISSION', 'NON_RESIDENT_SERVICES', 'ANY']).optional(),
    contractType: zod_1.z.string().min(2).max(160).optional(),
    thresholdType: zod_1.z.enum(['TRANSACTION_THRESHOLD', 'ANNUAL_CUMULATIVE_THRESHOLD', 'SUPPLIER_CATEGORY_THRESHOLD', 'NO_THRESHOLD_RULE']).optional(),
    thresholdAmountPesewas: zod_1.z.number().int().nonnegative().optional(),
    rateBps: zod_1.z.number().int().nonnegative().max(10000),
    taxBase: zod_1.z.enum(['GROSS_AMOUNT', 'TAXABLE_AMOUNT', 'AMOUNT_OVER_THRESHOLD']).optional(),
    effectiveFrom: zod_1.z.string().datetime(),
    effectiveTo: zod_1.z.string().datetime().optional().nullable(),
    exemption: zod_1.z.boolean().optional(),
    certificateRequired: zod_1.z.boolean().optional(),
    active: zod_1.z.boolean().optional(),
    version: zod_1.z.number().int().positive().optional(),
});
exports.taxComponentClassificationSchema = zod_1.z.object({
    transactionId: zod_1.z.string().min(2).max(160),
    orderId: zod_1.z.string().optional().nullable(),
    componentType: zod_1.z.string().min(2).max(120),
    payerType: zod_1.z.enum(['CUSTOMER', 'VENDOR', 'DELIVERY_PARTNER', 'INDEPENDENT_DELIVERY_PARTNER', 'FLEET_DELIVERY_PARTNER', 'FLEET_PARTNER', 'ORE', 'PAYSTACK', 'EMPLOYEE', 'LANDLORD', 'OTHER_SUPPLIER']),
    payerId: zod_1.z.string().optional().nullable(),
    payeeType: zod_1.z.enum(['CUSTOMER', 'VENDOR', 'DELIVERY_PARTNER', 'INDEPENDENT_DELIVERY_PARTNER', 'FLEET_DELIVERY_PARTNER', 'FLEET_PARTNER', 'ORE', 'PAYSTACK', 'EMPLOYEE', 'LANDLORD', 'OTHER_SUPPLIER']),
    payeeId: zod_1.z.string().optional().nullable(),
    supplierType: zod_1.z.enum(['CUSTOMER', 'VENDOR', 'DELIVERY_PARTNER', 'INDEPENDENT_DELIVERY_PARTNER', 'FLEET_DELIVERY_PARTNER', 'FLEET_PARTNER', 'ORE', 'PAYSTACK', 'EMPLOYEE', 'LANDLORD', 'OTHER_SUPPLIER']),
    supplierId: zod_1.z.string().optional().nullable(),
    customerId: zod_1.z.string().optional().nullable(),
    grossAmountPesewas: zod_1.z.number().int().nonnegative(),
    taxableAmountPesewas: zod_1.z.number().int().nonnegative().optional().nullable(),
    taxCategory: zod_1.z.enum(['TAXABLE', 'ZERO_RATED', 'EXEMPT', 'OUT_OF_SCOPE', 'NOT_ORE_SUPPLY']),
    revenueOwner: zod_1.z.enum(['ORE', 'VENDOR', 'DELIVERY_PARTNER', 'FLEET_DELIVERY_PARTNER', 'OTHER']),
    paymentProcessor: zod_1.z.enum(['PAYSTACK', 'CASH', 'INTERNAL', 'NONE']),
    settlementMethod: zod_1.z.enum(['PAYSTACK_SPLIT', 'PAYSTACK_TRANSFER', 'COD_CASH', 'WALLET', 'BANK_TRANSFER', 'INTERNAL_LEDGER', 'NONE']),
    contractType: zod_1.z.string().min(2).max(160),
    transactionType: zod_1.z.enum(['GOODS', 'WORKS', 'GENERAL_SERVICES', 'RENT', 'DIRECTOR_FEES', 'COMMISSION', 'NON_RESIDENT_SERVICES']),
    residentStatus: zod_1.z.enum(['RESIDENT', 'NON_RESIDENT', 'UNKNOWN']),
    transactionDate: zod_1.z.string().datetime().optional().nullable(),
    pricingMode: zod_1.z.enum(['INCLUSIVE', 'EXCLUSIVE']).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional().nullable(),
});
exports.taxReviewResolveSchema = zod_1.z.object({
    note: zod_1.z.string().min(5).max(1000),
});
exports.vendorTaxProfileUpsertSchema = zod_1.z.object({
    residentStatus: zod_1.z.enum(['RESIDENT', 'NON_RESIDENT', 'UNKNOWN']),
    taxIdentificationNumber: zod_1.z.string().trim().min(1).max(80).optional().nullable(),
    taxProfileJson: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional().nullable(),
});
exports.deliveryPartnerTaxProfileUpsertSchema = zod_1.z.object({
    residentStatus: zod_1.z.enum(['RESIDENT', 'NON_RESIDENT', 'UNKNOWN']),
    deliveryPartnerType: zod_1.z.enum(['INDEPENDENT_DELIVERY_PARTNER', 'FLEET_DELIVERY_PARTNER']).optional(),
    deliveryPartnerId: zod_1.z.string().trim().min(1).max(160).optional().nullable(),
    fleetPartnerId: zod_1.z.string().trim().min(1).max(160).optional().nullable(),
    contractType: zod_1.z.string().trim().min(2).max(160).optional(),
    settlementMethod: zod_1.z.enum(['PAYSTACK_SPLIT', 'PAYSTACK_TRANSFER', 'COD_CASH', 'WALLET', 'BANK_TRANSFER', 'INTERNAL_LEDGER', 'NONE']).optional(),
});
exports.performanceMetricConfigSchema = zod_1.z.object({
    code: zod_1.z.string().min(2).max(80),
    label: zod_1.z.string().min(2).max(160),
    category: zod_1.z.enum(['OPERATIONS', 'CUSTOMER_EXPERIENCE', 'COMPLIANCE', 'QUALITY', 'FINANCIAL', 'SAFETY']),
    weight: zod_1.z.number().nonnegative().max(1000),
    formula: zod_1.z.enum(['RATE_GTE_TARGET', 'RATE_LTE_TARGET', 'AVERAGE_GTE_TARGET', 'AVERAGE_LTE_TARGET', 'COUNT_LTE_TARGET', 'MANUAL_0_100']),
    target: zod_1.z.number().nonnegative(),
    minimumSampleSize: zod_1.z.number().int().nonnegative().optional(),
    enabled: zod_1.z.boolean().optional(),
    maxValue: zod_1.z.number().positive().optional(),
    exclusionCodes: zod_1.z.array(zod_1.z.string().min(1).max(80)).optional(),
    attribution: zod_1.z.object({
        impactWhenResponsibleOnly: zod_1.z.boolean().optional(),
        excludedCauses: zod_1.z.array(zod_1.z.enum(['RESPONSIBLE', 'CUSTOMER', 'VENDOR', 'RIDER', 'PLATFORM', 'WEATHER', 'THIRD_PARTY', 'UNKNOWN'])).optional(),
    }).optional(),
});
exports.performanceEngineConfigSchema = zod_1.z.object({
    subject: zod_1.z.enum(['VENDOR', 'RIDER']),
    version: zod_1.z.number().int().positive(),
    reviewPeriod: zod_1.z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'CUSTOM']),
    minimumTotalSampleSize: zod_1.z.number().int().nonnegative().optional(),
    metrics: zod_1.z.array(exports.performanceMetricConfigSchema).min(1),
    gradeBands: zod_1.z.array(zod_1.z.object({
        grade: zod_1.z.string().min(1).max(20),
        minScore: zod_1.z.number().min(0).max(100),
        maxScore: zod_1.z.number().min(0).max(100).optional(),
        status: zod_1.z.enum(['EXCELLENT', 'GOOD', 'MONITOR', 'WARNING', 'PIP', 'RESTRICTED', 'SUSPENDED', 'INSUFFICIENT_DATA']),
    })).min(1),
    categoryWeights: zod_1.z.record(zod_1.z.string(), zod_1.z.number().nonnegative()).optional(),
    trendRules: zod_1.z.object({ improvingDelta: zod_1.z.number().optional(), decliningDelta: zod_1.z.number().optional(), reviewPeriods: zod_1.z.number().int().positive().optional() }).optional(),
    actionRules: zod_1.z.array(zod_1.z.object({
        code: zod_1.z.string().min(2).max(80),
        action: zod_1.z.enum(['NO_ACTION', 'WARNING', 'PIP', 'RESTRICTION', 'SUSPENSION', 'AUDIT_REVIEW', 'MANUAL_REVIEW']),
        whenStatusIn: zod_1.z.array(zod_1.z.enum(['EXCELLENT', 'GOOD', 'MONITOR', 'WARNING', 'PIP', 'RESTRICTED', 'SUSPENDED', 'INSUFFICIENT_DATA'])).optional(),
        whenScoreBelow: zod_1.z.number().min(0).max(100).optional(),
        whenMetricBelow: zod_1.z.object({ metricCode: zod_1.z.string().min(1), scoreBelow: zod_1.z.number().min(0).max(100) }).optional(),
        requiresAudit: zod_1.z.boolean().optional(),
        requiresApproval: zod_1.z.boolean().optional(),
        restrictionCode: zod_1.z.string().max(80).optional(),
        durationDays: zod_1.z.number().int().positive().optional(),
    })).optional(),
    auditRequiredActions: zod_1.z.array(zod_1.z.string().min(1).max(80)).optional(),
});
exports.performanceConfigUpsertSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(120).optional(),
    active: zod_1.z.boolean().default(true),
    config: exports.performanceEngineConfigSchema,
    notes: zod_1.z.string().max(500).optional(),
});
exports.performanceMetricInputSchema = zod_1.z.object({
    code: zod_1.z.string().min(1).max(80),
    numerator: zod_1.z.number().nonnegative().optional(),
    denominator: zod_1.z.number().nonnegative().optional(),
    value: zod_1.z.number().nonnegative().optional(),
    sampleSize: zod_1.z.number().int().nonnegative().optional(),
    category: zod_1.z.enum(['OPERATIONS', 'CUSTOMER_EXPERIENCE', 'COMPLIANCE', 'QUALITY', 'FINANCIAL', 'SAFETY']).optional(),
    attributed: zod_1.z.boolean().optional(),
    attribution: zod_1.z.enum(['RESPONSIBLE', 'CUSTOMER', 'VENDOR', 'RIDER', 'PLATFORM', 'WEATHER', 'THIRD_PARTY', 'UNKNOWN']).optional(),
    exclusionCode: zod_1.z.string().max(80).nullable().optional(),
    incidentType: zod_1.z.string().max(80).nullable().optional(),
    notes: zod_1.z.string().max(500).optional(),
});
exports.performanceReviewRunSchema = zod_1.z.object({
    periodStart: zod_1.z.string().datetime(),
    periodEnd: zod_1.z.string().datetime(),
    reviewerId: zod_1.z.string().min(1).optional(),
    metrics: zod_1.z.array(exports.performanceMetricInputSchema).optional(),
    incidents: zod_1.z.array(zod_1.z.object({ type: zod_1.z.string().min(1).max(80), severity: zod_1.z.string().max(40).optional(), attributed: zod_1.z.boolean().optional(), exclusionCode: zod_1.z.string().max(80).optional() })).optional(),
    actionOverrides: zod_1.z.array(zod_1.z.string().min(1).max(80)).optional(),
    outcome: zod_1.z.string().max(80).optional(),
    notes: zod_1.z.string().max(1000).optional(),
});
exports.performanceHistorySearchSchema = zod_1.z.object({
    subjectId: zod_1.z.string().optional(),
    periodStart: zod_1.z.string().datetime().optional(),
    periodEnd: zod_1.z.string().datetime().optional(),
    status: zod_1.z.string().optional(),
    reviewer: zod_1.z.string().optional(),
    metricCategory: zod_1.z.string().optional(),
    incidentType: zod_1.z.string().optional(),
    action: zod_1.z.string().optional(),
    outcome: zod_1.z.string().optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(250).optional(),
});
exports.performanceCorrectionSchema = exports.performanceReviewRunSchema.extend({
    linkedRecordId: zod_1.z.string().min(1),
    correctionType: zod_1.z.enum(['CORRECTION', 'APPEAL', 'REVERSAL']),
    reason: zod_1.z.string().min(5).max(500),
});
exports.riderIncidentAttributionSchema = zod_1.z.object({
    severity: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    attribution: zod_1.z.enum(['RESPONSIBLE', 'CUSTOMER', 'VENDOR', 'RIDER', 'PLATFORM', 'WEATHER', 'THIRD_PARTY', 'UNKNOWN']).default('UNKNOWN'),
    excludedFromPerformance: zod_1.z.boolean().default(false),
    exclusionReason: zod_1.z.string().max(300).optional(),
    performanceImpact: zod_1.z.boolean().default(true),
    outcome: zod_1.z.string().max(80).optional(),
});
exports.marketFulfillmentSchema = zod_1.z.object({
    lines: zod_1.z.array(zod_1.z.object({
        orderItemId: zod_1.z.string().min(1),
        actualQuantity: zod_1.z.number().nonnegative(),
        unit: zod_1.z.string().min(1).max(40),
        actualPricePesewas: zod_1.z.number().int().nonnegative().nullable().optional(),
        note: zod_1.z.string().max(300).nullable().optional(),
    })).optional(),
});
exports.orderDelaySchema = zod_1.z.object({
    extraMinutes: zod_1.z.number().int().min(1).max(120).optional(),
    newPrepTimeMin: zod_1.z.number().int().min(1).max(720).optional(),
    reason: zod_1.z.string().min(3).max(300),
}).refine((value) => value.extraMinutes !== undefined || value.newPrepTimeMin !== undefined, {
    message: 'Provide either extraMinutes or newPrepTimeMin',
    path: ['extraMinutes'],
});
exports.orderCancelSchema = zod_1.z.object({
    reason: zod_1.z.string().max(300).optional(),
});
exports.adminCancelSchema = zod_1.z.object({
    reason: zod_1.z.string().min(3).max(300),
});
exports.forceStateSchema = zod_1.z.object({
    targetStatus: zod_1.z.string().min(2).max(50),
    reason: zod_1.z.string().min(3).max(300),
});
exports.internalSetRiderFeeSchema = zod_1.z.object({
    riderFeePesewas: zod_1.z.number().int().nonnegative(),
    peakPayPesewas: zod_1.z.number().int().nonnegative().optional(),
});
// ── Payment internal ────────────────────────────────────────────────
exports.initializePaymentSchema = zod_1.z.object({
    checkoutId: zod_1.z.string().min(1),
    amountPesewas: zod_1.z.number().int().positive(),
    phone: zod_1.z.string().min(8).max(20),
    allocations: zod_1.z.array(zod_1.z.object({
        orderId: zod_1.z.string().min(1),
        allocatedPesewas: zod_1.z.number().int().positive(),
    })).min(1),
});
exports.transferSchema = zod_1.z.object({
    amountPesewas: zod_1.z.number().int().positive(),
    destination: zod_1.z.string().min(3).max(200),
    reference: zod_1.z.string().min(1).max(200),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.vendorTransferSchema = zod_1.z.object({
    amountPesewas: zod_1.z.number().int().positive(),
    reference: zod_1.z.string().min(1).max(200),
    payout: zod_1.z.object({
        type: zod_1.z.enum(['MOMO', 'BANK']),
        provider: zod_1.z.string().min(2).max(80),
        accountNumber: zod_1.z.string().min(6).max(30),
        accountName: zod_1.z.string().min(3).max(120),
    }),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.internalRefundSchema = zod_1.z.object({
    orderId: zod_1.z.string().min(1),
    reason: zod_1.z.string().min(3).max(300),
    amountPesewas: zod_1.z.number().int().positive().optional(),
});
//# sourceMappingURL=dto.js.map