import { HolidayHours, WeeklyHours } from './vendor.entity';
/** A Vendor's additional operating location. The primary Vendor row remains the default location. */
export declare class VendorLocation {
    id: string;
    vendorId: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    deliveryRadiusKm: number;
    accepting: boolean;
    hoursJson: WeeklyHours | null;
    holidayHoursJson: HolidayHours | null;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=vendor-location.entity.d.ts.map