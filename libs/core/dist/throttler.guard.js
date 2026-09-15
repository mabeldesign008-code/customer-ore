"use strict";
/**
 * Throttler guard with an internal-traffic exemption (audit F-BUG-8).
 *
 * The stock @nestjs/throttler guard keys every request by source IP with a shared
 * 100 req/min budget. All inter-service HTTP originates from the same host in a
 * deployment, so the internal APIs of every service shared ONE bucket. Requests
 * carrying the valid internal service key are already authenticated by the shared
 * service-to-service guard and are exempt from this client rate limit.
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OreThrottlerGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const throttler_1 = require("@nestjs/throttler");
const crypto_1 = require("crypto");
const internal_auth_1 = require("./internal-auth");
const config_1 = require("@ore/config");
const ore_env_1 = require("./ore-env");
function keyMatches(provided, expected) {
    if (!provided || !expected)
        return false;
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length)
        return false;
    return (0, crypto_1.timingSafeEqual)(a, b);
}
let OreThrottlerGuard = class OreThrottlerGuard extends throttler_1.ThrottlerGuard {
    env;
    constructor(options, storageService, reflector, env) {
        super(options, storageService, reflector);
        this.env = env;
    }
    /**
     * Service-to-service traffic bypasses the rate limit.
     *
     * The exemption originally recognised only the legacy plaintext key. Once `internalFetch`
     * moved to per-request MACs (audit F-SEC-1) that was a countdown: the day `INTERNAL_LEGACY_KEY`
     * is finally turned off, every internal call stops being exempt and starts sharing one bucket
     * — and because services sit behind one egress IP, the first busy service would 429 all the
     * others. A security cleanup would have read as a platform-wide outage.
     *
     * Both credentials are accepted here for exactly as long as `AuthGuard` accepts both.
     */
    async canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const mac = req.headers?.[internal_auth_1.INTERNAL_MAC_HEADER];
        if (mac &&
            (0, internal_auth_1.verifyInternalMac)(this.env.internalServiceKey, req.method ?? 'GET', req.url ?? '', req.body, mac, req.headers?.[internal_auth_1.INTERNAL_TS_HEADER], req.headers?.[internal_auth_1.INTERNAL_SERVICE_HEADER])) {
            return true;
        }
        const provided = req.headers?.[config_1.INTERNAL_KEY_HEADER];
        if (typeof provided === 'string' && keyMatches(provided, this.env.internalServiceKey)) {
            return true;
        }
        return super.canActivate(context);
    }
};
exports.OreThrottlerGuard = OreThrottlerGuard;
exports.OreThrottlerGuard = OreThrottlerGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)((0, throttler_1.getOptionsToken)())),
    __param(1, (0, common_1.Inject)((0, throttler_1.getStorageToken)())),
    __param(3, (0, common_1.Inject)(ore_env_1.ORE_ENV)),
    __metadata("design:paramtypes", [Object, Object, core_1.Reflector, Object])
], OreThrottlerGuard);
//# sourceMappingURL=throttler.guard.js.map