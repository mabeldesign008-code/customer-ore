/**
 * Bounding box for a radius search.
 *
 * `buildPool` used to load every AVAILABLE rider in the country and reject them one at a time in
 * application code. This narrows the candidate set in SQL first, so the work scales with riders
 * *near the pickup* rather than riders *on the platform*.
 *
 * A box, not a circle, on purpose: `BETWEEN` on two indexed columns works identically on Postgres
 * and SQLite and needs no PostGIS extension. It over-selects the corners by up to ~27%, and the
 * exact haversine check inside `validateCandidateEligibility` still decides who is really in
 * range — the box only has to be a superset, never a filter of record.
 */

/** Mean Earth radius in kilometres, matching the haversine used for the exact distance. */
const EARTH_RADIUS_KM = 6371;

/** Degrees of latitude per kilometre — constant everywhere. */
const DEG_LAT_PER_KM = 180 / (Math.PI * EARTH_RADIUS_KM);

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  /** True when the box spans the whole globe and filtering by it would be pointless. */
  degenerate: boolean;
}

/**
 * The smallest lat/lng rectangle guaranteed to contain every point within `radiusKm` of `origin`.
 *
 * Longitude degrees shrink towards the poles, so the longitude half-width is divided by
 * `cos(latitude)`. Near a pole that divisor approaches zero and the box widens to everything; the
 * `degenerate` flag lets the caller skip a filter that would exclude nothing. Ghana sits near the
 * equator where `cos` is ~0.999, so in practice the box is tight.
 */
export function boundingBox(origin: { lat: number; lng: number }, radiusKm: number): BoundingBox {
  if (!Number.isFinite(origin.lat) || !Number.isFinite(origin.lng) || !Number.isFinite(radiusKm) || radiusKm <= 0) {
    return { minLat: -90, maxLat: 90, minLng: -180, maxLng: 180, degenerate: true };
  }

  const latDelta = radiusKm * DEG_LAT_PER_KM;
  const cosLat = Math.cos((origin.lat * Math.PI) / 180);

  // Guard the polar case and any box wide enough to wrap the antimeridian: both make a
  // longitude BETWEEN meaningless, so fall back to latitude-only filtering.
  if (Math.abs(cosLat) < 1e-6) {
    return { minLat: clampLat(origin.lat - latDelta), maxLat: clampLat(origin.lat + latDelta), minLng: -180, maxLng: 180, degenerate: true };
  }

  const lngDelta = latDelta / Math.abs(cosLat);
  if (lngDelta >= 180) {
    return { minLat: clampLat(origin.lat - latDelta), maxLat: clampLat(origin.lat + latDelta), minLng: -180, maxLng: 180, degenerate: true };
  }

  const minLng = origin.lng - lngDelta;
  const maxLng = origin.lng + lngDelta;

  // Crossing ±180° would need two ranges OR'd together. Rather than complicate every caller for
  // a case Ghana will never hit, widen to the full range and let the exact check do the work.
  if (minLng < -180 || maxLng > 180) {
    return { minLat: clampLat(origin.lat - latDelta), maxLat: clampLat(origin.lat + latDelta), minLng: -180, maxLng: 180, degenerate: true };
  }

  return {
    minLat: clampLat(origin.lat - latDelta),
    maxLat: clampLat(origin.lat + latDelta),
    minLng,
    maxLng,
    degenerate: false,
  };
}

function clampLat(lat: number): number {
  return Math.max(-90, Math.min(90, lat));
}
