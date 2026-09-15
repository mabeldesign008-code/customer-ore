/**
 * Fixed-window rate limiting shared across replicas.
 *
 * Distinct from `OreThrottlerGuard`, which limits *requests per client* at the HTTP edge. This
 * limits a business action against a business key — OTP sends per phone number — which the edge
 * cannot express: an attacker rotating source IPs stays under the HTTP throttle while hammering
 * one phone, and one victim's phone being flooded is the thing that actually costs money and
 * burns the user's trust in the SMS.
 *
 * Follows the same optional-Redis convention as the throttler: Redis when REDIS_URL is set, an
 * in-process window otherwise, chosen at wiring time so callers never branch on it.
 */
export interface RateLimitDecision {
    allowed: boolean;
    /** Hits recorded in the current window, including this one. */
    count: number;
    /** When the current window expires, so callers can tell the user when to try again. */
    resetAt: Date;
}
export interface RateLimiter {
    /** Record one hit against `key` and report whether it is within `limit` for `windowMs`. */
    hit(key: string, limit: number, windowMs: number): Promise<RateLimitDecision>;
    /** Drop a key's window — used after a successful verify, so a legitimate user is not punished. */
    reset(key: string): Promise<void>;
}
/**
 * Single-process fallback.
 *
 * Correct for one replica and for tests, and honest about what it is: with N replicas a limit of
 * 5 becomes 5N, because each process counts alone. That is why Redis exists in production.
 */
export declare class InMemoryRateLimiter implements RateLimiter {
    private readonly windows;
    /**
     * Bounded because the key is a phone number: an attacker enumerating numbers would otherwise
     * grow this map without limit, turning a rate limiter into a memory-exhaustion vector.
     */
    private static readonly MAX_KEYS;
    hit(key: string, limit: number, windowMs: number): Promise<RateLimitDecision>;
    reset(key: string): Promise<void>;
    /**
     * Sweeps expired entries first, and only falls back to dropping live ones if that was not
     * enough. Never a wholesale `clear()`: that would hand every currently-limited attacker a
     * fresh budget at the exact moment the map is busiest, which is the moment an attack is
     * underway.
     */
    private evictIfNeeded;
}
interface RedisLike {
    multi(): {
        incr(key: string): {
            pttl(key: string): {
                exec(): Promise<unknown>;
            };
        };
    };
    pexpire(key: string, ms: number): Promise<unknown>;
    del(key: string): Promise<unknown>;
}
/**
 * Redis-backed fixed window: `INCR` then set the TTL on the first hit.
 *
 * `INCR` is the whole point — it is atomic, so concurrent requests across replicas cannot both
 * read "4" and both decide they are the fifth. A read-then-write limiter has exactly the race it
 * is deployed to prevent, and it fails open under the load that matters.
 */
export declare class RedisRateLimiter implements RateLimiter {
    private readonly redis;
    private readonly fallback;
    private readonly logger;
    constructor(redis: RedisLike, fallback?: RateLimiter);
    hit(key: string, limit: number, windowMs: number): Promise<RateLimitDecision>;
    reset(key: string): Promise<void>;
}
export declare function createRateLimiter(redisUrl?: string): RateLimiter;
export {};
//# sourceMappingURL=rate-limiter.d.ts.map