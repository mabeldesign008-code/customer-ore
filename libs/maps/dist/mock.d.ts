/** Mock geocoder — deterministic coordinates for known test places (works offline, no keys). */
import { Geocoder, LocationInput, ResolvedLocation } from './geocoder';
export declare class MockGeocoder implements Geocoder {
    resolve(input: LocationInput): Promise<ResolvedLocation>;
    route(a: {
        lat: number;
        lng: number;
    }, b: {
        lat: number;
        lng: number;
    }): Promise<{
        distanceM: number;
        durationS: number;
    }>;
}
//# sourceMappingURL=mock.d.ts.map