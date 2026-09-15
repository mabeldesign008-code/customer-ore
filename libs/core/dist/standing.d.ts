/**
 * Account standing: is this user still allowed to transact?
 *
 * WHY THIS IS NOT IN THE JWT
 * A JWT is valid until it expires, so putting `status` in it means a suspension takes up to
 * the token lifetime to bite. Suspending a customer mid-fraud and having them keep ordering
 * for another fifteen minutes is the exact failure this exists to prevent.
 *
 * WHY IT FAILS CLOSED
 * The lookup is cached, but on a cache miss with the auth service unreachable this REFUSES
 * the request. That is a deliberate availability trade: a short outage during which orders
 * cannot be placed is recoverable, a suspension that silently stopped working is not.
 *
 * Fail-open would be the wrong default here specifically because the whole point of the
 * feature is that it must not be bypassable — and "the check was unavailable" is the easiest
 * bypass of all.
 *
 * WHY ONLY `ACTIVE` IS CACHED
 * This service runs in the order/payment process while the status lives in auth, so a cache
 * here is a window during which a suspension does not bite. Caching only the permissive
 * answer makes that window one-directional: a suspension is picked up on the very next
 * request, and the only thing that can be stale is a reinstatement — the safe direction.
 * `USER_STANDING_CHANGED` closes the rest by dropping the entry everywhere the moment an
 * admin acts, so in practice neither direction waits for anything.
 */
import type { Bus } from '@ore/bus';
export declare const STANDING_KEY = "ore_require_standing";
/** Opt a route into the standing check. Applied to customer-facing actions that move money
 * or create work: placing an order, paying, requesting a refund. */
export declare const RequireStanding: () => import("@nestjs/common").CustomDecorator<string>;
export interface Standing {
    status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
    suspendedUntil: string | null;
    suspensionReason: string | null;
    tokenEpoch: number;
    /** A compliance hold with scope ORDER or ALL is active. Optional so a pre-hold auth service
     *  answering without it cannot be read as "no hold" by an old client — `=== true` only. */
    orderBlocked?: boolean;
    orderBlockReason?: string | null;
}
export declare class StandingService {
    private readonly logger;
    private readonly cache;
    private subscribed;
    /**
     * Subscribe to standing changes so a suspension invalidates every process at once.
     * Called once by OreCoreModule, which is the only place that owns the bus.
     */
    watch(bus: Bus): Promise<void>;
    /** Read standing. Throws (fails closed) if it cannot be determined. */
    forUser(userId: string): Promise<Standing>;
    /** Drop a user from the cache so the next check re-reads. Call after a status change. */
    invalidate(userId?: string | null): void;
    /**
     * Assert the user may act. Throws 403 with a message the customer can act on.
     *
     * A suspended account with an end date is told when it returns; a banned one is told to
     * contact support. Vague refusals generate support tickets, which is the opposite of what
     * suspending someone is for.
     */
    assert(userId: string): Promise<void>;
}
//# sourceMappingURL=standing.d.ts.map