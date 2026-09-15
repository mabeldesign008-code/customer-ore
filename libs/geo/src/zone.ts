/** Zone loading + containment checks. Zone polygon can be overridden via env (ZONE_POLYGON_JSON). */

import { CAPE_COAST_ZONE } from '@ore/contracts';
import { pointInPolygon } from './polygon';
import { LatLng, Zone } from './types';

export function loadZone(env: Record<string, string | undefined> = {}): Zone {
  const raw = env.ZONE_POLYGON_JSON;
  if (raw) {
    try {
      const polygon = JSON.parse(raw) as LatLng[];
      if (polygon.length >= 3) return { ...CAPE_COAST_ZONE, polygon };
    } catch {
      // fall through to default
    }
  }
  return CAPE_COAST_ZONE;
}

export function isPointInZone(point: LatLng, zone: Zone): boolean {
  return pointInPolygon(point, zone.polygon);
}
