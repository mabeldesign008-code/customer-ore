/** Socket handshake + order membership helpers. Kept free of Nest so they can be unit-tested. */

import { JwtPayload } from '@ore/core';
import { Role } from '@ore/contracts';

export interface CommsOrderAccess {
  customerId: string;
  vendorId: string;
  riderId: string | null;
}

export interface CommsHandshake {
  auth?: Record<string, unknown>;
  headers?: Record<string, unknown>;
  query?: Record<string, unknown>;
}

export const COMMS_MESSAGE_MAX = 2000;

/**
 * Whether `?token=` in the handshake URL is honoured.
 *
 * A token in a query string is a token in places nobody audits: access logs, the Referer header,
 * reverse-proxy and CDN logs, browser history, error trackers. These are 30-day-lived JWTs, so a
 * single log export is a month of impersonation for every user in it. Header or `auth.token`
 * carries the same credential and appears in none of those places.
 *
 * It stays available outside production because it is the only way to authenticate a websocket
 * from a browser address bar or a plain `wscat`, which is worth keeping for local debugging.
 */
export function queryTokensAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV !== 'production';
}

/**
 * Same JWT the HTTP AuthGuard accepts: `auth.token`, Bearer header, or — outside production
 * only — `?token=`.
 */
export function extractSocketToken(handshake: CommsHandshake, allowQueryToken = queryTokensAllowed()): string | null {
  const authToken = handshake.auth?.['token'];
  if (typeof authToken === 'string' && authToken.trim()) return authToken.trim();

  const header = handshake.headers?.['authorization'] ?? handshake.headers?.['Authorization'];
  if (typeof header === 'string') {
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (match?.[1]?.trim()) return match[1].trim();
  }

  if (!allowQueryToken) return null;

  const queryToken = handshake.query?.['token'];
  if (typeof queryToken === 'string' && queryToken.trim()) return queryToken.trim();
  if (Array.isArray(queryToken) && typeof queryToken[0] === 'string' && queryToken[0].trim()) {
    return queryToken[0].trim();
  }
  return null;
}

export function userRoles(user: JwtPayload): Role[] {
  const roles = Array.isArray(user.roles) ? user.roles : [];
  return roles.length > 0 ? roles : [user.role];
}

/** Who may open or write the order thread. Rider id is the Dispatch profile id. */
export function viewerMayAccessOrder(
  user: JwtPayload,
  order: CommsOrderAccess,
  ctx: { riderId?: string | null; vendorIds?: string[] } = {},
): boolean {
  const roles = userRoles(user);
  if (roles.includes(Role.ADMIN)) return true;
  if (roles.includes(Role.CUSTOMER) && order.customerId === user.sub) return true;
  if (roles.includes(Role.RIDER) && ctx.riderId && order.riderId === ctx.riderId) return true;
  if (roles.includes(Role.VENDOR) && (ctx.vendorIds ?? []).includes(order.vendorId)) return true;
  return false;
}

/** JWT has no `support` Role — Ore Support staff sign in as admin. */
export function isSupportStaff(user: JwtPayload): boolean {
  return userRoles(user).includes(Role.ADMIN);
}

export function viewerMayAccessSupportThread(
  user: JwtPayload,
  thread: { ownerUserId: string | null },
): boolean {
  if (isSupportStaff(user)) return true;
  return !!thread.ownerUserId && thread.ownerUserId === user.sub;
}

/** Admin replies on a support thread are stored as role `support` (not a bot). */
export function supportSenderRole(user: JwtPayload, kind: 'order' | 'support'): string {
  if (kind === 'support' && isSupportStaff(user)) return 'support';
  return user.role;
}

export function normalizeMessageBody(raw: string | undefined): string | null {
  const body = raw?.trim() ?? '';
  if (body.length < 1 || body.length > COMMS_MESSAGE_MAX) return null;
  return body;
}
