/** Socket.IO handshake helpers. Kept free of Nest so they can be unit-tested. */

import { JwtPayload } from '@ore/core';
import { Role } from '@ore/contracts';

export interface TrackingOrderAccess {
  customerId: string;
  vendorId: string;
  riderId: string | null;
}

export interface TrackingHandshake {
  auth?: Record<string, unknown>;
  headers?: Record<string, unknown>;
  query?: Record<string, unknown>;
}

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
export function extractSocketToken(handshake: TrackingHandshake, allowQueryToken = queryTokensAllowed()): string | null {
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

/**
 * Who may join `order:{id}` (and who may GET the HTTP rider position).
 * Rider id is the Dispatch profile id, not the JWT `sub`.
 */
export function viewerMayAccessOrder(
  user: JwtPayload,
  order: TrackingOrderAccess,
  ctx: { riderId?: string | null; vendorIds?: string[] } = {},
): boolean {
  const roles = userRoles(user);
  if (roles.includes(Role.ADMIN)) return true;
  if (roles.includes(Role.CUSTOMER) && order.customerId === user.sub) return true;
  if (roles.includes(Role.RIDER) && ctx.riderId && order.riderId === ctx.riderId) return true;
  if (roles.includes(Role.VENDOR) && (ctx.vendorIds ?? []).includes(order.vendorId)) return true;
  return false;
}
