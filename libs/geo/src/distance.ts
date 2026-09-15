/** Haversine distance between two lat/lng points (metres). Pure TS — no PostGIS needed. */

import { LatLng } from './types';

const EARTH_RADIUS_M = 6_371_000;

export function haversineM(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function distanceKm(a: LatLng, b: LatLng): number {
  return haversineM(a, b) / 1000;
}

/** 
 * Returns true if moving from origin to target B goes in the completely opposite direction 
 * as moving from origin to target A.
 * Computes the dot product of the two vectors. If highly negative, they are opposite.
 */
export function isOppositeDirection(origin: LatLng, a: LatLng, b: LatLng): boolean {
  const vecA = { lat: a.lat - origin.lat, lng: a.lng - origin.lng };
  const vecB = { lat: b.lat - origin.lat, lng: b.lng - origin.lng };
  const dot = vecA.lat * vecB.lat + vecA.lng * vecB.lng;
  // If dot is less than 0, they diverge. If it's strongly negative relative to lengths, it's opposite.
  // We use a simple threshold: if dot < 0 and the points are separated, it's broadly opposite.
  return dot < 0;
}

/** True if point `a` is within `radiusM` of point `b`. */
export function withinM(a: LatLng, b: LatLng, radiusM: number): boolean {
  return haversineM(a, b) <= radiusM;
}
