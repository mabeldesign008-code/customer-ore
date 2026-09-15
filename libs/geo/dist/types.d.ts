export interface LatLng {
    lat: number;
    lng: number;
}
export interface Zone {
    id: string;
    name: string;
    polygon: LatLng[];
    config: ZoneConfig;
}
export interface ZoneConfig {
    dispatchLeadMin: number;
    vendorAcceptWindowSec: number;
    riderOfferWindowSec: number;
    paymentTimeoutMin: number;
    riderRetryEverySec: number;
    riderRetryMaxMin: number;
    pickupGeofenceM: number;
    dropGeofenceM: number;
}
//# sourceMappingURL=types.d.ts.map