"use strict";
/** Seed riders, customers, admins — test phone numbers (23355… riders, 23350… customers). */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SEED_ADDRESSES = exports.SEED_RIDERS = exports.SEED_CUSTOMERS = exports.SEED_ADMINS = void 0;
const contracts_1 = require("@ore/contracts");
exports.SEED_ADMINS = [{ name: 'Ore Admin', phone: '233540000001', role: contracts_1.Role.ADMIN }];
exports.SEED_CUSTOMERS = [
    { name: 'Ama Owusu', phone: '233500000001', role: contracts_1.Role.CUSTOMER },
    { name: 'Kofi Mensah', phone: '233500000002', role: contracts_1.Role.CUSTOMER },
    { name: 'Efua Arthur', phone: '233500000003', role: contracts_1.Role.CUSTOMER },
    { name: 'Yaw Boateng', phone: '233500000004', role: contracts_1.Role.CUSTOMER },
    { name: 'Akosua Frimpong', phone: '233500000005', role: contracts_1.Role.CUSTOMER },
    { name: 'Kwame Appiah', phone: '233500000006', role: contracts_1.Role.CUSTOMER },
    { name: 'Abena Darko', phone: '233500000007', role: contracts_1.Role.CUSTOMER },
    { name: 'Kojo Nkrumah', phone: '233500000008', role: contracts_1.Role.CUSTOMER },
];
/** Riders spread across the Cape Coast zone. */
exports.SEED_RIDERS = [
    { name: 'Rashid Mohammed', phone: '233550000001', role: contracts_1.Role.RIDER, vehicle: contracts_1.VehicleType.MOTORBIKE, lat: 5.108, lng: -1.247 },
    { name: 'Grace Aidoo', phone: '233550000002', role: contracts_1.Role.RIDER, vehicle: contracts_1.VehicleType.BICYCLE, lat: 5.118, lng: -1.252 },
    { name: 'Ibrahim Sulemana', phone: '233550000003', role: contracts_1.Role.RIDER, vehicle: contracts_1.VehicleType.MOTORBIKE, lat: 5.125, lng: -1.258 },
    { name: 'Linda Quansah', phone: '233550000004', role: contracts_1.Role.RIDER, vehicle: contracts_1.VehicleType.MOTORBIKE, lat: 5.1, lng: -1.235 },
    { name: 'Joseph Tetteh', phone: '233550000005', role: contracts_1.Role.RIDER, vehicle: contracts_1.VehicleType.BICYCLE, lat: 5.115, lng: -1.24 },
    { name: 'Mariama Sissoko', phone: '233550000006', role: contracts_1.Role.RIDER, vehicle: contracts_1.VehicleType.MOTORBIKE, lat: 5.13, lng: -1.26 },
    { name: 'Daniel Amoah', phone: '233550000007', role: contracts_1.Role.RIDER, vehicle: contracts_1.VehicleType.MOTORBIKE, lat: 5.102, lng: -1.245 },
    { name: 'Esther Mensimah', phone: '233550000008', role: contracts_1.Role.RIDER, vehicle: contracts_1.VehicleType.BICYCLE, lat: 5.12, lng: -1.255 },
    { name: 'Michael Owiredu', phone: '233550000009', role: contracts_1.Role.RIDER, vehicle: contracts_1.VehicleType.MOTORBIKE, lat: 5.107, lng: -1.232 },
    { name: 'Fatima Bello', phone: '233550000010', role: contracts_1.Role.RIDER, vehicle: contracts_1.VehicleType.MOTORBIKE, lat: 5.123, lng: -1.25 },
    { name: 'Kwesi Prah', phone: '233550000011', role: contracts_1.Role.RIDER, vehicle: contracts_1.VehicleType.BICYCLE, lat: 5.105, lng: -1.244 },
    { name: 'Adjoa Serwaa', phone: '233550000012', role: contracts_1.Role.RIDER, vehicle: contracts_1.VehicleType.MOTORBIKE, lat: 5.116, lng: -1.247 },
];
/** Demo delivery addresses across Cape Coast neighbourhoods. */
exports.SEED_ADDRESSES = [
    { label: 'Home — Pedu', lat: 5.156, lng: -1.279, details: 'Behind Pedu Junction', source: 'MANUAL' },
    { label: 'UCC Campus — North Gate', lat: 5.122, lng: -1.296, details: 'University of Cape Coast', source: 'GOOGLE_MAPS' },
    { label: 'Adisadel Estate', lat: 5.14, lng: -1.255, details: 'Near Adisadel College', source: 'MANUAL' },
    { label: 'Abura', lat: 5.125, lng: -1.235, details: 'Abura roundabout', source: 'WHAT3WORDS' },
    { label: 'Ola', lat: 5.099, lng: -1.222, details: 'Ola residential', source: 'MANUAL' },
    { label: 'Kotokuraba Market area', lat: 5.106, lng: -1.246, details: 'Near the market', source: 'GHANA_GPS' },
    { label: 'Bakano', lat: 5.124, lng: -1.195, details: 'Bakano junction', source: 'MANUAL' },
    { label: 'London Bridge', lat: 5.109, lng: -1.233, details: 'London Bridge area', source: 'MANUAL' },
];
//# sourceMappingURL=people.js.map