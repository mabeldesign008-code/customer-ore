"use strict";
/** Zone loading + containment checks. Zone polygon can be overridden via env (ZONE_POLYGON_JSON). */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadZone = loadZone;
exports.isPointInZone = isPointInZone;
const contracts_1 = require("@ore/contracts");
const polygon_1 = require("./polygon");
function loadZone(env = {}) {
    const raw = env.ZONE_POLYGON_JSON;
    if (raw) {
        try {
            const polygon = JSON.parse(raw);
            if (polygon.length >= 3)
                return { ...contracts_1.CAPE_COAST_ZONE, polygon };
        }
        catch {
            // fall through to default
        }
    }
    return contracts_1.CAPE_COAST_ZONE;
}
function isPointInZone(point, zone) {
    return (0, polygon_1.pointInPolygon)(point, zone.polygon);
}
//# sourceMappingURL=zone.js.map