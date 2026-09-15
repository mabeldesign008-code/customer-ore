"use strict";
/**
 * PermissionGuard — the authorisation door for every admin route.
 *
 * `AuthGuard` answers "who are you". This answers "may you do this".
 *
 *   Request
 *     → AuthGuard        (JWT → req.user)
 *     → PermissionGuard  (permission matrix → allow / deny, and log the decision)
 *     → controller
 *
 * DECISION ORDER
 *   1. `@Public()` / `@Internal()` route        → not our business, allow.
 *   2. `@RequirePermission('x.y.z')` present    → the caller must hold it, or 403.
 *   3. No permission declared but the route is admin-only (`@Roles(Role.ADMIN)` with
 *      no other role) and the caller IS an admin → **403**. This is the fail-closed
 *      half: an admin route somebody forgot to tag is denied, not open. A contract
 *      test walks the route tree so this fires in CI rather than in production.
 *   4. Anything else                            → defer to `@Roles` (AuthGuard).
 *
 * WHY PERMISSIONS AND NOT ROLES
 *   Roles are the label on the door; permissions are the intent. Every admin route
 *   used to carry `@Roles(Role.ADMIN)` and nothing else, which meant a support rep's
 *   token could approve withdrawals, pay vendor settlements and force order states.
 *
 * WHY THE ADMIN LOOKUP IS A NETWORK CALL
 *   `adminRole` rides in the JWT, but suspension must bite immediately — you cannot
 *   wait out a 24h access token to revoke a leaver. So status and per-admin
 *   grants/denies come from the auth service, cached for 15s. The static permission
 *   matrix is in `@ore/contracts` and shared with the console.
 *
 * AUTH SERVICE UNREACHABLE
 *   We degrade to the JWT's `adminRole` rather than locking every admin out because
 *   auth had a bad minute. Every route here already requires internal-key auth or a
 *   valid admin JWT, and every decision is written to `admin_action` with a
 *   `degraded` marker so the window is auditable after the fact.
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
var PermissionGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionGuard = exports.RemotePermissionAuditSink = exports.RequirePermission = exports.PERMISSIONS_KEY = exports.PERMISSION_AUDIT_SINK = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const contracts_1 = require("@ore/contracts");
const contracts_2 = require("@ore/contracts");
const http_1 = require("./http");
const guards_1 = require("./guards");
exports.PERMISSION_AUDIT_SINK = 'ORE_PERMISSION_AUDIT_SINK';
exports.PERMISSIONS_KEY = 'ore_permissions';
/** Declare the permission a route requires. Method-level overrides controller-level. */
const RequirePermission = (...permissions) => (0, common_1.SetMetadata)(exports.PERMISSIONS_KEY, permissions);
exports.RequirePermission = RequirePermission;
/**
 * Deliberately zero.
 *
 * A cached grant is a window in which a suspended or revoked admin still gets through —
 * up to the TTL, on every service, with no way to invalidate it from the auth service.
 * For a system that pays money out off ledger balances, that window is the risk we care
 * most about, and admin traffic is low enough that one internal lookup per request is
 * cheap. Revisit only with a push-based invalidation (event → guard.invalidate), never
 * with a longer TTL.
 */
const CACHE_TTL_MS = 0;
const CACHE_MAX = 2_000;
/**
 * Audit sink for services that do not own the `admin_action` table — which is all of them
 * except auth.
 *
 * This exists because the default sink was a no-op: a guard in notification or ledger enforced
 * the permission and then threw the decision away. Enforcement without a record is half a
 * control — "who approved this SMS to 40,000 people" had no answer for any route outside auth.
 *
 * Fire-and-forget on purpose. The audit write must never fail the request it describes, and it
 * must never slow it down, so the POST is not awaited by the caller. A dropped row is logged;
 * a blocked request would be worse.
 */
class RemotePermissionAuditSink {
    logger = new common_1.Logger('PermissionAudit');
    record(entry) {
        void (0, http_1.internalFetch)(`${(0, http_1.serviceUrl)('auth')}/auth/internal/admin-actions`, {
            method: 'POST',
            body: JSON.stringify(entry),
        })
            .then((res) => {
            if (!res.ok)
                this.logger.warn(`audit post rejected: ${res.status}`);
        })
            .catch((err) => this.logger.warn(`audit post failed: ${err.message}`));
    }
}
exports.RemotePermissionAuditSink = RemotePermissionAuditSink;
let PermissionGuard = PermissionGuard_1 = class PermissionGuard {
    reflector;
    audit;
    logger = new common_1.Logger(PermissionGuard_1.name);
    cache = new Map();
    constructor(reflector, audit = { record: () => undefined }) {
        this.reflector = reflector;
        this.audit = audit;
    }
    async canActivate(ctx) {
        const handler = ctx.getHandler();
        const target = ctx.getClass();
        if (this.reflector.getAllAndOverride(guards_1.IS_PUBLIC_KEY, [handler, target]))
            return true;
        if (this.reflector.getAllAndOverride(guards_1.IS_INTERNAL_KEY, [handler, target]))
            return true;
        const req = ctx.switchToHttp().getRequest();
        const user = req.user;
        if (!user)
            return true; // AuthGuard runs first and would already have thrown.
        const required = this.reflector.getAllAndOverride(exports.PERMISSIONS_KEY, [handler, target]);
        const roles = this.reflector.getAllAndOverride(guards_1.ROLES_KEY, [handler, target]) ?? [];
        const adminOnly = roles.length > 0 && roles.every((r) => r === contracts_2.Role.ADMIN);
        // Nothing to enforce for this caller on this route.
        if (!required?.length && !adminOnly)
            return true;
        // The matrix is for admins. Non-admin callers on mixed-role routes (@Roles(VENDOR,
        // ADMIN)) are scoped to their own resources in the service layer (a vendor can only
        // manage its own vendor); running them through adminAccess() would 403 every vendor
        // (they have no admin_user row) the moment a mixed route declares a permission —
        // which is why mixed routes had to stay untagged, and why the matrix was never
        // enforced on them (audit F-SEC-4).
        const callerRoles = Array.isArray(user.roles) ? user.roles : [user.role];
        if (!callerRoles.includes(contracts_2.Role.ADMIN))
            return true;
        const access = await this.adminAccess(user);
        const meta = this.routeMeta(ctx, req);
        // One gate for every admin-only route, before any permission logic: a suspended,
        // revoked or not-yet-enrolled admin holds nothing. Checked here as well as inside
        // holds() so the fail-closed branch below cannot let them through either.
        //
        // One exemption: `admin.audit.read_own` is "read your own access record". The console
        // calls it on load to learn who it is signed in as, and it is the only way the UI can
        // find out that the account is PENDING_ENROLMENT or SUSPENDED in order to say so. It
        // exposes nothing but the caller's own role, status and (already emptied) permission
        // list — AdminService.self() returns [] for any non-ACTIVE account.
        const selfInspectionOnly = required?.length === 1 && required[0] === 'admin.audit.read_own';
        if (access.status !== 'ACTIVE' && !selfInspectionOnly) {
            await this.record(access, user, required?.join('|') || 'admin', 'deny', `admin ${access.status}`, meta);
            throw new common_1.ForbiddenException(`Admin account is ${access.status.toLowerCase()}`);
        }
        if (required?.length) {
            const held = required.find((p) => this.holds(access, p));
            if (held) {
                await this.record(access, user, held, 'allow', 'permission held', meta);
                return true;
            }
            await this.record(access, user, required.join('|'), 'deny', 'permission not held', meta);
            throw new common_1.ForbiddenException(`Missing permission: ${required.join(' or ')}`);
        }
        // Admin-only route with no declared permission: fail closed.
        await this.record(access, user, null, 'deny', 'admin route without @RequirePermission', meta);
        this.logger.warn(`unguarded admin route ${meta.method} ${meta.path} — denying until it declares a permission`);
        throw new common_1.ForbiddenException('This admin endpoint has no permission declared');
    }
    /* ─────────────────────────── helpers ─────────────────────────── */
    holds(access, permission) {
        if (access.denials.includes(permission))
            return false;
        if (access.grants.includes(permission))
            return true;
        // "Read your own access record" is held in every state, including PENDING_ENROLMENT
        // and SUSPENDED. It is the only way the console can learn which of those it is in and
        // say so, and AdminService.self() already returns status truthfully with an empty
        // permission list — so this reveals nothing but the caller's own situation.
        if (permission === 'admin.audit.read_own')
            return true;
        // Only a fully ACTIVE admin holds anything else. SUSPENDED and REVOKED are obvious,
        // but PENDING_ENROLMENT must fail too — a per-admin grant given to an admin who has
        // not finished enrolment must not start working before they have.
        if (access.status !== 'ACTIVE')
            return false;
        if (access.adminRole === 'super_admin') {
            // Super holds everything the matrix grants to super_admin. `marketing.pii.export`
            // is denied to every role including super, and must stay denied.
            return (0, contracts_1.roleHasPermission)('super_admin', permission);
        }
        if (!access.adminRole || !contracts_1.ADMIN_ROLE_ORDER.includes(access.adminRole))
            return false;
        return (0, contracts_1.roleHasPermission)(access.adminRole, permission);
    }
    async adminAccess(user) {
        const cached = this.cache.get(user.sub);
        if (cached && Date.now() - cached.at < CACHE_TTL_MS)
            return cached.access;
        let access = {
            adminRole: user.adminRole ?? null,
            status: 'ACTIVE',
            grants: [],
            denials: [],
            degraded: true,
        };
        try {
            const res = await (0, http_1.internalFetch)(`${(0, http_1.serviceUrl)('auth')}/auth/internal/admins/${user.sub}`);
            if (res.ok) {
                const body = (await res.json());
                if (body?.found) {
                    access = {
                        adminRole: body.adminRole ?? user.adminRole ?? null,
                        status: body.status ?? 'ACTIVE',
                        grants: Array.isArray(body.grants) ? body.grants : [],
                        denials: Array.isArray(body.denials) ? body.denials : [],
                        degraded: false,
                    };
                }
                else {
                    // A role=ADMIN token with no admin_user row: not provisioned. Deny.
                    access = { adminRole: null, status: 'NOT_PROVISIONED', grants: [], denials: [], degraded: false };
                }
            }
        }
        catch {
            // Degrade to the JWT rather than lock every admin out during an auth blip.
            this.logger.warn(`auth unreachable — using JWT adminRole for ${user.sub} (degraded)`);
        }
        this.evictIfFull();
        this.cache.set(user.sub, { at: Date.now(), access });
        return access;
    }
    /** Drop the cached access for a user — call after suspend / role change / grant change. */
    invalidate(userId) {
        this.cache.delete(userId);
    }
    /**
     * Make room by dropping expired entries first, then the oldest.
     *
     * This was a wholesale `clear()`. Nothing unsafe followed from it — a cache miss re-fetches
     * the truth — but it meant that the instant the cache filled, every admin in the system was
     * evicted at once and the next request from each of them hit the auth service. A stampede
     * against auth, triggered by being busy, at the moment of being busy.
     */
    evictIfFull() {
        if (this.cache.size < CACHE_MAX)
            return;
        const now = Date.now();
        for (const [k, v] of this.cache) {
            if (now - v.at >= CACHE_TTL_MS)
                this.cache.delete(k);
        }
        let overflow = this.cache.size - CACHE_MAX + 1;
        // Map iterates in insertion order, so this drops the oldest — the entries closest to
        // expiring anyway.
        for (const k of this.cache.keys()) {
            if (overflow-- <= 0)
                break;
            this.cache.delete(k);
        }
    }
    routeMeta(ctx, req) {
        const service = (ctx.getClass().constructor.name || 'unknown').replace(/Controller$/, '').toLowerCase();
        return {
            service,
            method: req.method ?? 'GET',
            path: (req.url ?? '').split('?')[0],
            ip: req.ip ?? null,
        };
    }
    async record(access, user, permission, decision, reason, meta) {
        // Recording every allow would flood the log; denials are the interesting half and
        // every permission-holding allow on a money route is audited by the service layer.
        if (decision === 'allow' && !permission)
            return;
        try {
            await this.audit.record({
                actorUserId: user.sub,
                actorAdminRole: access.adminRole,
                permission,
                decision,
                reason,
                degraded: access.degraded,
                ...meta,
            });
        }
        catch (err) {
            this.logger.error(`audit sink failed: ${err.message}`);
        }
    }
};
exports.PermissionGuard = PermissionGuard;
exports.PermissionGuard = PermissionGuard = PermissionGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Optional)()),
    __param(1, (0, common_1.Inject)(exports.PERMISSION_AUDIT_SINK)),
    __metadata("design:paramtypes", [core_1.Reflector, Object])
], PermissionGuard);
//# sourceMappingURL=permission.guard.js.map