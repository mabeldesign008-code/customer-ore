"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisRateLimiter = exports.InMemoryRateLimiter = void 0;
exports.createRateLimiter = createRateLimiter;
const common_1 = require("@nestjs/common");
/**
 * Single-process fallback.
 *
 * Correct for one replica and for tests, and honest about what it is: with N replicas a limit of
 * 5 becomes 5N, because each process counts alone. That is why Redis exists in production.
 */
class InMemoryRateLimiter {
    windows = new Map();
    /**
     * Bounded because the key is a phone number: an attacker enumerating numbers would otherwise
     * grow this map without limit, turning a rate limiter into a memory-exhaustion vector.
     */
    static MAX_KEYS = 50_000;
    async hit(key, limit, windowMs) {
        const now = Date.now();
        const existing = this.windows.get(key);
        if (!existing || existing.resetAt <= now) {
            this.evictIfNeeded(now);
            const resetAt = now + windowMs;
            this.windows.set(key, { count: 1, resetAt });
            return { allowed: 1 <= limit, count: 1, resetAt: new Date(resetAt) };
        }
        existing.count += 1;
        return { allowed: existing.count <= limit, count: existing.count, resetAt: new Date(existing.resetAt) };
    }
    async reset(key) {
        this.windows.delete(key);
    }
    /**
     * Sweeps expired entries first, and only falls back to dropping live ones if that was not
     * enough. Never a wholesale `clear()`: that would hand every currently-limited attacker a
     * fresh budget at the exact moment the map is busiest, which is the moment an attack is
     * underway.
     */
    evictIfNeeded(now) {
        if (this.windows.size < InMemoryRateLimiter.MAX_KEYS)
            return;
        for (const [k, v] of this.windows) {
            if (v.resetAt <= now)
                this.windows.delete(k);
        }
        let overflow = this.windows.size - InMemoryRateLimiter.MAX_KEYS + 1;
        if (overflow <= 0)
            return;
        // Map iterates in insertion order, so this drops the oldest windows — the ones closest to
        // expiring anyway.
        for (const k of this.windows.keys()) {
            this.windows.delete(k);
            if (--overflow <= 0)
                break;
        }
    }
}
exports.InMemoryRateLimiter = InMemoryRateLimiter;
/**
 * Redis-backed fixed window: `INCR` then set the TTL on the first hit.
 *
 * `INCR` is the whole point — it is atomic, so concurrent requests across replicas cannot both
 * read "4" and both decide they are the fifth. A read-then-write limiter has exactly the race it
 * is deployed to prevent, and it fails open under the load that matters.
 */
class RedisRateLimiter {
    redis;
    fallback;
    logger = new common_1.Logger(RedisRateLimiter.name);
    constructor(redis, fallback = new InMemoryRateLimiter()) {
        this.redis = redis;
        this.fallback = fallback;
    }
    async hit(key, limit, windowMs) {
        const redisKey = `ore:rl:${key}`;
        try {
            const res = (await this.redis
                .multi()
                .incr(redisKey)
                .pttl(redisKey)
                .exec());
            if (!res)
                throw new Error('redis transaction aborted');
            const count = Number(res[0]?.[1] ?? 0);
            let ttl = Number(res[1]?.[1] ?? -1);
            // pttl returns -1 for a key with no expiry: either this is the first hit of the window, or
            // a previous pexpire was lost. Setting it either way means a key can never become
            // permanent, which would lock a phone number out forever.
            if (count === 1 || ttl < 0) {
                await this.redis.pexpire(redisKey, windowMs);
                ttl = windowMs;
            }
            return { allowed: count <= limit, count, resetAt: new Date(Date.now() + ttl) };
        }
        catch (err) {
            // Fail open, loudly. A Redis outage must not stop every user in the country from logging
            // in; the in-memory limiter still caps the damage per replica in the meantime.
            this.logger.error(`rate limiter degraded to in-memory for '${key}'`, err instanceof Error ? err.stack : err);
            return this.fallback.hit(key, limit, windowMs);
        }
    }
    async reset(key) {
        try {
            await this.redis.del(`ore:rl:${key}`);
        }
        catch {
            // A stale window expires on its own; failing the caller's request over it would be worse.
        }
        await this.fallback.reset(key);
    }
}
exports.RedisRateLimiter = RedisRateLimiter;
function createRateLimiter(redisUrl) {
    if (!redisUrl)
        return new InMemoryRateLimiter();
    try {
        // Required lazily so services without Redis configured never load the driver.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Redis = require('ioredis');
        return new RedisRateLimiter(new Redis(redisUrl));
    }
    catch (err) {
        new common_1.Logger('createRateLimiter').error('REDIS_URL is set but ioredis could not be loaded; rate limits are per-replica only', err instanceof Error ? err.stack : err);
        return new InMemoryRateLimiter();
    }
}
//# sourceMappingURL=rate-limiter.js.map