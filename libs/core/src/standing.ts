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

import { ForbiddenException, Injectable, Logger, SetMetadata } from '@nestjs/common';
import { internalFetch } from './http';
import { serviceUrl } from '@ore/config';
import { EVENTS } from '@ore/contracts';
import type { Bus } from '@ore/bus';

export const STANDING_KEY = 'ore_require_standing';

/** Opt a route into the standing check. Applied to customer-facing actions that move money
 * or create work: placing an order, paying, requesting a refund. */
export const RequireStanding = () => SetMetadata(STANDING_KEY, true);

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

/**
 * Backstop only. The event is what makes a change immediate; this bounds how long a
 * *missed* event can leave a reinstated customer refused.
 */
const CACHE_TTL_MS = 5_000;
const FETCH_TIMEOUT_MS = 4_000;

@Injectable()
export class StandingService {
  private readonly logger = new Logger(StandingService.name);
  private readonly cache = new Map<string, { at: number; standing: Standing }>();
  private subscribed = false;

  /**
   * Subscribe to standing changes so a suspension invalidates every process at once.
   * Called once by OreCoreModule, which is the only place that owns the bus.
   */
  async watch(bus: Bus): Promise<void> {
    if (this.subscribed) return;
    this.subscribed = true;
    try {
      await bus.subscribe<{ userId: string; status: Standing['status']; tokenEpoch: number }>(
        EVENTS.USER_STANDING_CHANGED,
        (env) => {
          this.invalidate(env.payload?.userId);
        },
      );
    } catch (err) {
      // Not fatal: the TTL still bounds staleness, and failing to subscribe must not stop
      // the service from booting.
      this.subscribed = false;
      this.logger.error(`Could not subscribe to standing changes: ${(err as Error).message}`);
    }
  }

  /** Read standing. Throws (fails closed) if it cannot be determined. */
  async forUser(userId: string): Promise<Standing> {
    if (!userId) throw new ForbiddenException('Cannot verify account standing without a user');
    const hit = this.cache.get(userId);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.standing;

    let res: Response;
    try {
      res = await internalFetch(
        `${serviceUrl('auth')}/auth/internal/users/${encodeURIComponent(userId)}/standing`,
        { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) } as RequestInit,
      );
    } catch (err) {
      this.logger.error(`Standing lookup failed for ${userId}: ${(err as Error).message}`);
      throw new ForbiddenException(
        'We could not verify your account status right now. Please try again in a moment.',
      );
    }
    if (!res.ok) {
      // A 404 means no such user — that is a hard no, not a retry.
      throw new ForbiddenException(
        res.status === 404 ? 'Account not found' : 'We could not verify your account status right now.',
      );
    }
    const standing = (await res.json()) as Standing;
    // Only the permissive answer is worth caching; see the note at the top of this file.
    if (standing.status === 'ACTIVE') this.cache.set(userId, { at: Date.now(), standing });
    return standing;
  }

  /** Drop a user from the cache so the next check re-reads. Call after a status change. */
  invalidate(userId?: string | null): void {
    if (!userId) return;
    this.cache.delete(userId);
  }

  /**
   * Assert the user may act. Throws 403 with a message the customer can act on.
   *
   * A suspended account with an end date is told when it returns; a banned one is told to
   * contact support. Vague refusals generate support tickets, which is the opposite of what
   * suspending someone is for.
   */
  async assert(userId: string): Promise<void> {
    const standing = await this.forUser(userId);
    if (standing.status === 'ACTIVE') {
      // A compliance hold is narrower than a suspension — the account still works, this one
      // action does not — but it is enforced on the same path so there is a single answer to
      // "may this user transact". Only `=== true` blocks: an auth service that predates holds
      // omits the field, and absence must not be read as a refusal.
      if (standing.orderBlocked === true) {
        throw new ForbiddenException(
          `This action is on hold: ${standing.orderBlockReason ?? 'please contact support'}`.trim(),
        );
      }
      // An expired suspension self-clears: the auth service flips it, but a cached ACTIVE
      // would be wrong the other way round, so treat a past `suspendedUntil` as active.
      return;
    }
    if (standing.status === 'SUSPENDED') {
      const until = standing.suspendedUntil ? new Date(standing.suspendedUntil) : null;
      if (until && until.getTime() < Date.now()) {
        this.invalidate(userId);
        return;
      }
      throw new ForbiddenException(
        until
          ? `Your account is suspended until ${until.toISOString()}. ${standing.suspensionReason ?? ''}`.trim()
          : `Your account is suspended. ${standing.suspensionReason ?? 'Please contact support.'}`.trim(),
      );
    }
    throw new ForbiddenException(
      `Your account has been closed. ${standing.suspensionReason ?? 'Please contact support.'}`.trim(),
    );
  }
}
