/** Point-in-polygon (ray casting) for zone containment checks. */

import { LatLng } from './types';

export function pointInPolygon(point: LatLng, ring: LatLng[]): boolean {
  if (ring.length < 3) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i].lng;
    const yi = ring[i].lat;
    const xj = ring[j].lng;
    const yj = ring[j].lat;
    const intersect =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Distance from a point to a polygon's edges (approx: min distance to each segment). */
export function distanceToPolygonM(point: LatLng, ring: LatLng[]): number {
  let min = Infinity;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const d = distToSegmentM(point, ring[j], ring[i]);
    if (d < min) min = d;
  }
  return min;
}

function distToSegmentM(p: LatLng, a: LatLng, b: LatLng): number {
  // convert to local metres via equirectangular approx (fine for <50km)
  const r = 6_371_000;
  const toX = (lng: number, lat: number) => (lng * Math.PI * r) / 180 * Math.cos((lat * Math.PI) / 180);
  const toY = (lat: number) => (lat * Math.PI * r) / 180;
  const ax = toX(a.lng, a.lat);
  const ay = toY(a.lat);
  const bx = toX(b.lng, b.lat);
  const by = toY(b.lat);
  const px = toX(p.lng, p.lat);
  const py = toY(p.lat);
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}
