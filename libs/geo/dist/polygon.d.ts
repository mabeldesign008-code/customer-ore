/** Point-in-polygon (ray casting) for zone containment checks. */
import { LatLng } from './types';
export declare function pointInPolygon(point: LatLng, ring: LatLng[]): boolean;
/** Distance from a point to a polygon's edges (approx: min distance to each segment). */
export declare function distanceToPolygonM(point: LatLng, ring: LatLng[]): number;
//# sourceMappingURL=polygon.d.ts.map