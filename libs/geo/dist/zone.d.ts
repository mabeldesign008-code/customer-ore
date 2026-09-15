/** Zone loading + containment checks. Zone polygon can be overridden via env (ZONE_POLYGON_JSON). */
import { LatLng, Zone } from './types';
export declare function loadZone(env?: Record<string, string | undefined>): Zone;
export declare function isPointInZone(point: LatLng, zone: Zone): boolean;
//# sourceMappingURL=zone.d.ts.map