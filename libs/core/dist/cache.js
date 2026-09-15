"use strict";
/** Redis cache (cache-aside with TTL jitter) shared by all services.
 *  Gracefully degrades to a no-op in-memory map when Redis is unreachable so a
 *  cache outage can never take a service down. */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ORE_CACHE_TOKEN = exports.RedisCacheService = void 0;
exports.cacheProvider = cacheProvider;
const common_1 = require("@nestjs/common");
const ioredis_1 = __importDefault(require("ioredis"));
const config_1 = require("@ore/config");
const CACHE_PREFIX = 'ore:cache:';
const JITTER_MAX_MS = 5_000;
let RedisCacheService = class RedisCacheService {
    redis;
    fallback = new Map();
    constructor(redisUrl) {
        if (!redisUrl) {
            this.redis = null;
            return;
        }
        try {
            this.redis = new ioredis_1.default(redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true, enableOfflineQueue: false });
            this.redis.on('error', () => {
                // Handled silently - fallback will be used
            });
            this.redis.connect().catch((err) => {
                console.warn('[cache] redis unavailable, using in-process fallback', err.message);
                this.redis?.disconnect();
            });
        }
        catch {
            this.redis = null;
        }
    }
    jitter(baseTtl) {
        return baseTtl + Math.floor(Math.random() * JITTER_MAX_MS / 1000);
    }
    async get(key) {
        const full = CACHE_PREFIX + key;
        if (this.redis?.status === 'ready') {
            const raw = await this.redis.get(full);
            if (raw == null)
                return null;
            try {
                return JSON.parse(raw);
            }
            catch {
                return raw;
            }
        }
        const hit = this.fallback.get(full);
        if (hit && hit.expires > Date.now())
            return hit.value;
        if (hit)
            this.fallback.delete(full);
        return null;
    }
    async set(key, value, ttlSeconds) {
        const full = CACHE_PREFIX + key;
        const raw = typeof value === 'string' ? value : JSON.stringify(value);
        if (this.redis?.status === 'ready') {
            await this.redis.set(full, raw, 'EX', this.jitter(ttlSeconds));
            return;
        }
        this.fallback.set(full, { value, expires: Date.now() + ttlSeconds * 1000 });
    }
    async del(key) {
        const full = CACHE_PREFIX + key;
        if (this.redis?.status === 'ready') {
            await this.redis.del(full);
            return;
        }
        this.fallback.delete(full);
    }
    async delPrefix(prefix) {
        if (this.redis?.status === 'ready') {
            const keys = await this.redis.keys(CACHE_PREFIX + prefix + '*');
            if (keys.length)
                await this.redis.del(...keys);
            return;
        }
        for (const k of [...this.fallback.keys()]) {
            if (k.startsWith(CACHE_PREFIX + prefix))
                this.fallback.delete(k);
        }
    }
};
exports.RedisCacheService = RedisCacheService;
exports.RedisCacheService = RedisCacheService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [String])
], RedisCacheService);
function cacheProvider(env = process.env) {
    const ore = (0, config_1.loadEnv)(env);
    return {
        provide: exports.ORE_CACHE_TOKEN,
        useFactory: () => new RedisCacheService(ore.redisUrl),
    };
}
exports.ORE_CACHE_TOKEN = 'ORE_CACHE';
//# sourceMappingURL=cache.js.map