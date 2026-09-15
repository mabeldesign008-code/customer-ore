"use strict";
/** Haversine distance between two lat/lng points (metres). Pure TS — no PostGIS needed. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.haversineM = haversineM;
exports.distanceKm = distanceKm;
exports.isOppositeDirection = isOppositeDirection;
exports.withinM = withinM;
const EARTH_RADIUS_M = 6_371_000;
function haversineM(a, b) {
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}
function distanceKm(a, b) {
    return haversineM(a, b) / 1000;
}
/**
 * Returns true if moving from origin to target B goes in the completely opposite direction
 * as moving from origin to target A.
 * Computes the dot product of the two vectors. If highly negative, they are opposite.
 */
function isOppositeDirection(origin, a, b) {
    const vecA = { lat: a.lat - origin.lat, lng: a.lng - origin.lng };
    const vecB = { lat: b.lat - origin.lat, lng: b.lng - origin.lng };
    const dot = vecA.lat * vecB.lat + vecA.lng * vecB.lng;
    // If dot is less than 0, they diverge. If it's strongly negative relative to lengths, it's opposite.
    // We use a simple threshold: if dot < 0 and the points are separated, it's broadly opposite.
    return dot < 0;
}
/** True if point `a` is within `radiusM` of point `b`. */
function withinM(a, b, radiusM) {
    return haversineM(a, b) <= radiusM;
}
//# sourceMappingURL=distance.js.map