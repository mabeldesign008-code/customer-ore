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
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
export declare const PERMISSION_AUDIT_SINK = "ORE_PERMISSION_AUDIT_SINK";
export declare const PERMISSIONS_KEY = "ore_permissions";
/** Declare the permission a route requires. Method-level overrides controller-level. */
export declare const RequirePermission: (...permissions: string[]) => import("@nestjs/common").CustomDecorator<string>;
export interface AdminAccess {
    adminRole: string | null;
    status: string;
    /** Extra permissions granted on top of the role. */
    grants: string[];
    /** Permissions taken away from the role. */
    denials: string[];
    degraded: boolean;
}
/** Sink for audit rows. The auth service injects a writer; elsewhere it stays a no-op. */
export interface PermissionAuditSink {
    record(entry: {
        actorUserId: string | null;
        actorAdminRole: string | null;
        permission: string | null;
        decision: 'allow' | 'deny';
        reason: string;
        service: string;
        method: string;
        path: string;
        ip: string | null;
        degraded: boolean;
    }): Promise<void> | void;
}
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
export declare class RemotePermissionAuditSink implements PermissionAuditSink {
    private readonly logger;
    record(entry: Parameters<PermissionAuditSink['record']>[0]): void;
}
export declare class PermissionGuard implements CanActivate {
    private readonly reflector;
    private readonly audit;
    private readonly logger;
    private readonly cache;
    constructor(reflector: Reflector, audit?: PermissionAuditSink);
    canActivate(ctx: ExecutionContext): Promise<boolean>;
    private holds;
    private adminAccess;
    /** Drop the cached access for a user — call after suspend / role change / grant change. */
    invalidate(userId: string): void;
    /**
     * Make room by dropping expired entries first, then the oldest.
     *
     * This was a wholesale `clear()`. Nothing unsafe followed from it — a cache miss re-fetches
     * the truth — but it meant that the instant the cache filled, every admin in the system was
     * evicted at once and the next request from each of them hit the auth service. A stampede
     * against auth, triggered by being busy, at the moment of being busy.
     */
    private evictIfFull;
    private routeMeta;
    private record;
}
//# sourceMappingURL=permission.guard.d.ts.map