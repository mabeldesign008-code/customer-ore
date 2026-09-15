/** Redis cache (cache-aside with TTL jitter) shared by all services.
 *  Gracefully degrades to a no-op in-memory map when Redis is unreachable so a
 *  cache outage can never take a service down. */
export interface CacheService {
    get<T>(key: string): Promise<T | null>;
    set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
    del(key: string): Promise<void>;
    delPrefix(prefix: string): Promise<void>;
}
export declare class RedisCacheService implements CacheService {
    private readonly redis;
    private readonly fallback;
    constructor(redisUrl: string);
    private jitter;
    get<T>(key: string): Promise<T | null>;
    set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
    del(key: string): Promise<void>;
    delPrefix(prefix: string): Promise<void>;
}
export declare function cacheProvider(env?: Record<string, string | undefined>): {
    provide: string;
    useFactory: () => RedisCacheService;
};
export declare const ORE_CACHE_TOKEN = "ORE_CACHE";
//# sourceMappingURL=cache.d.ts.map