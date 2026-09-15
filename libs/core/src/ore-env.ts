/** Injection tokens + OreEnv provider used across all services. */

import { OreEnv, loadEnv } from '@ore/config';

export const ORE_ENV = 'ORE_ENV';
export const ORE_BUS = 'ORE_BUS';
export const ORE_SCHEDULER = 'ORE_SCHEDULER';
/** Durable, cross-replica dedupe for event consumers. See `consumer-dedupe.ts`. */
export const ORE_DEDUPE = 'ORE_DEDUPE';
export const ORE_RATE_LIMIT = 'ORE_RATE_LIMIT';
export const ORE_NOTIFY = 'ORE_NOTIFY';
export const ORE_EMAIL = 'ORE_EMAIL';
export const ORE_GEOCODER = 'ORE_GEOCODER';
export const ORE_PAYSTACK = 'ORE_PAYSTACK';
export const ORE_STORAGE = 'ORE_STORAGE';
export const ORE_METRICS = 'ORE_METRICS';
export const ORE_FLAGS = 'ORE_FLAGS';
export const ORE_CACHE = 'ORE_CACHE';

export const oreEnvProvider = (env: Record<string, string | undefined> = process.env) => ({
  provide: ORE_ENV,
  useFactory: (): OreEnv => loadEnv(env),
});
