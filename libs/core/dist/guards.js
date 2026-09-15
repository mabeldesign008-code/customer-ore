"use strict";
/** AuthGuard (JWT) + Roles + Public + Internal — one pattern across all services. */
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
var AuthGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentUser = exports.AuthGuard = exports.Internal = exports.Public = exports.Roles = exports.IS_INTERNAL_KEY = exports.IS_PUBLIC_KEY = exports.ROLES_KEY = exports.standing = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@ore/config");
const crypto_1 = require("crypto");
const ore_env_1 = require("./ore-env");
const internal_auth_1 = require("./internal-auth");
const jwt_1 = require("./jwt");
const standing_1 = require("./standing");
/**
 * Module-scope singleton. AuthGuard is instantiated by every service via APP_GUARD and
 * takes only Reflector + ORE_ENV, so injecting StandingService through the constructor
 * would mean touching eleven modules for one optional check. The cache is per-process,
 * which is what we want: each service decides for itself. OreCoreModule subscribes this
 * instance to `user.standing_changed` so a status change drops the entry everywhere at
 * once rather than waiting for the TTL.
 */
exports.standing = new standing_1.StandingService();
exports.ROLES_KEY = 'ore_roles';
exports.IS_PUBLIC_KEY = 'ore_is_public';
exports.IS_INTERNAL_KEY = 'ore_is_internal';
const Roles = (...roles) => (0, common_1.SetMetadata)(exports.ROLES_KEY, roles);
exports.Roles = Roles;
/** No token. Health, OTP, signed webhooks. */
const Public = () => (0, common_1.SetMetadata)(exports.IS_PUBLIC_KEY, true);
exports.Public = Public;
/** Service-to-service only. Never routed through the gateway. */
const Internal = () => (0, common_1.SetMetadata)(exports.IS_INTERNAL_KEY, true);
exports.Internal = Internal;
function keysEqual(provided, expected) {
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length)
        return false;
    return (0, crypto_1.timingSafeEqual)(a, b);
}
let AuthGuard = class AuthGuard {
    static { AuthGuard_1 = this; }
    reflector;
    env;
    static legacyLogger = new common_1.Logger('InternalAuth');
    /** One warning per caller service, not per request — enough to see who, not enough to drown the log. */
    static legacyWarned = new Set();
    static warnLegacyKey(service, url) {
        if (AuthGuard_1.legacyWarned.has(service))
            return;
        AuthGuard_1.legacyWarned.add(service);
        AuthGuard_1.legacyLogger.warn(`[deprecated] '${service}' authenticated with the plaintext internal key (first seen on ${url}). ` +
            'It should send x-ore-internal-mac. Set INTERNAL_LEGACY_KEY=off once no service does this.');
    }
    constructor(reflector, env) {
        this.reflector = reflector;
        this.env = env;
    }
    async canActivate(ctx) {
        const isPublic = this.reflector.getAllAndOverride(exports.IS_PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()]);
        if (isPublic)
            return true;
        const isInternal = this.reflector.getAllAndOverride(exports.IS_INTERNAL_KEY, [ctx.getHandler(), ctx.getClass()]);
        const req = ctx.switchToHttp().getRequest();
        if (isInternal) {
            const key = req.headers?.[config_1.INTERNAL_KEY_HEADER];
            const mac = req.headers?.[internal_auth_1.INTERNAL_MAC_HEADER];
            // Prefer the MAC (key never travels over the wire — audit F-SEC-1); fall back to
            // the legacy plaintext key for mixed-version rolling deploys.
            const macOk = !!mac && (0, internal_auth_1.verifyInternalMac)(this.env.internalServiceKey, req.method ?? 'GET', req.url ?? '', req.body, mac, req.headers?.[internal_auth_1.INTERNAL_TS_HEADER], req.headers?.[internal_auth_1.INTERNAL_SERVICE_HEADER]);
            const keyOk = this.env.internalLegacyKeyAccepted && !!key && keysEqual(key, this.env.internalServiceKey);
            if (!macOk && !keyOk) {
                throw new common_1.UnauthorizedException('Invalid internal service key');
            }
            if (keyOk && !macOk) {
                // Deliberately noisy, and deliberately not rate-limited away to nothing. The whole point
                // of the MAC scheme is that the shared key never travels; every line here is a caller
                // still putting it on the wire. Without this signal there is no way to know whether the
                // fallback is safe to switch off, so it never gets switched off.
                AuthGuard_1.warnLegacyKey(req.headers?.[internal_auth_1.INTERNAL_SERVICE_HEADER] ?? 'unknown', req.url ?? '');
            }
            // Optional per-service caller allowlist (INTERNAL_CALLERS=order,ledger,…):
            // even within the cluster, a service can restrict WHICH services may reach its
            // internal API.
            const allowlist = this.env.internalCallerAllowlist;
            if (allowlist.length) {
                // The x-ore-service header is only authenticated by the MAC — on the legacy
                // plaintext-key path it is attacker-chosen, so an attacker holding the key could
                // name any allowed service (audit S-3). A service that bothered to set an allowlist
                // is asking "who is calling?"; the legacy path cannot answer that, so it fails closed.
                if (!macOk) {
                    throw new common_1.UnauthorizedException('Internal caller allowlist requires MAC authentication (legacy key does not prove service identity)');
                }
                const service = req.headers?.[internal_auth_1.INTERNAL_SERVICE_HEADER];
                if (!service || !allowlist.includes(service)) {
                    throw new common_1.UnauthorizedException('Internal caller not allowed');
                }
            }
            return true;
        }
        const auth = req.headers?.['authorization'];
        if (!auth?.startsWith('Bearer '))
            throw new common_1.UnauthorizedException('Missing bearer token');
        try {
            req.user = (0, jwt_1.verifyToken)(this.env, auth.slice(7));
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid or expired token');
        }
        // Opt-in account-standing check (suspended/banned). Only on routes that create work or
        // move money, so a status lookup is not on the path of every read.
        const requireStanding = this.reflector.getAllAndOverride(standing_1.STANDING_KEY, [ctx.getHandler(), ctx.getClass()]);
        if (requireStanding && req.user?.sub) {
            await exports.standing.assert(req.user.sub);
        }
        const roles = this.reflector.getAllAndOverride(exports.ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
        if (roles?.length) {
            const userRoles = Array.isArray(req.user.roles) ? req.user.roles : [req.user.role];
            const hasMatch = roles.some((r) => userRoles.includes(r) || req.user.role === r);
            if (!hasMatch) {
                throw new common_1.ForbiddenException(`Requires role: ${roles.join('|')}`);
            }
        }
        return true;
    }
};
exports.AuthGuard = AuthGuard;
exports.AuthGuard = AuthGuard = AuthGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(ore_env_1.ORE_ENV)),
    __metadata("design:paramtypes", [core_1.Reflector, Object])
], AuthGuard);
exports.CurrentUser = (0, common_1.createParamDecorator)((_data, ctx) => {
    return ctx.switchToHttp().getRequest().user;
});
//# sourceMappingURL=guards.js.map