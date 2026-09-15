import { haversineM, distanceKm, withinM } from './distance';
import { pointInPolygon, distanceToPolygonM } from './polygon';
import { loadZone, isPointInZone } from './zone';

describe('geo', () => {
  it('haversine distance is sane (Cape Coast castle → UCC ≈ 6.5km)', () => {
    const a = { lat: 5.104, lng: -1.244 };
    const b = { lat: 5.1174, lng: -1.299 };
    const km = distanceKm(a, b);
    expect(km).toBeGreaterThan(5.5);
    expect(km).toBeLessThan(8);
  });

  it('withinM works', () => {
    const a = { lat: 5.1, lng: -1.24 };
    const b = { lat: 5.1005, lng: -1.24 };
    expect(withinM(a, b, 100)).toBe(true);
    expect(withinM(a, b, 20)).toBe(false);
    expect(haversineM(a, b)).toBeGreaterThan(40);
    expect(haversineM(a, b)).toBeLessThan(70);
  });

  it('point-in-polygon: Cape Coast zone contains Kotokuraba, excludes Accra', () => {
    const zone = loadZone({});
    expect(isPointInZone({ lat: 5.106, lng: -1.246 }, zone)).toBe(true); // Kotokuraba Market
    expect(isPointInZone({ lat: 5.1174, lng: -1.299 }, zone)).toBe(true); // UCC
    expect(isPointInZone({ lat: 5.6037, lng: -0.187 }, zone)).toBe(false); // Accra
    expect(isPointInZone({ lat: 5.104, lng: -1.244 }, zone)).toBe(true); // Castle
  });

  it('distance to polygon is small for near-outside point', () => {
    const zone = loadZone({});
    const d = distanceToPolygonM({ lat: 5.2045, lng: -1.283 }, zone.polygon);
    expect(d).toBeLessThan(500);
  });
});
