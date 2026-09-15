/** Live geocoders — Google Maps, what3words, Ghana GPS. Keys come from env; no code changes needed. */
import { Geocoder, LocationInput, ResolvedLocation } from './geocoder';
export declare class LiveGeocoder implements Geocoder {
    private readonly env;
    constructor(env?: Record<string, string | undefined>);
    private get ore();
    resolve(input: LocationInput): Promise<ResolvedLocation>;
    private google;
    private w3w;
    private ghanagps;
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
//# sourceMappingURL=live.d.ts.map