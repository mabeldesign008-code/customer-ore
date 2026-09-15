/** Redis cache (cache-aside with TTL jitter) shared by all services.
 *  Gracefully degrades to a no-op in-memory map when Redis is unreachable so a
 *  cache outage can never take a service down. */

import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { loadEnv } from '@ore/config';

const CACHE_PREFIX = 'ore:cache:';
const JITTER_MAX_MS = 5_000;

export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  delPrefix(prefix: string): Promise<void>;
}

@Injectable()
export class RedisCacheService implements CacheService {
  private readonly redis: Redis | null;
  private readonly fallback = new Map<string, { value: unknown; expires: number }>();

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
        console.warn('[cache] redis unavailable, using in-process fallback', err.message);
        this.redis?.disconnect();
      });
    } catch {
      this.redis = null;
    }
  }

  private jitter(baseTtl: number): number {
    return baseTtl + Math.floor(Math.random() * JITTER_MAX_MS / 1000);
  }

  async get<T>(key: string): Promise<T | null> {
    const full = CACHE_PREFIX + key;
    if (this.redis?.status === 'ready') {
      const raw = await this.redis.get(full);
      if (raw == null) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return raw as unknown as T;
      }
    }
    const hit = this.fallback.get(full);
    if (hit && hit.expires > Date.now()) return hit.value as T;
    if (hit) this.fallback.delete(full);
    return null;
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const full = CACHE_PREFIX + key;
    const raw = typeof value === 'string' ? value : JSON.stringify(value);
    if (this.redis?.status === 'ready') {
      await this.redis.set(full, raw, 'EX', this.jitter(ttlSeconds));
      return;
    }
    this.fallback.set(full, { value, expires: Date.now() + ttlSeconds * 1000 });
  }

  async del(key: string): Promise<void> {
    const full = CACHE_PREFIX + key;
    if (this.redis?.status === 'ready') {
      await this.redis.del(full);
      return;
    }
    this.fallback.delete(full);
  }

  async delPrefix(prefix: string): Promise<void> {
    if (this.redis?.status === 'ready') {
      const keys = await this.redis.keys(CACHE_PREFIX + prefix + '*');
      if (keys.length) await this.redis.del(...keys);
      return;
    }
    for (const k of [...this.fallback.keys()]) {
      if (k.startsWith(CACHE_PREFIX + prefix)) this.fallback.delete(k);
    }
  }
}

export function cacheProvider(env: Record<string, string | undefined> = process.env) {
  const ore = loadEnv(env);
  return {
    provide: ORE_CACHE_TOKEN,
    useFactory: () => new RedisCacheService(ore.redisUrl),
  };
}

export const ORE_CACHE_TOKEN = 'ORE_CACHE';
