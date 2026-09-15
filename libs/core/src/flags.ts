/** Feature flags — Redis KV (`ore:flag:<name>`) with an in-process fallback.
 *  Exposed by the gateway at GET/PUT /flags (admin-guarded). Flags let ops flip
 *  behaviors (e.g. catalog caching) without a deploy. */

import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { loadEnv } from '@ore/config';

const FLAG_PREFIX = 'ore:flag:';

export interface FlagValue {
  value: string | boolean | number;
  updatedAt: string;
}

export interface FlagsService {
  get(name: string): Promise<FlagValue | null>;
  set(name: string, value: string | boolean | number): Promise<void>;
  all(): Promise<Record<string, FlagValue>>;
}

@Injectable()
export class RedisFlagsService implements FlagsService {
  private readonly redis: Redis | null;
  private readonly fallback = new Map<string, FlagValue>();

  constructor(redisUrl: string) {
    if (!redisUrl) {
      this.redis = null;
      return;
    }
    try {
      this.redis = new Redis(redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true, enableOfflineQueue: false });
      this.redis.on('error', () => {
        // Handled silently - fallback will be used
      });
      this.redis.connect().catch((err) => {
        console.warn('[flags] redis unavailable, using in-process fallback', err.message);
        this.redis?.disconnect();
      });
    } catch {
      this.redis = null;
    }
  }

  private parse(raw: string): FlagValue | null {
    try {
      const v = JSON.parse(raw) as FlagValue;
      if (v && typeof v.value !== 'undefined') return v;
    } catch {
      // stored as plain string
    }
    return { value: raw, updatedAt: new Date().toISOString() };
  }

  async get(name: string): Promise<FlagValue | null> {
    const full = FLAG_PREFIX + name;
    if (this.redis?.status === 'ready') {
      const raw = await this.redis.get(full);
      return raw == null ? null : this.parse(raw);
    }
    return this.fallback.get(full) ?? null;
  }

  async set(name: string, value: string | boolean | number): Promise<void> {
    const full = FLAG_PREFIX + name;
    const record: FlagValue = { value, updatedAt: new Date().toISOString() };
    if (this.redis?.status === 'ready') {
      await this.redis.set(full, JSON.stringify(record));
      return;
    }
    this.fallback.set(full, record);
  }

  async all(): Promise<Record<string, FlagValue>> {
    if (this.redis?.status === 'ready') {
      const keys = await this.redis.keys(FLAG_PREFIX + '*');
      const out: Record<string, FlagValue> = {};
      for (const k of keys) {
        const raw = await this.redis.get(k);
        if (raw != null) out[k.slice(FLAG_PREFIX.length)] = this.parse(raw)!;
      }
      return out;
    }
    const out: Record<string, FlagValue> = {};
    for (const [k, v] of this.fallback) out[k.slice(FLAG_PREFIX.length)] = v;
    return out;
  }
}

export function flagsProvider(env: Record<string, string | undefined> = process.env) {
  const ore = loadEnv(env);
  return {
    provide: ORE_FLAGS_TOKEN,
    useFactory: () => new RedisFlagsService(ore.redisUrl),
  };
}

export const ORE_FLAGS_TOKEN = 'ORE_FLAGS';
