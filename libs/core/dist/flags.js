"use strict";
/** Feature flags — Redis KV (`ore:flag:<name>`) with an in-process fallback.
 *  Exposed by the gateway at GET/PUT /flags (admin-guarded). Flags let ops flip
 *  behaviors (e.g. catalog caching) without a deploy. */
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
exports.ORE_FLAGS_TOKEN = exports.RedisFlagsService = void 0;
exports.flagsProvider = flagsProvider;
const common_1 = require("@nestjs/common");
const ioredis_1 = __importDefault(require("ioredis"));
const config_1 = require("@ore/config");
const FLAG_PREFIX = 'ore:flag:';
let RedisFlagsService = class RedisFlagsService {
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
                console.warn('[flags] redis unavailable, using in-process fallback', err.message);
                this.redis?.disconnect();
            });
        }
        catch {
            this.redis = null;
        }
    }
    parse(raw) {
        try {
            const v = JSON.parse(raw);
            if (v && typeof v.value !== 'undefined')
                return v;
        }
        catch {
            // stored as plain string
        }
        return { value: raw, updatedAt: new Date().toISOString() };
    }
    async get(name) {
        const full = FLAG_PREFIX + name;
        if (this.redis?.status === 'ready') {
            const raw = await this.redis.get(full);
            return raw == null ? null : this.parse(raw);
        }
        return this.fallback.get(full) ?? null;
    }
    async set(name, value) {
        const full = FLAG_PREFIX + name;
        const record = { value, updatedAt: new Date().toISOString() };
        if (this.redis?.status === 'ready') {
            await this.redis.set(full, JSON.stringify(record));
            return;
        }
        this.fallback.set(full, record);
    }
    async all() {
        if (this.redis?.status === 'ready') {
            const keys = await this.redis.keys(FLAG_PREFIX + '*');
            const out = {};
            for (const k of keys) {
                const raw = await this.redis.get(k);
                if (raw != null)
                    out[k.slice(FLAG_PREFIX.length)] = this.parse(raw);
            }
            return out;
        }
        const out = {};
        for (const [k, v] of this.fallback)
            out[k.slice(FLAG_PREFIX.length)] = v;
        return out;
    }
};
exports.RedisFlagsService = RedisFlagsService;
exports.RedisFlagsService = RedisFlagsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [String])
], RedisFlagsService);
function flagsProvider(env = process.env) {
    const ore = (0, config_1.loadEnv)(env);
    return {
        provide: exports.ORE_FLAGS_TOKEN,
        useFactory: () => new RedisFlagsService(ore.redisUrl),
    };
}
exports.ORE_FLAGS_TOKEN = 'ORE_FLAGS';
//# sourceMappingURL=flags.js.map