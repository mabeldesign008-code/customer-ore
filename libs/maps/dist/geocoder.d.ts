/** Location resolution: the customer can detect location 4 ways —
 *  AUTO (device GPS), GOOGLE MAPS (place search), WHAT3WORDS (///triplet), GHANA GPS (digital address). */
import { GeocoderSource } from '@ore/contracts';
export interface ResolvedLocation {
    lat: number;
    lng: number;
    source: GeocoderSource;
    label: string;
    digitalAddress?: string;
    what3words?: string;
    accuracyM?: number;
}
export type LocationInput = {
    mode: 'auto';
    lat: number;
    lng: number;
} | {
    mode: 'google';
    query: string;
} | {
    mode: 'w3w';
    words: string;
} | {
    mode: 'ghanagps';
    digitalAddress: string;
};
export interface Geocoder {
    resolve(input: LocationInput): Promise<ResolvedLocation>;
    /** Road distance + duration estimate between two points (for ETA). */
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
//# sourceMappingURL=geocoder.d.ts.map