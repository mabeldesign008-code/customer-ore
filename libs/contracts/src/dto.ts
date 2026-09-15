/** Shared request/response DTOs (plain interfaces + zod schemas where validation matters). */

import { z } from 'zod';
import { BatchType, ErrandStatus, ErrandTrustTier, OrderType, PaymentMethod, Role, RiderCodStatus, RiderCodTier, StoryKind, SubstitutionStatus, VehicleType, VendorPenaltyLevel, VendorPlan, VendorType } from './enums';

// ── Auth ────────────────────────────────────────────────────────────
export const requestOtpSchema = z.object({
  phone: z.string().min(8, 'Phone number required'),
  role: z.nativeEnum(Role).optional(),
  name: z.string().min(2).max(80).optional(),
});
export type RequestOtpDto = z.infer<typeof requestOtpSchema>;

export const verifyOtpSchema = z.object({
  phone: z.string(),
  code: z.string().length(6),
  targetRole: z.nativeEnum(Role).optional(),
  deviceToken: z.string().optional(),
  deviceFingerprint: z.string().optional(),
});
export type VerifyOtpDto = z.infer<typeof verifyOtpSchema>;

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address').optional().nullable(),
  termsAccepted: z.boolean().optional(),
});
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  totpCode: z.string().regex(/^\d{6}$/, 'TOTP must be 6 digits'),
});
export type AdminLoginDto = z.infer<typeof adminLoginSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(16),
});
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;

export interface RegistrationStatusDto {
  kind: 'RIDER' | 'VENDOR';
  currentStage: number;
  maxStages: number;
  status: string; // ApplicationStatus
  requiresActionField?: string | null;
  rejectionReason?: string | null;
  canReapplyAfter?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  isNewUser: boolean;
  activeRole: Role;
  roles: Role[];
  user: {
    id: string;
    phone: string;
    role: Role;
    roles: Role[];
    name: string | null;
    publicId?: string | null;
  };
  registration?: RegistrationStatusDto | null;
}

// ── Rider Staged Onboarding DTOs ─────────────────────────────────────
export const riderStage1Schema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  dob: z.string().refine((val) => {
    const age = (Date.now() - new Date(val).getTime()) / (365.25 * 24 * 3600 * 1000);
    return age >= 18;
  }, 'Rider must be at least 18 years old'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  email: z.string().email(),
  residentialAddress: z.object({
    region: z.string().min(2),
    city: z.string().min(2),
    digitalAddress: z.string().min(5), // GhanaPostGPS
    streetLandmark: z.string().min(3),
  }),
  emergencyContact: z.object({
    name: z.string().min(2),
    relationship: z.string().min(2),
    phone: z.string().min(8),
  }),
});
export type RiderStage1Dto = z.infer<typeof riderStage1Schema>;

export const riderStage2Schema = z.object({
  idType: z.enum(['GHANA_CARD', 'PASSPORT', 'DRIVERS_LICENSE']),
  idNumber: z.string().min(4),
  selfieBase64: z.string().min(100),
  angleImagesBase64: z.array(z.string()).min(4).max(6),
});
export type RiderStage2Dto = z.infer<typeof riderStage2Schema>;

export const riderStage3Schema = z.object({
  ghanaCardNumber: z.string().min(5),
  ghanaCardFrontKey: z.string().min(1),
  ghanaCardBackKey: z.string().optional(),
  driversLicenseKey: z.string().optional(),
  roadworthinessKey: z.string().optional(),
  insuranceKey: z.string().optional(),
});
export type RiderStage3Dto = z.infer<typeof riderStage3Schema>;

export const riderStage4Schema = z.object({
  vehicleType: z.enum(['BICYCLE', 'MOTORBIKE', 'CAR']),
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.number().int().optional(),
  color: z.string().optional(),
  licensePlate: z.string().optional(),
  vehiclePhotos: z.array(z.string()).optional(),
  payout: z.object({
    type: z.enum(['MOMO', 'BANK']),
    provider: z.string().min(2), // MTN, Telecel, AT or Bank Name
    accountNumber: z.string().min(6),
    accountName: z.string().min(3),
  }),
});
export type RiderStage4Dto = z.infer<typeof riderStage4Schema>;

// ── Vendor Staged Onboarding DTOs ────────────────────────────────────
export const vendorStage1Schema = z.object({
  vendorType: z.enum([
    VendorType.FOOD,
    VendorType.GROCERY,
    VendorType.MARKET,
    VendorType.PHARMACY,
    VendorType.SHOP,
    VendorType.LAUNDRY,
  ]),
  vendorClass: z.enum(['INDIVIDUAL', 'BUSINESS']).default('BUSINESS'),
});
export type VendorStage1Dto = z.infer<typeof vendorStage1Schema>;

export const vendorStage2Schema = z.object({
  businessName: z.string().min(2),
  description: z.string().min(10),
  businessPhone: z.string().min(8),
  businessEmail: z.string().email(),
  displayAddress: z.object({
    region: z.string().min(2),
    city: z.string().min(2),
    streetAddress: z.string().min(3),
    landmark: z.string().min(2),
    digitalAddress: z.string().min(5), // GhanaPostGPS
  }),
  workplaceGps: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    accuracy: z.number().max(100, 'Workplace GPS accuracy must be within 100 meters'),
    isMock: z.boolean().refine((val) => !val, 'Mock location / GPS spoofing is prohibited'),
  }),
});
export type VendorStage2Dto = z.infer<typeof vendorStage2Schema>;

export const vendorStage3Schema = z.object({
  ownerName: z.string().min(2),
  ownerRole: z.string().min(2),
  ownerPhone: z.string().min(8),
  ownerEmail: z.string().email(),
  ghanaCardNumber: z.string().min(5),
  idType: z.enum(['GHANA_CARD', 'PASSPORT', 'DRIVERS_LICENSE']).default('GHANA_CARD'),
  selfieBase64: z.string().min(100),
  angleImagesBase64: z.array(z.string()).min(4).max(6),
});
export type VendorStage3Dto = z.infer<typeof vendorStage3Schema>;

export const vendorStage4Schema = z.object({
  registrationNumber: z.string().min(3),
  businessRegDocKey: z.string().min(1),
  tinDocKey: z.string().optional(),
  vatDocKey: z.string().optional(),
  categoryDocs: z.record(z.string()).optional(),
});
export type VendorStage4Dto = z.infer<typeof vendorStage4Schema>;

export const vendorStage5Schema = z.object({
  payout: z.object({
    type: z.enum(['MOMO', 'BANK']),
    provider: z.string().min(2),
    accountNumber: z.string().min(6),
    accountName: z.string().min(3),
  }),
  acceptedTerms: z.boolean().refine((val) => val === true, 'You must accept the Vendor Payment Terms'),
});
export type VendorStage5Dto = z.infer<typeof vendorStage5Schema>;

// ── Catalog ─────────────────────────────────────────────────────────
export interface VendorLocationDto {
  id: string;
  vendorId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  deliveryRadiusKm: number;
  accepting: boolean;
  active: boolean;
}

export interface VendorDto {
  id: string;
  name: string;
  vendorType: string;
  approved: boolean;
  publicId?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  lat: number;
  lng: number;
  deliveryRadiusKm: number;
  acceptsCod: boolean;
  accepting: boolean;
  defaultPrepTimeMin?: number;
  maxConcurrentOrders?: number;
  openNow: boolean;
  hoursJson?: Record<string, { open: string; close: string }[]> | null;
  holidayHoursJson?: Record<string, { closed: boolean; open?: string; close?: string }> | null;
  opensAt?: string;
  closesAt?: string;
  distanceKm?: number;
  plan?: VendorPlan; // doc §4 Premium = stories + reduced commission
  suspendUntil?: string | null;
  /** Active branches are included for internal dispatch/task projection and ignored by older clients. */
  locations?: VendorLocationDto[];
}

export interface MenuItemDto {
  id: string;
  vendorId: string;
  name: string;
  pricePesewas: number;
  prepTimeMin: number;
  available: boolean;
  unit?: string;
  stock?: number | null;
  prescriptionOnly?: boolean;
  modifiers?: string[];
  addonGroups?: Record<string, unknown>[] | null;
  imageKey?: string | null;
  imageUrl?: string | null;
  imageContentType?: string | null;
  sku?: string | null;
  expiryDate?: string | null;
  dosage?: string | null;
  turnaround?: string | null;
  dailyMarketPrice?: boolean;
  garmentType?: string | null;
  conditionJson?: Record<string, unknown> | null;
  dietaryTags?: string[];
  description?: string;
  category?: string;
}

export interface SearchItemDto extends MenuItemDto {
  vendorName: string;
  vendorType?: string;
  vendorLat: number;
  vendorLng: number;
}

// ── Cart / Checkout ─────────────────────────────────────────────────
export interface SelectedOptionDto {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceAdjustmentPesewas: number;
}

export interface CartLineDto {
  id: string;
  itemId: string;
  vendorId: string;
  qty: number;
  unitPricePesewas: number; // final per-unit snapshot including selected options
  modifiers: string[];
  selectedOptions: SelectedOptionDto[];
  optionsTotalPesewas: number;
  itemName: string;
}

export interface CartDto {
  id: string;
  customerId: string;
  lines: CartLineDto[];
  vendors: { vendorId: string; vendorName: string; lineCount: number }[];
}

export const selectedOptionSchema = z.object({
  groupId: z.string().min(1),
  groupName: z.string().min(1),
  optionId: z.string().min(1),
  optionName: z.string().min(1),
  priceAdjustmentPesewas: z.number().int().nonnegative(),
});
export const addCartItemSchema = z.object({
  itemId: z.string().min(1),
  qty: z.number().int().min(1).max(50),
  modifiers: z.array(z.string()).default([]),
  selectedOptions: z.array(selectedOptionSchema).default([]),
});
export type AddCartItemDto = z.infer<typeof addCartItemSchema>;

export const deliveryAddressSchema = z.object({
  /** Human label is presentation only; lat/lng are the delivery source of truth. */
  label: z.string().min(1).max(120),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  source: z.string().min(1).max(30),
  details: z.string().max(300).optional(),
  landmark: z.string().max(160).optional(),
  receiverName: z.string().min(1).max(120).optional(),
  receiverPhone: z.string().regex(/^(\+?233|0)[1-9][0-9]{8}$/, 'Invalid Ghana receiver phone number').optional(),
  digitalAddress: z.string().max(40).optional(),
  what3words: z.string().regex(/^(?:\/\/\/)?[a-zA-ZÀ-ÿ.-]+\.[a-zA-ZÀ-ÿ.-]+\.[a-zA-ZÀ-ÿ.-]+$/, 'Invalid what3words address').optional(),
  deliveryInstructions: z.string().max(500).optional(),
  confirmationSource: z.string().max(40).optional(),
  confirmedAt: z.string().datetime().optional(),
});
export type DeliveryAddressDto = z.infer<typeof deliveryAddressSchema>;

export const savedAddressUpsertSchema = z.object({
  label: z.string().min(1).max(80),
  address: deliveryAddressSchema,
  isDefault: z.boolean().optional(),
  reason: z.string().max(500).optional(),
});
export type SavedAddressUpsertDto = z.infer<typeof savedAddressUpsertSchema>;

export const savedAddressCorrectionSchema = savedAddressUpsertSchema.extend({
  reason: z.string().min(5).max(500),
});
export type SavedAddressCorrectionDto = z.infer<typeof savedAddressCorrectionSchema>;

export const customerCodPolicySchema = z.object({
  tier: z.enum(['NEW', 'STANDARD', 'TRUSTED', 'PREMIUM']).optional(),
  blocked: z.boolean().optional(),
  reason: z.string().min(5).max(500).optional(),
});
export type CustomerCodPolicyDto = z.infer<typeof customerCodPolicySchema>;

export const checkoutSchema = z.object({
  address: deliveryAddressSchema,
  paymentMethods: z
    .array(z.object({ vendorId: z.string().min(1), method: z.nativeEnum(PaymentMethod) }))
    .optional(), // default: all PREPAID
  note: z.string().max(500).optional(),
  creditPesewas: z.number().int().nonnegative().optional(), // wallet credit applied to prepaid (doc §Payment)
  /** When present, only these vendor promotions are applied. Omitted = auto-apply the best active campaign. */
  promotions: z.array(z.object({ vendorId: z.string().min(1), promotionId: z.string().min(1) })).optional(),
  /** Optional rider tip per vendor order. 100% to the assigned rider on delivery. Max GHS 500. */
  tips: z.array(z.object({ vendorId: z.string().min(1), tipPesewas: z.number().int().nonnegative().max(50_000) })).optional(),
  leaveAtDoor: z.boolean().optional(),
  dropNote: z.string().max(300).optional(),
  /** ISO datetime. 30 min – 7 days ahead. Dispatch waits until this minus the lead. */
  scheduledFor: z.string().datetime().optional(),
  serviceLevel: z.enum(['STANDARD', 'SCHEDULED', 'PRIORITY']).optional(),
  /** Optional customer voucher code. Maps onto an active Vendor promotion (6.11). */
  voucherCode: z.string().min(3).max(32).optional(),
  recipient: z.object({ name: z.string().min(1).max(120), phone: z.string().regex(/^(\+?233|0)[1-9][0-9]{8}$/, 'Invalid Ghana phone number') }).optional(), // gift (doc §3 Case 2)
});
export type CheckoutDto = z.infer<typeof checkoutSchema>;

export interface OrderItemSnapshot {
  itemId: string;
  name: string;
  qty: number;
  unit?: string | null;
  unitPricePesewas: number;
  prepTimeMin: number;
  modifiers: string[];
  selectedOptions: SelectedOptionDto[];
  optionsTotalPesewas: number;
  prescriptionOnly: boolean;
}

export interface CheckoutOrderResult {
  orderId: string;
  vendorId: string;
  vendorName: string;
  vendorType: string;
  serviceCode: string;
  serviceLevel?: 'STANDARD' | 'SCHEDULED' | 'PRIORITY';
  status: string;
  paymentMethod: PaymentMethod;
  subtotalPesewas: number;
  deliveryFeePesewas: number;
  serviceFeePesewas: number;
  commissionPct: number;
  totalPesewas: number;
  promotionId?: string | null;
  promotionTitle?: string | null;
  promotionDiscountPesewas?: number;
  tipPesewas?: number;
  prepTimeMin: number;
  feePolicyVersion: number;
}

export interface CheckoutResultDto {
  checkoutId: string;
  orders: CheckoutOrderResult[];
  prepaidTotalPesewas: number;
  codTotalPesewas: number;
  creditAppliedPesewas?: number; // wallet credit used (reduces the PSP charge)
  pspChargePesewas?: number; // amount actually charged to the customer via Paystack
  payment?: {
    reference: string;
    paystackUrl: string | null; // real: Paystack authorize URL; mock: null
    mode: string;
  };
  /** Present when a requested promo could not be redeemed — checkout still completed at full price. */
  promotionWarnings?: string[];
}

/** Customer-visible Vendor campaign. No budget/spend internals. */
export interface PublicVendorPromotionDto {
  id: string;
  vendorId: string;
  title: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  minimumSubtotalPesewas: number;
  endsAt: string;
}

// ── Orders ──────────────────────────────────────────────────────────
export interface OrderStatusDto {
  orderId: string;
  ref: string;
  serviceCode: string;
  vendorType: string;
  orderType?: OrderType;
  status: string;
  checkoutId: string;
  vendorId: string;
  vendorName: string;
  paymentMethod: PaymentMethod;
  /** Authoritative checkout breakdown in integer pesewas. */
  subtotalPesewas: number;
  deliveryFeePesewas: number;
  serviceFeePesewas: number;
  totalPesewas: number;
  prepTimeMin: number;
  originalPrepTimeMin?: number | null;
  prepTimeExtendedByMin?: number;
  prepExtensionCount?: number;
  estimatedReadyAt?: string | null;
  prepCountdownRemainingSec?: number | null;
  note?: string | null;
  promotionId?: string | null;
  promotionTitle?: string | null;
  promotionDiscountPesewas?: number;
  /** Customer-paid rider tip. 0 when none. Credited to the rider on delivery, not the vendor. */
  tipPesewas?: number;
  /** Platform-funded peak pay. 0 when none. Credited to the rider on delivery. Not a customer charge. */
  peakPayPesewas?: number;
  leaveAtDoor?: boolean;
  dropNote?: string | null;
  scheduledFor?: string | null;
  serviceLevel?: 'STANDARD' | 'SCHEDULED' | 'PRIORITY';
  signatureRequired?: boolean;
  etaMinutes: number | null;
  pickup?: { locationId: string | null; name: string; address: string | null; lat: number; lng: number } | null;
  rider?: { id: string; name: string; phone: string; lat: number; lng: number } | null;
  customer?: { id: string; name: string; phone: string } | null;
  items?: {
    id: string;
    itemId: string;
    name: string;
    qty: number;
    unit?: string | null;
    unitPricePesewas: number;
    prepTimeMin: number;
    modifiers: string[];
    selectedOptions: SelectedOptionDto[];
    optionsTotalPesewas: number;
  }[];
  prescriptionRequired?: boolean;
  prescriptionStatus?: string;
  prescriptionReviewNote?: string | null;
  conditionJson?: Record<string, unknown> | null;
  marketFulfillment?: {
    recordedAt: string;
    lines: { orderItemId: string; actualQuantity: number; unit: string; actualPricePesewas: number | null; note: string | null }[];
  } | null;
  laundryStage?: string | null;
  riderFeePesewas?: number;
  dropoff?: DeliveryAddressDto;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  otpRequired: boolean;
  timeline: { from: string; to: string; at: string }[];
  errand?: {
    task: string;
    shopName: string | null;
    shopLat: number;
    shopLng: number;
    budgetPesewas: number;
    escrowPesewas: number;
    errandStatus: string;
    spentPesewas: number;
    receipts: { amountPesewas: number; photoKey: string; note: string | null; at: string }[];
    substitution: { item: string; pricePesewas: number; status: string } | null;
    trustTier: string | null;
    compensationPesewas: number;
  } | null;
  recipient?: { name: string; phone: string; status: string; confirmedAt: string | null; address: DeliveryAddressDto | null } | null;
  parcel?: {
    sender: { name: string; phone: string; address: { label: string; lat: number; lng: number; details?: string } };
    recipient: { name: string; phone: string; address: { label: string; lat: number; lng: number; details?: string } };
    category: string;
    weightKg: number;
    dimensionsCm: { length: number; width: number; height: number } | null;
    declaredValuePesewas: number;
    description: string;
    fragile: boolean;
    sealed: boolean;
    pickupMode: string;
    proofMode: string;
    parcelStatus: string;
    returnReason: string | null;
  } | null;
}

export const acceptOrderSchema = z.object({ orderId: z.string().min(1) });
export const rejectOrderSchema = z.object({ orderId: z.string().min(1), reason: z.string().optional() });
export const readyOrderSchema = z.object({ orderId: z.string().min(1) });
export const delayedOrderSchema = z.object({
  orderId: z.string().min(1),
  extraMinutes: z.number().int().min(1).max(120).optional(),
  newPrepTimeMin: z.number().int().min(1).max(720).optional(),
  reason: z.string().min(3).max(300),
}).refine((value) => value.extraMinutes !== undefined || value.newPrepTimeMin !== undefined, {
  message: 'Provide either extraMinutes or newPrepTimeMin',
  path: ['extraMinutes'],
});
export const confirmOtpSchema = z.object({
  otp: z.string().length(4),
  riderLat: z.number(), // geofence guard: rider must be near the drop point
  riderLng: z.number(),
});
export type ConfirmOtpDto = z.infer<typeof confirmOtpSchema>;

// ── Rider / Dispatch ────────────────────────────────────────────────
export const riderAvailabilitySchema = z.object({
  status: z.enum(['AVAILABLE', 'OFFLINE']),
});
export const riderPauseSchema = z.object({
  minutes: z.number().int().min(1).max(120).default(30),
});
export const riderIncidentSchema = z.object({
  type: z.string().min(2).max(50),
  orderId: z.string().min(1).optional(),
  note: z.string().max(1000).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
});
export type RiderIncidentDto = z.infer<typeof riderIncidentSchema>;
export const patchRiderProfileSchema = z.object({
  vehicle: z.nativeEnum(VehicleType),
  licensePlate: z.string().max(20).optional().nullable(),
});
export type PatchRiderProfileDto = z.infer<typeof patchRiderProfileSchema>;
export const reorderSchema = z.object({
  orderId: z.string().min(1),
});
export type ReorderDto = z.infer<typeof reorderSchema>;
export const redeemVoucherSchema = z.object({
  code: z.string().min(3).max(32),
});
export type RedeemVoucherDto = z.infer<typeof redeemVoucherSchema>;
export const loyaltyRedeemSchema = z.object({
  points: z.number().int().positive().multipleOf(100),
});
export type LoyaltyRedeemDto = z.infer<typeof loyaltyRedeemSchema>;
export const riderSessionSchema = z.object({
  durationMin: z.number().int().min(15).max(720).default(240),
});
export type RiderSessionDto = z.infer<typeof riderSessionSchema>;
export const createRiderBlockSchema = z.object({
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});
export type CreateRiderBlockDto = z.infer<typeof createRiderBlockSchema>;
export interface RiderBlockDto {
  id: string;
  startsAt: string;
  endsAt: string;
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}
export const acceptOfferSchema = z.object({ offerId: z.string().min(1) });
export const declineOfferSchema = z.object({ offerId: z.string().min(1) });
export const pickupProofMethodSchema = z.enum(['GPS', 'PICKUP_CODE', 'QR', 'VENDOR_CONFIRMATION', 'PHOTO']);
export type PickupProofMethod = z.infer<typeof pickupProofMethodSchema>;

export const pickupSchema = z.object({
  riderLat: z.number(),
  riderLng: z.number(),
  proofMethod: pickupProofMethodSchema.optional(),
  proofValue: z.string().min(1).max(300).optional(),
  proofPhotoKey: z.string().min(1).max(500).optional(),
});
export type PickupDto = z.infer<typeof pickupSchema>;

/** Safe order-line projection for a Rider. Prescription contents never belong here. */
export interface RiderOrderItemDto {
  id: string;
  itemId: string;
  name: string;
  qty: number;
  unit?: string | null;
  modifiers: string[];
  selectedOptions: SelectedOptionDto[];
  optionsTotalPesewas: number;
  prescriptionOnly?: boolean;
  handlingFlags?: string[];
}

export type RiderStopKind = 'PICKUP' | 'DROPOFF' | 'LAUNDRY_COLLECTION' | 'LAUNDRY_RETURN';

export interface RiderRouteStopDto {
  stopId: string;
  orderId: string;
  sequence: number;
  kind: RiderStopKind;
  label: string;
  address?: string | null;
  lat: number;
  lng: number;
  status?: string | null;
  serviceCode?: string | null;
}

export interface RiderLaundryContextDto {
  stage?: string | null;
  leg?: 'COLLECTION' | 'VENDOR_HANDOFF' | 'RETURN' | null;
  nextStopKind?: RiderStopKind | null;
  packageSealed?: boolean;
}

export interface RiderMarketContextDto {
  fulfillmentRecorded: boolean;
  lines?: { orderItemId: string; actualQuantity: number; unit: string; note?: string | null }[];
}

export interface RiderPharmacyContextDto {
  operationalFlag: 'SEALED_PACKAGE' | 'PRESCRIPTION_APPROVED' | 'PICKUP_REVIEW_REQUIRED';
}

export interface RiderErrandContextDto {
  task: string;
  shopName: string | null;
  shopLat: number;
  shopLng: number;
  budgetPesewas: number;
  spentPesewas: number;
  remainingBudgetPesewas: number;
  errandStatus: string;
  receiptCount: number;
  substitution?: { item: string; pricePesewas: number; status: string } | null;
  requiresReceipt: boolean;
}

export interface RiderParcelContextDto {
  senderName: string;
  senderPhone: string;
  recipientName: string;
  recipientPhone: string;
  category: string;
  weightKg: number;
  dimensionsCm: { length: number; width: number; height: number } | null;
  declaredValuePesewas: number;
  description: string;
  fragile: boolean;
  sealed: boolean;
  pickupMode: string;
  proofMode: string;
  parcelStatus: string;
  returnReason: string | null;
}

export interface OfferDto {
  id: string;
  batchId?: string | null; // set when the offer covers a grouped/batched set of orders (doc §2)
  orderId: string;
  vendorId: string;
  vendorLocationId?: string | null;
  vendorName: string;
  vendorLocationName?: string | null;
  pickupAddress?: string | null;
  vendorLat: number;
  vendorLng: number;
  dropLat: number;
  dropLng: number;
  dropAddress: string;
  customerPhone?: string | null;
  customerNote?: string | null;
  items?: RiderOrderItemDto[];
  pharmacy?: RiderPharmacyContextDto | null;
  market?: RiderMarketContextDto | null;
  laundry?: RiderLaundryContextDto | null;
  errand?: RiderErrandContextDto | null;
  parcel?: RiderParcelContextDto | null;
  batchStops?: RiderRouteStopDto[];
  expiresAt: string;
  riderFeePesewas: number; // computed via distance-based formula (doc §2.4.2)
  tipPesewas?: number;
  peakPayPesewas?: number;
  leaveAtDoor?: boolean;
  dropNote?: string | null;
  scheduledFor?: string | null;
  pickupWindowMin: number;
  // doc §5: assignment transparency fields
  pickupCount: number;
  dropCount: number;
  pickupDistanceKm: number;
  deliveryDistanceKm: number;
  totalRouteKm: number;
  codExposurePesewas: number;
  vendorReadiness: string; // preparing | ready | delayed
  acceptanceWindowSec: number;
  serviceCode: string;
  assignmentType?: 'SINGLE_DELIVERY' | 'MULTI_PICKUP_DELIVERY' | 'MULTI_CUSTOMER_BATCH_DELIVERY' | 'MULTI_VENDOR_MULTI_CUSTOMER_BATCH';
  pickupSequence?: RiderRouteStopDto[];
  dropoffSequence?: RiderRouteStopDto[];
  handlingNote?: string | null;
  routeMayResequence?: boolean;
  routeRule?: string | null;
}

export interface RiderTaskDto {
  offerId: string | null;
  currentOrder: {
    orderId: string;
    status: string;
    vendorId: string;
    vendorLocationId?: string | null;
    vendorName: string;
    vendorLocationName?: string | null;
    pickupAddress?: string | null;
    vendorLat: number;
    vendorLng: number;
    dropLat: number;
    dropLng: number;
    dropAddress: string;
    paymentMethod: PaymentMethod;
    codAmountPesewas: number;
    customerPhone?: string | null;
    customerNote?: string | null;
    items?: RiderOrderItemDto[];
    pharmacy?: RiderPharmacyContextDto | null;
    market?: RiderMarketContextDto | null;
    laundry?: RiderLaundryContextDto | null;
    errand?: RiderErrandContextDto | null;
    parcel?: RiderParcelContextDto | null;
    riderFeePesewas: number;
    tipPesewas?: number;
    peakPayPesewas?: number;
    leaveAtDoor?: boolean;
    dropNote?: string | null;
    scheduledFor?: string | null;
    serviceCode: string;
  } | null;
  batch?: BatchDto | null;
  stops?: RiderRouteStopDto[];
}

export type RiderDemandLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type RiderDemandConfidence = 'LOW' | 'MEDIUM' | 'HIGH';

export interface RiderDemandZoneDto {
  zoneId: string;
  zoneName: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  distanceFromRiderKm: number;
  demandLevel: RiderDemandLevel;
  expectedOrdersNext30Min: number;
  expectedWaitMin: { min: number; max: number };
  confidence: RiderDemandConfidence;
  freshAt: string;
  expiresAt: string;
  reason: string;
  onlineRidersNearby: number;
  unassignedOrdersNearby: number;
  serviceTypes: string[];
}

export interface RiderDemandZonesDto {
  freshAt: string;
  expiresAt: string;
  zones: RiderDemandZoneDto[];
}

export interface RiderPerformanceDto {
  periodDays: number;
  generatedAt: string;
  rating: number;
  reliabilityScore: number;
  completedDeliveries: number;
  declineCount: number;
  totalAnsweredOffers: number;
  acceptedOffers: number;
  acceptanceRate: number | null;
  completedAssignments: number;
  releasedAssignments: number;
  completionRate: number | null;
  performanceScore?: {
    configVersion: number;
    overallScore: number | null;
    grade: string | null;
    status: string;
    trend: string;
    insufficientData: boolean;
    metrics: unknown[];
    categoryScores: unknown[];
    triggeredActions: unknown[];
  };
}

// ── Tracking ────────────────────────────────────────────────────────
export const locationUpdateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  orderId: z.string().optional(),
  speedKmh: z.number().min(0).optional(),
});
export type LocationUpdateDto = z.infer<typeof locationUpdateSchema>;

// ── Comms (order threads + Ore Support) ─────────────────────────────
export const commsThreadKindSchema = z.enum(['order', 'support']);
export type CommsThreadKind = z.infer<typeof commsThreadKindSchema>;

export const createCommsThreadSchema = z
  .object({
    kind: commsThreadKindSchema.optional(),
    orderId: z.string().min(1).max(80).optional(),
  })
  .superRefine((value, ctx) => {
    const kind = value.kind ?? 'order';
    if (kind === 'order' && !value.orderId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['orderId'],
        message: 'orderId is required for an order thread',
      });
    }
  });
export type CreateCommsThreadDto = z.infer<typeof createCommsThreadSchema>;

export const postCommsMessageSchema = z.object({
  body: z.string().min(1).max(2000),
  attachments: z.array(z.object({
    url: z.string().url(),
    type: z.string(),
    name: z.string()
  })).optional(),
});
export type PostCommsMessageDto = z.infer<typeof postCommsMessageSchema>;

export interface CommsThreadDto {
  threadId: string;
  kind: CommsThreadKind;
  orderId: string | null;
  ownerUserId?: string | null;
  ownerRole?: string | null;
  customerId: string | null;
  vendorId: string | null;
  riderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommsMessageDto {
  id: string;
  threadId: string;
  senderUserId: string;
  senderRole: string;
  body: string;
  visibility?: string;
  attachments?: { url: string; type: string; name: string }[] | null;
  createdAt: string;
}

export const commsVoiceTargetSchema = z.enum(['customer', 'rider', 'vendor']);
export type CommsVoiceTarget = z.infer<typeof commsVoiceTargetSchema>;

/**
 * Device platform of the caller. Selects the Twilio Push Credential embedded in the
 * access token — Android (FCM v1) and iOS (APNs VoIP) are separate credentials and an
 * iOS token with the Android push SID simply fails to register for incoming pushes.
 */
export const commsVoicePlatformSchema = z.enum(['android', 'ios', 'web']);
export type CommsVoicePlatform = z.infer<typeof commsVoicePlatformSchema>;

export const createCommsVoiceTokenSchema = z.object({
  orderId: z.string().min(1).max(80),
  platform: commsVoicePlatformSchema.optional(),
});
export type CreateCommsVoiceTokenDto = z.infer<typeof createCommsVoiceTokenSchema>;

export const createCommsCallSchema = z.object({
  orderId: z.string().min(1).max(80),
  target: commsVoiceTargetSchema,
  platform: commsVoicePlatformSchema.optional(),
});
export type CreateCommsCallDto = z.infer<typeof createCommsCallSchema>;

/** Support call — no order context; rings the online support agents. */
export const createCommsSupportCallSchema = z.object({
  platform: commsVoicePlatformSchema.optional(),
  topic: z.string().max(120).optional(),
});
export type CreateCommsSupportCallDto = z.infer<typeof createCommsSupportCallSchema>;

/** Agent softphone registration — no order context; permission-gated (support.voice.answer). */
export const createCommsAgentTokenSchema = z.object({
  platform: commsVoicePlatformSchema.optional(),
});
export type CreateCommsAgentTokenDto = z.infer<typeof createCommsAgentTokenSchema>;

export interface CommsVoiceSessionDto {
  provider: 'log' | 'twilio';
  target?: CommsVoiceTarget;
  identity?: string;
  toIdentity?: string;
  token?: string;
  expiresAt?: string;
  ttlSec?: number;
  /** Opaque id of the voice_call CDR row; clients send it back with call events. */
  callId?: string;
  /**
   * Callee's stored E.164 number for the "switch to regular call" fallback. Masking is
   * explicitly NOT a product requirement (owner decision 2026-09-11): when VoIP is not
   * viable the apps hand off to the native dialer with this number.
   */
  fallbackPhone?: string | null;
  /** True for support sessions (agent ringing instead of a single order party). */
  support?: boolean;
}

/** What the apps render on their support screens instead of hardcoded numbers. */
export interface SupportContactDto {
  /** Public PSTN support line, E.164, or null when not provisioned. */
  phone: string | null;
  /** In-app VoIP support calling available (Twilio live). */
  appCallingEnabled: boolean;
}

/** Agent softphone presence heartbeat (admin panel). Redis-backed with a short TTL. */
export const commsVoicePresenceSchema = z.object({
  online: z.boolean(),
  /** Agent mobile to ring when no browser agent answers (E.164). */
  forwardPhone: z.string().regex(/^\+[1-9]\d{7,15}$/, 'forwardPhone must be E.164').optional(),
});
export type CommsVoicePresenceDto = z.infer<typeof commsVoicePresenceSchema>;

/**
 * Client-reported call events (the Twilio status callback only sees Twilio legs; the
 * tel: fallback handoff happens entirely on the device).
 */
export const commsCallEventSchema = z.object({
  kind: z.enum(['fallback_offered', 'fallback_started', 'voip_failed', 'quality_poor', 'quality_recovered']),
  detail: z.string().max(200).optional(),
});
export type CommsCallEventDto = z.infer<typeof commsCallEventSchema>;

export type CommsCallStatus =
  | 'initiated'
  | 'ringing'
  | 'answered'
  | 'completed'
  | 'no-answer'
  | 'busy'
  | 'failed'
  | 'canceled';

export interface CommsCallRecordDto {
  callId: string;
  kind: 'order' | 'support';
  orderId: string | null;
  callerUserId: string;
  targetUserId: string | null;
  target: CommsVoiceTarget | null;
  provider: 'log' | 'twilio';
  platform: CommsVoicePlatform | null;
  status: CommsCallStatus;
  fallbackUsed: boolean;
  twilioCallSid: string | null;
  recordingUrl: string | null;
  startedAt: string;
  answeredAt: string | null;
  endedAt: string | null;
  durationSec: number | null;
}

// ── Refunds / money ─────────────────────────────────────────────────
export const refundRequestSchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().min(3).max(300),
  amountPesewas: z.number().int().positive().optional(), // default: full allocated amount
  refundComponent: z.enum(['UNSPECIFIED', 'VENDOR_PRODUCT', 'ORE_COMMISSION', 'ORE_SERVICE_FEE', 'DELIVERY_FEE', 'PRIORITY_FEE', 'TIP', 'ERRAND_BUDGET']).optional(),
  originalTaxStatus: z.enum(['UNKNOWN', 'NOT_TAXED', 'TAXED_OPEN_PERIOD', 'TAXED_FILED_PERIOD']).optional(),
  taxPeriodStatus: z.enum(['OPEN', 'FILED', 'AMENDED', 'CLOSED']).optional(),
});
export type RefundRequestDto = z.infer<typeof refundRequestSchema>;

export const remittanceSchema = z.object({
  amountPesewas: z.number().int().positive(),
  reference: z.string().optional(),
});
export type RemittanceDto = z.infer<typeof remittanceSchema>;

// ── Wallet / rider money (doc §5) ───────────────────────────────────
export const withdrawalRequestSchema = z.object({
  amountPesewas: z.number().int().positive(),
  destination: z.string().min(3).max(120), // e.g. "2335… MoMo" / bank account label
  reference: z.string().optional(),
});
export type WithdrawalRequestDto = z.infer<typeof withdrawalRequestSchema>;

export const codTierSchema = z.object({
  tier: z.enum(['NEW', 'EXPERIENCED', 'SENIOR']),
  reason: z.string().optional(),
});
export type CodTierDto = z.infer<typeof codTierSchema>;

export const codStatusSchema = z.object({
  status: z.enum(['CLEAR', 'WARNING', 'SUSPENDED', 'INVESTIGATION', 'TERMINATED']),
  reason: z.string().optional(),
});
export type CodStatusDto = z.infer<typeof codStatusSchema>;

export const walletAdjustSchema = z.object({
  amountPesewas: z.number().int().nonnegative(),
  kind: z.enum(['credit_cleared', 'penalty', 'reversal']),
  reason: z.string().min(3).max(300),
});
export type WalletAdjustDto = z.infer<typeof walletAdjustSchema>;

/** Wallet view — doc §5: available payout = cleared − COD − penalties, never negative. */
export interface RiderWalletDto {
  riderId: string;
  userId: string;
  pendingPesewas: number;
  clearedPesewas: number;
  lockedPesewas: number; // penalties / in-transit withdrawal holds
  cashLiabilityPesewas: number; // outstanding COD cash owed to platform
  withdrawablePesewas: number; // max(0, cleared − cashLiability − locked)
  lifetimeEarnedPesewas: number;
  lifetimeRemittedPesewas: number;
  codTier: RiderCodTier;
  codStatus: RiderCodStatus;
  codEligible: boolean; // can accept a COD order right now
  tierLimitPesewas: number;
  triggerPct: number;
  withdrawalDay: string | null;
  withdrawnTodayPesewas: number;
  freeWithdrawalsLeftToday: number;
  withdrawalFeePesewas: number;
  minWithdrawalPesewas: number;
  dailyCapPesewas: number;
}

// ── Vendor settlement (doc §4) ─────────────────────────────────────
export const vendorSettlementPaySchema = z.object({
  note: z.string().max(300).optional(),
});
export type VendorSettlementPayDto = z.infer<typeof vendorSettlementPaySchema>;

export const vendorSettlementReverseSchema = z.object({
  reason: z.string().min(3).max(300),
});
export type VendorSettlementReverseDto = z.infer<typeof vendorSettlementReverseSchema>;

// ── Disputes / refunds / chargebacks (doc §Payment) ────────────────
export const openDisputeSchema = z.object({
  orderId: z.string().min(1),
  reason: z.enum(['MISSING_ITEM', 'WRONG_ITEM', 'DAMAGED', 'QUALITY', 'NEVER_DELIVERED', 'OVERCHARGED', 'OTHER']),
  description: z.string().min(3).max(1000),
  evidenceKeys: z.array(z.string().min(1)).max(10).optional(), // media storage keys
});
export type OpenDisputeDto = z.infer<typeof openDisputeSchema>;

export const resolveDisputeSchema = z.object({
  decision: z.enum(['refund_full', 'refund_partial', 'no_refund']),
  fault: z.enum(['VENDOR', 'RIDER', 'PLATFORM', 'CUSTOMER']).optional(),
  amountPesewas: z.number().int().positive().optional(), // required for refund_partial
  refundMethod: z.enum(['WALLET', 'ORIGINAL']).optional(), // default WALLET (doc §Payment priority)
  note: z.string().max(500).optional(),
});
export type ResolveDisputeDto = z.infer<typeof resolveDisputeSchema>;

export const openChargebackSchema = z.object({
  orderId: z.string().min(1),
  reference: z.string().min(1), // bank/PSP chargeback reference
  amountPesewas: z.number().int().positive(),
  reason: z.string().min(3).max(500),
  evidenceKeys: z.array(z.string().min(1)).max(10).optional(),
});
export type OpenChargebackDto = z.infer<typeof openChargebackSchema>;

export const resolveChargebackSchema = z.object({
  outcome: z.enum(['won', 'lost']),
  fault: z.enum(['VENDOR', 'RIDER', 'PLATFORM', 'CUSTOMER']).optional(),
  feesPesewas: z.number().int().nonnegative().optional(), // PSP/bank chargeback fees allocated
  note: z.string().max(500).optional(),
});
export type ResolveChargebackDto = z.infer<typeof resolveChargebackSchema>;

// ── Dispatch grouping / batching (doc §2) ──────────────────────────
export interface BatchRouteStop {
  orderId: string;
  vendorId?: string;
  name: string;
  lat: number;
  lng: number;
}

export interface BatchDto {
  id: string;
  type: BatchType;
  riderId: string | null;
  status: string;
  pickupCount: number;
  dropCount: number;
  orderIds: string[];
  pickupOrder: BatchRouteStop[]; // sequential pickups (rider origin → nearest first)
  dropOrder: BatchRouteStop[]; // sequential drops
  totalRiderFeePesewas: number;
  codExposurePesewas: number;
  createdAt: string;
}

export const adminCustomerCreditSchema = z.object({
  amountPesewas: z.number().int().positive(),
  reason: z.string().min(3).max(300),
});
export type AdminCustomerCreditDto = z.infer<typeof adminCustomerCreditSchema>;

// NOTE: customer wallet top-up was intentionally REMOVED. Customers never load money into
// their wallet — they pay at checkout. The wallet exists solely as a destination for refunds,
// which the customer may then withdraw or spend on a later order.
// ── Parcel / Courier (request-only service) ─────────────────────────
const parcelAddressSchema = deliveryAddressSchema;

export const createParcelSchema = z.object({
  sender: z.object({
    name: z.string().min(2).max(120),
    phone: z.string().regex(/^(\+?233|0)[1-9][0-9]{8}$/, 'Invalid Ghana sender phone number'),
    address: parcelAddressSchema,
  }),
  recipient: z.object({
    name: z.string().min(2).max(120),
    phone: z.string().regex(/^(\+?233|0)[1-9][0-9]{8}$/, 'Invalid Ghana recipient phone number'),
    address: parcelAddressSchema,
  }),
  category: z.enum(['DOCUMENTS', 'SMALL_PACKAGE', 'MEDIUM_PACKAGE', 'LARGE_PACKAGE', 'FRAGILE']),
  weightKg: z.number().positive().max(80),
  dimensionsCm: z.object({ length: z.number().positive().max(200), width: z.number().positive().max(200), height: z.number().positive().max(200) }).optional(),
  declaredValuePesewas: z.number().int().nonnegative().max(500_000),
  description: z.string().min(3).max(500),
  fragile: z.boolean().default(false),
  sealed: z.boolean().refine((value) => value === true, 'Parcel must be sealed before pickup'),
  pickupMode: z.enum(['MEET_DOOR', 'MEET_CURB']).default('MEET_DOOR'),
  proofMode: z.enum(['PIN', 'SIGNATURE', 'PHOTO', 'PIN_AND_PHOTO']).default('PIN'),
  prohibitedItemsAcknowledged: z.literal(true),
  serviceLevel: z.enum(['STANDARD', 'SCHEDULED', 'PRIORITY']).optional(),
  note: z.string().max(500).optional(),
});
export type CreateParcelDto = z.infer<typeof createParcelSchema>;

// ── Errands (doc §Errands) ─────────────────────────────────────────
export const createErrandSchema = z.object({
  task: z.string().min(5).max(500), // what to buy/do
  shopName: z.string().min(2).max(120).optional(),
  shopLat: z.number().min(-90).max(90),
  shopLng: z.number().min(-180).max(180),
  budgetPesewas: z.number().int().positive().max(500_000), // goods budget cap (GHS ≤ 5,000)
  address: deliveryAddressSchema,
  serviceLevel: z.enum(['STANDARD', 'SCHEDULED', 'PRIORITY']).optional(),
  note: z.string().max(500).optional(),
});
export type CreateErrandDto = z.infer<typeof createErrandSchema>;

export const errandReceiptSchema = z.object({
  amountPesewas: z.number().int().positive(), // ≤ remaining budget
  /** Internal callers may provide a storage key; Rider clients upload dataBase64 and receive a server-owned key. */
  photoKey: z.string().min(1).max(200).optional(),
  dataBase64: z.string().min(100).optional(),
  contentType: z.string().max(80).optional(),
  note: z.string().max(300).optional(),
}).refine((value) => !!value.photoKey || !!value.dataBase64, {
  message: 'A receipt photo is required',
  path: ['dataBase64'],
});
export type ErrandReceiptDto = z.infer<typeof errandReceiptSchema>;

export const errandSubstitutionSchema = z.object({
  item: z.string().min(2).max(120), // proposed substitute
  pricePesewas: z.number().int().positive(),
});
export type ErrandSubstitutionDto = z.infer<typeof errandSubstitutionSchema>;

export const errandSubDecisionSchema = z.object({
  approve: z.boolean(),
});
export type ErrandSubDecisionDto = z.infer<typeof errandSubDecisionSchema>;

// ── Referral (doc §8) ──────────────────────────────────────────────
export const referralClaimSchema = z.object({
  code: z.string().min(4).max(20),
  phone: z.string().regex(/^(\+?233|0)[1-9][0-9]{8}$/, 'Invalid Ghana phone number'),
});
export type ReferralClaimDto = z.infer<typeof referralClaimSchema>;

export const referralBlockSchema = z.object({
  reason: z.string().min(3).max(300),
});
export type ReferralBlockDto = z.infer<typeof referralBlockSchema>;

// ── Vendor plans / stories / penalties (doc §4) ────────────────────
export const setVendorPlanSchema = z.object({
  plan: z.enum(['STANDARD', 'PREMIUM']),
});
export type SetVendorPlanDto = z.infer<typeof setVendorPlanSchema>;

export const createStorySchema = z.object({
  kind: z.enum(['IMAGE', 'VIDEO']),
  mediaKey: z.string().min(1).max(300),
  muxPlaybackId: z.string().min(1).max(200).optional(), // VIDEO only — Mux (mock: passthrough)
  caption: z.string().max(200).optional(),
});
export type CreateStoryDto = z.infer<typeof createStorySchema>;

export const createVendorPromotionSchema = z.object({
  title: z.string().min(3).max(120),
  discountType: z.enum(['PERCENT', 'FIXED']),
  discountValue: z.number().int().positive(),
  minimumSubtotalPesewas: z.number().int().nonnegative().optional(),
  budgetPesewas: z.number().int().positive().optional(),
  redemptionLimit: z.number().int().positive().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  code: z.string().min(3).max(32).regex(/^[A-Z0-9-]+$/i).optional(),
}).superRefine((value, ctx) => {
  if (value.discountType === 'PERCENT' && value.discountValue > 100) {
    ctx.addIssue({ code: z.ZodIssueCode.too_big, maximum: 100, type: 'number', inclusive: true, path: ['discountValue'], message: 'Percentage discount cannot exceed 100' });
  }
  if (new Date(value.endsAt) <= new Date(value.startsAt)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endsAt'], message: 'Promotion must end after it starts' });
  }
});
export type CreateVendorPromotionDto = z.infer<typeof createVendorPromotionSchema>;

export const createVendorReviewSchema = z.object({
  orderId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});
export type CreateVendorReviewDto = z.infer<typeof createVendorReviewSchema>;

export const applyPenaltySchema = z.object({
  level: z.enum(['WARNING', 'FINANCIAL', 'SUSPENSION_24H', 'SUSPENSION_72H', 'SUSPENSION_7D', 'PERMANENT']),
  trigger: z.string().min(3).max(200),
  amountPesewas: z.number().int().nonnegative().optional(), // required for FINANCIAL
  note: z.string().max(300).optional(),
});
export type ApplyPenaltyDto = z.infer<typeof applyPenaltySchema>;

// ── Catalog management (admin / vendor) ────────────────────────────

export const createVendorSchema = z.object({
  name: z.string().min(2).max(120),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  deliveryRadiusKm: z.number().positive().max(50).optional(),
  acceptsCod: z.boolean().optional(),
  defaultPrepTimeMin: z.number().int().min(5).max(180).optional(),
});
export type CreateVendorDto = z.infer<typeof createVendorSchema>;

export const addMenuItemSchema = z.object({
  name: z.string().min(2).max(120),
  category: z.string().min(1).max(80),
  pricePesewas: z.number().int().positive(),
  prepTimeMin: z.number().int().min(0).max(720).optional(),
  unit: z.string().max(40).optional(),
  stock: z.number().int().nonnegative().optional(),
  prescriptionOnly: z.boolean().optional(),
  description: z.string().max(1000).optional(),
  modifiers: z.array(z.string().min(1).max(80)).optional(),
  addonGroups: z.array(z.record(z.unknown())).optional(),
  sku: z.string().max(80).optional(),
  expiryDate: z.string().optional(),
  dosage: z.string().max(200).optional(),
  turnaround: z.string().max(100).optional(),
  dailyMarketPrice: z.boolean().optional(),
  garmentType: z.string().max(80).optional(),
  conditionJson: z.record(z.unknown()).optional(),
  dietaryTags: z.array(z.string().min(1).max(50)).optional(),
});
export type AddMenuItemDto = z.infer<typeof addMenuItemSchema>;

export const createVendorLocationSchema = z.object({
  name: z.string().min(2).max(120),
  address: z.string().min(3).max(300),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  deliveryRadiusKm: z.number().positive().max(50).optional(),
  accepting: z.boolean().optional(),
});
export type CreateVendorLocationDto = z.infer<typeof createVendorLocationSchema>;

export const addVendorStaffSchema = z.object({
  userId: z.string().min(1),
  displayName: z.string().min(2).max(80),
  phone: z.string().min(8).max(20).optional(),
  staffRole: z.string().min(2).max(50).optional(),
});
export type AddVendorStaffDto = z.infer<typeof addVendorStaffSchema>;

export const connectPosSchema = z.object({
  provider: z.string().min(2).max(80),
  externalStoreId: z.string().min(1).max(200).optional(),
});
export type ConnectPosDto = z.infer<typeof connectPosSchema>;

export const posWebhookSchema = z.object({
  event: z.string().min(1).max(80).optional(),
  itemId: z.string().min(1).optional(),
  stock: z.number().int().nonnegative().optional(),
  available: z.boolean().optional(),
});
export type PosWebhookDto = z.infer<typeof posWebhookSchema>;

export const vendorReviewResponseSchema = z.object({
  response: z.string().min(1).max(1000),
});
export type VendorReviewResponseDto = z.infer<typeof vendorReviewResponseSchema>;

// ── Catalog internal ────────────────────────────────────────────────

export const reserveStockSchema = z.object({
  orderId: z.string().min(1),
  lines: z.array(z.object({ itemId: z.string().min(1), qty: z.number().int().positive() })).min(1),
});
export type ReserveStockDto = z.infer<typeof reserveStockSchema>;

export const onboardVendorSchema = z.object({
  ownerUserId: z.string().min(1),
  name: z.string().min(2).max(120),
  vendorType: z.string().min(2).max(50),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  publicId: z.string().min(1),
  payoutAccountJson: z.record(z.unknown()).nullable().optional(),
});
export type OnboardVendorDto = z.infer<typeof onboardVendorSchema>;

// ── Notification ────────────────────────────────────────────────────

export const registerDeviceTokenSchema = z.object({
  token: z.string().min(10).max(500),
  platform: z.enum(['android', 'ios']),
});
export type RegisterDeviceTokenDto = z.infer<typeof registerDeviceTokenSchema>;

// ── Ledger admin / vendor ───────────────────────────────────────────

export const requestVendorWithdrawalSchema = z.object({
  amountPesewas: z.number().int().positive(),
});
export type RequestVendorWithdrawalDto = z.infer<typeof requestVendorWithdrawalSchema>;

export const releaseVendorReserveSchema = z.object({
  amountPesewas: z.number().int().positive(),
  reason: z.string().min(3).max(300),
});
export type ReleaseVendorReserveDto = z.infer<typeof releaseVendorReserveSchema>;

export const verifyRemittanceSchema = z.object({
  amountPesewas: z.number().int().positive(),
});
export type VerifyRemittanceDto = z.infer<typeof verifyRemittanceSchema>;

export const rejectWithdrawalSchema = z.object({
  note: z.string().max(300).optional(),
});
export type RejectWithdrawalDto = z.infer<typeof rejectWithdrawalSchema>;

// ── Dispatch ────────────────────────────────────────────────────────

export const registerRiderSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().min(8).max(20),
  vehicle: z.nativeEnum(VehicleType).optional(),
  licensePlate: z.string().max(20).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});
export type RegisterRiderDto = z.infer<typeof registerRiderSchema>;

export const riderAvailabilityBodySchema = z.object({
  status: z.enum(['AVAILABLE', 'OFFLINE']),
});
export type RiderAvailabilityBodyDto = z.infer<typeof riderAvailabilityBodySchema>;

export const adminAssignSchema = z.object({
  riderId: z.string().min(1),
  reason: z.string().min(3).max(300),
});
export type AdminAssignDto = z.infer<typeof adminAssignSchema>;

export const setRiderVerifiedSchema = z.object({
  verified: z.boolean().default(true),
  /** Optional backend/admin-approved operating location id. City code is resolved server-side from the register. */
  approvedOperatingLocationId: z.string().min(1).max(80).optional(),
});
export type SetRiderVerifiedDto = z.infer<typeof setRiderVerifiedSchema>;

export const onboardRiderSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(2).max(120),
  phone: z.string().min(8).max(20),
  vehicle: z.nativeEnum(VehicleType).optional(),
  licensePlate: z.string().max(20).optional().nullable(),
  approvedOperatingLocationId: z.string().min(1).max(80).optional(),
  approvalActorId: z.string().min(1).max(120).optional(),
  sourceApplicationId: z.string().min(1).max(120).optional(),
});
export type OnboardRiderDto = z.infer<typeof onboardRiderSchema>;

export const riderIdentifierCorrectionSchema = z.object({
  reason: z.string().min(10).max(1000),
  approvalReference: z.string().min(3).max(120),
  /** Optional corrected approved operating location id. The sequence is still database-generated. */
  approvedOperatingLocationId: z.string().min(1).max(80).optional(),
});
export type RiderIdentifierCorrectionDto = z.infer<typeof riderIdentifierCorrectionSchema>;

export const codBlockSchema = z.object({
  blocked: z.boolean(),
});
export type CodBlockDto = z.infer<typeof codBlockSchema>;

// ── Order management ────────────────────────────────────────────────

export const uploadPrescriptionSchema = z.object({
  dataBase64: z.string().min(100),
  contentType: z.string().max(80).optional(),
});
export type UploadPrescriptionDto = z.infer<typeof uploadPrescriptionSchema>;

export const prescriptionReviewSchema = z.object({
  note: z.string().max(500).optional(),
});
export type PrescriptionReviewDto = z.infer<typeof prescriptionReviewSchema>;

export const reportIssueSchema = z.object({
  category: z.string().min(2).max(50).optional(),
  note: z.string().max(1000).optional(),
});
export type ReportIssueDto = z.infer<typeof reportIssueSchema>;

export const resolveIssueSchema = z.object({
  status: z.string().min(2).max(50).optional(),
  note: z.string().max(500).optional(),
});
export type ResolveIssueDto = z.infer<typeof resolveIssueSchema>;

export const laundryStageSchema = z.object({
  stage: z.string().min(2).max(80),
});
export type LaundryStageDto = z.infer<typeof laundryStageSchema>;

export const laundryConditionSchema = z.object({
  condition: z.record(z.unknown()),
});
export type LaundryConditionDto = z.infer<typeof laundryConditionSchema>;

export const laundryConditionPhotoSchema = z.object({
  dataBase64: z.string().min(100),
  contentType: z.string().max(80).optional(),
});
export type LaundryConditionPhotoDto = z.infer<typeof laundryConditionPhotoSchema>;

export const uploadDeliveryProofSchema = z.object({
  photoBase64: z.string().min(100),
  contentType: z.string().max(80).optional(),
});
export type UploadDeliveryProofDto = z.infer<typeof uploadDeliveryProofSchema>;

export const uploadDeliverySignatureSchema = z.object({
  signatureBase64: z.string().min(100),
  contentType: z.string().max(80).optional(),
});
export type UploadDeliverySignatureDto = z.infer<typeof uploadDeliverySignatureSchema>;

export const confirmGiftLocationSchema = deliveryAddressSchema.extend({
  source: z.string().min(1).max(30).default('RECIPIENT'),
  confirmationSource: z.string().max(40).default('RECIPIENT_LINK'),
});
export type ConfirmGiftLocationDto = z.infer<typeof confirmGiftLocationSchema>;

export const orderAddressCorrectionSchema = z.object({
  address: deliveryAddressSchema,
  reason: z.string().min(5).max(500),
  source: z.string().max(40).default('SUPPORT_CORRECTION'),
});
export type OrderAddressCorrectionDto = z.infer<typeof orderAddressCorrectionSchema>;

export const taxRuleUpsertSchema = z.object({
  ruleId: z.string().min(2).max(120),
  taxType: z.enum(['VAT', 'NHIL', 'GETFUND', 'WHT', 'WITHHOLDING_VAT', 'PAYE', 'SSNIT', 'CIT', 'RENT_WHT']),
  supplierType: z.enum(['CUSTOMER', 'VENDOR', 'DELIVERY_PARTNER', 'INDEPENDENT_DELIVERY_PARTNER', 'FLEET_DELIVERY_PARTNER', 'FLEET_PARTNER', 'ORE', 'PAYSTACK', 'EMPLOYEE', 'LANDLORD', 'OTHER_SUPPLIER', 'ANY']).optional(),
  payerType: z.enum(['CUSTOMER', 'VENDOR', 'DELIVERY_PARTNER', 'INDEPENDENT_DELIVERY_PARTNER', 'FLEET_DELIVERY_PARTNER', 'FLEET_PARTNER', 'ORE', 'PAYSTACK', 'EMPLOYEE', 'LANDLORD', 'OTHER_SUPPLIER', 'ANY']).optional(),
  payeeType: z.enum(['CUSTOMER', 'VENDOR', 'DELIVERY_PARTNER', 'INDEPENDENT_DELIVERY_PARTNER', 'FLEET_DELIVERY_PARTNER', 'FLEET_PARTNER', 'ORE', 'PAYSTACK', 'EMPLOYEE', 'LANDLORD', 'OTHER_SUPPLIER', 'ANY']).optional(),
  residentStatus: z.enum(['RESIDENT', 'NON_RESIDENT', 'UNKNOWN', 'ANY']).optional(),
  transactionType: z.enum(['GOODS', 'WORKS', 'GENERAL_SERVICES', 'RENT', 'DIRECTOR_FEES', 'COMMISSION', 'NON_RESIDENT_SERVICES', 'ANY']).optional(),
  contractType: z.string().min(2).max(160).optional(),
  thresholdType: z.enum(['TRANSACTION_THRESHOLD', 'ANNUAL_CUMULATIVE_THRESHOLD', 'SUPPLIER_CATEGORY_THRESHOLD', 'NO_THRESHOLD_RULE']).optional(),
  thresholdAmountPesewas: z.number().int().nonnegative().optional(),
  rateBps: z.number().int().nonnegative().max(10000),
  taxBase: z.enum(['GROSS_AMOUNT', 'TAXABLE_AMOUNT', 'AMOUNT_OVER_THRESHOLD']).optional(),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().optional().nullable(),
  exemption: z.boolean().optional(),
  certificateRequired: z.boolean().optional(),
  active: z.boolean().optional(),
  version: z.number().int().positive().optional(),
});
export type TaxRuleUpsertDto = z.infer<typeof taxRuleUpsertSchema>;

export const taxComponentClassificationSchema = z.object({
  transactionId: z.string().min(2).max(160),
  orderId: z.string().optional().nullable(),
  componentType: z.string().min(2).max(120),
  payerType: z.enum(['CUSTOMER', 'VENDOR', 'DELIVERY_PARTNER', 'INDEPENDENT_DELIVERY_PARTNER', 'FLEET_DELIVERY_PARTNER', 'FLEET_PARTNER', 'ORE', 'PAYSTACK', 'EMPLOYEE', 'LANDLORD', 'OTHER_SUPPLIER']),
  payerId: z.string().optional().nullable(),
  payeeType: z.enum(['CUSTOMER', 'VENDOR', 'DELIVERY_PARTNER', 'INDEPENDENT_DELIVERY_PARTNER', 'FLEET_DELIVERY_PARTNER', 'FLEET_PARTNER', 'ORE', 'PAYSTACK', 'EMPLOYEE', 'LANDLORD', 'OTHER_SUPPLIER']),
  payeeId: z.string().optional().nullable(),
  supplierType: z.enum(['CUSTOMER', 'VENDOR', 'DELIVERY_PARTNER', 'INDEPENDENT_DELIVERY_PARTNER', 'FLEET_DELIVERY_PARTNER', 'FLEET_PARTNER', 'ORE', 'PAYSTACK', 'EMPLOYEE', 'LANDLORD', 'OTHER_SUPPLIER']),
  supplierId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  grossAmountPesewas: z.number().int().nonnegative(),
  taxableAmountPesewas: z.number().int().nonnegative().optional().nullable(),
  taxCategory: z.enum(['TAXABLE', 'ZERO_RATED', 'EXEMPT', 'OUT_OF_SCOPE', 'NOT_ORE_SUPPLY']),
  revenueOwner: z.enum(['ORE', 'VENDOR', 'DELIVERY_PARTNER', 'FLEET_DELIVERY_PARTNER', 'OTHER']),
  paymentProcessor: z.enum(['PAYSTACK', 'CASH', 'INTERNAL', 'NONE']),
  settlementMethod: z.enum(['PAYSTACK_SPLIT', 'PAYSTACK_TRANSFER', 'COD_CASH', 'WALLET', 'BANK_TRANSFER', 'INTERNAL_LEDGER', 'NONE']),
  contractType: z.string().min(2).max(160),
  transactionType: z.enum(['GOODS', 'WORKS', 'GENERAL_SERVICES', 'RENT', 'DIRECTOR_FEES', 'COMMISSION', 'NON_RESIDENT_SERVICES']),
  residentStatus: z.enum(['RESIDENT', 'NON_RESIDENT', 'UNKNOWN']),
  transactionDate: z.string().datetime().optional().nullable(),
  pricingMode: z.enum(['INCLUSIVE', 'EXCLUSIVE']).optional(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});
export type TaxComponentClassificationDto = z.infer<typeof taxComponentClassificationSchema>;

export const taxReviewResolveSchema = z.object({
  note: z.string().min(5).max(1000),
});
export type TaxReviewResolveDto = z.infer<typeof taxReviewResolveSchema>;

export const vendorTaxProfileUpsertSchema = z.object({
  residentStatus: z.enum(['RESIDENT', 'NON_RESIDENT', 'UNKNOWN']),
  taxIdentificationNumber: z.string().trim().min(1).max(80).optional().nullable(),
  taxProfileJson: z.record(z.string(), z.unknown()).optional().nullable(),
});
export type VendorTaxProfileUpsertDto = z.infer<typeof vendorTaxProfileUpsertSchema>;

export const deliveryPartnerTaxProfileUpsertSchema = z.object({
  residentStatus: z.enum(['RESIDENT', 'NON_RESIDENT', 'UNKNOWN']),
  deliveryPartnerType: z.enum(['INDEPENDENT_DELIVERY_PARTNER', 'FLEET_DELIVERY_PARTNER']).optional(),
  deliveryPartnerId: z.string().trim().min(1).max(160).optional().nullable(),
  fleetPartnerId: z.string().trim().min(1).max(160).optional().nullable(),
  contractType: z.string().trim().min(2).max(160).optional(),
  settlementMethod: z.enum(['PAYSTACK_SPLIT', 'PAYSTACK_TRANSFER', 'COD_CASH', 'WALLET', 'BANK_TRANSFER', 'INTERNAL_LEDGER', 'NONE']).optional(),
});
export type DeliveryPartnerTaxProfileUpsertDto = z.infer<typeof deliveryPartnerTaxProfileUpsertSchema>;

export const performanceMetricConfigSchema = z.object({
  code: z.string().min(2).max(80),
  label: z.string().min(2).max(160),
  category: z.enum(['OPERATIONS', 'CUSTOMER_EXPERIENCE', 'COMPLIANCE', 'QUALITY', 'FINANCIAL', 'SAFETY']),
  weight: z.number().nonnegative().max(1000),
  formula: z.enum(['RATE_GTE_TARGET', 'RATE_LTE_TARGET', 'AVERAGE_GTE_TARGET', 'AVERAGE_LTE_TARGET', 'COUNT_LTE_TARGET', 'MANUAL_0_100']),
  target: z.number().nonnegative(),
  minimumSampleSize: z.number().int().nonnegative().optional(),
  enabled: z.boolean().optional(),
  maxValue: z.number().positive().optional(),
  exclusionCodes: z.array(z.string().min(1).max(80)).optional(),
  attribution: z.object({
    impactWhenResponsibleOnly: z.boolean().optional(),
    excludedCauses: z.array(z.enum(['RESPONSIBLE', 'CUSTOMER', 'VENDOR', 'RIDER', 'PLATFORM', 'WEATHER', 'THIRD_PARTY', 'UNKNOWN'])).optional(),
  }).optional(),
});
export const performanceEngineConfigSchema = z.object({
  subject: z.enum(['VENDOR', 'RIDER']),
  version: z.number().int().positive(),
  reviewPeriod: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'CUSTOM']),
  minimumTotalSampleSize: z.number().int().nonnegative().optional(),
  metrics: z.array(performanceMetricConfigSchema).min(1),
  gradeBands: z.array(z.object({
    grade: z.string().min(1).max(20),
    minScore: z.number().min(0).max(100),
    maxScore: z.number().min(0).max(100).optional(),
    status: z.enum(['EXCELLENT', 'GOOD', 'MONITOR', 'WARNING', 'PIP', 'RESTRICTED', 'SUSPENDED', 'INSUFFICIENT_DATA']),
  })).min(1),
  categoryWeights: z.record(z.string(), z.number().nonnegative()).optional(),
  trendRules: z.object({ improvingDelta: z.number().optional(), decliningDelta: z.number().optional(), reviewPeriods: z.number().int().positive().optional() }).optional(),
  actionRules: z.array(z.object({
    code: z.string().min(2).max(80),
    action: z.enum(['NO_ACTION', 'WARNING', 'PIP', 'RESTRICTION', 'SUSPENSION', 'AUDIT_REVIEW', 'MANUAL_REVIEW']),
    whenStatusIn: z.array(z.enum(['EXCELLENT', 'GOOD', 'MONITOR', 'WARNING', 'PIP', 'RESTRICTED', 'SUSPENDED', 'INSUFFICIENT_DATA'])).optional(),
    whenScoreBelow: z.number().min(0).max(100).optional(),
    whenMetricBelow: z.object({ metricCode: z.string().min(1), scoreBelow: z.number().min(0).max(100) }).optional(),
    requiresAudit: z.boolean().optional(),
    requiresApproval: z.boolean().optional(),
    restrictionCode: z.string().max(80).optional(),
    durationDays: z.number().int().positive().optional(),
  })).optional(),
  auditRequiredActions: z.array(z.string().min(1).max(80)).optional(),
});
export type PerformanceEngineConfigDto = z.infer<typeof performanceEngineConfigSchema>;

export const performanceConfigUpsertSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  active: z.boolean().default(true),
  config: performanceEngineConfigSchema,
  notes: z.string().max(500).optional(),
});
export type PerformanceConfigUpsertDto = z.infer<typeof performanceConfigUpsertSchema>;

export const performanceMetricInputSchema = z.object({
  code: z.string().min(1).max(80),
  numerator: z.number().nonnegative().optional(),
  denominator: z.number().nonnegative().optional(),
  value: z.number().nonnegative().optional(),
  sampleSize: z.number().int().nonnegative().optional(),
  category: z.enum(['OPERATIONS', 'CUSTOMER_EXPERIENCE', 'COMPLIANCE', 'QUALITY', 'FINANCIAL', 'SAFETY']).optional(),
  attributed: z.boolean().optional(),
  attribution: z.enum(['RESPONSIBLE', 'CUSTOMER', 'VENDOR', 'RIDER', 'PLATFORM', 'WEATHER', 'THIRD_PARTY', 'UNKNOWN']).optional(),
  exclusionCode: z.string().max(80).nullable().optional(),
  incidentType: z.string().max(80).nullable().optional(),
  notes: z.string().max(500).optional(),
});
export const performanceReviewRunSchema = z.object({
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  reviewerId: z.string().min(1).optional(),
  metrics: z.array(performanceMetricInputSchema).optional(),
  incidents: z.array(z.object({ type: z.string().min(1).max(80), severity: z.string().max(40).optional(), attributed: z.boolean().optional(), exclusionCode: z.string().max(80).optional() })).optional(),
  actionOverrides: z.array(z.string().min(1).max(80)).optional(),
  outcome: z.string().max(80).optional(),
  notes: z.string().max(1000).optional(),
});
export type PerformanceReviewRunDto = z.infer<typeof performanceReviewRunSchema>;

export const performanceHistorySearchSchema = z.object({
  subjectId: z.string().optional(),
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional(),
  status: z.string().optional(),
  reviewer: z.string().optional(),
  metricCategory: z.string().optional(),
  incidentType: z.string().optional(),
  action: z.string().optional(),
  outcome: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(250).optional(),
});
export type PerformanceHistorySearchDto = z.infer<typeof performanceHistorySearchSchema>;

export const performanceCorrectionSchema = performanceReviewRunSchema.extend({
  linkedRecordId: z.string().min(1),
  correctionType: z.enum(['CORRECTION', 'APPEAL', 'REVERSAL']),
  reason: z.string().min(5).max(500),
});
export type PerformanceCorrectionDto = z.infer<typeof performanceCorrectionSchema>;

export const riderIncidentAttributionSchema = z.object({
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  attribution: z.enum(['RESPONSIBLE', 'CUSTOMER', 'VENDOR', 'RIDER', 'PLATFORM', 'WEATHER', 'THIRD_PARTY', 'UNKNOWN']).default('UNKNOWN'),
  excludedFromPerformance: z.boolean().default(false),
  exclusionReason: z.string().max(300).optional(),
  performanceImpact: z.boolean().default(true),
  outcome: z.string().max(80).optional(),
});
export type RiderIncidentAttributionDto = z.infer<typeof riderIncidentAttributionSchema>;

export const marketFulfillmentSchema = z.object({
  lines: z.array(z.object({
    orderItemId: z.string().min(1),
    actualQuantity: z.number().nonnegative(),
    unit: z.string().min(1).max(40),
    actualPricePesewas: z.number().int().nonnegative().nullable().optional(),
    note: z.string().max(300).nullable().optional(),
  })).optional(),
});
export type MarketFulfillmentDto = z.infer<typeof marketFulfillmentSchema>;

export const orderDelaySchema = z.object({
  extraMinutes: z.number().int().min(1).max(120).optional(),
  newPrepTimeMin: z.number().int().min(1).max(720).optional(),
  reason: z.string().min(3).max(300),
}).refine((value) => value.extraMinutes !== undefined || value.newPrepTimeMin !== undefined, {
  message: 'Provide either extraMinutes or newPrepTimeMin',
  path: ['extraMinutes'],
});
export type OrderDelayDto = z.infer<typeof orderDelaySchema>;

export const orderCancelSchema = z.object({
  reason: z.string().max(300).optional(),
});
export type OrderCancelDto = z.infer<typeof orderCancelSchema>;

export const adminCancelSchema = z.object({
  reason: z.string().min(3).max(300),
});
export type AdminCancelDto = z.infer<typeof adminCancelSchema>;

export const forceStateSchema = z.object({
  targetStatus: z.string().min(2).max(50),
  reason: z.string().min(3).max(300),
});
export type ForceStateDto = z.infer<typeof forceStateSchema>;

export const internalSetRiderFeeSchema = z.object({
  riderFeePesewas: z.number().int().nonnegative(),
  peakPayPesewas: z.number().int().nonnegative().optional(),
});
export type InternalSetRiderFeeDto = z.infer<typeof internalSetRiderFeeSchema>;

// ── Payment internal ────────────────────────────────────────────────

export const initializePaymentSchema = z.object({
  checkoutId: z.string().min(1),
  amountPesewas: z.number().int().positive(),
  phone: z.string().min(8).max(20),
  allocations: z.array(z.object({
    orderId: z.string().min(1),
    allocatedPesewas: z.number().int().positive(),
  })).min(1),
});
export type InitializePaymentDto = z.infer<typeof initializePaymentSchema>;

export const transferSchema = z.object({
  amountPesewas: z.number().int().positive(),
  destination: z.string().min(3).max(200),
  reference: z.string().min(1).max(200),
  metadata: z.record(z.unknown()).optional(),
});
export type TransferDto = z.infer<typeof transferSchema>;

export const vendorTransferSchema = z.object({
  amountPesewas: z.number().int().positive(),
  reference: z.string().min(1).max(200),
  payout: z.object({
    type: z.enum(['MOMO', 'BANK']),
    provider: z.string().min(2).max(80),
    accountNumber: z.string().min(6).max(30),
    accountName: z.string().min(3).max(120),
  }),
  metadata: z.record(z.unknown()).optional(),
});
export type VendorTransferDto = z.infer<typeof vendorTransferSchema>;

export const internalRefundSchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().min(3).max(300),
  amountPesewas: z.number().int().positive().optional(),
});
export type InternalRefundDto = z.infer<typeof internalRefundSchema>;
