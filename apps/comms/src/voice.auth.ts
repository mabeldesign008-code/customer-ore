/** Voice identity + who may dial whom. Kept free of Nest for unit tests. */

import { Role } from '@ore/contracts';
import { JwtPayload } from '@ore/core';
import { CommsOrderAccess, userRoles } from './comms.auth';

export type VoiceCallTarget = 'customer' | 'rider' | 'vendor';

export function voiceClientIdentity(userId: string): string {
  return `ore_${userId.trim()}`;
}

export function parseVoiceClientIdentity(raw: string | undefined): string | null {
  if (!raw) return null;
  const value = raw.replace(/^client:/i, '').trim();
  if (!value.startsWith('ore_')) return null;
  const userId = value.slice(4);
  return userId.length > 0 ? userId : null;
}

export function isSyntheticVendor(vendorId: string): boolean {
  return vendorId === 'PARCEL' || vendorId === 'ERRAND';
}

/**
 * Best-effort E.164 for phone numbers we hand to `tel:` links and TwiML `<Number>`.
 * Stored user phones arrive as country-code digits without the '+' (the OTP flow
 * normalizes that way); TwiML and reliable international dialing need the '+'.
 * Returns null for anything not plausibly E.164 — an honest "no fallback" beats
 * dialing garbage.
 */
export function normalizeE164(raw: string | null | undefined): string | null {
  const v = (raw ?? '').trim();
  if (/^\+[1-9]\d{7,14}$/.test(v)) return v;
  if (/^[1-9]\d{7,14}$/.test(v)) return `+${v}`;
  return null;
}

export function callerMayDial(
  user: JwtPayload,
  order: CommsOrderAccess,
  target: VoiceCallTarget,
  ctx: { riderId?: string | null; vendorIds?: string[]; targetUserId?: string | null } = {},
): boolean {
  const roles = userRoles(user);
  const isMember =
    roles.includes(Role.ADMIN) ||
    (roles.includes(Role.CUSTOMER) && order.customerId === user.sub) ||
    (roles.includes(Role.RIDER) && !!ctx.riderId && order.riderId === ctx.riderId) ||
    (roles.includes(Role.VENDOR) && (ctx.vendorIds ?? []).includes(order.vendorId));
  if (!isMember) return false;
  if (!ctx.targetUserId) return false;
  if (ctx.targetUserId === user.sub && !roles.includes(Role.ADMIN)) return false;
  if (target === 'customer') return ctx.targetUserId === order.customerId;
  if (target === 'rider') return !!order.riderId;
  if (target === 'vendor') return !isSyntheticVendor(order.vendorId);
  return false;
}
