"use strict";
/** Mock geocoder — deterministic coordinates for known test places (works offline, no keys). */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockGeocoder = void 0;
const contracts_1 = require("@ore/contracts");
const geo_1 = require("@ore/geo");
const KNOWN = {
    ...contracts_1.PLACEHOLDER_COORDS,
    'Lemon Lounge': { lat: 5.116, lng: -1.252 },
    'Emperor Ital Joint': { lat: 5.112, lng: -1.244 },
    'Zizibi Restaurant': { lat: 5.104, lng: -1.238 },
    'Baobab House': { lat: 5.121, lng: -1.257 },
    'New Life Cafe': { lat: 5.126, lng: -1.261 },
    'Ancestral Flavours': { lat: 5.108, lng: -1.249 },
    "Baab's Veggie Fie": { lat: 5.113, lng: -1.240 },
    'Kokodo Restaurant': { lat: 5.118, lng: -1.255 },
    'Orange Beach Bar': { lat: 5.100, lng: -1.230 },
    'Akoma Kesse Fie': { lat: 5.105, lng: -1.242 },
};
class MockGeocoder {
    async resolve(input) {
        switch (input.mode) {
            case 'auto':
                return {
                    lat: input.lat,
                    lng: input.lng,
                    source: contracts_1.GeocoderSource.AUTO_DETECT,
                    label: `Auto (${input.lat.toFixed(4)}, ${input.lng.toFixed(4)})`,
                };
            case 'google': {
                const hit = findKey(KNOWN, input.query);
                if (hit)
                    return { ...hit.loc, source: contracts_1.GeocoderSource.GOOGLE_MAPS, label: hit.key };
                throw new Error(`Mock geocoder: unknown place "${input.query}" — try a seeded place (e.g. "Lemon Lounge", "Kotokuraba Market", "UCC")`);
            }
            case 'w3w': {
                const words = input.words.replace(/^\/+/, '');
                const hit = Object.entries(KNOWN).find(([, l]) => `${l.lat.toFixed(3)}.${l.lng.toFixed(3)}` === words);
                if (hit)
                    return { ...hit[1], source: contracts_1.GeocoderSource.WHAT3WORDS, label: hit[0], what3words: input.words };
                throw new Error(`Mock geocoder: unknown w3w triplet "${input.words}"`);
            }
            case 'ghanagps': {
                const addr = input.digitalAddress.toUpperCase();
                const hit = Object.entries(KNOWN).find(([, l]) => `${l.lat.toFixed(3)}.${l.lng.toFixed(3)}` === addr);
                if (hit)
                    return { ...hit[1], source: contracts_1.GeocoderSource.GHANA_GPS, label: hit[0], digitalAddress: addr };
                throw new Error(`Mock geocoder: unknown digital address "${input.digitalAddress}"`);
            }
        }
    }
    async route(a, b) {
        const straight = (0, geo_1.haversineM)(a, b);
        // Mock roads: assume ~1.3x straight-line, ~25 km/h urban
        const distanceM = straight * 1.3;
        const durationS = (distanceM / 1000 / 25) * 3600;
        return { distanceM, durationS };
    }
}
exports.MockGeocoder = MockGeocoder;
function findKey(map, query) {
    const q = query.toLowerCase();
    const exact = Object.entries(map).find(([k]) => k.toLowerCase() === q);
    if (exact)
        return { key: exact[0], loc: exact[1] };
    const partial = Object.entries(map).find(([k]) => k.toLowerCase().includes(q));
    if (partial)
        return { key: partial[0], loc: partial[1] };
    return null;
}
//# sourceMappingURL=mock.js.map