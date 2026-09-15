"use strict";
/** Geocoder factory: mock (offline) or live (real keys). */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGeocoder = createGeocoder;
const config_1 = require("@ore/config");
const live_1 = require("./live");
const mock_1 = require("./mock");
function createGeocoder(env = process.env) {
    const ore = (0, config_1.loadEnv)(env);
    // An explicit mock mode must remain deterministic even when a developer's
    // local template contains a placeholder Google key. Live Google calls are
    // enabled deliberately with GEOCODER_MODE=live.
    const useLive = ore.geocoderMode === 'live';
    return useLive ? new live_1.LiveGeocoder(env) : new mock_1.MockGeocoder();
}
//# sourceMappingURL=factory.js.map