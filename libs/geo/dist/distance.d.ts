/** Haversine distance between two lat/lng points (metres). Pure TS — no PostGIS needed. */
import { LatLng } from './types';
export declare function haversineM(a: LatLng, b: LatLng): number;
export declare function distanceKm(a: LatLng, b: LatLng): number;
/**
 * Returns true if moving from origin to target B goes in the completely opposite direction
 * as moving from origin to target A.
 * Computes the dot product of the two vectors. If highly negative, they are opposite.
 */
export declare function isOppositeDirection(origin: LatLng, a: LatLng, b: LatLng): boolean;
/** True if point `a` is within `radiusM` of point `b`. */
export declare function withinM(a: LatLng, b: LatLng, radiusM: number): boolean;
//# sourceMappingURL=distance.d.ts.map