/** Shared request/response DTOs (plain interfaces + zod schemas where validation matters). */
import { z } from 'zod';
import { BatchType, OrderType, PaymentMethod, Role, RiderCodStatus, RiderCodTier, VehicleType, VendorPlan, VendorType } from './enums';
export declare const requestOtpSchema: z.ZodObject<{
    phone: z.ZodString;
    role: z.ZodOptional<z.ZodNativeEnum<typeof Role>>;
    name: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    phone: string;
    role?: Role | undefined;
    name?: string | undefined;
}, {
    phone: string;
    role?: Role | undefined;
    name?: string | undefined;
}>;
export type RequestOtpDto = z.infer<typeof requestOtpSchema>;
export declare const verifyOtpSchema: z.ZodObject<{
    phone: z.ZodString;
    code: z.ZodString;
    targetRole: z.ZodOptional<z.ZodNativeEnum<typeof Role>>;
    deviceToken: z.ZodOptional<z.ZodString>;
    deviceFingerprint: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    phone: string;
    code: string;
    targetRole?: Role | undefined;
    deviceToken?: string | undefined;
    deviceFingerprint?: string | undefined;
}, {
    phone: string;
    code: string;
    targetRole?: Role | undefined;
    deviceToken?: string | undefined;
    deviceFingerprint?: string | undefined;
}>;
export type VerifyOtpDto = z.infer<typeof verifyOtpSchema>;
export declare const updateProfileSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    termsAccepted: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    email?: string | null | undefined;
    termsAccepted?: boolean | undefined;
}, {
    name: string;
    email?: string | null | undefined;
    termsAccepted?: boolean | undefined;
}>;
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
export declare const adminLoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    totpCode: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    totpCode: string;
}, {
    email: string;
    password: string;
    totpCode: string;
}>;
export type AdminLoginDto = z.infer<typeof adminLoginSchema>;
export declare const refreshTokenSchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    refreshToken: string;
}, {
    refreshToken: string;
}>;
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;
export interface RegistrationStatusDto {
    kind: 'RIDER' | 'VENDOR';
    currentStage: number;
    maxStages: number;
    status: string;
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
export declare const riderStage1Schema: z.ZodObject<{
    firstName: z.ZodString;
    lastName: z.ZodString;
    dob: z.ZodEffects<z.ZodString, string, string>;
    gender: z.ZodEnum<["MALE", "FEMALE", "OTHER"]>;
    email: z.ZodString;
    residentialAddress: z.ZodObject<{
        region: z.ZodString;
        city: z.ZodString;
        digitalAddress: z.ZodString;
        streetLandmark: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        region: string;
        city: string;
        digitalAddress: string;
        streetLandmark: string;
    }, {
        region: string;
        city: string;
        digitalAddress: string;
        streetLandmark: string;
    }>;
    emergencyContact: z.ZodObject<{
        name: z.ZodString;
        relationship: z.ZodString;
        phone: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        phone: string;
        name: string;
        relationship: string;
    }, {
        phone: string;
        name: string;
        relationship: string;
    }>;
}, "strip", z.ZodTypeAny, {
    email: string;
    firstName: string;
    lastName: string;
    dob: string;
    gender: "OTHER" | "MALE" | "FEMALE";
    residentialAddress: {
        region: string;
        city: string;
        digitalAddress: string;
        streetLandmark: string;
    };
    emergencyContact: {
        phone: string;
        name: string;
        relationship: string;
    };
}, {
    email: string;
    firstName: string;
    lastName: string;
    dob: string;
    gender: "OTHER" | "MALE" | "FEMALE";
    residentialAddress: {
        region: string;
        city: string;
        digitalAddress: string;
        streetLandmark: string;
    };
    emergencyContact: {
        phone: string;
        name: string;
        relationship: string;
    };
}>;
export type RiderStage1Dto = z.infer<typeof riderStage1Schema>;
export declare const riderStage2Schema: z.ZodObject<{
    idType: z.ZodEnum<["GHANA_CARD", "PASSPORT", "DRIVERS_LICENSE"]>;
    idNumber: z.ZodString;
    selfieBase64: z.ZodString;
    angleImagesBase64: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    idType: "GHANA_CARD" | "PASSPORT" | "DRIVERS_LICENSE";
    idNumber: string;
    selfieBase64: string;
    angleImagesBase64: string[];
}, {
    idType: "GHANA_CARD" | "PASSPORT" | "DRIVERS_LICENSE";
    idNumber: string;
    selfieBase64: string;
    angleImagesBase64: string[];
}>;
export type RiderStage2Dto = z.infer<typeof riderStage2Schema>;
export declare const riderStage3Schema: z.ZodObject<{
    ghanaCardNumber: z.ZodString;
    ghanaCardFrontKey: z.ZodString;
    ghanaCardBackKey: z.ZodOptional<z.ZodString>;
    driversLicenseKey: z.ZodOptional<z.ZodString>;
    roadworthinessKey: z.ZodOptional<z.ZodString>;
    insuranceKey: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    ghanaCardNumber: string;
    ghanaCardFrontKey: string;
    ghanaCardBackKey?: string | undefined;
    driversLicenseKey?: string | undefined;
    roadworthinessKey?: string | undefined;
    insuranceKey?: string | undefined;
}, {
    ghanaCardNumber: string;
    ghanaCardFrontKey: string;
    ghanaCardBackKey?: string | undefined;
    driversLicenseKey?: string | undefined;
    roadworthinessKey?: string | undefined;
    insuranceKey?: string | undefined;
}>;
export type RiderStage3Dto = z.infer<typeof riderStage3Schema>;
export declare const riderStage4Schema: z.ZodObject<{
    vehicleType: z.ZodEnum<["BICYCLE", "MOTORBIKE", "CAR"]>;
    make: z.ZodOptional<z.ZodString>;
    model: z.ZodOptional<z.ZodString>;
    year: z.ZodOptional<z.ZodNumber>;
    color: z.ZodOptional<z.ZodString>;
    licensePlate: z.ZodOptional<z.ZodString>;
    vehiclePhotos: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    payout: z.ZodObject<{
        type: z.ZodEnum<["MOMO", "BANK"]>;
        provider: z.ZodString;
        accountNumber: z.ZodString;
        accountName: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "MOMO" | "BANK";
        provider: string;
        accountNumber: string;
        accountName: string;
    }, {
        type: "MOMO" | "BANK";
        provider: string;
        accountNumber: string;
        accountName: string;
    }>;
}, "strip", z.ZodTypeAny, {
    vehicleType: "BICYCLE" | "MOTORBIKE" | "CAR";
    payout: {
        type: "MOMO" | "BANK";
        provider: string;
        accountNumber: string;
        accountName: string;
    };
    make?: string | undefined;
    model?: string | undefined;
    year?: number | undefined;
    color?: string | undefined;
    licensePlate?: string | undefined;
    vehiclePhotos?: string[] | undefined;
}, {
    vehicleType: "BICYCLE" | "MOTORBIKE" | "CAR";
    payout: {
        type: "MOMO" | "BANK";
        provider: string;
        accountNumber: string;
        accountName: string;
    };
    make?: string | undefined;
    model?: string | undefined;
    year?: number | undefined;
    color?: string | undefined;
    licensePlate?: string | undefined;
    vehiclePhotos?: string[] | undefined;
}>;
export type RiderStage4Dto = z.infer<typeof riderStage4Schema>;
export declare const vendorStage1Schema: z.ZodObject<{
    vendorType: z.ZodEnum<[VendorType.FOOD, VendorType.GROCERY, VendorType.MARKET, VendorType.PHARMACY, VendorType.SHOP, VendorType.LAUNDRY]>;
    vendorClass: z.ZodDefault<z.ZodEnum<["INDIVIDUAL", "BUSINESS"]>>;
}, "strip", z.ZodTypeAny, {
    vendorType: VendorType.FOOD | VendorType.GROCERY | VendorType.MARKET | VendorType.PHARMACY | VendorType.SHOP | VendorType.LAUNDRY;
    vendorClass: "INDIVIDUAL" | "BUSINESS";
}, {
    vendorType: VendorType.FOOD | VendorType.GROCERY | VendorType.MARKET | VendorType.PHARMACY | VendorType.SHOP | VendorType.LAUNDRY;
    vendorClass?: "INDIVIDUAL" | "BUSINESS" | undefined;
}>;
export type VendorStage1Dto = z.infer<typeof vendorStage1Schema>;
export declare const vendorStage2Schema: z.ZodObject<{
    businessName: z.ZodString;
    description: z.ZodString;
    businessPhone: z.ZodString;
    businessEmail: z.ZodString;
    displayAddress: z.ZodObject<{
        region: z.ZodString;
        city: z.ZodString;
        streetAddress: z.ZodString;
        landmark: z.ZodString;
        digitalAddress: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        region: string;
        city: string;
        digitalAddress: string;
        streetAddress: string;
        landmark: string;
    }, {
        region: string;
        city: string;
        digitalAddress: string;
        streetAddress: string;
        landmark: string;
    }>;
    workplaceGps: z.ZodObject<{
        lat: z.ZodNumber;
        lng: z.ZodNumber;
        accuracy: z.ZodNumber;
        isMock: z.ZodEffects<z.ZodBoolean, boolean, boolean>;
    }, "strip", z.ZodTypeAny, {
        lat: number;
        lng: number;
        accuracy: number;
        isMock: boolean;
    }, {
        lat: number;
        lng: number;
        accuracy: number;
        isMock: boolean;
    }>;
}, "strip", z.ZodTypeAny, {
    businessName: string;
    description: string;
    businessPhone: string;
    businessEmail: string;
    displayAddress: {
        region: string;
        city: string;
        digitalAddress: string;
        streetAddress: string;
        landmark: string;
    };
    workplaceGps: {
        lat: number;
        lng: number;
        accuracy: number;
        isMock: boolean;
    };
}, {
    businessName: string;
    description: string;
    businessPhone: string;
    businessEmail: string;
    displayAddress: {
        region: string;
        city: string;
        digitalAddress: string;
        streetAddress: string;
        landmark: string;
    };
    workplaceGps: {
        lat: number;
        lng: number;
        accuracy: number;
        isMock: boolean;
    };
}>;
export type VendorStage2Dto = z.infer<typeof vendorStage2Schema>;
export declare const vendorStage3Schema: z.ZodObject<{
    ownerName: z.ZodString;
    ownerRole: z.ZodString;
    ownerPhone: z.ZodString;
    ownerEmail: z.ZodString;
    ghanaCardNumber: z.ZodString;
    idType: z.ZodDefault<z.ZodEnum<["GHANA_CARD", "PASSPORT", "DRIVERS_LICENSE"]>>;
    selfieBase64: z.ZodString;
    angleImagesBase64: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    idType: "GHANA_CARD" | "PASSPORT" | "DRIVERS_LICENSE";
    selfieBase64: string;
    angleImagesBase64: string[];
    ghanaCardNumber: string;
    ownerName: string;
    ownerRole: string;
    ownerPhone: string;
    ownerEmail: string;
}, {
    selfieBase64: string;
    angleImagesBase64: string[];
    ghanaCardNumber: string;
    ownerName: string;
    ownerRole: string;
    ownerPhone: string;
    ownerEmail: string;
    idType?: "GHANA_CARD" | "PASSPORT" | "DRIVERS_LICENSE" | undefined;
}>;
export type VendorStage3Dto = z.infer<typeof vendorStage3Schema>;
export declare const vendorStage4Schema: z.ZodObject<{
    registrationNumber: z.ZodString;
    businessRegDocKey: z.ZodString;
    tinDocKey: z.ZodOptional<z.ZodString>;
    vatDocKey: z.ZodOptional<z.ZodString>;
    categoryDocs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    registrationNumber: string;
    businessRegDocKey: string;
    tinDocKey?: string | undefined;
    vatDocKey?: string | undefined;
    categoryDocs?: Record<string, string> | undefined;
}, {
    registrationNumber: string;
    businessRegDocKey: string;
    tinDocKey?: string | undefined;
    vatDocKey?: string | undefined;
    categoryDocs?: Record<string, string> | undefined;
}>;
export type VendorStage4Dto = z.infer<typeof vendorStage4Schema>;
export declare const vendorStage5Schema: z.ZodObject<{
    payout: z.ZodObject<{
        type: z.ZodEnum<["MOMO", "BANK"]>;
        provider: z.ZodString;
        accountNumber: z.ZodString;
        accountName: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "MOMO" | "BANK";
        provider: string;
        accountNumber: string;
        accountName: string;
    }, {
        type: "MOMO" | "BANK";
        provider: string;
        accountNumber: string;
        accountName: string;
    }>;
    acceptedTerms: z.ZodEffects<z.ZodBoolean, boolean, boolean>;
}, "strip", z.ZodTypeAny, {
    payout: {
        type: "MOMO" | "BANK";
        provider: string;
        accountNumber: string;
        accountName: string;
    };
    acceptedTerms: boolean;
}, {
    payout: {
        type: "MOMO" | "BANK";
        provider: string;
        accountNumber: string;
        accountName: string;
    };
    acceptedTerms: boolean;
}>;
export type VendorStage5Dto = z.infer<typeof vendorStage5Schema>;
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
    hoursJson?: Record<string, {
        open: string;
        close: string;
    }[]> | null;
    holidayHoursJson?: Record<string, {
        closed: boolean;
        open?: string;
        close?: string;
    }> | null;
    opensAt?: string;
    closesAt?: string;
    distanceKm?: number;
    plan?: VendorPlan;
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
    unitPricePesewas: number;
    modifiers: string[];
    selectedOptions: SelectedOptionDto[];
    optionsTotalPesewas: number;
    itemName: string;
}
export interface CartDto {
    id: string;
    customerId: string;
    lines: CartLineDto[];
    vendors: {
        vendorId: string;
        vendorName: string;
        lineCount: number;
    }[];
}
export declare const selectedOptionSchema: z.ZodObject<{
    groupId: z.ZodString;
    groupName: z.ZodString;
    optionId: z.ZodString;
    optionName: z.ZodString;
    priceAdjustmentPesewas: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    groupId: string;
    groupName: string;
    optionId: string;
    optionName: string;
    priceAdjustmentPesewas: number;
}, {
    groupId: string;
    groupName: string;
    optionId: string;
    optionName: string;
    priceAdjustmentPesewas: number;
}>;
export declare const addCartItemSchema: z.ZodObject<{
    itemId: z.ZodString;
    qty: z.ZodNumber;
    modifiers: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    selectedOptions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        groupId: z.ZodString;
        groupName: z.ZodString;
        optionId: z.ZodString;
        optionName: z.ZodString;
        priceAdjustmentPesewas: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        groupId: string;
        groupName: string;
        optionId: string;
        optionName: string;
        priceAdjustmentPesewas: number;
    }, {
        groupId: string;
        groupName: string;
        optionId: string;
        optionName: string;
        priceAdjustmentPesewas: number;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    itemId: string;
    qty: number;
    modifiers: string[];
    selectedOptions: {
        groupId: string;
        groupName: string;
        optionId: string;
        optionName: string;
        priceAdjustmentPesewas: number;
    }[];
}, {
    itemId: string;
    qty: number;
    modifiers?: string[] | undefined;
    selectedOptions?: {
        groupId: string;
        groupName: string;
        optionId: string;
        optionName: string;
        priceAdjustmentPesewas: number;
    }[] | undefined;
}>;
export type AddCartItemDto = z.infer<typeof addCartItemSchema>;
export declare const deliveryAddressSchema: z.ZodObject<{
    /** Human label is presentation only; lat/lng are the delivery source of truth. */
    label: z.ZodString;
    lat: z.ZodNumber;
    lng: z.ZodNumber;
    source: z.ZodString;
    details: z.ZodOptional<z.ZodString>;
    landmark: z.ZodOptional<z.ZodString>;
    receiverName: z.ZodOptional<z.ZodString>;
    receiverPhone: z.ZodOptional<z.ZodString>;
    digitalAddress: z.ZodOptional<z.ZodString>;
    what3words: z.ZodOptional<z.ZodString>;
    deliveryInstructions: z.ZodOptional<z.ZodString>;
    confirmationSource: z.ZodOptional<z.ZodString>;
    confirmedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    lat: number;
    lng: number;
    label: string;
    source: string;
    digitalAddress?: string | undefined;
    landmark?: string | undefined;
    details?: string | undefined;
    receiverName?: string | undefined;
    receiverPhone?: string | undefined;
    what3words?: string | undefined;
    deliveryInstructions?: string | undefined;
    confirmationSource?: string | undefined;
    confirmedAt?: string | undefined;
}, {
    lat: number;
    lng: number;
    label: string;
    source: string;
    digitalAddress?: string | undefined;
    landmark?: string | undefined;
    details?: string | undefined;
    receiverName?: string | undefined;
    receiverPhone?: string | undefined;
    what3words?: string | undefined;
    deliveryInstructions?: string | undefined;
    confirmationSource?: string | undefined;
    confirmedAt?: string | undefined;
}>;
export type DeliveryAddressDto = z.infer<typeof deliveryAddressSchema>;
export declare const savedAddressUpsertSchema: z.ZodObject<{
    label: z.ZodString;
    address: z.ZodObject<{
        /** Human label is presentation only; lat/lng are the delivery source of truth. */
        label: z.ZodString;
        lat: z.ZodNumber;
        lng: z.ZodNumber;
        source: z.ZodString;
        details: z.ZodOptional<z.ZodString>;
        landmark: z.ZodOptional<z.ZodString>;
        receiverName: z.ZodOptional<z.ZodString>;
        receiverPhone: z.ZodOptional<z.ZodString>;
        digitalAddress: z.ZodOptional<z.ZodString>;
        what3words: z.ZodOptional<z.ZodString>;
        deliveryInstructions: z.ZodOptional<z.ZodString>;
        confirmationSource: z.ZodOptional<z.ZodString>;
        confirmedAt: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        lat: number;
        lng: number;
        label: string;
        source: string;
        digitalAddress?: string | undefined;
        landmark?: string | undefined;
        details?: string | undefined;
        receiverName?: string | undefined;
        receiverPhone?: string | undefined;
        what3words?: string | undefined;
        deliveryInstructions?: string | undefined;
        confirmationSource?: string | undefined;
        confirmedAt?: string | undefined;
    }, {
        lat: number;
        lng: number;
        label: string;
        source: string;
        digitalAddress?: string | undefined;
        landmark?: string | undefined;
        details?: string | undefined;
        receiverName?: string | undefined;
        receiverPhone?: string | undefined;
        what3words?: string | undefined;
        deliveryInstructions?: string | undefined;
        confirmationSource?: string | undefined;
        confirmedAt?: string | undefined;
    }>;
    isDefault: z.ZodOptional<z.ZodBoolean>;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    label: string;
    address: {
        lat: number;
        lng: number;
        label: string;
        source: string;
        digitalAddress?: string | undefined;
        landmark?: string | undefined;
        details?: string | undefined;
        receiverName?: string | undefined;
        receiverPhone?: string | undefined;
        what3words?: string | undefined;
        deliveryInstructions?: string | undefined;
        confirmationSource?: string | undefined;
        confirmedAt?: string | undefined;
    };
    isDefault?: boolean | undefined;
    reason?: string | undefined;
}, {
    label: string;
    address: {
        lat: number;
        lng: number;
        label: string;
        source: string;
        digitalAddress?: string | undefined;
        landmark?: string | undefined;
        details?: string | undefined;
        receiverName?: string | undefined;
        receiverPhone?: string | undefined;
        what3words?: string | undefined;
        deliveryInstructions?: string | undefined;
        confirmationSource?: string | undefined;
        confirmedAt?: string | undefined;
    };
    isDefault?: boolean | undefined;
    reason?: string | undefined;
}>;
export type SavedAddressUpsertDto = z.infer<typeof savedAddressUpsertSchema>;
export declare const savedAddressCorrectionSchema: z.ZodObject<{
    label: z.ZodString;
    address: z.ZodObject<{
        /** Human label is presentation only; lat/lng are the delivery source of truth. */
        label: z.ZodString;
        lat: z.ZodNumber;
        lng: z.ZodNumber;
        source: z.ZodString;
        details: z.ZodOptional<z.ZodString>;
        landmark: z.ZodOptional<z.ZodString>;
        receiverName: z.ZodOptional<z.ZodString>;
        receiverPhone: z.ZodOptional<z.ZodString>;
        digitalAddress: z.ZodOptional<z.ZodString>;
        what3words: z.ZodOptional<z.ZodString>;
        deliveryInstructions: z.ZodOptional<z.ZodString>;
        confirmationSource: z.ZodOptional<z.ZodString>;
        confirmedAt: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        lat: number;
        lng: number;
        label: string;
        source: string;
        digitalAddress?: string | undefined;
        landmark?: string | undefined;
        details?: string | undefined;
        receiverName?: string | undefined;
        receiverPhone?: string | undefined;
        what3words?: string | undefined;
        deliveryInstructions?: string | undefined;
        confirmationSource?: string | undefined;
        confirmedAt?: string | undefined;
    }, {
        lat: number;
        lng: number;
        label: string;
        source: string;
        digitalAddress?: string | undefined;
        landmark?: string | undefined;
        details?: string | undefined;
        receiverName?: string | undefined;
        receiverPhone?: string | undefined;
        what3words?: string | undefined;
        deliveryInstructions?: string | undefined;
        confirmationSource?: string | undefined;
        confirmedAt?: string | undefined;
    }>;
    isDefault: z.ZodOptional<z.ZodBoolean>;
} & {
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    label: string;
    address: {
        lat: number;
        lng: number;
        label: string;
        source: string;
        digitalAddress?: string | undefined;
        landmark?: string | undefined;
        details?: string | undefined;
        receiverName?: string | undefined;
        receiverPhone?: string | undefined;
        what3words?: string | undefined;
        deliveryInstructions?: string | undefined;
        confirmationSource?: string | undefined;
        confirmedAt?: string | undefined;
    };
    reason: string;
    isDefault?: boolean | undefined;
}, {
    label: string;
    address: {
        lat: number;
        lng: number;
        label: string;
        source: string;
        digitalAddress?: string | undefined;
        landmark?: string | undefined;
        details?: string | undefined;
        receiverName?: string | undefined;
        receiverPhone?: string | undefined;
        what3words?: string | undefined;
        deliveryInstructions?: string | undefined;
        confirmationSource?: string | undefined;
        confirmedAt?: string | undefined;
    };
    reason: string;
    isDefault?: boolean | undefined;
}>;
export type SavedAddressCorrectionDto = z.infer<typeof savedAddressCorrectionSchema>;
export declare const customerCodPolicySchema: z.ZodObject<{
    tier: z.ZodOptional<z.ZodEnum<["NEW", "STANDARD", "TRUSTED", "PREMIUM"]>>;
    blocked: z.ZodOptional<z.ZodBoolean>;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    reason?: string | undefined;
    tier?: "NEW" | "TRUSTED" | "STANDARD" | "PREMIUM" | undefined;
    blocked?: boolean | undefined;
}, {
    reason?: string | undefined;
    tier?: "NEW" | "TRUSTED" | "STANDARD" | "PREMIUM" | undefined;
    blocked?: boolean | undefined;
}>;
export type CustomerCodPolicyDto = z.infer<typeof customerCodPolicySchema>;
export declare const checkoutSchema: z.ZodObject<{
    address: z.ZodObject<{
        /** Human label is presentation only; lat/lng are the delivery source of truth. */
        label: z.ZodString;
        lat: z.ZodNumber;
        lng: z.ZodNumber;
        source: z.ZodString;
        details: z.ZodOptional<z.ZodString>;
        landmark: z.ZodOptional<z.ZodString>;
        receiverName: z.ZodOptional<z.ZodString>;
        receiverPhone: z.ZodOptional<z.ZodString>;
        digitalAddress: z.ZodOptional<z.ZodString>;
        what3words: z.ZodOptional<z.ZodString>;
        deliveryInstructions: z.ZodOptional<z.ZodString>;
        confirmationSource: z.ZodOptional<z.ZodString>;
        confirmedAt: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        lat: number;
        lng: number;
        label: string;
        source: string;
        digitalAddress?: string | undefined;
        landmark?: string | undefined;
        details?: string | undefined;
        receiverName?: string | undefined;
        receiverPhone?: string | undefined;
        what3words?: string | undefined;
        deliveryInstructions?: string | undefined;
        confirmationSource?: string | undefined;
        confirmedAt?: string | undefined;
    }, {
        lat: number;
        lng: number;
        label: string;
        source: string;
        digitalAddress?: string | undefined;
        landmark?: string | undefined;
        details?: string | undefined;
        receiverName?: string | undefined;
        receiverPhone?: string | undefined;
        what3words?: string | undefined;
        deliveryInstructions?: string | undefined;
        confirmationSource?: string | undefined;
        confirmedAt?: string | undefined;
    }>;
    paymentMethods: z.ZodOptional<z.ZodArray<z.ZodObject<{
        vendorId: z.ZodString;
        method: z.ZodNativeEnum<typeof PaymentMethod>;
    }, "strip", z.ZodTypeAny, {
        vendorId: string;
        method: PaymentMethod;
    }, {
        vendorId: string;
        method: PaymentMethod;
    }>, "many">>;
    note: z.ZodOptional<z.ZodString>;
    creditPesewas: z.ZodOptional<z.ZodNumber>;
    /** When present, only these vendor promotions are applied. Omitted = auto-apply the best active campaign. */
    promotions: z.ZodOptional<z.ZodArray<z.ZodObject<{
        vendorId: z.ZodString;
        promotionId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        vendorId: string;
        promotionId: string;
    }, {
        vendorId: string;
        promotionId: string;
    }>, "many">>;
    /** Optional rider tip per vendor order. 100% to the assigned rider on delivery. Max GHS 500. */
    tips: z.ZodOptional<z.ZodArray<z.ZodObject<{
        vendorId: z.ZodString;
        tipPesewas: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        vendorId: string;
        tipPesewas: number;
    }, {
        vendorId: string;
        tipPesewas: number;
    }>, "many">>;
    leaveAtDoor: z.ZodOptional<z.ZodBoolean>;
    dropNote: z.ZodOptional<z.ZodString>;
    /** ISO datetime. 30 min – 7 days ahead. Dispatch waits until this minus the lead. */
    scheduledFor: z.ZodOptional<z.ZodString>;
    serviceLevel: z.ZodOptional<z.ZodEnum<["STANDARD", "SCHEDULED", "PRIORITY"]>>;
    /** Optional customer voucher code. Maps onto an active Vendor promotion (6.11). */
    voucherCode: z.ZodOptional<z.ZodString>;
    recipient: z.ZodOptional<z.ZodObject<{
        name: z.ZodString;
        phone: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        phone: string;
        name: string;
    }, {
        phone: string;
        name: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    address: {
        lat: number;
        lng: number;
        label: string;
        source: string;
        digitalAddress?: string | undefined;
        landmark?: string | undefined;
        details?: string | undefined;
        receiverName?: string | undefined;
        receiverPhone?: string | undefined;
        what3words?: string | undefined;
        deliveryInstructions?: string | undefined;
        confirmationSource?: string | undefined;
        confirmedAt?: string | undefined;
    };
    paymentMethods?: {
        vendorId: string;
        method: PaymentMethod;
    }[] | undefined;
    note?: string | undefined;
    creditPesewas?: number | undefined;
    promotions?: {
        vendorId: string;
        promotionId: string;
    }[] | undefined;
    tips?: {
        vendorId: string;
        tipPesewas: number;
    }[] | undefined;
    leaveAtDoor?: boolean | undefined;
    dropNote?: string | undefined;
    scheduledFor?: string | undefined;
    serviceLevel?: "STANDARD" | "SCHEDULED" | "PRIORITY" | undefined;
    voucherCode?: string | undefined;
    recipient?: {
        phone: string;
        name: string;
    } | undefined;
}, {
    address: {
        lat: number;
        lng: number;
        label: string;
        source: string;
        digitalAddress?: string | undefined;
        landmark?: string | undefined;
        details?: string | undefined;
        receiverName?: string | undefined;
        receiverPhone?: string | undefined;
        what3words?: string | undefined;
        deliveryInstructions?: string | undefined;
        confirmationSource?: string | undefined;
        confirmedAt?: string | undefined;
    };
    paymentMethods?: {
        vendorId: string;
        method: PaymentMethod;
    }[] | undefined;
    note?: string | undefined;
    creditPesewas?: number | undefined;
    promotions?: {
        vendorId: string;
        promotionId: string;
    }[] | undefined;
    tips?: {
        vendorId: string;
        tipPesewas: number;
    }[] | undefined;
    leaveAtDoor?: boolean | undefined;
    dropNote?: string | undefined;
    scheduledFor?: string | undefined;
    serviceLevel?: "STANDARD" | "SCHEDULED" | "PRIORITY" | undefined;
    voucherCode?: string | undefined;
    recipient?: {
        phone: string;
        name: string;
    } | undefined;
}>;
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
    creditAppliedPesewas?: number;
    pspChargePesewas?: number;
    payment?: {
        reference: string;
        paystackUrl: string | null;
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
    pickup?: {
        locationId: string | null;
        name: string;
        address: string | null;
        lat: number;
        lng: number;
    } | null;
    rider?: {
        id: string;
        name: string;
        phone: string;
        lat: number;
        lng: number;
    } | null;
    customer?: {
        id: string;
        name: string;
        phone: string;
    } | null;
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
        lines: {
            orderItemId: string;
            actualQuantity: number;
            unit: string;
            actualPricePesewas: number | null;
            note: string | null;
        }[];
    } | null;
    laundryStage?: string | null;
    riderFeePesewas?: number;
    dropoff?: DeliveryAddressDto;
    completedAt?: string | null;
    createdAt?: string;
    updatedAt?: string;
    otpRequired: boolean;
    timeline: {
        from: string;
        to: string;
        at: string;
    }[];
    errand?: {
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
    } | null;
    recipient?: {
        name: string;
        phone: string;
        status: string;
        confirmedAt: string | null;
        address: DeliveryAddressDto | null;
    } | null;
    parcel?: {
        sender: {
            name: string;
            phone: string;
            address: {
                label: string;
                lat: number;
                lng: number;
                details?: string;
            };
        };
        recipient: {
            name: string;
            phone: string;
            address: {
                label: string;
                lat: number;
                lng: number;
                details?: string;
            };
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
        pickupMode: string;
        proofMode: string;
        parcelStatus: string;
        returnReason: string | null;
    } | null;
}
export declare const acceptOrderSchema: z.ZodObject<{
    orderId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    orderId: string;
}, {
    orderId: string;
}>;
export declare const rejectOrderSchema: z.ZodObject<{
    orderId: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    orderId: string;
    reason?: string | undefined;
}, {
    orderId: string;
    reason?: string | undefined;
}>;
export declare const readyOrderSchema: z.ZodObject<{
    orderId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    orderId: string;
}, {
    orderId: string;
}>;
export declare const delayedOrderSchema: z.ZodEffects<z.ZodObject<{
    orderId: z.ZodString;
    extraMinutes: z.ZodOptional<z.ZodNumber>;
    newPrepTimeMin: z.ZodOptional<z.ZodNumber>;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
    orderId: string;
    extraMinutes?: number | undefined;
    newPrepTimeMin?: number | undefined;
}, {
    reason: string;
    orderId: string;
    extraMinutes?: number | undefined;
    newPrepTimeMin?: number | undefined;
}>, {
    reason: string;
    orderId: string;
    extraMinutes?: number | undefined;
    newPrepTimeMin?: number | undefined;
}, {
    reason: string;
    orderId: string;
    extraMinutes?: number | undefined;
    newPrepTimeMin?: number | undefined;
}>;
export declare const confirmOtpSchema: z.ZodObject<{
    otp: z.ZodString;
    riderLat: z.ZodNumber;
    riderLng: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    otp: string;
    riderLat: number;
    riderLng: number;
}, {
    otp: string;
    riderLat: number;
    riderLng: number;
}>;
export type ConfirmOtpDto = z.infer<typeof confirmOtpSchema>;
export declare const riderAvailabilitySchema: z.ZodObject<{
    status: z.ZodEnum<["AVAILABLE", "OFFLINE"]>;
}, "strip", z.ZodTypeAny, {
    status: "OFFLINE" | "AVAILABLE";
}, {
    status: "OFFLINE" | "AVAILABLE";
}>;
export declare const riderPauseSchema: z.ZodObject<{
    minutes: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    minutes: number;
}, {
    minutes?: number | undefined;
}>;
export declare const riderIncidentSchema: z.ZodObject<{
    type: z.ZodString;
    orderId: z.ZodOptional<z.ZodString>;
    note: z.ZodOptional<z.ZodString>;
    lat: z.ZodOptional<z.ZodNumber>;
    lng: z.ZodOptional<z.ZodNumber>;
    severity: z.ZodOptional<z.ZodEnum<["LOW", "MEDIUM", "HIGH", "CRITICAL"]>>;
}, "strip", z.ZodTypeAny, {
    type: string;
    lat?: number | undefined;
    lng?: number | undefined;
    note?: string | undefined;
    orderId?: string | undefined;
    severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | undefined;
}, {
    type: string;
    lat?: number | undefined;
    lng?: number | undefined;
    note?: string | undefined;
    orderId?: string | undefined;
    severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | undefined;
}>;
export type RiderIncidentDto = z.infer<typeof riderIncidentSchema>;
export declare const patchRiderProfileSchema: z.ZodObject<{
    vehicle: z.ZodNativeEnum<typeof VehicleType>;
    licensePlate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    vehicle: VehicleType;
    licensePlate?: string | null | undefined;
}, {
    vehicle: VehicleType;
    licensePlate?: string | null | undefined;
}>;
export type PatchRiderProfileDto = z.infer<typeof patchRiderProfileSchema>;
export declare const reorderSchema: z.ZodObject<{
    orderId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    orderId: string;
}, {
    orderId: string;
}>;
export type ReorderDto = z.infer<typeof reorderSchema>;
export declare const redeemVoucherSchema: z.ZodObject<{
    code: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code: string;
}, {
    code: string;
}>;
export type RedeemVoucherDto = z.infer<typeof redeemVoucherSchema>;
export declare const loyaltyRedeemSchema: z.ZodObject<{
    points: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    points: number;
}, {
    points: number;
}>;
export type LoyaltyRedeemDto = z.infer<typeof loyaltyRedeemSchema>;
export declare const riderSessionSchema: z.ZodObject<{
    durationMin: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    durationMin: number;
}, {
    durationMin?: number | undefined;
}>;
export type RiderSessionDto = z.infer<typeof riderSessionSchema>;
export declare const createRiderBlockSchema: z.ZodObject<{
    startsAt: z.ZodString;
    endsAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    startsAt: string;
    endsAt: string;
}, {
    startsAt: string;
    endsAt: string;
}>;
export type CreateRiderBlockDto = z.infer<typeof createRiderBlockSchema>;
export interface RiderBlockDto {
    id: string;
    startsAt: string;
    endsAt: string;
    status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}
export declare const acceptOfferSchema: z.ZodObject<{
    offerId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    offerId: string;
}, {
    offerId: string;
}>;
export declare const declineOfferSchema: z.ZodObject<{
    offerId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    offerId: string;
}, {
    offerId: string;
}>;
export declare const pickupProofMethodSchema: z.ZodEnum<["GPS", "PICKUP_CODE", "QR", "VENDOR_CONFIRMATION", "PHOTO"]>;
export type PickupProofMethod = z.infer<typeof pickupProofMethodSchema>;
export declare const pickupSchema: z.ZodObject<{
    riderLat: z.ZodNumber;
    riderLng: z.ZodNumber;
    proofMethod: z.ZodOptional<z.ZodEnum<["GPS", "PICKUP_CODE", "QR", "VENDOR_CONFIRMATION", "PHOTO"]>>;
    proofValue: z.ZodOptional<z.ZodString>;
    proofPhotoKey: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    riderLat: number;
    riderLng: number;
    proofMethod?: "GPS" | "PICKUP_CODE" | "QR" | "VENDOR_CONFIRMATION" | "PHOTO" | undefined;
    proofValue?: string | undefined;
    proofPhotoKey?: string | undefined;
}, {
    riderLat: number;
    riderLng: number;
    proofMethod?: "GPS" | "PICKUP_CODE" | "QR" | "VENDOR_CONFIRMATION" | "PHOTO" | undefined;
    proofValue?: string | undefined;
    proofPhotoKey?: string | undefined;
}>;
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
    lines?: {
        orderItemId: string;
        actualQuantity: number;
        unit: string;
        note?: string | null;
    }[];
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
    substitution?: {
        item: string;
        pricePesewas: number;
        status: string;
    } | null;
    requiresReceipt: boolean;
}
export interface RiderParcelContextDto {
    senderName: string;
    senderPhone: string;
    recipientName: string;
    recipientPhone: string;
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
    pickupMode: string;
    proofMode: string;
    parcelStatus: string;
    returnReason: string | null;
}
export interface OfferDto {
    id: string;
    batchId?: string | null;
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
    riderFeePesewas: number;
    tipPesewas?: number;
    peakPayPesewas?: number;
    leaveAtDoor?: boolean;
    dropNote?: string | null;
    scheduledFor?: string | null;
    pickupWindowMin: number;
    pickupCount: number;
    dropCount: number;
    pickupDistanceKm: number;
    deliveryDistanceKm: number;
    totalRouteKm: number;
    codExposurePesewas: number;
    vendorReadiness: string;
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
    expectedWaitMin: {
        min: number;
        max: number;
    };
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
export declare const locationUpdateSchema: z.ZodObject<{
    lat: z.ZodNumber;
    lng: z.ZodNumber;
    orderId: z.ZodOptional<z.ZodString>;
    speedKmh: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    lat: number;
    lng: number;
    orderId?: string | undefined;
    speedKmh?: number | undefined;
}, {
    lat: number;
    lng: number;
    orderId?: string | undefined;
    speedKmh?: number | undefined;
}>;
export type LocationUpdateDto = z.infer<typeof locationUpdateSchema>;
export declare const commsThreadKindSchema: z.ZodEnum<["order", "support"]>;
export type CommsThreadKind = z.infer<typeof commsThreadKindSchema>;
export declare const createCommsThreadSchema: z.ZodEffects<z.ZodObject<{
    kind: z.ZodOptional<z.ZodEnum<["order", "support"]>>;
    orderId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    orderId?: string | undefined;
    kind?: "support" | "order" | undefined;
}, {
    orderId?: string | undefined;
    kind?: "support" | "order" | undefined;
}>, {
    orderId?: string | undefined;
    kind?: "support" | "order" | undefined;
}, {
    orderId?: string | undefined;
    kind?: "support" | "order" | undefined;
}>;
export type CreateCommsThreadDto = z.infer<typeof createCommsThreadSchema>;
export declare const postCommsMessageSchema: z.ZodObject<{
    body: z.ZodString;
    attachments: z.ZodOptional<z.ZodArray<z.ZodObject<{
        url: z.ZodString;
        type: z.ZodString;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        type: string;
        url: string;
    }, {
        name: string;
        type: string;
        url: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    body: string;
    attachments?: {
        name: string;
        type: string;
        url: string;
    }[] | undefined;
}, {
    body: string;
    attachments?: {
        name: string;
        type: string;
        url: string;
    }[] | undefined;
}>;
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
    attachments?: {
        url: string;
        type: string;
        name: string;
    }[] | null;
    createdAt: string;
}
export declare const commsVoiceTargetSchema: z.ZodEnum<["customer", "rider", "vendor"]>;
export type CommsVoiceTarget = z.infer<typeof commsVoiceTargetSchema>;
/**
 * Device platform of the caller. Selects the Twilio Push Credential embedded in the
 * access token — Android (FCM v1) and iOS (APNs VoIP) are separate credentials and an
 * iOS token with the Android push SID simply fails to register for incoming pushes.
 */
export declare const commsVoicePlatformSchema: z.ZodEnum<["android", "ios", "web"]>;
export type CommsVoicePlatform = z.infer<typeof commsVoicePlatformSchema>;
export declare const createCommsVoiceTokenSchema: z.ZodObject<{
    orderId: z.ZodString;
    platform: z.ZodOptional<z.ZodEnum<["android", "ios", "web"]>>;
}, "strip", z.ZodTypeAny, {
    orderId: string;
    platform?: "android" | "ios" | "web" | undefined;
}, {
    orderId: string;
    platform?: "android" | "ios" | "web" | undefined;
}>;
export type CreateCommsVoiceTokenDto = z.infer<typeof createCommsVoiceTokenSchema>;
export declare const createCommsCallSchema: z.ZodObject<{
    orderId: z.ZodString;
    target: z.ZodEnum<["customer", "rider", "vendor"]>;
    platform: z.ZodOptional<z.ZodEnum<["android", "ios", "web"]>>;
}, "strip", z.ZodTypeAny, {
    orderId: string;
    target: "customer" | "vendor" | "rider";
    platform?: "android" | "ios" | "web" | undefined;
}, {
    orderId: string;
    target: "customer" | "vendor" | "rider";
    platform?: "android" | "ios" | "web" | undefined;
}>;
export type CreateCommsCallDto = z.infer<typeof createCommsCallSchema>;
/** Support call — no order context; rings the online support agents. */
export declare const createCommsSupportCallSchema: z.ZodObject<{
    platform: z.ZodOptional<z.ZodEnum<["android", "ios", "web"]>>;
    topic: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    platform?: "android" | "ios" | "web" | undefined;
    topic?: string | undefined;
}, {
    platform?: "android" | "ios" | "web" | undefined;
    topic?: string | undefined;
}>;
export type CreateCommsSupportCallDto = z.infer<typeof createCommsSupportCallSchema>;
/** Agent softphone registration — no order context; permission-gated (support.voice.answer). */
export declare const createCommsAgentTokenSchema: z.ZodObject<{
    platform: z.ZodOptional<z.ZodEnum<["android", "ios", "web"]>>;
}, "strip", z.ZodTypeAny, {
    platform?: "android" | "ios" | "web" | undefined;
}, {
    platform?: "android" | "ios" | "web" | undefined;
}>;
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
export declare const commsVoicePresenceSchema: z.ZodObject<{
    online: z.ZodBoolean;
    /** Agent mobile to ring when no browser agent answers (E.164). */
    forwardPhone: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    online: boolean;
    forwardPhone?: string | undefined;
}, {
    online: boolean;
    forwardPhone?: string | undefined;
}>;
export type CommsVoicePresenceDto = z.infer<typeof commsVoicePresenceSchema>;
/**
 * Client-reported call events (the Twilio status callback only sees Twilio legs; the
 * tel: fallback handoff happens entirely on the device).
 */
export declare const commsCallEventSchema: z.ZodObject<{
    kind: z.ZodEnum<["fallback_offered", "fallback_started", "voip_failed", "quality_poor", "quality_recovered"]>;
    detail: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    kind: "fallback_offered" | "fallback_started" | "voip_failed" | "quality_poor" | "quality_recovered";
    detail?: string | undefined;
}, {
    kind: "fallback_offered" | "fallback_started" | "voip_failed" | "quality_poor" | "quality_recovered";
    detail?: string | undefined;
}>;
export type CommsCallEventDto = z.infer<typeof commsCallEventSchema>;
export type CommsCallStatus = 'initiated' | 'ringing' | 'answered' | 'completed' | 'no-answer' | 'busy' | 'failed' | 'canceled';
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
export declare const refundRequestSchema: z.ZodObject<{
    orderId: z.ZodString;
    reason: z.ZodString;
    amountPesewas: z.ZodOptional<z.ZodNumber>;
    refundComponent: z.ZodOptional<z.ZodEnum<["UNSPECIFIED", "VENDOR_PRODUCT", "ORE_COMMISSION", "ORE_SERVICE_FEE", "DELIVERY_FEE", "PRIORITY_FEE", "TIP", "ERRAND_BUDGET"]>>;
    originalTaxStatus: z.ZodOptional<z.ZodEnum<["UNKNOWN", "NOT_TAXED", "TAXED_OPEN_PERIOD", "TAXED_FILED_PERIOD"]>>;
    taxPeriodStatus: z.ZodOptional<z.ZodEnum<["OPEN", "FILED", "AMENDED", "CLOSED"]>>;
}, "strip", z.ZodTypeAny, {
    reason: string;
    orderId: string;
    amountPesewas?: number | undefined;
    refundComponent?: "UNSPECIFIED" | "VENDOR_PRODUCT" | "ORE_COMMISSION" | "ORE_SERVICE_FEE" | "DELIVERY_FEE" | "PRIORITY_FEE" | "TIP" | "ERRAND_BUDGET" | undefined;
    originalTaxStatus?: "UNKNOWN" | "NOT_TAXED" | "TAXED_OPEN_PERIOD" | "TAXED_FILED_PERIOD" | undefined;
    taxPeriodStatus?: "OPEN" | "CLOSED" | "FILED" | "AMENDED" | undefined;
}, {
    reason: string;
    orderId: string;
    amountPesewas?: number | undefined;
    refundComponent?: "UNSPECIFIED" | "VENDOR_PRODUCT" | "ORE_COMMISSION" | "ORE_SERVICE_FEE" | "DELIVERY_FEE" | "PRIORITY_FEE" | "TIP" | "ERRAND_BUDGET" | undefined;
    originalTaxStatus?: "UNKNOWN" | "NOT_TAXED" | "TAXED_OPEN_PERIOD" | "TAXED_FILED_PERIOD" | undefined;
    taxPeriodStatus?: "OPEN" | "CLOSED" | "FILED" | "AMENDED" | undefined;
}>;
export type RefundRequestDto = z.infer<typeof refundRequestSchema>;
export declare const remittanceSchema: z.ZodObject<{
    amountPesewas: z.ZodNumber;
    reference: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    amountPesewas: number;
    reference?: string | undefined;
}, {
    amountPesewas: number;
    reference?: string | undefined;
}>;
export type RemittanceDto = z.infer<typeof remittanceSchema>;
export declare const withdrawalRequestSchema: z.ZodObject<{
    amountPesewas: z.ZodNumber;
    destination: z.ZodString;
    reference: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    amountPesewas: number;
    destination: string;
    reference?: string | undefined;
}, {
    amountPesewas: number;
    destination: string;
    reference?: string | undefined;
}>;
export type WithdrawalRequestDto = z.infer<typeof withdrawalRequestSchema>;
export declare const codTierSchema: z.ZodObject<{
    tier: z.ZodEnum<["NEW", "EXPERIENCED", "SENIOR"]>;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tier: "NEW" | "EXPERIENCED" | "SENIOR";
    reason?: string | undefined;
}, {
    tier: "NEW" | "EXPERIENCED" | "SENIOR";
    reason?: string | undefined;
}>;
export type CodTierDto = z.infer<typeof codTierSchema>;
export declare const codStatusSchema: z.ZodObject<{
    status: z.ZodEnum<["CLEAR", "WARNING", "SUSPENDED", "INVESTIGATION", "TERMINATED"]>;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "SUSPENDED" | "CLEAR" | "WARNING" | "INVESTIGATION" | "TERMINATED";
    reason?: string | undefined;
}, {
    status: "SUSPENDED" | "CLEAR" | "WARNING" | "INVESTIGATION" | "TERMINATED";
    reason?: string | undefined;
}>;
export type CodStatusDto = z.infer<typeof codStatusSchema>;
export declare const walletAdjustSchema: z.ZodObject<{
    amountPesewas: z.ZodNumber;
    kind: z.ZodEnum<["credit_cleared", "penalty", "reversal"]>;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
    kind: "credit_cleared" | "penalty" | "reversal";
    amountPesewas: number;
}, {
    reason: string;
    kind: "credit_cleared" | "penalty" | "reversal";
    amountPesewas: number;
}>;
export type WalletAdjustDto = z.infer<typeof walletAdjustSchema>;
/** Wallet view — doc §5: available payout = cleared − COD − penalties, never negative. */
export interface RiderWalletDto {
    riderId: string;
    userId: string;
    pendingPesewas: number;
    clearedPesewas: number;
    lockedPesewas: number;
    cashLiabilityPesewas: number;
    withdrawablePesewas: number;
    lifetimeEarnedPesewas: number;
    lifetimeRemittedPesewas: number;
    codTier: RiderCodTier;
    codStatus: RiderCodStatus;
    codEligible: boolean;
    tierLimitPesewas: number;
    triggerPct: number;
    withdrawalDay: string | null;
    withdrawnTodayPesewas: number;
    freeWithdrawalsLeftToday: number;
    withdrawalFeePesewas: number;
    minWithdrawalPesewas: number;
    dailyCapPesewas: number;
}
export declare const vendorSettlementPaySchema: z.ZodObject<{
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    note?: string | undefined;
}, {
    note?: string | undefined;
}>;
export type VendorSettlementPayDto = z.infer<typeof vendorSettlementPaySchema>;
export declare const vendorSettlementReverseSchema: z.ZodObject<{
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
}, {
    reason: string;
}>;
export type VendorSettlementReverseDto = z.infer<typeof vendorSettlementReverseSchema>;
export declare const openDisputeSchema: z.ZodObject<{
    orderId: z.ZodString;
    reason: z.ZodEnum<["MISSING_ITEM", "WRONG_ITEM", "DAMAGED", "QUALITY", "NEVER_DELIVERED", "OVERCHARGED", "OTHER"]>;
    description: z.ZodString;
    evidenceKeys: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    description: string;
    reason: "MISSING_ITEM" | "WRONG_ITEM" | "DAMAGED" | "QUALITY" | "NEVER_DELIVERED" | "OVERCHARGED" | "OTHER";
    orderId: string;
    evidenceKeys?: string[] | undefined;
}, {
    description: string;
    reason: "MISSING_ITEM" | "WRONG_ITEM" | "DAMAGED" | "QUALITY" | "NEVER_DELIVERED" | "OVERCHARGED" | "OTHER";
    orderId: string;
    evidenceKeys?: string[] | undefined;
}>;
export type OpenDisputeDto = z.infer<typeof openDisputeSchema>;
export declare const resolveDisputeSchema: z.ZodObject<{
    decision: z.ZodEnum<["refund_full", "refund_partial", "no_refund"]>;
    fault: z.ZodOptional<z.ZodEnum<["VENDOR", "RIDER", "PLATFORM", "CUSTOMER"]>>;
    amountPesewas: z.ZodOptional<z.ZodNumber>;
    refundMethod: z.ZodOptional<z.ZodEnum<["WALLET", "ORIGINAL"]>>;
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    decision: "refund_full" | "refund_partial" | "no_refund";
    note?: string | undefined;
    amountPesewas?: number | undefined;
    fault?: "VENDOR" | "RIDER" | "PLATFORM" | "CUSTOMER" | undefined;
    refundMethod?: "WALLET" | "ORIGINAL" | undefined;
}, {
    decision: "refund_full" | "refund_partial" | "no_refund";
    note?: string | undefined;
    amountPesewas?: number | undefined;
    fault?: "VENDOR" | "RIDER" | "PLATFORM" | "CUSTOMER" | undefined;
    refundMethod?: "WALLET" | "ORIGINAL" | undefined;
}>;
export type ResolveDisputeDto = z.infer<typeof resolveDisputeSchema>;
export declare const openChargebackSchema: z.ZodObject<{
    orderId: z.ZodString;
    reference: z.ZodString;
    amountPesewas: z.ZodNumber;
    reason: z.ZodString;
    evidenceKeys: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    reason: string;
    orderId: string;
    amountPesewas: number;
    reference: string;
    evidenceKeys?: string[] | undefined;
}, {
    reason: string;
    orderId: string;
    amountPesewas: number;
    reference: string;
    evidenceKeys?: string[] | undefined;
}>;
export type OpenChargebackDto = z.infer<typeof openChargebackSchema>;
export declare const resolveChargebackSchema: z.ZodObject<{
    outcome: z.ZodEnum<["won", "lost"]>;
    fault: z.ZodOptional<z.ZodEnum<["VENDOR", "RIDER", "PLATFORM", "CUSTOMER"]>>;
    feesPesewas: z.ZodOptional<z.ZodNumber>;
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    outcome: "won" | "lost";
    note?: string | undefined;
    fault?: "VENDOR" | "RIDER" | "PLATFORM" | "CUSTOMER" | undefined;
    feesPesewas?: number | undefined;
}, {
    outcome: "won" | "lost";
    note?: string | undefined;
    fault?: "VENDOR" | "RIDER" | "PLATFORM" | "CUSTOMER" | undefined;
    feesPesewas?: number | undefined;
}>;
export type ResolveChargebackDto = z.infer<typeof resolveChargebackSchema>;
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
    pickupOrder: BatchRouteStop[];
    dropOrder: BatchRouteStop[];
    totalRiderFeePesewas: number;
    codExposurePesewas: number;
    createdAt: string;
}
export declare const adminCustomerCreditSchema: z.ZodObject<{
    amountPesewas: z.ZodNumber;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
    amountPesewas: number;
}, {
    reason: string;
    amountPesewas: number;
}>;
export type AdminCustomerCreditDto = z.infer<typeof adminCustomerCreditSchema>;
export declare const createParcelSchema: z.ZodObject<{
    sender: z.ZodObject<{
        name: z.ZodString;
        phone: z.ZodString;
        address: z.ZodObject<{
            /** Human label is presentation only; lat/lng are the delivery source of truth. */
            label: z.ZodString;
            lat: z.ZodNumber;
            lng: z.ZodNumber;
            source: z.ZodString;
            details: z.ZodOptional<z.ZodString>;
            landmark: z.ZodOptional<z.ZodString>;
            receiverName: z.ZodOptional<z.ZodString>;
            receiverPhone: z.ZodOptional<z.ZodString>;
            digitalAddress: z.ZodOptional<z.ZodString>;
            what3words: z.ZodOptional<z.ZodString>;
            deliveryInstructions: z.ZodOptional<z.ZodString>;
            confirmationSource: z.ZodOptional<z.ZodString>;
            confirmedAt: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            lat: number;
            lng: number;
            label: string;
            source: string;
            digitalAddress?: string | undefined;
            landmark?: string | undefined;
            details?: string | undefined;
            receiverName?: string | undefined;
            receiverPhone?: string | undefined;
            what3words?: string | undefined;
            deliveryInstructions?: string | undefined;
            confirmationSource?: string | undefined;
            confirmedAt?: string | undefined;
        }, {
            lat: number;
            lng: number;
            label: string;
            source: string;
            digitalAddress?: string | undefined;
            landmark?: string | undefined;
            details?: string | undefined;
            receiverName?: string | undefined;
            receiverPhone?: string | undefined;
            what3words?: string | undefined;
            deliveryInstructions?: string | undefined;
            confirmationSource?: string | undefined;
            confirmedAt?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        phone: string;
        name: string;
        address: {
            lat: number;
            lng: number;
            label: string;
            source: string;
            digitalAddress?: string | undefined;
            landmark?: string | undefined;
            details?: string | undefined;
            receiverName?: string | undefined;
            receiverPhone?: string | undefined;
            what3words?: string | undefined;
            deliveryInstructions?: string | undefined;
            confirmationSource?: string | undefined;
            confirmedAt?: string | undefined;
        };
    }, {
        phone: string;
        name: string;
        address: {
            lat: number;
            lng: number;
            label: string;
            source: string;
            digitalAddress?: string | undefined;
            landmark?: string | undefined;
            details?: string | undefined;
            receiverName?: string | undefined;
            receiverPhone?: string | undefined;
            what3words?: string | undefined;
            deliveryInstructions?: string | undefined;
            confirmationSource?: string | undefined;
            confirmedAt?: string | undefined;
        };
    }>;
    recipient: z.ZodObject<{
        name: z.ZodString;
        phone: z.ZodString;
        address: z.ZodObject<{
            /** Human label is presentation only; lat/lng are the delivery source of truth. */
            label: z.ZodString;
            lat: z.ZodNumber;
            lng: z.ZodNumber;
            source: z.ZodString;
            details: z.ZodOptional<z.ZodString>;
            landmark: z.ZodOptional<z.ZodString>;
            receiverName: z.ZodOptional<z.ZodString>;
            receiverPhone: z.ZodOptional<z.ZodString>;
            digitalAddress: z.ZodOptional<z.ZodString>;
            what3words: z.ZodOptional<z.ZodString>;
            deliveryInstructions: z.ZodOptional<z.ZodString>;
            confirmationSource: z.ZodOptional<z.ZodString>;
            confirmedAt: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            lat: number;
            lng: number;
            label: string;
            source: string;
            digitalAddress?: string | undefined;
            landmark?: string | undefined;
            details?: string | undefined;
            receiverName?: string | undefined;
            receiverPhone?: string | undefined;
            what3words?: string | undefined;
            deliveryInstructions?: string | undefined;
            confirmationSource?: string | undefined;
            confirmedAt?: string | undefined;
        }, {
            lat: number;
            lng: number;
            label: string;
            source: string;
            digitalAddress?: string | undefined;
            landmark?: string | undefined;
            details?: string | undefined;
            receiverName?: string | undefined;
            receiverPhone?: string | undefined;
            what3words?: string | undefined;
            deliveryInstructions?: string | undefined;
            confirmationSource?: string | undefined;
            confirmedAt?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        phone: string;
        name: string;
        address: {
            lat: number;
            lng: number;
            label: string;
            source: string;
            digitalAddress?: string | undefined;
            landmark?: string | undefined;
            details?: string | undefined;
            receiverName?: string | undefined;
            receiverPhone?: string | undefined;
            what3words?: string | undefined;
            deliveryInstructions?: string | undefined;
            confirmationSource?: string | undefined;
            confirmedAt?: string | undefined;
        };
    }, {
        phone: string;
        name: string;
        address: {
            lat: number;
            lng: number;
            label: string;
            source: string;
            digitalAddress?: string | undefined;
            landmark?: string | undefined;
            details?: string | undefined;
            receiverName?: string | undefined;
            receiverPhone?: string | undefined;
            what3words?: string | undefined;
            deliveryInstructions?: string | undefined;
            confirmationSource?: string | undefined;
            confirmedAt?: string | undefined;
        };
    }>;
    category: z.ZodEnum<["DOCUMENTS", "SMALL_PACKAGE", "MEDIUM_PACKAGE", "LARGE_PACKAGE", "FRAGILE"]>;
    weightKg: z.ZodNumber;
    dimensionsCm: z.ZodOptional<z.ZodObject<{
        length: z.ZodNumber;
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        length: number;
        width: number;
        height: number;
    }, {
        length: number;
        width: number;
        height: number;
    }>>;
    declaredValuePesewas: z.ZodNumber;
    description: z.ZodString;
    fragile: z.ZodDefault<z.ZodBoolean>;
    sealed: z.ZodEffects<z.ZodBoolean, boolean, boolean>;
    pickupMode: z.ZodDefault<z.ZodEnum<["MEET_DOOR", "MEET_CURB"]>>;
    proofMode: z.ZodDefault<z.ZodEnum<["PIN", "SIGNATURE", "PHOTO", "PIN_AND_PHOTO"]>>;
    prohibitedItemsAcknowledged: z.ZodLiteral<true>;
    serviceLevel: z.ZodOptional<z.ZodEnum<["STANDARD", "SCHEDULED", "PRIORITY"]>>;
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    description: string;
    recipient: {
        phone: string;
        name: string;
        address: {
            lat: number;
            lng: number;
            label: string;
            source: string;
            digitalAddress?: string | undefined;
            landmark?: string | undefined;
            details?: string | undefined;
            receiverName?: string | undefined;
            receiverPhone?: string | undefined;
            what3words?: string | undefined;
            deliveryInstructions?: string | undefined;
            confirmationSource?: string | undefined;
            confirmedAt?: string | undefined;
        };
    };
    sender: {
        phone: string;
        name: string;
        address: {
            lat: number;
            lng: number;
            label: string;
            source: string;
            digitalAddress?: string | undefined;
            landmark?: string | undefined;
            details?: string | undefined;
            receiverName?: string | undefined;
            receiverPhone?: string | undefined;
            what3words?: string | undefined;
            deliveryInstructions?: string | undefined;
            confirmationSource?: string | undefined;
            confirmedAt?: string | undefined;
        };
    };
    category: "DOCUMENTS" | "SMALL_PACKAGE" | "MEDIUM_PACKAGE" | "LARGE_PACKAGE" | "FRAGILE";
    weightKg: number;
    declaredValuePesewas: number;
    fragile: boolean;
    sealed: boolean;
    pickupMode: "MEET_DOOR" | "MEET_CURB";
    proofMode: "PHOTO" | "PIN" | "SIGNATURE" | "PIN_AND_PHOTO";
    prohibitedItemsAcknowledged: true;
    note?: string | undefined;
    serviceLevel?: "STANDARD" | "SCHEDULED" | "PRIORITY" | undefined;
    dimensionsCm?: {
        length: number;
        width: number;
        height: number;
    } | undefined;
}, {
    description: string;
    recipient: {
        phone: string;
        name: string;
        address: {
            lat: number;
            lng: number;
            label: string;
            source: string;
            digitalAddress?: string | undefined;
            landmark?: string | undefined;
            details?: string | undefined;
            receiverName?: string | undefined;
            receiverPhone?: string | undefined;
            what3words?: string | undefined;
            deliveryInstructions?: string | undefined;
            confirmationSource?: string | undefined;
            confirmedAt?: string | undefined;
        };
    };
    sender: {
        phone: string;
        name: string;
        address: {
            lat: number;
            lng: number;
            label: string;
            source: string;
            digitalAddress?: string | undefined;
            landmark?: string | undefined;
            details?: string | undefined;
            receiverName?: string | undefined;
            receiverPhone?: string | undefined;
            what3words?: string | undefined;
            deliveryInstructions?: string | undefined;
            confirmationSource?: string | undefined;
            confirmedAt?: string | undefined;
        };
    };
    category: "DOCUMENTS" | "SMALL_PACKAGE" | "MEDIUM_PACKAGE" | "LARGE_PACKAGE" | "FRAGILE";
    weightKg: number;
    declaredValuePesewas: number;
    sealed: boolean;
    prohibitedItemsAcknowledged: true;
    note?: string | undefined;
    serviceLevel?: "STANDARD" | "SCHEDULED" | "PRIORITY" | undefined;
    dimensionsCm?: {
        length: number;
        width: number;
        height: number;
    } | undefined;
    fragile?: boolean | undefined;
    pickupMode?: "MEET_DOOR" | "MEET_CURB" | undefined;
    proofMode?: "PHOTO" | "PIN" | "SIGNATURE" | "PIN_AND_PHOTO" | undefined;
}>;
export type CreateParcelDto = z.infer<typeof createParcelSchema>;
export declare const createErrandSchema: z.ZodObject<{
    task: z.ZodString;
    shopName: z.ZodOptional<z.ZodString>;
    shopLat: z.ZodNumber;
    shopLng: z.ZodNumber;
    budgetPesewas: z.ZodNumber;
    address: z.ZodObject<{
        /** Human label is presentation only; lat/lng are the delivery source of truth. */
        label: z.ZodString;
        lat: z.ZodNumber;
        lng: z.ZodNumber;
        source: z.ZodString;
        details: z.ZodOptional<z.ZodString>;
        landmark: z.ZodOptional<z.ZodString>;
        receiverName: z.ZodOptional<z.ZodString>;
        receiverPhone: z.ZodOptional<z.ZodString>;
        digitalAddress: z.ZodOptional<z.ZodString>;
        what3words: z.ZodOptional<z.ZodString>;
        deliveryInstructions: z.ZodOptional<z.ZodString>;
        confirmationSource: z.ZodOptional<z.ZodString>;
        confirmedAt: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        lat: number;
        lng: number;
        label: string;
        source: string;
        digitalAddress?: string | undefined;
        landmark?: string | undefined;
        details?: string | undefined;
        receiverName?: string | undefined;
        receiverPhone?: string | undefined;
        what3words?: string | undefined;
        deliveryInstructions?: string | undefined;
        confirmationSource?: string | undefined;
        confirmedAt?: string | undefined;
    }, {
        lat: number;
        lng: number;
        label: string;
        source: string;
        digitalAddress?: string | undefined;
        landmark?: string | undefined;
        details?: string | undefined;
        receiverName?: string | undefined;
        receiverPhone?: string | undefined;
        what3words?: string | undefined;
        deliveryInstructions?: string | undefined;
        confirmationSource?: string | undefined;
        confirmedAt?: string | undefined;
    }>;
    serviceLevel: z.ZodOptional<z.ZodEnum<["STANDARD", "SCHEDULED", "PRIORITY"]>>;
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    address: {
        lat: number;
        lng: number;
        label: string;
        source: string;
        digitalAddress?: string | undefined;
        landmark?: string | undefined;
        details?: string | undefined;
        receiverName?: string | undefined;
        receiverPhone?: string | undefined;
        what3words?: string | undefined;
        deliveryInstructions?: string | undefined;
        confirmationSource?: string | undefined;
        confirmedAt?: string | undefined;
    };
    task: string;
    shopLat: number;
    shopLng: number;
    budgetPesewas: number;
    note?: string | undefined;
    serviceLevel?: "STANDARD" | "SCHEDULED" | "PRIORITY" | undefined;
    shopName?: string | undefined;
}, {
    address: {
        lat: number;
        lng: number;
        label: string;
        source: string;
        digitalAddress?: string | undefined;
        landmark?: string | undefined;
        details?: string | undefined;
        receiverName?: string | undefined;
        receiverPhone?: string | undefined;
        what3words?: string | undefined;
        deliveryInstructions?: string | undefined;
        confirmationSource?: string | undefined;
        confirmedAt?: string | undefined;
    };
    task: string;
    shopLat: number;
    shopLng: number;
    budgetPesewas: number;
    note?: string | undefined;
    serviceLevel?: "STANDARD" | "SCHEDULED" | "PRIORITY" | undefined;
    shopName?: string | undefined;
}>;
export type CreateErrandDto = z.infer<typeof createErrandSchema>;
export declare const errandReceiptSchema: z.ZodEffects<z.ZodObject<{
    amountPesewas: z.ZodNumber;
    /** Internal callers may provide a storage key; Rider clients upload dataBase64 and receive a server-owned key. */
    photoKey: z.ZodOptional<z.ZodString>;
    dataBase64: z.ZodOptional<z.ZodString>;
    contentType: z.ZodOptional<z.ZodString>;
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    amountPesewas: number;
    note?: string | undefined;
    photoKey?: string | undefined;
    dataBase64?: string | undefined;
    contentType?: string | undefined;
}, {
    amountPesewas: number;
    note?: string | undefined;
    photoKey?: string | undefined;
    dataBase64?: string | undefined;
    contentType?: string | undefined;
}>, {
    amountPesewas: number;
    note?: string | undefined;
    photoKey?: string | undefined;
    dataBase64?: string | undefined;
    contentType?: string | undefined;
}, {
    amountPesewas: number;
    note?: string | undefined;
    photoKey?: string | undefined;
    dataBase64?: string | undefined;
    contentType?: string | undefined;
}>;
export type ErrandReceiptDto = z.infer<typeof errandReceiptSchema>;
export declare const errandSubstitutionSchema: z.ZodObject<{
    item: z.ZodString;
    pricePesewas: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    item: string;
    pricePesewas: number;
}, {
    item: string;
    pricePesewas: number;
}>;
export type ErrandSubstitutionDto = z.infer<typeof errandSubstitutionSchema>;
export declare const errandSubDecisionSchema: z.ZodObject<{
    approve: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    approve: boolean;
}, {
    approve: boolean;
}>;
export type ErrandSubDecisionDto = z.infer<typeof errandSubDecisionSchema>;
export declare const referralClaimSchema: z.ZodObject<{
    code: z.ZodString;
    phone: z.ZodString;
}, "strip", z.ZodTypeAny, {
    phone: string;
    code: string;
}, {
    phone: string;
    code: string;
}>;
export type ReferralClaimDto = z.infer<typeof referralClaimSchema>;
export declare const referralBlockSchema: z.ZodObject<{
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
}, {
    reason: string;
}>;
export type ReferralBlockDto = z.infer<typeof referralBlockSchema>;
export declare const setVendorPlanSchema: z.ZodObject<{
    plan: z.ZodEnum<["STANDARD", "PREMIUM"]>;
}, "strip", z.ZodTypeAny, {
    plan: "STANDARD" | "PREMIUM";
}, {
    plan: "STANDARD" | "PREMIUM";
}>;
export type SetVendorPlanDto = z.infer<typeof setVendorPlanSchema>;
export declare const createStorySchema: z.ZodObject<{
    kind: z.ZodEnum<["IMAGE", "VIDEO"]>;
    mediaKey: z.ZodString;
    muxPlaybackId: z.ZodOptional<z.ZodString>;
    caption: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    kind: "IMAGE" | "VIDEO";
    mediaKey: string;
    muxPlaybackId?: string | undefined;
    caption?: string | undefined;
}, {
    kind: "IMAGE" | "VIDEO";
    mediaKey: string;
    muxPlaybackId?: string | undefined;
    caption?: string | undefined;
}>;
export type CreateStoryDto = z.infer<typeof createStorySchema>;
export declare const createVendorPromotionSchema: z.ZodEffects<z.ZodObject<{
    title: z.ZodString;
    discountType: z.ZodEnum<["PERCENT", "FIXED"]>;
    discountValue: z.ZodNumber;
    minimumSubtotalPesewas: z.ZodOptional<z.ZodNumber>;
    budgetPesewas: z.ZodOptional<z.ZodNumber>;
    redemptionLimit: z.ZodOptional<z.ZodNumber>;
    startsAt: z.ZodString;
    endsAt: z.ZodString;
    code: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    startsAt: string;
    endsAt: string;
    title: string;
    discountType: "PERCENT" | "FIXED";
    discountValue: number;
    code?: string | undefined;
    budgetPesewas?: number | undefined;
    minimumSubtotalPesewas?: number | undefined;
    redemptionLimit?: number | undefined;
}, {
    startsAt: string;
    endsAt: string;
    title: string;
    discountType: "PERCENT" | "FIXED";
    discountValue: number;
    code?: string | undefined;
    budgetPesewas?: number | undefined;
    minimumSubtotalPesewas?: number | undefined;
    redemptionLimit?: number | undefined;
}>, {
    startsAt: string;
    endsAt: string;
    title: string;
    discountType: "PERCENT" | "FIXED";
    discountValue: number;
    code?: string | undefined;
    budgetPesewas?: number | undefined;
    minimumSubtotalPesewas?: number | undefined;
    redemptionLimit?: number | undefined;
}, {
    startsAt: string;
    endsAt: string;
    title: string;
    discountType: "PERCENT" | "FIXED";
    discountValue: number;
    code?: string | undefined;
    budgetPesewas?: number | undefined;
    minimumSubtotalPesewas?: number | undefined;
    redemptionLimit?: number | undefined;
}>;
export type CreateVendorPromotionDto = z.infer<typeof createVendorPromotionSchema>;
export declare const createVendorReviewSchema: z.ZodObject<{
    orderId: z.ZodString;
    rating: z.ZodNumber;
    comment: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    orderId: string;
    rating: number;
    comment?: string | undefined;
}, {
    orderId: string;
    rating: number;
    comment?: string | undefined;
}>;
export type CreateVendorReviewDto = z.infer<typeof createVendorReviewSchema>;
export declare const applyPenaltySchema: z.ZodObject<{
    level: z.ZodEnum<["WARNING", "FINANCIAL", "SUSPENSION_24H", "SUSPENSION_72H", "SUSPENSION_7D", "PERMANENT"]>;
    trigger: z.ZodString;
    amountPesewas: z.ZodOptional<z.ZodNumber>;
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    level: "WARNING" | "FINANCIAL" | "SUSPENSION_24H" | "SUSPENSION_72H" | "SUSPENSION_7D" | "PERMANENT";
    trigger: string;
    note?: string | undefined;
    amountPesewas?: number | undefined;
}, {
    level: "WARNING" | "FINANCIAL" | "SUSPENSION_24H" | "SUSPENSION_72H" | "SUSPENSION_7D" | "PERMANENT";
    trigger: string;
    note?: string | undefined;
    amountPesewas?: number | undefined;
}>;
export type ApplyPenaltyDto = z.infer<typeof applyPenaltySchema>;
export declare const createVendorSchema: z.ZodObject<{
    name: z.ZodString;
    lat: z.ZodNumber;
    lng: z.ZodNumber;
    deliveryRadiusKm: z.ZodOptional<z.ZodNumber>;
    acceptsCod: z.ZodOptional<z.ZodBoolean>;
    defaultPrepTimeMin: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    lat: number;
    lng: number;
    deliveryRadiusKm?: number | undefined;
    acceptsCod?: boolean | undefined;
    defaultPrepTimeMin?: number | undefined;
}, {
    name: string;
    lat: number;
    lng: number;
    deliveryRadiusKm?: number | undefined;
    acceptsCod?: boolean | undefined;
    defaultPrepTimeMin?: number | undefined;
}>;
export type CreateVendorDto = z.infer<typeof createVendorSchema>;
export declare const addMenuItemSchema: z.ZodObject<{
    name: z.ZodString;
    category: z.ZodString;
    pricePesewas: z.ZodNumber;
    prepTimeMin: z.ZodOptional<z.ZodNumber>;
    unit: z.ZodOptional<z.ZodString>;
    stock: z.ZodOptional<z.ZodNumber>;
    prescriptionOnly: z.ZodOptional<z.ZodBoolean>;
    description: z.ZodOptional<z.ZodString>;
    modifiers: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    addonGroups: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
    sku: z.ZodOptional<z.ZodString>;
    expiryDate: z.ZodOptional<z.ZodString>;
    dosage: z.ZodOptional<z.ZodString>;
    turnaround: z.ZodOptional<z.ZodString>;
    dailyMarketPrice: z.ZodOptional<z.ZodBoolean>;
    garmentType: z.ZodOptional<z.ZodString>;
    conditionJson: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    dietaryTags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    category: string;
    pricePesewas: number;
    description?: string | undefined;
    modifiers?: string[] | undefined;
    prepTimeMin?: number | undefined;
    unit?: string | undefined;
    stock?: number | undefined;
    prescriptionOnly?: boolean | undefined;
    addonGroups?: Record<string, unknown>[] | undefined;
    sku?: string | undefined;
    expiryDate?: string | undefined;
    dosage?: string | undefined;
    turnaround?: string | undefined;
    dailyMarketPrice?: boolean | undefined;
    garmentType?: string | undefined;
    conditionJson?: Record<string, unknown> | undefined;
    dietaryTags?: string[] | undefined;
}, {
    name: string;
    category: string;
    pricePesewas: number;
    description?: string | undefined;
    modifiers?: string[] | undefined;
    prepTimeMin?: number | undefined;
    unit?: string | undefined;
    stock?: number | undefined;
    prescriptionOnly?: boolean | undefined;
    addonGroups?: Record<string, unknown>[] | undefined;
    sku?: string | undefined;
    expiryDate?: string | undefined;
    dosage?: string | undefined;
    turnaround?: string | undefined;
    dailyMarketPrice?: boolean | undefined;
    garmentType?: string | undefined;
    conditionJson?: Record<string, unknown> | undefined;
    dietaryTags?: string[] | undefined;
}>;
export type AddMenuItemDto = z.infer<typeof addMenuItemSchema>;
export declare const createVendorLocationSchema: z.ZodObject<{
    name: z.ZodString;
    address: z.ZodString;
    lat: z.ZodNumber;
    lng: z.ZodNumber;
    deliveryRadiusKm: z.ZodOptional<z.ZodNumber>;
    accepting: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    lat: number;
    lng: number;
    address: string;
    deliveryRadiusKm?: number | undefined;
    accepting?: boolean | undefined;
}, {
    name: string;
    lat: number;
    lng: number;
    address: string;
    deliveryRadiusKm?: number | undefined;
    accepting?: boolean | undefined;
}>;
export type CreateVendorLocationDto = z.infer<typeof createVendorLocationSchema>;
export declare const addVendorStaffSchema: z.ZodObject<{
    userId: z.ZodString;
    displayName: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    staffRole: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    displayName: string;
    phone?: string | undefined;
    staffRole?: string | undefined;
}, {
    userId: string;
    displayName: string;
    phone?: string | undefined;
    staffRole?: string | undefined;
}>;
export type AddVendorStaffDto = z.infer<typeof addVendorStaffSchema>;
export declare const connectPosSchema: z.ZodObject<{
    provider: z.ZodString;
    externalStoreId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    provider: string;
    externalStoreId?: string | undefined;
}, {
    provider: string;
    externalStoreId?: string | undefined;
}>;
export type ConnectPosDto = z.infer<typeof connectPosSchema>;
export declare const posWebhookSchema: z.ZodObject<{
    event: z.ZodOptional<z.ZodString>;
    itemId: z.ZodOptional<z.ZodString>;
    stock: z.ZodOptional<z.ZodNumber>;
    available: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    itemId?: string | undefined;
    stock?: number | undefined;
    event?: string | undefined;
    available?: boolean | undefined;
}, {
    itemId?: string | undefined;
    stock?: number | undefined;
    event?: string | undefined;
    available?: boolean | undefined;
}>;
export type PosWebhookDto = z.infer<typeof posWebhookSchema>;
export declare const vendorReviewResponseSchema: z.ZodObject<{
    response: z.ZodString;
}, "strip", z.ZodTypeAny, {
    response: string;
}, {
    response: string;
}>;
export type VendorReviewResponseDto = z.infer<typeof vendorReviewResponseSchema>;
export declare const reserveStockSchema: z.ZodObject<{
    orderId: z.ZodString;
    lines: z.ZodArray<z.ZodObject<{
        itemId: z.ZodString;
        qty: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        itemId: string;
        qty: number;
    }, {
        itemId: string;
        qty: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    orderId: string;
    lines: {
        itemId: string;
        qty: number;
    }[];
}, {
    orderId: string;
    lines: {
        itemId: string;
        qty: number;
    }[];
}>;
export type ReserveStockDto = z.infer<typeof reserveStockSchema>;
export declare const onboardVendorSchema: z.ZodObject<{
    ownerUserId: z.ZodString;
    name: z.ZodString;
    vendorType: z.ZodString;
    lat: z.ZodNumber;
    lng: z.ZodNumber;
    publicId: z.ZodString;
    payoutAccountJson: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    vendorType: string;
    lat: number;
    lng: number;
    ownerUserId: string;
    publicId: string;
    payoutAccountJson?: Record<string, unknown> | null | undefined;
}, {
    name: string;
    vendorType: string;
    lat: number;
    lng: number;
    ownerUserId: string;
    publicId: string;
    payoutAccountJson?: Record<string, unknown> | null | undefined;
}>;
export type OnboardVendorDto = z.infer<typeof onboardVendorSchema>;
export declare const registerDeviceTokenSchema: z.ZodObject<{
    token: z.ZodString;
    platform: z.ZodEnum<["android", "ios"]>;
}, "strip", z.ZodTypeAny, {
    platform: "android" | "ios";
    token: string;
}, {
    platform: "android" | "ios";
    token: string;
}>;
export type RegisterDeviceTokenDto = z.infer<typeof registerDeviceTokenSchema>;
export declare const requestVendorWithdrawalSchema: z.ZodObject<{
    amountPesewas: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    amountPesewas: number;
}, {
    amountPesewas: number;
}>;
export type RequestVendorWithdrawalDto = z.infer<typeof requestVendorWithdrawalSchema>;
export declare const releaseVendorReserveSchema: z.ZodObject<{
    amountPesewas: z.ZodNumber;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
    amountPesewas: number;
}, {
    reason: string;
    amountPesewas: number;
}>;
export type ReleaseVendorReserveDto = z.infer<typeof releaseVendorReserveSchema>;
export declare const verifyRemittanceSchema: z.ZodObject<{
    amountPesewas: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    amountPesewas: number;
}, {
    amountPesewas: number;
}>;
export type VerifyRemittanceDto = z.infer<typeof verifyRemittanceSchema>;
export declare const rejectWithdrawalSchema: z.ZodObject<{
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    note?: string | undefined;
}, {
    note?: string | undefined;
}>;
export type RejectWithdrawalDto = z.infer<typeof rejectWithdrawalSchema>;
export declare const registerRiderSchema: z.ZodObject<{
    name: z.ZodString;
    phone: z.ZodString;
    vehicle: z.ZodOptional<z.ZodNativeEnum<typeof VehicleType>>;
    licensePlate: z.ZodOptional<z.ZodString>;
    lat: z.ZodOptional<z.ZodNumber>;
    lng: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    phone: string;
    name: string;
    licensePlate?: string | undefined;
    lat?: number | undefined;
    lng?: number | undefined;
    vehicle?: VehicleType | undefined;
}, {
    phone: string;
    name: string;
    licensePlate?: string | undefined;
    lat?: number | undefined;
    lng?: number | undefined;
    vehicle?: VehicleType | undefined;
}>;
export type RegisterRiderDto = z.infer<typeof registerRiderSchema>;
export declare const riderAvailabilityBodySchema: z.ZodObject<{
    status: z.ZodEnum<["AVAILABLE", "OFFLINE"]>;
}, "strip", z.ZodTypeAny, {
    status: "OFFLINE" | "AVAILABLE";
}, {
    status: "OFFLINE" | "AVAILABLE";
}>;
export type RiderAvailabilityBodyDto = z.infer<typeof riderAvailabilityBodySchema>;
export declare const adminAssignSchema: z.ZodObject<{
    riderId: z.ZodString;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
    riderId: string;
}, {
    reason: string;
    riderId: string;
}>;
export type AdminAssignDto = z.infer<typeof adminAssignSchema>;
export declare const setRiderVerifiedSchema: z.ZodObject<{
    verified: z.ZodDefault<z.ZodBoolean>;
    /** Optional backend/admin-approved operating location id. City code is resolved server-side from the register. */
    approvedOperatingLocationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    verified: boolean;
    approvedOperatingLocationId?: string | undefined;
}, {
    verified?: boolean | undefined;
    approvedOperatingLocationId?: string | undefined;
}>;
export type SetRiderVerifiedDto = z.infer<typeof setRiderVerifiedSchema>;
export declare const onboardRiderSchema: z.ZodObject<{
    userId: z.ZodString;
    name: z.ZodString;
    phone: z.ZodString;
    vehicle: z.ZodOptional<z.ZodNativeEnum<typeof VehicleType>>;
    licensePlate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    approvedOperatingLocationId: z.ZodOptional<z.ZodString>;
    approvalActorId: z.ZodOptional<z.ZodString>;
    sourceApplicationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    phone: string;
    name: string;
    userId: string;
    licensePlate?: string | null | undefined;
    vehicle?: VehicleType | undefined;
    approvedOperatingLocationId?: string | undefined;
    approvalActorId?: string | undefined;
    sourceApplicationId?: string | undefined;
}, {
    phone: string;
    name: string;
    userId: string;
    licensePlate?: string | null | undefined;
    vehicle?: VehicleType | undefined;
    approvedOperatingLocationId?: string | undefined;
    approvalActorId?: string | undefined;
    sourceApplicationId?: string | undefined;
}>;
export type OnboardRiderDto = z.infer<typeof onboardRiderSchema>;
export declare const riderIdentifierCorrectionSchema: z.ZodObject<{
    reason: z.ZodString;
    approvalReference: z.ZodString;
    /** Optional corrected approved operating location id. The sequence is still database-generated. */
    approvedOperatingLocationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    reason: string;
    approvalReference: string;
    approvedOperatingLocationId?: string | undefined;
}, {
    reason: string;
    approvalReference: string;
    approvedOperatingLocationId?: string | undefined;
}>;
export type RiderIdentifierCorrectionDto = z.infer<typeof riderIdentifierCorrectionSchema>;
export declare const codBlockSchema: z.ZodObject<{
    blocked: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    blocked: boolean;
}, {
    blocked: boolean;
}>;
export type CodBlockDto = z.infer<typeof codBlockSchema>;
export declare const uploadPrescriptionSchema: z.ZodObject<{
    dataBase64: z.ZodString;
    contentType: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    dataBase64: string;
    contentType?: string | undefined;
}, {
    dataBase64: string;
    contentType?: string | undefined;
}>;
export type UploadPrescriptionDto = z.infer<typeof uploadPrescriptionSchema>;
export declare const prescriptionReviewSchema: z.ZodObject<{
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    note?: string | undefined;
}, {
    note?: string | undefined;
}>;
export type PrescriptionReviewDto = z.infer<typeof prescriptionReviewSchema>;
export declare const reportIssueSchema: z.ZodObject<{
    category: z.ZodOptional<z.ZodString>;
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    note?: string | undefined;
    category?: string | undefined;
}, {
    note?: string | undefined;
    category?: string | undefined;
}>;
export type ReportIssueDto = z.infer<typeof reportIssueSchema>;
export declare const resolveIssueSchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodString>;
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status?: string | undefined;
    note?: string | undefined;
}, {
    status?: string | undefined;
    note?: string | undefined;
}>;
export type ResolveIssueDto = z.infer<typeof resolveIssueSchema>;
export declare const laundryStageSchema: z.ZodObject<{
    stage: z.ZodString;
}, "strip", z.ZodTypeAny, {
    stage: string;
}, {
    stage: string;
}>;
export type LaundryStageDto = z.infer<typeof laundryStageSchema>;
export declare const laundryConditionSchema: z.ZodObject<{
    condition: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    condition: Record<string, unknown>;
}, {
    condition: Record<string, unknown>;
}>;
export type LaundryConditionDto = z.infer<typeof laundryConditionSchema>;
export declare const laundryConditionPhotoSchema: z.ZodObject<{
    dataBase64: z.ZodString;
    contentType: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    dataBase64: string;
    contentType?: string | undefined;
}, {
    dataBase64: string;
    contentType?: string | undefined;
}>;
export type LaundryConditionPhotoDto = z.infer<typeof laundryConditionPhotoSchema>;
export declare const uploadDeliveryProofSchema: z.ZodObject<{
    photoBase64: z.ZodString;
    contentType: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    photoBase64: string;
    contentType?: string | undefined;
}, {
    photoBase64: string;
    contentType?: string | undefined;
}>;
export type UploadDeliveryProofDto = z.infer<typeof uploadDeliveryProofSchema>;
export declare const uploadDeliverySignatureSchema: z.ZodObject<{
    signatureBase64: z.ZodString;
    contentType: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    signatureBase64: string;
    contentType?: string | undefined;
}, {
    signatureBase64: string;
    contentType?: string | undefined;
}>;
export type UploadDeliverySignatureDto = z.infer<typeof uploadDeliverySignatureSchema>;
export declare const confirmGiftLocationSchema: z.ZodObject<{
    label: z.ZodString;
    lat: z.ZodNumber;
    lng: z.ZodNumber;
    details: z.ZodOptional<z.ZodString>;
    landmark: z.ZodOptional<z.ZodString>;
    receiverName: z.ZodOptional<z.ZodString>;
    receiverPhone: z.ZodOptional<z.ZodString>;
    digitalAddress: z.ZodOptional<z.ZodString>;
    what3words: z.ZodOptional<z.ZodString>;
    deliveryInstructions: z.ZodOptional<z.ZodString>;
    confirmedAt: z.ZodOptional<z.ZodString>;
} & {
    source: z.ZodDefault<z.ZodString>;
    confirmationSource: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    lat: number;
    lng: number;
    label: string;
    source: string;
    confirmationSource: string;
    digitalAddress?: string | undefined;
    landmark?: string | undefined;
    details?: string | undefined;
    receiverName?: string | undefined;
    receiverPhone?: string | undefined;
    what3words?: string | undefined;
    deliveryInstructions?: string | undefined;
    confirmedAt?: string | undefined;
}, {
    lat: number;
    lng: number;
    label: string;
    digitalAddress?: string | undefined;
    landmark?: string | undefined;
    source?: string | undefined;
    details?: string | undefined;
    receiverName?: string | undefined;
    receiverPhone?: string | undefined;
    what3words?: string | undefined;
    deliveryInstructions?: string | undefined;
    confirmationSource?: string | undefined;
    confirmedAt?: string | undefined;
}>;
export type ConfirmGiftLocationDto = z.infer<typeof confirmGiftLocationSchema>;
export declare const orderAddressCorrectionSchema: z.ZodObject<{
    address: z.ZodObject<{
        /** Human label is presentation only; lat/lng are the delivery source of truth. */
        label: z.ZodString;
        lat: z.ZodNumber;
        lng: z.ZodNumber;
        source: z.ZodString;
        details: z.ZodOptional<z.ZodString>;
        landmark: z.ZodOptional<z.ZodString>;
        receiverName: z.ZodOptional<z.ZodString>;
        receiverPhone: z.ZodOptional<z.ZodString>;
        digitalAddress: z.ZodOptional<z.ZodString>;
        what3words: z.ZodOptional<z.ZodString>;
        deliveryInstructions: z.ZodOptional<z.ZodString>;
        confirmationSource: z.ZodOptional<z.ZodString>;
        confirmedAt: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        lat: number;
        lng: number;
        label: string;
        source: string;
        digitalAddress?: string | undefined;
        landmark?: string | undefined;
        details?: string | undefined;
        receiverName?: string | undefined;
        receiverPhone?: string | undefined;
        what3words?: string | undefined;
        deliveryInstructions?: string | undefined;
        confirmationSource?: string | undefined;
        confirmedAt?: string | undefined;
    }, {
        lat: number;
        lng: number;
        label: string;
        source: string;
        digitalAddress?: string | undefined;
        landmark?: string | undefined;
        details?: string | undefined;
        receiverName?: string | undefined;
        receiverPhone?: string | undefined;
        what3words?: string | undefined;
        deliveryInstructions?: string | undefined;
        confirmationSource?: string | undefined;
        confirmedAt?: string | undefined;
    }>;
    reason: z.ZodString;
    source: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    source: string;
    address: {
        lat: number;
        lng: number;
        label: string;
        source: string;
        digitalAddress?: string | undefined;
        landmark?: string | undefined;
        details?: string | undefined;
        receiverName?: string | undefined;
        receiverPhone?: string | undefined;
        what3words?: string | undefined;
        deliveryInstructions?: string | undefined;
        confirmationSource?: string | undefined;
        confirmedAt?: string | undefined;
    };
    reason: string;
}, {
    address: {
        lat: number;
        lng: number;
        label: string;
        source: string;
        digitalAddress?: string | undefined;
        landmark?: string | undefined;
        details?: string | undefined;
        receiverName?: string | undefined;
        receiverPhone?: string | undefined;
        what3words?: string | undefined;
        deliveryInstructions?: string | undefined;
        confirmationSource?: string | undefined;
        confirmedAt?: string | undefined;
    };
    reason: string;
    source?: string | undefined;
}>;
export type OrderAddressCorrectionDto = z.infer<typeof orderAddressCorrectionSchema>;
export declare const taxRuleUpsertSchema: z.ZodObject<{
    ruleId: z.ZodString;
    taxType: z.ZodEnum<["VAT", "NHIL", "GETFUND", "WHT", "WITHHOLDING_VAT", "PAYE", "SSNIT", "CIT", "RENT_WHT"]>;
    supplierType: z.ZodOptional<z.ZodEnum<["CUSTOMER", "VENDOR", "DELIVERY_PARTNER", "INDEPENDENT_DELIVERY_PARTNER", "FLEET_DELIVERY_PARTNER", "FLEET_PARTNER", "ORE", "PAYSTACK", "EMPLOYEE", "LANDLORD", "OTHER_SUPPLIER", "ANY"]>>;
    payerType: z.ZodOptional<z.ZodEnum<["CUSTOMER", "VENDOR", "DELIVERY_PARTNER", "INDEPENDENT_DELIVERY_PARTNER", "FLEET_DELIVERY_PARTNER", "FLEET_PARTNER", "ORE", "PAYSTACK", "EMPLOYEE", "LANDLORD", "OTHER_SUPPLIER", "ANY"]>>;
    payeeType: z.ZodOptional<z.ZodEnum<["CUSTOMER", "VENDOR", "DELIVERY_PARTNER", "INDEPENDENT_DELIVERY_PARTNER", "FLEET_DELIVERY_PARTNER", "FLEET_PARTNER", "ORE", "PAYSTACK", "EMPLOYEE", "LANDLORD", "OTHER_SUPPLIER", "ANY"]>>;
    residentStatus: z.ZodOptional<z.ZodEnum<["RESIDENT", "NON_RESIDENT", "UNKNOWN", "ANY"]>>;
    transactionType: z.ZodOptional<z.ZodEnum<["GOODS", "WORKS", "GENERAL_SERVICES", "RENT", "DIRECTOR_FEES", "COMMISSION", "NON_RESIDENT_SERVICES", "ANY"]>>;
    contractType: z.ZodOptional<z.ZodString>;
    thresholdType: z.ZodOptional<z.ZodEnum<["TRANSACTION_THRESHOLD", "ANNUAL_CUMULATIVE_THRESHOLD", "SUPPLIER_CATEGORY_THRESHOLD", "NO_THRESHOLD_RULE"]>>;
    thresholdAmountPesewas: z.ZodOptional<z.ZodNumber>;
    rateBps: z.ZodNumber;
    taxBase: z.ZodOptional<z.ZodEnum<["GROSS_AMOUNT", "TAXABLE_AMOUNT", "AMOUNT_OVER_THRESHOLD"]>>;
    effectiveFrom: z.ZodString;
    effectiveTo: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    exemption: z.ZodOptional<z.ZodBoolean>;
    certificateRequired: z.ZodOptional<z.ZodBoolean>;
    active: z.ZodOptional<z.ZodBoolean>;
    version: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    ruleId: string;
    taxType: "VAT" | "NHIL" | "GETFUND" | "WHT" | "WITHHOLDING_VAT" | "PAYE" | "SSNIT" | "CIT" | "RENT_WHT";
    rateBps: number;
    effectiveFrom: string;
    supplierType?: "VENDOR" | "CUSTOMER" | "DELIVERY_PARTNER" | "INDEPENDENT_DELIVERY_PARTNER" | "FLEET_DELIVERY_PARTNER" | "FLEET_PARTNER" | "ORE" | "PAYSTACK" | "EMPLOYEE" | "LANDLORD" | "OTHER_SUPPLIER" | "ANY" | undefined;
    payerType?: "VENDOR" | "CUSTOMER" | "DELIVERY_PARTNER" | "INDEPENDENT_DELIVERY_PARTNER" | "FLEET_DELIVERY_PARTNER" | "FLEET_PARTNER" | "ORE" | "PAYSTACK" | "EMPLOYEE" | "LANDLORD" | "OTHER_SUPPLIER" | "ANY" | undefined;
    payeeType?: "VENDOR" | "CUSTOMER" | "DELIVERY_PARTNER" | "INDEPENDENT_DELIVERY_PARTNER" | "FLEET_DELIVERY_PARTNER" | "FLEET_PARTNER" | "ORE" | "PAYSTACK" | "EMPLOYEE" | "LANDLORD" | "OTHER_SUPPLIER" | "ANY" | undefined;
    residentStatus?: "UNKNOWN" | "ANY" | "RESIDENT" | "NON_RESIDENT" | undefined;
    transactionType?: "ANY" | "GOODS" | "WORKS" | "GENERAL_SERVICES" | "RENT" | "DIRECTOR_FEES" | "COMMISSION" | "NON_RESIDENT_SERVICES" | undefined;
    contractType?: string | undefined;
    thresholdType?: "TRANSACTION_THRESHOLD" | "ANNUAL_CUMULATIVE_THRESHOLD" | "SUPPLIER_CATEGORY_THRESHOLD" | "NO_THRESHOLD_RULE" | undefined;
    thresholdAmountPesewas?: number | undefined;
    taxBase?: "GROSS_AMOUNT" | "TAXABLE_AMOUNT" | "AMOUNT_OVER_THRESHOLD" | undefined;
    effectiveTo?: string | null | undefined;
    exemption?: boolean | undefined;
    certificateRequired?: boolean | undefined;
    active?: boolean | undefined;
    version?: number | undefined;
}, {
    ruleId: string;
    taxType: "VAT" | "NHIL" | "GETFUND" | "WHT" | "WITHHOLDING_VAT" | "PAYE" | "SSNIT" | "CIT" | "RENT_WHT";
    rateBps: number;
    effectiveFrom: string;
    supplierType?: "VENDOR" | "CUSTOMER" | "DELIVERY_PARTNER" | "INDEPENDENT_DELIVERY_PARTNER" | "FLEET_DELIVERY_PARTNER" | "FLEET_PARTNER" | "ORE" | "PAYSTACK" | "EMPLOYEE" | "LANDLORD" | "OTHER_SUPPLIER" | "ANY" | undefined;
    payerType?: "VENDOR" | "CUSTOMER" | "DELIVERY_PARTNER" | "INDEPENDENT_DELIVERY_PARTNER" | "FLEET_DELIVERY_PARTNER" | "FLEET_PARTNER" | "ORE" | "PAYSTACK" | "EMPLOYEE" | "LANDLORD" | "OTHER_SUPPLIER" | "ANY" | undefined;
    payeeType?: "VENDOR" | "CUSTOMER" | "DELIVERY_PARTNER" | "INDEPENDENT_DELIVERY_PARTNER" | "FLEET_DELIVERY_PARTNER" | "FLEET_PARTNER" | "ORE" | "PAYSTACK" | "EMPLOYEE" | "LANDLORD" | "OTHER_SUPPLIER" | "ANY" | undefined;
    residentStatus?: "UNKNOWN" | "ANY" | "RESIDENT" | "NON_RESIDENT" | undefined;
    transactionType?: "ANY" | "GOODS" | "WORKS" | "GENERAL_SERVICES" | "RENT" | "DIRECTOR_FEES" | "COMMISSION" | "NON_RESIDENT_SERVICES" | undefined;
    contractType?: string | undefined;
    thresholdType?: "TRANSACTION_THRESHOLD" | "ANNUAL_CUMULATIVE_THRESHOLD" | "SUPPLIER_CATEGORY_THRESHOLD" | "NO_THRESHOLD_RULE" | undefined;
    thresholdAmountPesewas?: number | undefined;
    taxBase?: "GROSS_AMOUNT" | "TAXABLE_AMOUNT" | "AMOUNT_OVER_THRESHOLD" | undefined;
    effectiveTo?: string | null | undefined;
    exemption?: boolean | undefined;
    certificateRequired?: boolean | undefined;
    active?: boolean | undefined;
    version?: number | undefined;
}>;
export type TaxRuleUpsertDto = z.infer<typeof taxRuleUpsertSchema>;
export declare const taxComponentClassificationSchema: z.ZodObject<{
    transactionId: z.ZodString;
    orderId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    componentType: z.ZodString;
    payerType: z.ZodEnum<["CUSTOMER", "VENDOR", "DELIVERY_PARTNER", "INDEPENDENT_DELIVERY_PARTNER", "FLEET_DELIVERY_PARTNER", "FLEET_PARTNER", "ORE", "PAYSTACK", "EMPLOYEE", "LANDLORD", "OTHER_SUPPLIER"]>;
    payerId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    payeeType: z.ZodEnum<["CUSTOMER", "VENDOR", "DELIVERY_PARTNER", "INDEPENDENT_DELIVERY_PARTNER", "FLEET_DELIVERY_PARTNER", "FLEET_PARTNER", "ORE", "PAYSTACK", "EMPLOYEE", "LANDLORD", "OTHER_SUPPLIER"]>;
    payeeId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    supplierType: z.ZodEnum<["CUSTOMER", "VENDOR", "DELIVERY_PARTNER", "INDEPENDENT_DELIVERY_PARTNER", "FLEET_DELIVERY_PARTNER", "FLEET_PARTNER", "ORE", "PAYSTACK", "EMPLOYEE", "LANDLORD", "OTHER_SUPPLIER"]>;
    supplierId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    customerId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    grossAmountPesewas: z.ZodNumber;
    taxableAmountPesewas: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    taxCategory: z.ZodEnum<["TAXABLE", "ZERO_RATED", "EXEMPT", "OUT_OF_SCOPE", "NOT_ORE_SUPPLY"]>;
    revenueOwner: z.ZodEnum<["ORE", "VENDOR", "DELIVERY_PARTNER", "FLEET_DELIVERY_PARTNER", "OTHER"]>;
    paymentProcessor: z.ZodEnum<["PAYSTACK", "CASH", "INTERNAL", "NONE"]>;
    settlementMethod: z.ZodEnum<["PAYSTACK_SPLIT", "PAYSTACK_TRANSFER", "COD_CASH", "WALLET", "BANK_TRANSFER", "INTERNAL_LEDGER", "NONE"]>;
    contractType: z.ZodString;
    transactionType: z.ZodEnum<["GOODS", "WORKS", "GENERAL_SERVICES", "RENT", "DIRECTOR_FEES", "COMMISSION", "NON_RESIDENT_SERVICES"]>;
    residentStatus: z.ZodEnum<["RESIDENT", "NON_RESIDENT", "UNKNOWN"]>;
    transactionDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    pricingMode: z.ZodOptional<z.ZodEnum<["INCLUSIVE", "EXCLUSIVE"]>>;
    metadata: z.ZodNullable<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
}, "strip", z.ZodTypeAny, {
    supplierType: "VENDOR" | "CUSTOMER" | "DELIVERY_PARTNER" | "INDEPENDENT_DELIVERY_PARTNER" | "FLEET_DELIVERY_PARTNER" | "FLEET_PARTNER" | "ORE" | "PAYSTACK" | "EMPLOYEE" | "LANDLORD" | "OTHER_SUPPLIER";
    payerType: "VENDOR" | "CUSTOMER" | "DELIVERY_PARTNER" | "INDEPENDENT_DELIVERY_PARTNER" | "FLEET_DELIVERY_PARTNER" | "FLEET_PARTNER" | "ORE" | "PAYSTACK" | "EMPLOYEE" | "LANDLORD" | "OTHER_SUPPLIER";
    payeeType: "VENDOR" | "CUSTOMER" | "DELIVERY_PARTNER" | "INDEPENDENT_DELIVERY_PARTNER" | "FLEET_DELIVERY_PARTNER" | "FLEET_PARTNER" | "ORE" | "PAYSTACK" | "EMPLOYEE" | "LANDLORD" | "OTHER_SUPPLIER";
    residentStatus: "UNKNOWN" | "RESIDENT" | "NON_RESIDENT";
    transactionType: "GOODS" | "WORKS" | "GENERAL_SERVICES" | "RENT" | "DIRECTOR_FEES" | "COMMISSION" | "NON_RESIDENT_SERVICES";
    contractType: string;
    transactionId: string;
    componentType: string;
    grossAmountPesewas: number;
    taxCategory: "TAXABLE" | "ZERO_RATED" | "EXEMPT" | "OUT_OF_SCOPE" | "NOT_ORE_SUPPLY";
    revenueOwner: "OTHER" | "VENDOR" | "DELIVERY_PARTNER" | "FLEET_DELIVERY_PARTNER" | "ORE";
    paymentProcessor: "PAYSTACK" | "CASH" | "INTERNAL" | "NONE";
    settlementMethod: "WALLET" | "NONE" | "PAYSTACK_SPLIT" | "PAYSTACK_TRANSFER" | "COD_CASH" | "BANK_TRANSFER" | "INTERNAL_LEDGER";
    orderId?: string | null | undefined;
    payerId?: string | null | undefined;
    payeeId?: string | null | undefined;
    supplierId?: string | null | undefined;
    customerId?: string | null | undefined;
    taxableAmountPesewas?: number | null | undefined;
    transactionDate?: string | null | undefined;
    pricingMode?: "INCLUSIVE" | "EXCLUSIVE" | undefined;
    metadata?: Record<string, unknown> | null | undefined;
}, {
    supplierType: "VENDOR" | "CUSTOMER" | "DELIVERY_PARTNER" | "INDEPENDENT_DELIVERY_PARTNER" | "FLEET_DELIVERY_PARTNER" | "FLEET_PARTNER" | "ORE" | "PAYSTACK" | "EMPLOYEE" | "LANDLORD" | "OTHER_SUPPLIER";
    payerType: "VENDOR" | "CUSTOMER" | "DELIVERY_PARTNER" | "INDEPENDENT_DELIVERY_PARTNER" | "FLEET_DELIVERY_PARTNER" | "FLEET_PARTNER" | "ORE" | "PAYSTACK" | "EMPLOYEE" | "LANDLORD" | "OTHER_SUPPLIER";
    payeeType: "VENDOR" | "CUSTOMER" | "DELIVERY_PARTNER" | "INDEPENDENT_DELIVERY_PARTNER" | "FLEET_DELIVERY_PARTNER" | "FLEET_PARTNER" | "ORE" | "PAYSTACK" | "EMPLOYEE" | "LANDLORD" | "OTHER_SUPPLIER";
    residentStatus: "UNKNOWN" | "RESIDENT" | "NON_RESIDENT";
    transactionType: "GOODS" | "WORKS" | "GENERAL_SERVICES" | "RENT" | "DIRECTOR_FEES" | "COMMISSION" | "NON_RESIDENT_SERVICES";
    contractType: string;
    transactionId: string;
    componentType: string;
    grossAmountPesewas: number;
    taxCategory: "TAXABLE" | "ZERO_RATED" | "EXEMPT" | "OUT_OF_SCOPE" | "NOT_ORE_SUPPLY";
    revenueOwner: "OTHER" | "VENDOR" | "DELIVERY_PARTNER" | "FLEET_DELIVERY_PARTNER" | "ORE";
    paymentProcessor: "PAYSTACK" | "CASH" | "INTERNAL" | "NONE";
    settlementMethod: "WALLET" | "NONE" | "PAYSTACK_SPLIT" | "PAYSTACK_TRANSFER" | "COD_CASH" | "BANK_TRANSFER" | "INTERNAL_LEDGER";
    orderId?: string | null | undefined;
    payerId?: string | null | undefined;
    payeeId?: string | null | undefined;
    supplierId?: string | null | undefined;
    customerId?: string | null | undefined;
    taxableAmountPesewas?: number | null | undefined;
    transactionDate?: string | null | undefined;
    pricingMode?: "INCLUSIVE" | "EXCLUSIVE" | undefined;
    metadata?: Record<string, unknown> | null | undefined;
}>;
export type TaxComponentClassificationDto = z.infer<typeof taxComponentClassificationSchema>;
export declare const taxReviewResolveSchema: z.ZodObject<{
    note: z.ZodString;
}, "strip", z.ZodTypeAny, {
    note: string;
}, {
    note: string;
}>;
export type TaxReviewResolveDto = z.infer<typeof taxReviewResolveSchema>;
export declare const vendorTaxProfileUpsertSchema: z.ZodObject<{
    residentStatus: z.ZodEnum<["RESIDENT", "NON_RESIDENT", "UNKNOWN"]>;
    taxIdentificationNumber: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    taxProfileJson: z.ZodNullable<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
}, "strip", z.ZodTypeAny, {
    residentStatus: "UNKNOWN" | "RESIDENT" | "NON_RESIDENT";
    taxIdentificationNumber?: string | null | undefined;
    taxProfileJson?: Record<string, unknown> | null | undefined;
}, {
    residentStatus: "UNKNOWN" | "RESIDENT" | "NON_RESIDENT";
    taxIdentificationNumber?: string | null | undefined;
    taxProfileJson?: Record<string, unknown> | null | undefined;
}>;
export type VendorTaxProfileUpsertDto = z.infer<typeof vendorTaxProfileUpsertSchema>;
export declare const deliveryPartnerTaxProfileUpsertSchema: z.ZodObject<{
    residentStatus: z.ZodEnum<["RESIDENT", "NON_RESIDENT", "UNKNOWN"]>;
    deliveryPartnerType: z.ZodOptional<z.ZodEnum<["INDEPENDENT_DELIVERY_PARTNER", "FLEET_DELIVERY_PARTNER"]>>;
    deliveryPartnerId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    fleetPartnerId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    contractType: z.ZodOptional<z.ZodString>;
    settlementMethod: z.ZodOptional<z.ZodEnum<["PAYSTACK_SPLIT", "PAYSTACK_TRANSFER", "COD_CASH", "WALLET", "BANK_TRANSFER", "INTERNAL_LEDGER", "NONE"]>>;
}, "strip", z.ZodTypeAny, {
    residentStatus: "UNKNOWN" | "RESIDENT" | "NON_RESIDENT";
    contractType?: string | undefined;
    settlementMethod?: "WALLET" | "NONE" | "PAYSTACK_SPLIT" | "PAYSTACK_TRANSFER" | "COD_CASH" | "BANK_TRANSFER" | "INTERNAL_LEDGER" | undefined;
    deliveryPartnerType?: "INDEPENDENT_DELIVERY_PARTNER" | "FLEET_DELIVERY_PARTNER" | undefined;
    deliveryPartnerId?: string | null | undefined;
    fleetPartnerId?: string | null | undefined;
}, {
    residentStatus: "UNKNOWN" | "RESIDENT" | "NON_RESIDENT";
    contractType?: string | undefined;
    settlementMethod?: "WALLET" | "NONE" | "PAYSTACK_SPLIT" | "PAYSTACK_TRANSFER" | "COD_CASH" | "BANK_TRANSFER" | "INTERNAL_LEDGER" | undefined;
    deliveryPartnerType?: "INDEPENDENT_DELIVERY_PARTNER" | "FLEET_DELIVERY_PARTNER" | undefined;
    deliveryPartnerId?: string | null | undefined;
    fleetPartnerId?: string | null | undefined;
}>;
export type DeliveryPartnerTaxProfileUpsertDto = z.infer<typeof deliveryPartnerTaxProfileUpsertSchema>;
export declare const performanceMetricConfigSchema: z.ZodObject<{
    code: z.ZodString;
    label: z.ZodString;
    category: z.ZodEnum<["OPERATIONS", "CUSTOMER_EXPERIENCE", "COMPLIANCE", "QUALITY", "FINANCIAL", "SAFETY"]>;
    weight: z.ZodNumber;
    formula: z.ZodEnum<["RATE_GTE_TARGET", "RATE_LTE_TARGET", "AVERAGE_GTE_TARGET", "AVERAGE_LTE_TARGET", "COUNT_LTE_TARGET", "MANUAL_0_100"]>;
    target: z.ZodNumber;
    minimumSampleSize: z.ZodOptional<z.ZodNumber>;
    enabled: z.ZodOptional<z.ZodBoolean>;
    maxValue: z.ZodOptional<z.ZodNumber>;
    exclusionCodes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    attribution: z.ZodOptional<z.ZodObject<{
        impactWhenResponsibleOnly: z.ZodOptional<z.ZodBoolean>;
        excludedCauses: z.ZodOptional<z.ZodArray<z.ZodEnum<["RESPONSIBLE", "CUSTOMER", "VENDOR", "RIDER", "PLATFORM", "WEATHER", "THIRD_PARTY", "UNKNOWN"]>, "many">>;
    }, "strip", z.ZodTypeAny, {
        impactWhenResponsibleOnly?: boolean | undefined;
        excludedCauses?: ("VENDOR" | "RIDER" | "PLATFORM" | "CUSTOMER" | "UNKNOWN" | "RESPONSIBLE" | "WEATHER" | "THIRD_PARTY")[] | undefined;
    }, {
        impactWhenResponsibleOnly?: boolean | undefined;
        excludedCauses?: ("VENDOR" | "RIDER" | "PLATFORM" | "CUSTOMER" | "UNKNOWN" | "RESPONSIBLE" | "WEATHER" | "THIRD_PARTY")[] | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    code: string;
    label: string;
    target: number;
    category: "OPERATIONS" | "COMPLIANCE" | "QUALITY" | "FINANCIAL" | "CUSTOMER_EXPERIENCE" | "SAFETY";
    weight: number;
    formula: "RATE_GTE_TARGET" | "RATE_LTE_TARGET" | "AVERAGE_GTE_TARGET" | "AVERAGE_LTE_TARGET" | "COUNT_LTE_TARGET" | "MANUAL_0_100";
    minimumSampleSize?: number | undefined;
    enabled?: boolean | undefined;
    maxValue?: number | undefined;
    exclusionCodes?: string[] | undefined;
    attribution?: {
        impactWhenResponsibleOnly?: boolean | undefined;
        excludedCauses?: ("VENDOR" | "RIDER" | "PLATFORM" | "CUSTOMER" | "UNKNOWN" | "RESPONSIBLE" | "WEATHER" | "THIRD_PARTY")[] | undefined;
    } | undefined;
}, {
    code: string;
    label: string;
    target: number;
    category: "OPERATIONS" | "COMPLIANCE" | "QUALITY" | "FINANCIAL" | "CUSTOMER_EXPERIENCE" | "SAFETY";
    weight: number;
    formula: "RATE_GTE_TARGET" | "RATE_LTE_TARGET" | "AVERAGE_GTE_TARGET" | "AVERAGE_LTE_TARGET" | "COUNT_LTE_TARGET" | "MANUAL_0_100";
    minimumSampleSize?: number | undefined;
    enabled?: boolean | undefined;
    maxValue?: number | undefined;
    exclusionCodes?: string[] | undefined;
    attribution?: {
        impactWhenResponsibleOnly?: boolean | undefined;
        excludedCauses?: ("VENDOR" | "RIDER" | "PLATFORM" | "CUSTOMER" | "UNKNOWN" | "RESPONSIBLE" | "WEATHER" | "THIRD_PARTY")[] | undefined;
    } | undefined;
}>;
export declare const performanceEngineConfigSchema: z.ZodObject<{
    subject: z.ZodEnum<["VENDOR", "RIDER"]>;
    version: z.ZodNumber;
    reviewPeriod: z.ZodEnum<["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "CUSTOM"]>;
    minimumTotalSampleSize: z.ZodOptional<z.ZodNumber>;
    metrics: z.ZodArray<z.ZodObject<{
        code: z.ZodString;
        label: z.ZodString;
        category: z.ZodEnum<["OPERATIONS", "CUSTOMER_EXPERIENCE", "COMPLIANCE", "QUALITY", "FINANCIAL", "SAFETY"]>;
        weight: z.ZodNumber;
        formula: z.ZodEnum<["RATE_GTE_TARGET", "RATE_LTE_TARGET", "AVERAGE_GTE_TARGET", "AVERAGE_LTE_TARGET", "COUNT_LTE_TARGET", "MANUAL_0_100"]>;
        target: z.ZodNumber;
        minimumSampleSize: z.ZodOptional<z.ZodNumber>;
        enabled: z.ZodOptional<z.ZodBoolean>;
        maxValue: z.ZodOptional<z.ZodNumber>;
        exclusionCodes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        attribution: z.ZodOptional<z.ZodObject<{
            impactWhenResponsibleOnly: z.ZodOptional<z.ZodBoolean>;
            excludedCauses: z.ZodOptional<z.ZodArray<z.ZodEnum<["RESPONSIBLE", "CUSTOMER", "VENDOR", "RIDER", "PLATFORM", "WEATHER", "THIRD_PARTY", "UNKNOWN"]>, "many">>;
        }, "strip", z.ZodTypeAny, {
            impactWhenResponsibleOnly?: boolean | undefined;
            excludedCauses?: ("VENDOR" | "RIDER" | "PLATFORM" | "CUSTOMER" | "UNKNOWN" | "RESPONSIBLE" | "WEATHER" | "THIRD_PARTY")[] | undefined;
        }, {
            impactWhenResponsibleOnly?: boolean | undefined;
            excludedCauses?: ("VENDOR" | "RIDER" | "PLATFORM" | "CUSTOMER" | "UNKNOWN" | "RESPONSIBLE" | "WEATHER" | "THIRD_PARTY")[] | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        label: string;
        target: number;
        category: "OPERATIONS" | "COMPLIANCE" | "QUALITY" | "FINANCIAL" | "CUSTOMER_EXPERIENCE" | "SAFETY";
        weight: number;
        formula: "RATE_GTE_TARGET" | "RATE_LTE_TARGET" | "AVERAGE_GTE_TARGET" | "AVERAGE_LTE_TARGET" | "COUNT_LTE_TARGET" | "MANUAL_0_100";
        minimumSampleSize?: number | undefined;
        enabled?: boolean | undefined;
        maxValue?: number | undefined;
        exclusionCodes?: string[] | undefined;
        attribution?: {
            impactWhenResponsibleOnly?: boolean | undefined;
            excludedCauses?: ("VENDOR" | "RIDER" | "PLATFORM" | "CUSTOMER" | "UNKNOWN" | "RESPONSIBLE" | "WEATHER" | "THIRD_PARTY")[] | undefined;
        } | undefined;
    }, {
        code: string;
        label: string;
        target: number;
        category: "OPERATIONS" | "COMPLIANCE" | "QUALITY" | "FINANCIAL" | "CUSTOMER_EXPERIENCE" | "SAFETY";
        weight: number;
        formula: "RATE_GTE_TARGET" | "RATE_LTE_TARGET" | "AVERAGE_GTE_TARGET" | "AVERAGE_LTE_TARGET" | "COUNT_LTE_TARGET" | "MANUAL_0_100";
        minimumSampleSize?: number | undefined;
        enabled?: boolean | undefined;
        maxValue?: number | undefined;
        exclusionCodes?: string[] | undefined;
        attribution?: {
            impactWhenResponsibleOnly?: boolean | undefined;
            excludedCauses?: ("VENDOR" | "RIDER" | "PLATFORM" | "CUSTOMER" | "UNKNOWN" | "RESPONSIBLE" | "WEATHER" | "THIRD_PARTY")[] | undefined;
        } | undefined;
    }>, "many">;
    gradeBands: z.ZodArray<z.ZodObject<{
        grade: z.ZodString;
        minScore: z.ZodNumber;
        maxScore: z.ZodOptional<z.ZodNumber>;
        status: z.ZodEnum<["EXCELLENT", "GOOD", "MONITOR", "WARNING", "PIP", "RESTRICTED", "SUSPENDED", "INSUFFICIENT_DATA"]>;
    }, "strip", z.ZodTypeAny, {
        status: "SUSPENDED" | "WARNING" | "EXCELLENT" | "GOOD" | "MONITOR" | "PIP" | "RESTRICTED" | "INSUFFICIENT_DATA";
        grade: string;
        minScore: number;
        maxScore?: number | undefined;
    }, {
        status: "SUSPENDED" | "WARNING" | "EXCELLENT" | "GOOD" | "MONITOR" | "PIP" | "RESTRICTED" | "INSUFFICIENT_DATA";
        grade: string;
        minScore: number;
        maxScore?: number | undefined;
    }>, "many">;
    categoryWeights: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    trendRules: z.ZodOptional<z.ZodObject<{
        improvingDelta: z.ZodOptional<z.ZodNumber>;
        decliningDelta: z.ZodOptional<z.ZodNumber>;
        reviewPeriods: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        improvingDelta?: number | undefined;
        decliningDelta?: number | undefined;
        reviewPeriods?: number | undefined;
    }, {
        improvingDelta?: number | undefined;
        decliningDelta?: number | undefined;
        reviewPeriods?: number | undefined;
    }>>;
    actionRules: z.ZodOptional<z.ZodArray<z.ZodObject<{
        code: z.ZodString;
        action: z.ZodEnum<["NO_ACTION", "WARNING", "PIP", "RESTRICTION", "SUSPENSION", "AUDIT_REVIEW", "MANUAL_REVIEW"]>;
        whenStatusIn: z.ZodOptional<z.ZodArray<z.ZodEnum<["EXCELLENT", "GOOD", "MONITOR", "WARNING", "PIP", "RESTRICTED", "SUSPENDED", "INSUFFICIENT_DATA"]>, "many">>;
        whenScoreBelow: z.ZodOptional<z.ZodNumber>;
        whenMetricBelow: z.ZodOptional<z.ZodObject<{
            metricCode: z.ZodString;
            scoreBelow: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            metricCode: string;
            scoreBelow: number;
        }, {
            metricCode: string;
            scoreBelow: number;
        }>>;
        requiresAudit: z.ZodOptional<z.ZodBoolean>;
        requiresApproval: z.ZodOptional<z.ZodBoolean>;
        restrictionCode: z.ZodOptional<z.ZodString>;
        durationDays: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        action: "WARNING" | "PIP" | "NO_ACTION" | "RESTRICTION" | "SUSPENSION" | "AUDIT_REVIEW" | "MANUAL_REVIEW";
        whenStatusIn?: ("SUSPENDED" | "WARNING" | "EXCELLENT" | "GOOD" | "MONITOR" | "PIP" | "RESTRICTED" | "INSUFFICIENT_DATA")[] | undefined;
        whenScoreBelow?: number | undefined;
        whenMetricBelow?: {
            metricCode: string;
            scoreBelow: number;
        } | undefined;
        requiresAudit?: boolean | undefined;
        requiresApproval?: boolean | undefined;
        restrictionCode?: string | undefined;
        durationDays?: number | undefined;
    }, {
        code: string;
        action: "WARNING" | "PIP" | "NO_ACTION" | "RESTRICTION" | "SUSPENSION" | "AUDIT_REVIEW" | "MANUAL_REVIEW";
        whenStatusIn?: ("SUSPENDED" | "WARNING" | "EXCELLENT" | "GOOD" | "MONITOR" | "PIP" | "RESTRICTED" | "INSUFFICIENT_DATA")[] | undefined;
        whenScoreBelow?: number | undefined;
        whenMetricBelow?: {
            metricCode: string;
            scoreBelow: number;
        } | undefined;
        requiresAudit?: boolean | undefined;
        requiresApproval?: boolean | undefined;
        restrictionCode?: string | undefined;
        durationDays?: number | undefined;
    }>, "many">>;
    auditRequiredActions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    version: number;
    subject: "VENDOR" | "RIDER";
    reviewPeriod: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "CUSTOM";
    metrics: {
        code: string;
        label: string;
        target: number;
        category: "OPERATIONS" | "COMPLIANCE" | "QUALITY" | "FINANCIAL" | "CUSTOMER_EXPERIENCE" | "SAFETY";
        weight: number;
        formula: "RATE_GTE_TARGET" | "RATE_LTE_TARGET" | "AVERAGE_GTE_TARGET" | "AVERAGE_LTE_TARGET" | "COUNT_LTE_TARGET" | "MANUAL_0_100";
        minimumSampleSize?: number | undefined;
        enabled?: boolean | undefined;
        maxValue?: number | undefined;
        exclusionCodes?: string[] | undefined;
        attribution?: {
            impactWhenResponsibleOnly?: boolean | undefined;
            excludedCauses?: ("VENDOR" | "RIDER" | "PLATFORM" | "CUSTOMER" | "UNKNOWN" | "RESPONSIBLE" | "WEATHER" | "THIRD_PARTY")[] | undefined;
        } | undefined;
    }[];
    gradeBands: {
        status: "SUSPENDED" | "WARNING" | "EXCELLENT" | "GOOD" | "MONITOR" | "PIP" | "RESTRICTED" | "INSUFFICIENT_DATA";
        grade: string;
        minScore: number;
        maxScore?: number | undefined;
    }[];
    minimumTotalSampleSize?: number | undefined;
    categoryWeights?: Record<string, number> | undefined;
    trendRules?: {
        improvingDelta?: number | undefined;
        decliningDelta?: number | undefined;
        reviewPeriods?: number | undefined;
    } | undefined;
    actionRules?: {
        code: string;
        action: "WARNING" | "PIP" | "NO_ACTION" | "RESTRICTION" | "SUSPENSION" | "AUDIT_REVIEW" | "MANUAL_REVIEW";
        whenStatusIn?: ("SUSPENDED" | "WARNING" | "EXCELLENT" | "GOOD" | "MONITOR" | "PIP" | "RESTRICTED" | "INSUFFICIENT_DATA")[] | undefined;
        whenScoreBelow?: number | undefined;
        whenMetricBelow?: {
            metricCode: string;
            scoreBelow: number;
        } | undefined;
        requiresAudit?: boolean | undefined;
        requiresApproval?: boolean | undefined;
        restrictionCode?: string | undefined;
        durationDays?: number | undefined;
    }[] | undefined;
    auditRequiredActions?: string[] | undefined;
}, {
    version: number;
    subject: "VENDOR" | "RIDER";
    reviewPeriod: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "CUSTOM";
    metrics: {
        code: string;
        label: string;
        target: number;
        category: "OPERATIONS" | "COMPLIANCE" | "QUALITY" | "FINANCIAL" | "CUSTOMER_EXPERIENCE" | "SAFETY";
        weight: number;
        formula: "RATE_GTE_TARGET" | "RATE_LTE_TARGET" | "AVERAGE_GTE_TARGET" | "AVERAGE_LTE_TARGET" | "COUNT_LTE_TARGET" | "MANUAL_0_100";
        minimumSampleSize?: number | undefined;
        enabled?: boolean | undefined;
        maxValue?: number | undefined;
        exclusionCodes?: string[] | undefined;
        attribution?: {
            impactWhenResponsibleOnly?: boolean | undefined;
            excludedCauses?: ("VENDOR" | "RIDER" | "PLATFORM" | "CUSTOMER" | "UNKNOWN" | "RESPONSIBLE" | "WEATHER" | "THIRD_PARTY")[] | undefined;
        } | undefined;
    }[];
    gradeBands: {
        status: "SUSPENDED" | "WARNING" | "EXCELLENT" | "GOOD" | "MONITOR" | "PIP" | "RESTRICTED" | "INSUFFICIENT_DATA";
        grade: string;
        minScore: number;
        maxScore?: number | undefined;
    }[];
    minimumTotalSampleSize?: number | undefined;
    categoryWeights?: Record<string, number> | undefined;
    trendRules?: {
        improvingDelta?: number | undefined;
        decliningDelta?: number | undefined;
        reviewPeriods?: number | undefined;
    } | undefined;
    actionRules?: {
        code: string;
        action: "WARNING" | "PIP" | "NO_ACTION" | "RESTRICTION" | "SUSPENSION" | "AUDIT_REVIEW" | "MANUAL_REVIEW";
        whenStatusIn?: ("SUSPENDED" | "WARNING" | "EXCELLENT" | "GOOD" | "MONITOR" | "PIP" | "RESTRICTED" | "INSUFFICIENT_DATA")[] | undefined;
        whenScoreBelow?: number | undefined;
        whenMetricBelow?: {
            metricCode: string;
            scoreBelow: number;
        } | undefined;
        requiresAudit?: boolean | undefined;
        requiresApproval?: boolean | undefined;
        restrictionCode?: string | undefined;
        durationDays?: number | undefined;
    }[] | undefined;
    auditRequiredActions?: string[] | undefined;
}>;
export type PerformanceEngineConfigDto = z.infer<typeof performanceEngineConfigSchema>;
export declare const performanceConfigUpsertSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    active: z.ZodDefault<z.ZodBoolean>;
    config: z.ZodObject<{
        subject: z.ZodEnum<["VENDOR", "RIDER"]>;
        version: z.ZodNumber;
        reviewPeriod: z.ZodEnum<["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "CUSTOM"]>;
        minimumTotalSampleSize: z.ZodOptional<z.ZodNumber>;
        metrics: z.ZodArray<z.ZodObject<{
            code: z.ZodString;
            label: z.ZodString;
            category: z.ZodEnum<["OPERATIONS", "CUSTOMER_EXPERIENCE", "COMPLIANCE", "QUALITY", "FINANCIAL", "SAFETY"]>;
            weight: z.ZodNumber;
            formula: z.ZodEnum<["RATE_GTE_TARGET", "RATE_LTE_TARGET", "AVERAGE_GTE_TARGET", "AVERAGE_LTE_TARGET", "COUNT_LTE_TARGET", "MANUAL_0_100"]>;
            target: z.ZodNumber;
            minimumSampleSize: z.ZodOptional<z.ZodNumber>;
            enabled: z.ZodOptional<z.ZodBoolean>;
            maxValue: z.ZodOptional<z.ZodNumber>;
            exclusionCodes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            attribution: z.ZodOptional<z.ZodObject<{
                impactWhenResponsibleOnly: z.ZodOptional<z.ZodBoolean>;
                excludedCauses: z.ZodOptional<z.ZodArray<z.ZodEnum<["RESPONSIBLE", "CUSTOMER", "VENDOR", "RIDER", "PLATFORM", "WEATHER", "THIRD_PARTY", "UNKNOWN"]>, "many">>;
            }, "strip", z.ZodTypeAny, {
                impactWhenResponsibleOnly?: boolean | undefined;
                excludedCauses?: ("VENDOR" | "RIDER" | "PLATFORM" | "CUSTOMER" | "UNKNOWN" | "RESPONSIBLE" | "WEATHER" | "THIRD_PARTY")[] | undefined;
            }, {
                impactWhenResponsibleOnly?: boolean | undefined;
                excludedCauses?: ("VENDOR" | "RIDER" | "PLATFORM" | "CUSTOMER" | "UNKNOWN" | "RESPONSIBLE" | "WEATHER" | "THIRD_PARTY")[] | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            code: string;
            label: string;
            target: number;
            category: "OPERATIONS" | "COMPLIANCE" | "QUALITY" | "FINANCIAL" | "CUSTOMER_EXPERIENCE" | "SAFETY";
            weight: number;
            formula: "RATE_GTE_TARGET" | "RATE_LTE_TARGET" | "AVERAGE_GTE_TARGET" | "AVERAGE_LTE_TARGET" | "COUNT_LTE_TARGET" | "MANUAL_0_100";
            minimumSampleSize?: number | undefined;
            enabled?: boolean | undefined;
            maxValue?: number | undefined;
            exclusionCodes?: string[] | undefined;
            attribution?: {
                impactWhenResponsibleOnly?: boolean | undefined;
                excludedCauses?: ("VENDOR" | "RIDER" | "PLATFORM" | "CUSTOMER" | "UNKNOWN" | "RESPONSIBLE" | "WEATHER" | "THIRD_PARTY")[] | undefined;
            } | undefined;
        }, {
            code: string;
            label: string;
            target: number;
            category: "OPERATIONS" | "COMPLIANCE" | "QUALITY" | "FINANCIAL" | "CUSTOMER_EXPERIENCE" | "SAFETY";
            weight: number;
            formula: "RATE_GTE_TARGET" | "RATE_LTE_TARGET" | "AVERAGE_GTE_TARGET" | "AVERAGE_LTE_TARGET" | "COUNT_LTE_TARGET" | "MANUAL_0_100";
            minimumSampleSize?: number | undefined;
            enabled?: boolean | undefined;
            maxValue?: number | undefined;
            exclusionCodes?: string[] | undefined;
            attribution?: {
                impactWhenResponsibleOnly?: boolean | undefined;
                excludedCauses?: ("VENDOR" | "RIDER" | "PLATFORM" | "CUSTOMER" | "UNKNOWN" | "RESPONSIBLE" | "WEATHER" | "THIRD_PARTY")[] | undefined;
            } | undefined;
        }>, "many">;
        gradeBands: z.ZodArray<z.ZodObject<{
            grade: z.ZodString;
            minScore: z.ZodNumber;
            maxScore: z.ZodOptional<z.ZodNumber>;
            status: z.ZodEnum<["EXCELLENT", "GOOD", "MONITOR", "WARNING", "PIP", "RESTRICTED", "SUSPENDED", "INSUFFICIENT_DATA"]>;
        }, "strip", z.ZodTypeAny, {
            status: "SUSPENDED" | "WARNING" | "EXCELLENT" | "GOOD" | "MONITOR" | "PIP" | "RESTRICTED" | "INSUFFICIENT_DATA";
            grade: string;
            minScore: number;
            maxScore?: number | undefined;
        }, {
            status: "SUSPENDED" | "WARNING" | "EXCELLENT" | "GOOD" | "MONITOR" | "PIP" | "RESTRICTED" | "INSUFFICIENT_DATA";
            grade: string;
            minScore: number;
            maxScore?: number | undefined;
        }>, "many">;
        categoryWeights: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
        trendRules: z.ZodOptional<z.ZodObject<{
            improvingDelta: z.ZodOptional<z.ZodNumber>;
            decliningDelta: z.ZodOptional<z.ZodNumber>;
            reviewPeriods: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            improvingDelta?: number | undefined;
            decliningDelta?: number | undefined;
            reviewPeriods?: number | undefined;
        }, {
            improvingDelta?: number | undefined;
            decliningDelta?: number | undefined;
            reviewPeriods?: number | undefined;
        }>>;
        actionRules: z.ZodOptional<z.ZodArray<z.ZodObject<{
            code: z.ZodString;
            action: z.ZodEnum<["NO_ACTION", "WARNING", "PIP", "RESTRICTION", "SUSPENSION", "AUDIT_REVIEW", "MANUAL_REVIEW"]>;
            whenStatusIn: z.ZodOptional<z.ZodArray<z.ZodEnum<["EXCELLENT", "GOOD", "MONITOR", "WARNING", "PIP", "RESTRICTED", "SUSPENDED", "INSUFFICIENT_DATA"]>, "many">>;
            whenScoreBelow: z.ZodOptional<z.ZodNumber>;
            whenMetricBelow: z.ZodOptional<z.ZodObject<{
                metricCode: z.ZodString;
                scoreBelow: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                metricCode: string;
                scoreBelow: number;
            }, {
                metricCode: string;
                scoreBelow: number;
            }>>;
            requiresAudit: z.ZodOptional<z.ZodBoolean>;
            requiresApproval: z.ZodOptional<z.ZodBoolean>;
            restrictionCode: z.ZodOptional<z.ZodString>;
            durationDays: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            code: string;
            action: "WARNING" | "PIP" | "NO_ACTION" | "RESTRICTION" | "SUSPENSION" | "AUDIT_REVIEW" | "MANUAL_REVIEW";
            whenStatusIn?: ("SUSPENDED" | "WARNING" | "EXCELLENT" | "GOOD" | "MONITOR" | "PIP" | "RESTRICTED" | "INSUFFICIENT_DATA")[] | undefined;
            whenScoreBelow?: number | undefined;
            whenMetricBelow?: {
                metricCode: string;
                scoreBelow: number;
            } | undefined;
            requiresAudit?: boolean | undefined;
            requiresApproval?: boolean | undefined;
            restrictionCode?: string | undefined;
            durationDays?: number | undefined;
        }, {
            code: string;
            action: "WARNING" | "PIP" | "NO_ACTION" | "RESTRICTION" | "SUSPENSION" | "AUDIT_REVIEW" | "MANUAL_REVIEW";
            whenStatusIn?: ("SUSPENDED" | "WARNING" | "EXCELLENT" | "GOOD" | "MONITOR" | "PIP" | "RESTRICTED" | "INSUFFICIENT_DATA")[] | undefined;
            whenScoreBelow?: number | undefined;
            whenMetricBelow?: {
                metricCode: string;
                scoreBelow: number;
            } | undefined;
            requiresAudit?: boolean | undefined;
            requiresApproval?: boolean | undefined;
            restrictionCode?: string | undefined;
            durationDays?: number | undefined;
        }>, "many">>;
        auditRequiredActions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        version: number;
        subject: "VENDOR" | "RIDER";
        reviewPeriod: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "CUSTOM";
        metrics: {
            code: string;
            label: string;
            target: number;
            category: "OPERATIONS" | "COMPLIANCE" | "QUALITY" | "FINANCIAL" | "CUSTOMER_EXPERIENCE" | "SAFETY";
            weight: number;
            formula: "RATE_GTE_TARGET" | "RATE_LTE_TARGET" | "AVERAGE_GTE_TARGET" | "AVERAGE_LTE_TARGET" | "COUNT_LTE_TARGET" | "MANUAL_0_100";
            minimumSampleSize?: number | undefined;
            enabled?: boolean | undefined;
            maxValue?: number | undefined;
            exclusionCodes?: string[] | undefined;
            attribution?: {
                impactWhenResponsibleOnly?: boolean | undefined;
                excludedCauses?: ("VENDOR" | "RIDER" | "PLATFORM" | "CUSTOMER" | "UNKNOWN" | "RESPONSIBLE" | "WEATHER" | "THIRD_PARTY")[] | undefined;
            } | undefined;
        }[];
        gradeBands: {
            status: "SUSPENDED" | "WARNING" | "EXCELLENT" | "GOOD" | "MONITOR" | "PIP" | "RESTRICTED" | "INSUFFICIENT_DATA";
            grade: string;
            minScore: number;
            maxScore?: number | undefined;
        }[];
        minimumTotalSampleSize?: number | undefined;
        categoryWeights?: Record<string, number> | undefined;
        trendRules?: {
            improvingDelta?: number | undefined;
            decliningDelta?: number | undefined;
            reviewPeriods?: number | undefined;
        } | undefined;
        actionRules?: {
            code: string;
            action: "WARNING" | "PIP" | "NO_ACTION" | "RESTRICTION" | "SUSPENSION" | "AUDIT_REVIEW" | "MANUAL_REVIEW";
            whenStatusIn?: ("SUSPENDED" | "WARNING" | "EXCELLENT" | "GOOD" | "MONITOR" | "PIP" | "RESTRICTED" | "INSUFFICIENT_DATA")[] | undefined;
            whenScoreBelow?: number | undefined;
            whenMetricBelow?: {
                metricCode: string;
                scoreBelow: number;
            } | undefined;
            requiresAudit?: boolean | undefined;
            requiresApproval?: boolean | undefined;
            restrictionCode?: string | undefined;
            durationDays?: number | undefined;
        }[] | undefined;
        auditRequiredActions?: string[] | undefined;
    }, {
        version: number;
        subject: "VENDOR" | "RIDER";
        reviewPeriod: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "CUSTOM";
        metrics: {
            code: string;
            label: string;
            target: number;
            category: "OPERATIONS" | "COMPLIANCE" | "QUALITY" | "FINANCIAL" | "CUSTOMER_EXPERIENCE" | "SAFETY";
            weight: number;
            formula: "RATE_GTE_TARGET" | "RATE_LTE_TARGET" | "AVERAGE_GTE_TARGET" | "AVERAGE_LTE_TARGET" | "COUNT_LTE_TARGET" | "MANUAL_0_100";
            minimumSampleSize?: number | undefined;
            enabled?: boolean | undefined;
            maxValue?: number | undefined;
            exclusionCodes?: string[] | undefined;
            attribution?: {
                impactWhenResponsibleOnly?: boolean | undefined;
                excludedCauses?: ("VENDOR" | "RIDER" | "PLATFORM" | "CUSTOMER" | "UNKNOWN" | "RESPONSIBLE" | "WEATHER" | "THIRD_PARTY")[] | undefined;
            } | undefined;
        }[];
        gradeBands: {
            status: "SUSPENDED" | "WARNING" | "EXCELLENT" | "GOOD" | "MONITOR" | "PIP" | "RESTRICTED" | "INSUFFICIENT_DATA";
            grade: string;
            minScore: number;
            maxScore?: number | undefined;
        }[];
        minimumTotalSampleSize?: number | undefined;
        categoryWeights?: Record<string, number> | undefined;
        trendRules?: {
            improvingDelta?: number | undefined;
            decliningDelta?: number | undefined;
            reviewPeriods?: number | undefined;
        } | undefined;
        actionRules?: {
            code: string;
            action: "WARNING" | "PIP" | "NO_ACTION" | "RESTRICTION" | "SUSPENSION" | "AUDIT_REVIEW" | "MANUAL_REVIEW";
            whenStatusIn?: ("SUSPENDED" | "WARNING" | "EXCELLENT" | "GOOD" | "MONITOR" | "PIP" | "RESTRICTED" | "INSUFFICIENT_DATA")[] | undefined;
            whenScoreBelow?: number | undefined;
            whenMetricBelow?: {
                metricCode: string;
                scoreBelow: number;
            } | undefined;
            requiresAudit?: boolean | undefined;
            requiresApproval?: boolean | undefined;
            restrictionCode?: string | undefined;
            durationDays?: number | undefined;
        }[] | undefined;
        auditRequiredActions?: string[] | undefined;
    }>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    active: boolean;
    config: {
        version: number;
        subject: "VENDOR" | "RIDER";
        reviewPeriod: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "CUSTOM";
        metrics: {
            code: string;
            label: string;
            target: number;
            category: "OPERATIONS" | "COMPLIANCE" | "QUALITY" | "FINANCIAL" | "CUSTOMER_EXPERIENCE" | "SAFETY";
            weight: number;
            formula: "RATE_GTE_TARGET" | "RATE_LTE_TARGET" | "AVERAGE_GTE_TARGET" | "AVERAGE_LTE_TARGET" | "COUNT_LTE_TARGET" | "MANUAL_0_100";
            minimumSampleSize?: number | undefined;
            enabled?: boolean | undefined;
            maxValue?: number | undefined;
            exclusionCodes?: string[] | undefined;
            attribution?: {
                impactWhenResponsibleOnly?: boolean | undefined;
                excludedCauses?: ("VENDOR" | "RIDER" | "PLATFORM" | "CUSTOMER" | "UNKNOWN" | "RESPONSIBLE" | "WEATHER" | "THIRD_PARTY")[] | undefined;
            } | undefined;
        }[];
        gradeBands: {
            status: "SUSPENDED" | "WARNING" | "EXCELLENT" | "GOOD" | "MONITOR" | "PIP" | "RESTRICTED" | "INSUFFICIENT_DATA";
            grade: string;
            minScore: number;
            maxScore?: number | undefined;
        }[];
        minimumTotalSampleSize?: number | undefined;
        categoryWeights?: Record<string, number> | undefined;
        trendRules?: {
            improvingDelta?: number | undefined;
            decliningDelta?: number | undefined;
            reviewPeriods?: number | undefined;
        } | undefined;
        actionRules?: {
            code: string;
            action: "WARNING" | "PIP" | "NO_ACTION" | "RESTRICTION" | "SUSPENSION" | "AUDIT_REVIEW" | "MANUAL_REVIEW";
            whenStatusIn?: ("SUSPENDED" | "WARNING" | "EXCELLENT" | "GOOD" | "MONITOR" | "PIP" | "RESTRICTED" | "INSUFFICIENT_DATA")[] | undefined;
            whenScoreBelow?: number | undefined;
            whenMetricBelow?: {
                metricCode: string;
                scoreBelow: number;
            } | undefined;
            requiresAudit?: boolean | undefined;
            requiresApproval?: boolean | undefined;
            restrictionCode?: string | undefined;
            durationDays?: number | undefined;
        }[] | undefined;
        auditRequiredActions?: string[] | undefined;
    };
    name?: string | undefined;
    notes?: string | undefined;
}, {
    config: {
        version: number;
        subject: "VENDOR" | "RIDER";
        reviewPeriod: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "CUSTOM";
        metrics: {
            code: string;
            label: string;
            target: number;
            category: "OPERATIONS" | "COMPLIANCE" | "QUALITY" | "FINANCIAL" | "CUSTOMER_EXPERIENCE" | "SAFETY";
            weight: number;
            formula: "RATE_GTE_TARGET" | "RATE_LTE_TARGET" | "AVERAGE_GTE_TARGET" | "AVERAGE_LTE_TARGET" | "COUNT_LTE_TARGET" | "MANUAL_0_100";
            minimumSampleSize?: number | undefined;
            enabled?: boolean | undefined;
            maxValue?: number | undefined;
            exclusionCodes?: string[] | undefined;
            attribution?: {
                impactWhenResponsibleOnly?: boolean | undefined;
                excludedCauses?: ("VENDOR" | "RIDER" | "PLATFORM" | "CUSTOMER" | "UNKNOWN" | "RESPONSIBLE" | "WEATHER" | "THIRD_PARTY")[] | undefined;
            } | undefined;
        }[];
        gradeBands: {
            status: "SUSPENDED" | "WARNING" | "EXCELLENT" | "GOOD" | "MONITOR" | "PIP" | "RESTRICTED" | "INSUFFICIENT_DATA";
            grade: string;
            minScore: number;
            maxScore?: number | undefined;
        }[];
        minimumTotalSampleSize?: number | undefined;
        categoryWeights?: Record<string, number> | undefined;
        trendRules?: {
            improvingDelta?: number | undefined;
            decliningDelta?: number | undefined;
            reviewPeriods?: number | undefined;
        } | undefined;
        actionRules?: {
            code: string;
            action: "WARNING" | "PIP" | "NO_ACTION" | "RESTRICTION" | "SUSPENSION" | "AUDIT_REVIEW" | "MANUAL_REVIEW";
            whenStatusIn?: ("SUSPENDED" | "WARNING" | "EXCELLENT" | "GOOD" | "MONITOR" | "PIP" | "RESTRICTED" | "INSUFFICIENT_DATA")[] | undefined;
            whenScoreBelow?: number | undefined;
            whenMetricBelow?: {
                metricCode: string;
                scoreBelow: number;
            } | undefined;
            requiresAudit?: boolean | undefined;
            requiresApproval?: boolean | undefined;
            restrictionCode?: string | undefined;
            durationDays?: number | undefined;
        }[] | undefined;
        auditRequiredActions?: string[] | undefined;
    };
    name?: string | undefined;
    active?: boolean | undefined;
    notes?: string | undefined;
}>;
export type PerformanceConfigUpsertDto = z.infer<typeof performanceConfigUpsertSchema>;
export declare const performanceMetricInputSchema: z.ZodObject<{
    code: z.ZodString;
    numerator: z.ZodOptional<z.ZodNumber>;
    denominator: z.ZodOptional<z.ZodNumber>;
    value: z.ZodOptional<z.ZodNumber>;
    sampleSize: z.ZodOptional<z.ZodNumber>;
    category: z.ZodOptional<z.ZodEnum<["OPERATIONS", "CUSTOMER_EXPERIENCE", "COMPLIANCE", "QUALITY", "FINANCIAL", "SAFETY"]>>;
    attributed: z.ZodOptional<z.ZodBoolean>;
    attribution: z.ZodOptional<z.ZodEnum<["RESPONSIBLE", "CUSTOMER", "VENDOR", "RIDER", "PLATFORM", "WEATHER", "THIRD_PARTY", "UNKNOWN"]>>;
    exclusionCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    incidentType: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    code: string;
    value?: number | undefined;
    category?: "OPERATIONS" | "COMPLIANCE" | "QUALITY" | "FINANCIAL" | "CUSTOMER_EXPERIENCE" | "SAFETY" | undefined;
    attribution?: "VENDOR" | "RIDER" | "PLATFORM" | "CUSTOMER" | "UNKNOWN" | "RESPONSIBLE" | "WEATHER" | "THIRD_PARTY" | undefined;
    notes?: string | undefined;
    numerator?: number | undefined;
    denominator?: number | undefined;
    sampleSize?: number | undefined;
    attributed?: boolean | undefined;
    exclusionCode?: string | null | undefined;
    incidentType?: string | null | undefined;
}, {
    code: string;
    value?: number | undefined;
    category?: "OPERATIONS" | "COMPLIANCE" | "QUALITY" | "FINANCIAL" | "CUSTOMER_EXPERIENCE" | "SAFETY" | undefined;
    attribution?: "VENDOR" | "RIDER" | "PLATFORM" | "CUSTOMER" | "UNKNOWN" | "RESPONSIBLE" | "WEATHER" | "THIRD_PARTY" | undefined;
    notes?: string | undefined;
    numerator?: number | undefined;
    denominator?: number | undefined;
    sampleSize?: number | undefined;
    attributed?: boolean | undefined;
    exclusionCode?: string | null | undefined;
    incidentType?: string | null | undefined;
}>;
export declare const performanceReviewRunSchema: z.ZodObject<{
    periodStart: z.ZodString;
    periodEnd: z.ZodString;
    reviewerId: z.ZodOptional<z.ZodString>;
    metrics: z.ZodOptional<z.ZodArray<z.ZodObject<{
        code: z.ZodString;
        numerator: z.ZodOptional<z.ZodNumber>;
        denominator: z.ZodOptional<z.ZodNumber>;
        value: z.ZodOptional<z.ZodNumber>;
        sampleSize: z.ZodOptional<z.ZodNumber>;
        category: z.ZodOptional<z.ZodEnum<["OPERATIONS", "CUSTOMER_EXPERIENCE", "COMPLIANCE", "QUALITY", "FINANCIAL", "SAFETY"]>>;
        attributed: z.ZodOptional<z.ZodBoolean>;
        attribution: z.ZodOptional<z.ZodEnum<["RESPONSIBLE", "CUSTOMER", "VENDOR", "RIDER", "PLATFORM", "WEATHER", "THIRD_PARTY", "UNKNOWN"]>>;
        exclusionCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        incidentType: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        notes: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        value?: number | undefined;
        category?: "OPERATIONS" | "COMPLIANCE" | "QUALITY" | "FINANCIAL" | "CUSTOMER_EXPERIENCE" | "SAFETY" | undefined;
        attribution?: "VENDOR" | "RIDER" | "PLATFORM" | "CUSTOMER" | "UNKNOWN" | "RESPONSIBLE" | "WEATHER" | "THIRD_PARTY" | undefined;
        notes?: string | undefined;
        numerator?: number | undefined;
        denominator?: number | undefined;
        sampleSize?: number | undefined;
        attributed?: boolean | undefined;
        exclusionCode?: string | null | undefined;
        incidentType?: string | null | undefined;
    }, {
        code: string;
        value?: number | undefined;
        category?: "OPERATIONS" | "COMPLIANCE" | "QUALITY" | "FINANCIAL" | "CUSTOMER_EXPERIENCE" | "SAFETY" | undefined;
        attribution?: "VENDOR" | "RIDER" | "PLATFORM" | "CUSTOMER" | "UNKNOWN" | "RESPONSIBLE" | "WEATHER" | "THIRD_PARTY" | undefined;
        notes?: string | undefined;
        numerator?: number | undefined;
        denominator?: number | undefined;
        sampleSize?: number | undefined;
        attributed?: boolean | undefined;
        exclusionCode?: string | null | undefined;
        incidentType?: string | null | undefined;
    }>, "many">>;
    incidents: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodString;
        severity: z.ZodOptional<z.ZodString>;
        attributed: z.ZodOptional<z.ZodBoolean>;
        exclusionCode: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: string;
        severity?: string | undefined;
        attributed?: boolean | undefined;
        exclusionCode?: string | undefined;
    }, {
        type: string;
        severity?: string | undefined;
        attributed?: boolean | undefined;
        exclusionCode?: string | undefined;
    }>, "many">>;
    actionOverrides: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    outcome: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    periodStart: string;
    periodEnd: string;
    outcome?: string | undefined;
    metrics?: {
        code: string;
        value?: number | undefined;
        category?: "OPERATIONS" | "COMPLIANCE" | "QUALITY" | "FINANCIAL" | "CUSTOMER_EXPERIENCE" | "SAFETY" | undefined;
        attribution?: "VENDOR" | "RIDER" | "PLATFORM" | "CUSTOMER" | "UNKNOWN" | "RESPONSIBLE" | "WEATHER" | "THIRD_PARTY" | undefined;
        notes?: string | undefined;
        numerator?: number | undefined;
        denominator?: number | undefined;
        sampleSize?: number | undefined;
        attributed?: boolean | undefined;
        exclusionCode?: string | null | undefined;
        incidentType?: string | null | undefined;
    }[] | undefined;
    notes?: string | undefined;
    reviewerId?: string | undefined;
    incidents?: {
        type: string;
        severity?: string | undefined;
        attributed?: boolean | undefined;
        exclusionCode?: string | undefined;
    }[] | undefined;
    actionOverrides?: string[] | undefined;
}, {
    periodStart: string;
    periodEnd: string;
    outcome?: string | undefined;
    metrics?: {
        code: string;
        value?: number | undefined;
        category?: "OPERATIONS" | "COMPLIANCE" | "QUALITY" | "FINANCIAL" | "CUSTOMER_EXPERIENCE" | "SAFETY" | undefined;
        attribution?: "VENDOR" | "RIDER" | "PLATFORM" | "CUSTOMER" | "UNKNOWN" | "RESPONSIBLE" | "WEATHER" | "THIRD_PARTY" | undefined;
        notes?: string | undefined;
        numerator?: number | undefined;
        denominator?: number | undefined;
        sampleSize?: number | undefined;
        attributed?: boolean | undefined;
        exclusionCode?: string | null | undefined;
        incidentType?: string | null | undefined;
    }[] | undefined;
    notes?: string | undefined;
    reviewerId?: string | undefined;
    incidents?: {
        type: string;
        severity?: string | undefined;
        attributed?: boolean | undefined;
        exclusionCode?: string | undefined;
    }[] | undefined;
    actionOverrides?: string[] | undefined;
}>;
export type PerformanceReviewRunDto = z.infer<typeof performanceReviewRunSchema>;
export declare const performanceHistorySearchSchema: z.ZodObject<{
    subjectId: z.ZodOptional<z.ZodString>;
    periodStart: z.ZodOptional<z.ZodString>;
    periodEnd: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    reviewer: z.ZodOptional<z.ZodString>;
    metricCategory: z.ZodOptional<z.ZodString>;
    incidentType: z.ZodOptional<z.ZodString>;
    action: z.ZodOptional<z.ZodString>;
    outcome: z.ZodOptional<z.ZodString>;
    limit: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status?: string | undefined;
    outcome?: string | undefined;
    action?: string | undefined;
    incidentType?: string | undefined;
    periodStart?: string | undefined;
    periodEnd?: string | undefined;
    subjectId?: string | undefined;
    reviewer?: string | undefined;
    metricCategory?: string | undefined;
    limit?: number | undefined;
}, {
    status?: string | undefined;
    outcome?: string | undefined;
    action?: string | undefined;
    incidentType?: string | undefined;
    periodStart?: string | undefined;
    periodEnd?: string | undefined;
    subjectId?: string | undefined;
    reviewer?: string | undefined;
    metricCategory?: string | undefined;
    limit?: number | undefined;
}>;
export type PerformanceHistorySearchDto = z.infer<typeof performanceHistorySearchSchema>;
export declare const performanceCorrectionSchema: z.ZodObject<{
    periodStart: z.ZodString;
    periodEnd: z.ZodString;
    reviewerId: z.ZodOptional<z.ZodString>;
    metrics: z.ZodOptional<z.ZodArray<z.ZodObject<{
        code: z.ZodString;
        numerator: z.ZodOptional<z.ZodNumber>;
        denominator: z.ZodOptional<z.ZodNumber>;
        value: z.ZodOptional<z.ZodNumber>;
        sampleSize: z.ZodOptional<z.ZodNumber>;
        category: z.ZodOptional<z.ZodEnum<["OPERATIONS", "CUSTOMER_EXPERIENCE", "COMPLIANCE", "QUALITY", "FINANCIAL", "SAFETY"]>>;
        attributed: z.ZodOptional<z.ZodBoolean>;
        attribution: z.ZodOptional<z.ZodEnum<["RESPONSIBLE", "CUSTOMER", "VENDOR", "RIDER", "PLATFORM", "WEATHER", "THIRD_PARTY", "UNKNOWN"]>>;
        exclusionCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        incidentType: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        notes: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        value?: number | undefined;
        category?: "OPERATIONS" | "COMPLIANCE" | "QUALITY" | "FINANCIAL" | "CUSTOMER_EXPERIENCE" | "SAFETY" | undefined;
        attribution?: "VENDOR" | "RIDER" | "PLATFORM" | "CUSTOMER" | "UNKNOWN" | "RESPONSIBLE" | "WEATHER" | "THIRD_PARTY" | undefined;
        notes?: string | undefined;
        numerator?: number | undefined;
        denominator?: number | undefined;
        sampleSize?: number | undefined;
        attributed?: boolean | undefined;
        exclusionCode?: string | null | undefined;
        incidentType?: string | null | undefined;
    }, {
        code: string;
        value?: number | undefined;
        category?: "OPERATIONS" | "COMPLIANCE" | "QUALITY" | "FINANCIAL" | "CUSTOMER_EXPERIENCE" | "SAFETY" | undefined;
        attribution?: "VENDOR" | "RIDER" | "PLATFORM" | "CUSTOMER" | "UNKNOWN" | "RESPONSIBLE" | "WEATHER" | "THIRD_PARTY" | undefined;
        notes?: string | undefined;
        numerator?: number | undefined;
        denominator?: number | undefined;
        sampleSize?: number | undefined;
        attributed?: boolean | undefined;
        exclusionCode?: string | null | undefined;
        incidentType?: string | null | undefined;
    }>, "many">>;
    incidents: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodString;
        severity: z.ZodOptional<z.ZodString>;
        attributed: z.ZodOptional<z.ZodBoolean>;
        exclusionCode: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: string;
        severity?: string | undefined;
        attributed?: boolean | undefined;
        exclusionCode?: string | undefined;
    }, {
        type: string;
        severity?: string | undefined;
        attributed?: boolean | undefined;
        exclusionCode?: string | undefined;
    }>, "many">>;
    actionOverrides: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    outcome: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
} & {
    linkedRecordId: z.ZodString;
    correctionType: z.ZodEnum<["CORRECTION", "APPEAL", "REVERSAL"]>;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
    periodStart: string;
    periodEnd: string;
    linkedRecordId: string;
    correctionType: "CORRECTION" | "APPEAL" | "REVERSAL";
    outcome?: string | undefined;
    metrics?: {
        code: string;
        value?: number | undefined;
        category?: "OPERATIONS" | "COMPLIANCE" | "QUALITY" | "FINANCIAL" | "CUSTOMER_EXPERIENCE" | "SAFETY" | undefined;
        attribution?: "VENDOR" | "RIDER" | "PLATFORM" | "CUSTOMER" | "UNKNOWN" | "RESPONSIBLE" | "WEATHER" | "THIRD_PARTY" | undefined;
        notes?: string | undefined;
        numerator?: number | undefined;
        denominator?: number | undefined;
        sampleSize?: number | undefined;
        attributed?: boolean | undefined;
        exclusionCode?: string | null | undefined;
        incidentType?: string | null | undefined;
    }[] | undefined;
    notes?: string | undefined;
    reviewerId?: string | undefined;
    incidents?: {
        type: string;
        severity?: string | undefined;
        attributed?: boolean | undefined;
        exclusionCode?: string | undefined;
    }[] | undefined;
    actionOverrides?: string[] | undefined;
}, {
    reason: string;
    periodStart: string;
    periodEnd: string;
    linkedRecordId: string;
    correctionType: "CORRECTION" | "APPEAL" | "REVERSAL";
    outcome?: string | undefined;
    metrics?: {
        code: string;
        value?: number | undefined;
        category?: "OPERATIONS" | "COMPLIANCE" | "QUALITY" | "FINANCIAL" | "CUSTOMER_EXPERIENCE" | "SAFETY" | undefined;
        attribution?: "VENDOR" | "RIDER" | "PLATFORM" | "CUSTOMER" | "UNKNOWN" | "RESPONSIBLE" | "WEATHER" | "THIRD_PARTY" | undefined;
        notes?: string | undefined;
        numerator?: number | undefined;
        denominator?: number | undefined;
        sampleSize?: number | undefined;
        attributed?: boolean | undefined;
        exclusionCode?: string | null | undefined;
        incidentType?: string | null | undefined;
    }[] | undefined;
    notes?: string | undefined;
    reviewerId?: string | undefined;
    incidents?: {
        type: string;
        severity?: string | undefined;
        attributed?: boolean | undefined;
        exclusionCode?: string | undefined;
    }[] | undefined;
    actionOverrides?: string[] | undefined;
}>;
export type PerformanceCorrectionDto = z.infer<typeof performanceCorrectionSchema>;
export declare const riderIncidentAttributionSchema: z.ZodObject<{
    severity: z.ZodOptional<z.ZodEnum<["LOW", "MEDIUM", "HIGH", "CRITICAL"]>>;
    attribution: z.ZodDefault<z.ZodEnum<["RESPONSIBLE", "CUSTOMER", "VENDOR", "RIDER", "PLATFORM", "WEATHER", "THIRD_PARTY", "UNKNOWN"]>>;
    excludedFromPerformance: z.ZodDefault<z.ZodBoolean>;
    exclusionReason: z.ZodOptional<z.ZodString>;
    performanceImpact: z.ZodDefault<z.ZodBoolean>;
    outcome: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    attribution: "VENDOR" | "RIDER" | "PLATFORM" | "CUSTOMER" | "UNKNOWN" | "RESPONSIBLE" | "WEATHER" | "THIRD_PARTY";
    excludedFromPerformance: boolean;
    performanceImpact: boolean;
    severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | undefined;
    outcome?: string | undefined;
    exclusionReason?: string | undefined;
}, {
    severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | undefined;
    outcome?: string | undefined;
    attribution?: "VENDOR" | "RIDER" | "PLATFORM" | "CUSTOMER" | "UNKNOWN" | "RESPONSIBLE" | "WEATHER" | "THIRD_PARTY" | undefined;
    excludedFromPerformance?: boolean | undefined;
    exclusionReason?: string | undefined;
    performanceImpact?: boolean | undefined;
}>;
export type RiderIncidentAttributionDto = z.infer<typeof riderIncidentAttributionSchema>;
export declare const marketFulfillmentSchema: z.ZodObject<{
    lines: z.ZodOptional<z.ZodArray<z.ZodObject<{
        orderItemId: z.ZodString;
        actualQuantity: z.ZodNumber;
        unit: z.ZodString;
        actualPricePesewas: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        note: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        unit: string;
        orderItemId: string;
        actualQuantity: number;
        note?: string | null | undefined;
        actualPricePesewas?: number | null | undefined;
    }, {
        unit: string;
        orderItemId: string;
        actualQuantity: number;
        note?: string | null | undefined;
        actualPricePesewas?: number | null | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    lines?: {
        unit: string;
        orderItemId: string;
        actualQuantity: number;
        note?: string | null | undefined;
        actualPricePesewas?: number | null | undefined;
    }[] | undefined;
}, {
    lines?: {
        unit: string;
        orderItemId: string;
        actualQuantity: number;
        note?: string | null | undefined;
        actualPricePesewas?: number | null | undefined;
    }[] | undefined;
}>;
export type MarketFulfillmentDto = z.infer<typeof marketFulfillmentSchema>;
export declare const orderDelaySchema: z.ZodEffects<z.ZodObject<{
    extraMinutes: z.ZodOptional<z.ZodNumber>;
    newPrepTimeMin: z.ZodOptional<z.ZodNumber>;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
    extraMinutes?: number | undefined;
    newPrepTimeMin?: number | undefined;
}, {
    reason: string;
    extraMinutes?: number | undefined;
    newPrepTimeMin?: number | undefined;
}>, {
    reason: string;
    extraMinutes?: number | undefined;
    newPrepTimeMin?: number | undefined;
}, {
    reason: string;
    extraMinutes?: number | undefined;
    newPrepTimeMin?: number | undefined;
}>;
export type OrderDelayDto = z.infer<typeof orderDelaySchema>;
export declare const orderCancelSchema: z.ZodObject<{
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    reason?: string | undefined;
}, {
    reason?: string | undefined;
}>;
export type OrderCancelDto = z.infer<typeof orderCancelSchema>;
export declare const adminCancelSchema: z.ZodObject<{
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
}, {
    reason: string;
}>;
export type AdminCancelDto = z.infer<typeof adminCancelSchema>;
export declare const forceStateSchema: z.ZodObject<{
    targetStatus: z.ZodString;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
    targetStatus: string;
}, {
    reason: string;
    targetStatus: string;
}>;
export type ForceStateDto = z.infer<typeof forceStateSchema>;
export declare const internalSetRiderFeeSchema: z.ZodObject<{
    riderFeePesewas: z.ZodNumber;
    peakPayPesewas: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    riderFeePesewas: number;
    peakPayPesewas?: number | undefined;
}, {
    riderFeePesewas: number;
    peakPayPesewas?: number | undefined;
}>;
export type InternalSetRiderFeeDto = z.infer<typeof internalSetRiderFeeSchema>;
export declare const initializePaymentSchema: z.ZodObject<{
    checkoutId: z.ZodString;
    amountPesewas: z.ZodNumber;
    phone: z.ZodString;
    allocations: z.ZodArray<z.ZodObject<{
        orderId: z.ZodString;
        allocatedPesewas: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        orderId: string;
        allocatedPesewas: number;
    }, {
        orderId: string;
        allocatedPesewas: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    phone: string;
    amountPesewas: number;
    checkoutId: string;
    allocations: {
        orderId: string;
        allocatedPesewas: number;
    }[];
}, {
    phone: string;
    amountPesewas: number;
    checkoutId: string;
    allocations: {
        orderId: string;
        allocatedPesewas: number;
    }[];
}>;
export type InitializePaymentDto = z.infer<typeof initializePaymentSchema>;
export declare const transferSchema: z.ZodObject<{
    amountPesewas: z.ZodNumber;
    destination: z.ZodString;
    reference: z.ZodString;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    amountPesewas: number;
    reference: string;
    destination: string;
    metadata?: Record<string, unknown> | undefined;
}, {
    amountPesewas: number;
    reference: string;
    destination: string;
    metadata?: Record<string, unknown> | undefined;
}>;
export type TransferDto = z.infer<typeof transferSchema>;
export declare const vendorTransferSchema: z.ZodObject<{
    amountPesewas: z.ZodNumber;
    reference: z.ZodString;
    payout: z.ZodObject<{
        type: z.ZodEnum<["MOMO", "BANK"]>;
        provider: z.ZodString;
        accountNumber: z.ZodString;
        accountName: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "MOMO" | "BANK";
        provider: string;
        accountNumber: string;
        accountName: string;
    }, {
        type: "MOMO" | "BANK";
        provider: string;
        accountNumber: string;
        accountName: string;
    }>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    payout: {
        type: "MOMO" | "BANK";
        provider: string;
        accountNumber: string;
        accountName: string;
    };
    amountPesewas: number;
    reference: string;
    metadata?: Record<string, unknown> | undefined;
}, {
    payout: {
        type: "MOMO" | "BANK";
        provider: string;
        accountNumber: string;
        accountName: string;
    };
    amountPesewas: number;
    reference: string;
    metadata?: Record<string, unknown> | undefined;
}>;
export type VendorTransferDto = z.infer<typeof vendorTransferSchema>;
export declare const internalRefundSchema: z.ZodObject<{
    orderId: z.ZodString;
    reason: z.ZodString;
    amountPesewas: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    reason: string;
    orderId: string;
    amountPesewas?: number | undefined;
}, {
    reason: string;
    orderId: string;
    amountPesewas?: number | undefined;
}>;
export type InternalRefundDto = z.infer<typeof internalRefundSchema>;
//# sourceMappingURL=dto.d.ts.map