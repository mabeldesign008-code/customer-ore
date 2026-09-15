/** Injection tokens + OreEnv provider used across all services. */
import { OreEnv } from '@ore/config';
export declare const ORE_ENV = "ORE_ENV";
export declare const ORE_BUS = "ORE_BUS";
export declare const ORE_SCHEDULER = "ORE_SCHEDULER";
/** Durable, cross-replica dedupe for event consumers. See `consumer-dedupe.ts`. */
export declare const ORE_DEDUPE = "ORE_DEDUPE";
export declare const ORE_RATE_LIMIT = "ORE_RATE_LIMIT";
export declare const ORE_NOTIFY = "ORE_NOTIFY";
export declare const ORE_EMAIL = "ORE_EMAIL";
export declare const ORE_GEOCODER = "ORE_GEOCODER";
export declare const ORE_PAYSTACK = "ORE_PAYSTACK";
export declare const ORE_STORAGE = "ORE_STORAGE";
export declare const ORE_METRICS = "ORE_METRICS";
export declare const ORE_FLAGS = "ORE_FLAGS";
export declare const ORE_CACHE = "ORE_CACHE";
export declare const oreEnvProvider: (env?: Record<string, string | undefined>) => {
    provide: string;
    useFactory: () => OreEnv;
};
//# sourceMappingURL=ore-env.d.ts.map