/** Geometry: points, the Cape Coast zone polygon, and zone config. */
export interface LatLng {
    lat: number;
    lng: number;
}
export interface Zone {
    id: string;
    name: string;
    /** Polygon ring (closed) approximating the Cape Coast service area. */
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
/**
 * Cape Coast metropolitan area — hand-drawn starter polygon covering
 * University of Cape Coast (W), Pedu/Adisadel (N), Ola/Bakano (E), castle & coast (S).
 * Refine in the admin tool before launch. Roughly: lat 5.05–5.20, lng -1.345…-1.170.
 */
export declare const CAPE_COAST_ZONE: Zone;
export interface OreLocationCode {
    /** Backend-controlled operating-location id. Frontends may display this, but never derive Rider IDs from it. */
    id: string;
    name: string;
    /** Short city code used in YDR-CC-YYYY-NNNN Rider IDs. */
    cityCode: string;
    active: boolean;
    aliases: string[];
}
/** Controlled Ore location-code register. Rider ID city codes must come from here. */
export declare const ORE_LOCATION_CODE_REGISTER: readonly OreLocationCode[];
export declare const DEFAULT_ORE_OPERATING_LOCATION_ID: string;
export declare const RIDER_IDENTIFIER_PREFIX = "YDR";
export declare const RIDER_IDENTIFIER_PATTERN: RegExp;
export declare function normalizeOreCityCode(cityCode: string): string;
export declare function formatRiderIdentifier(cityCode: string, approvalYear: number, sequenceNumber: number): string;
export declare function findOreLocationCode(idOrAlias: string | null | undefined): OreLocationCode | null;
export interface Address {
    id: string;
    label: string;
    lat: number;
    lng: number;
    /** Raw location source used to capture this point. */
    source: string;
    /** Ghana digital address when captured via GhanaGPS (e.g. CC-100-2345). */
    digitalAddress?: string;
    /** what3words triplet when captured via w3w (e.g. "///splendid.entitle.voice"). */
    what3words?: string;
    details?: string;
}
export declare const PLACEHOLDER_COORDS: {
    readonly UCC: {
        readonly lat: 5.1174;
        readonly lng: -1.299;
    };
    readonly 'Kotokuraba Market': {
        readonly lat: 5.106;
        readonly lng: -1.246;
    };
    readonly 'Cape Coast Castle': {
        readonly lat: 5.104;
        readonly lng: -1.244;
    };
    readonly Pedu: {
        readonly lat: 5.156;
        readonly lng: -1.279;
    };
    readonly Adisadel: {
        readonly lat: 5.14;
        readonly lng: -1.255;
    };
    readonly Abura: {
        readonly lat: 5.125;
        readonly lng: -1.235;
    };
    readonly Ola: {
        readonly lat: 5.099;
        readonly lng: -1.222;
    };
    readonly Bakano: {
        readonly lat: 5.124;
        readonly lng: -1.195;
    };
    readonly 'London Bridge': {
        readonly lat: 5.109;
        readonly lng: -1.233;
    };
    readonly 'University of Cape Coast': {
        readonly lat: 5.1174;
        readonly lng: -1.299;
    };
    readonly 'Cape Coast Stadium': {
        readonly lat: 5.116;
        readonly lng: -1.286;
    };
};
//# sourceMappingURL=geo.d.ts.map