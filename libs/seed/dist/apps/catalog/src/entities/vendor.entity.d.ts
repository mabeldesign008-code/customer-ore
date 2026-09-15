import { ResidentStatus, VendorPlan, VendorType } from '@ore/contracts';
export interface WeeklyHours {
    [day: string]: {
        open: string;
        close: string;
    }[];
}
export interface HolidayHours {
    [date: string]: {
        closed: boolean;
        open?: string;
        close?: string;
    };
}
export declare class Vendor {
    id: string;
    ownerUserId: string;
    vendorType: VendorType;
    approved: boolean;
    publicId: string | null;
    logoKey: string | null;
    bannerKey: string | null;
    name: string;
    lat: number;
    lng: number;
    deliveryRadiusKm: number;
    acceptsCod: boolean;
    accepting: boolean;
    maxConcurrentOrders: number;
    defaultPrepTimeMin: number;
    hoursJson: WeeklyHours | null;
    holidayHoursJson: HolidayHours | null;
    payoutAccountJson: Record<string, unknown> | null;
    /** Supplier tax profile used for WHT decisions on Ore-paid vendor incentives; unknown requires Finance/Tax review. */
    taxResidentStatus: ResidentStatus;
    taxIdentificationNumber: string | null;
    taxProfileJson: Record<string, unknown> | null;
    plan: VendorPlan;
    suspendUntil: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=vendor.entity.d.ts.map