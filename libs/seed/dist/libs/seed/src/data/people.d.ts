/** Seed riders, customers, admins — test phone numbers (23355… riders, 23350… customers). */
import { Role, VehicleType } from '@ore/contracts';
export interface SeedUser {
    name: string;
    phone: string;
    role: Role;
}
export interface SeedRider extends SeedUser {
    vehicle: VehicleType;
    lat: number;
    lng: number;
}
export declare const SEED_ADMINS: SeedUser[];
export declare const SEED_CUSTOMERS: SeedUser[];
/** Riders spread across the Cape Coast zone. */
export declare const SEED_RIDERS: SeedRider[];
/** Demo delivery addresses across Cape Coast neighbourhoods. */
export declare const SEED_ADDRESSES: readonly [{
    readonly label: "Home — Pedu";
    readonly lat: 5.156;
    readonly lng: -1.279;
    readonly details: "Behind Pedu Junction";
    readonly source: "MANUAL";
}, {
    readonly label: "UCC Campus — North Gate";
    readonly lat: 5.122;
    readonly lng: -1.296;
    readonly details: "University of Cape Coast";
    readonly source: "GOOGLE_MAPS";
}, {
    readonly label: "Adisadel Estate";
    readonly lat: 5.14;
    readonly lng: -1.255;
    readonly details: "Near Adisadel College";
    readonly source: "MANUAL";
}, {
    readonly label: "Abura";
    readonly lat: 5.125;
    readonly lng: -1.235;
    readonly details: "Abura roundabout";
    readonly source: "WHAT3WORDS";
}, {
    readonly label: "Ola";
    readonly lat: 5.099;
    readonly lng: -1.222;
    readonly details: "Ola residential";
    readonly source: "MANUAL";
}, {
    readonly label: "Kotokuraba Market area";
    readonly lat: 5.106;
    readonly lng: -1.246;
    readonly details: "Near the market";
    readonly source: "GHANA_GPS";
}, {
    readonly label: "Bakano";
    readonly lat: 5.124;
    readonly lng: -1.195;
    readonly details: "Bakano junction";
    readonly source: "MANUAL";
}, {
    readonly label: "London Bridge";
    readonly lat: 5.109;
    readonly lng: -1.233;
    readonly details: "London Bridge area";
    readonly source: "MANUAL";
}];
//# sourceMappingURL=people.d.ts.map