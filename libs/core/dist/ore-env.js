"use strict";
/** Injection tokens + OreEnv provider used across all services. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.oreEnvProvider = exports.ORE_CACHE = exports.ORE_FLAGS = exports.ORE_METRICS = exports.ORE_STORAGE = exports.ORE_PAYSTACK = exports.ORE_GEOCODER = exports.ORE_EMAIL = exports.ORE_NOTIFY = exports.ORE_RATE_LIMIT = exports.ORE_DEDUPE = exports.ORE_SCHEDULER = exports.ORE_BUS = exports.ORE_ENV = void 0;
const config_1 = require("@ore/config");
exports.ORE_ENV = 'ORE_ENV';
exports.ORE_BUS = 'ORE_BUS';
exports.ORE_SCHEDULER = 'ORE_SCHEDULER';
/** Durable, cross-replica dedupe for event consumers. See `consumer-dedupe.ts`. */
exports.ORE_DEDUPE = 'ORE_DEDUPE';
exports.ORE_RATE_LIMIT = 'ORE_RATE_LIMIT';
exports.ORE_NOTIFY = 'ORE_NOTIFY';
exports.ORE_EMAIL = 'ORE_EMAIL';
exports.ORE_GEOCODER = 'ORE_GEOCODER';
exports.ORE_PAYSTACK = 'ORE_PAYSTACK';
exports.ORE_STORAGE = 'ORE_STORAGE';
exports.ORE_METRICS = 'ORE_METRICS';
exports.ORE_FLAGS = 'ORE_FLAGS';
exports.ORE_CACHE = 'ORE_CACHE';
const oreEnvProvider = (env = process.env) => ({
    provide: exports.ORE_ENV,
    useFactory: () => (0, config_1.loadEnv)(env),
});
exports.oreEnvProvider = oreEnvProvider;
//# sourceMappingURL=ore-env.js.map