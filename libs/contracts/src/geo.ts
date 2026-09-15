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
export const CAPE_COAST_ZONE: Zone = {
  id: 'cape-coast',
  name: 'Cape Coast',
  polygon: [
    { lat: 5.204, lng: -1.283 },
    { lat: 5.196, lng: -1.240 },
    { lat: 5.186, lng: -1.210 },
    { lat: 5.168, lng: -1.186 },
    { lat: 5.130, lng: -1.170 },
    { lat: 5.092, lng: -1.182 },
    { lat: 5.076, lng: -1.210 },
    { lat: 5.055, lng: -1.245 },
    { lat: 5.056, lng: -1.285 },
    { lat: 5.080, lng: -1.330 },
    { lat: 5.120, lng: -1.345 },
    { lat: 5.170, lng: -1.320 },
  ],
  config: {
    dispatchLeadMin: 5,
    vendorAcceptWindowSec: 120,
    riderOfferWindowSec: 45,
    paymentTimeoutMin: 10,
    riderRetryEverySec: 30,
    riderRetryMaxMin: 5,
    pickupGeofenceM: 100,
    dropGeofenceM: 150,
  },
};

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
export const ORE_LOCATION_CODE_REGISTER: readonly OreLocationCode[] = [
  {
    id: CAPE_COAST_ZONE.id,
    name: CAPE_COAST_ZONE.name,
    cityCode: 'CC',
    active: true,
    aliases: ['cape coast', 'cape-coast'],
  },
] as const;

export const DEFAULT_ORE_OPERATING_LOCATION_ID = CAPE_COAST_ZONE.id;
export const RIDER_IDENTIFIER_PREFIX = 'YDR';
export const RIDER_IDENTIFIER_PATTERN = /^YDR-[A-Z0-9]{2,8}-\d{4}-\d{4}$/;

export function normalizeOreCityCode(cityCode: string): string {
  const normalized = cityCode.trim().toUpperCase();
  if (!/^[A-Z0-9]{2,8}$/.test(normalized)) {
    throw new Error('Ore city codes must be 2-8 uppercase letters or digits');
  }
  return normalized;
}

export function formatRiderIdentifier(cityCode: string, approvalYear: number, sequenceNumber: number): string {
  const code = normalizeOreCityCode(cityCode);
  if (!Number.isInteger(approvalYear) || approvalYear < 2000 || approvalYear > 9999) {
    throw new Error('Rider ID approval year must be a four-digit year');
  }
  if (!Number.isInteger(sequenceNumber) || sequenceNumber < 1 || sequenceNumber > 9999) {
    throw new Error('Rider ID sequence number must be between 1 and 9999');
  }
  return `${RIDER_IDENTIFIER_PREFIX}-${code}-${approvalYear}-${String(sequenceNumber).padStart(4, '0')}`;
}

export function findOreLocationCode(idOrAlias: string | null | undefined): OreLocationCode | null {
  const value = (idOrAlias ?? DEFAULT_ORE_OPERATING_LOCATION_ID).trim().toLowerCase();
  if (!value) return null;
  return ORE_LOCATION_CODE_REGISTER.find((location) => {
    return location.id.toLowerCase() === value ||
      location.name.toLowerCase() === value ||
      location.aliases.includes(value);
  }) ?? null;
}

export interface Address {
  id: string;
  label: string; // e.g. "Home — Pedu"
  lat: number;
  lng: number;
  /** Raw location source used to capture this point. */
  source: string;
  /** Ghana digital address when captured via GhanaGPS (e.g. CC-100-2345). */
  digitalAddress?: string;
  /** what3words triplet when captured via w3w (e.g. "///splendid.entitle.voice"). */
  what3words?: string;
  details?: string; // street, landmark, description
}

export const PLACEHOLDER_COORDS = {
  UCC: { lat: 5.1174, lng: -1.299 },
  'Kotokuraba Market': { lat: 5.106, lng: -1.246 },
  'Cape Coast Castle': { lat: 5.104, lng: -1.244 },
  Pedu: { lat: 5.156, lng: -1.279 },
  Adisadel: { lat: 5.140, lng: -1.255 },
  Abura: { lat: 5.125, lng: -1.235 },
  Ola: { lat: 5.099, lng: -1.222 },
  Bakano: { lat: 5.124, lng: -1.195 },
  'London Bridge': { lat: 5.109, lng: -1.233 },
  'University of Cape Coast': { lat: 5.1174, lng: -1.299 },
  'Cape Coast Stadium': { lat: 5.116, lng: -1.286 },
} as const;
