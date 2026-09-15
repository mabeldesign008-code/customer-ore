/** Live order membership for the comms thread (not a stale snapshot). */

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@ore/contracts';
import { JwtPayload, internalFetch, serviceUrl } from '@ore/core';
import { CommsOrderAccess, userRoles, viewerMayAccessOrder } from './comms.auth';
import { normalizeE164 } from './voice.auth';

@Injectable()
export class CommsAccessService {
  private readonly riderIdCache = new Map<string, { riderId: string; at: number }>();
  private readonly vendorIdsCache = new Map<string, { ids: string[]; at: number }>();
  private readonly phoneCache = new Map<string, { phone: string | null; at: number }>();

  async assertCanView(user: JwtPayload, orderId: string): Promise<CommsOrderAccess> {
    const order = await this.fetchOrder(orderId);
    if (!order) throw new NotFoundException('Order not found');
    const allowed = await this.canView(user, order);
    if (!allowed) throw new ForbiddenException('Not your order');
    return order;
  }

  async canView(user: JwtPayload, order: CommsOrderAccess): Promise<boolean> {
    const roles = userRoles(user);
    const riderId = roles.includes(Role.RIDER) ? await this.riderIdForUser(user.sub) : null;
    const vendorIds = roles.includes(Role.VENDOR) ? await this.vendorIdsForUser(user.sub) : [];
    return viewerMayAccessOrder(user, order, { riderId, vendorIds });
  }

  async fetchOrder(orderId: string): Promise<CommsOrderAccess | null> {
    try {
      const res = await internalFetch(`${serviceUrl('order')}/internal/orders/${orderId}`);
      if (!res.ok) return null;
      const body = (await res.json()) as {
        customerId?: string;
        vendorId?: string;
        riderId?: string | null;
      };
      if (typeof body.customerId !== 'string' || typeof body.vendorId !== 'string') return null;
      return {
        customerId: body.customerId,
        vendorId: body.vendorId,
        riderId: body.riderId ?? null,
      };
    } catch {
      return null;
    }
  }

  async riderIdForUser(userId: string): Promise<string | null> {
    const hit = this.riderIdCache.get(userId);
    if (hit && Date.now() - hit.at < 60_000) return hit.riderId;
    try {
      const res = await internalFetch(`${serviceUrl('dispatch')}/internal/riders/by-user/${userId}`);
      if (!res.ok) return null;
      const body = (await res.json()) as { id: string };
      this.riderIdCache.set(userId, { riderId: body.id, at: Date.now() });
      return body.id;
    } catch {
      return null;
    }
  }

  async userIdForRider(riderId: string): Promise<string | null> {
    try {
      const res = await internalFetch(`${serviceUrl('dispatch')}/internal/riders/${riderId}`);
      if (!res.ok) return null;
      const body = (await res.json()) as { userId?: string };
      return typeof body.userId === 'string' && body.userId.length > 0 ? body.userId : null;
    } catch {
      return null;
    }
  }

  async ownerUserIdForVendor(vendorId: string): Promise<string | null> {
    try {
      const res = await internalFetch(`${serviceUrl('catalog')}/internal/vendors/${vendorId}/owner`);
      if (!res.ok) return null;
      const body = (await res.json()) as { ownerUserId?: string };
      return typeof body.ownerUserId === 'string' && body.ownerUserId.length > 0 ? body.ownerUserId : null;
    } catch {
      return null;
    }
  }

  /**
   * A user's stored phone number, for the voice fallback handoff. Masking is not a
   * requirement here (owner decision 2026-09-11): when VoIP is not viable the caller's
   * app opens the native dialer with this number, so both sides see each other.
   * Cached briefly — a number changing mid-delivery is not a thing we need to race.
   */
  async phoneForUser(userId: string): Promise<string | null> {
    const hit = this.phoneCache.get(userId);
    if (hit && Date.now() - hit.at < 300_000) return hit.phone;
    try {
      const res = await internalFetch(`${serviceUrl('auth')}/auth/internal/users/${encodeURIComponent(userId)}`);
      if (!res.ok) return null;
      const body = (await res.json()) as { phone?: string };
      // Stored phones are country-code digits without '+'; clients need real E.164
      // for tel: handoffs (and TwiML would reject anything else).
      const phone = normalizeE164(typeof body.phone === 'string' ? body.phone : null);
      if (phone) this.phoneCache.set(userId, { phone, at: Date.now() });
      return phone;
    } catch {
      return null;
    }
  }

  async vendorIdsForUser(userId: string): Promise<string[]> {
    const hit = this.vendorIdsCache.get(userId);
    if (hit && Date.now() - hit.at < 60_000) return hit.ids;
    try {
      const res = await internalFetch(`${serviceUrl('catalog')}/internal/vendors?ownerId=${encodeURIComponent(userId)}`);
      if (!res.ok) return [];
      const rows = (await res.json()) as Array<{ id?: string }>;
      const ids = rows.map((row) => row.id).filter((id): id is string => typeof id === 'string' && id.length > 0);
      this.vendorIdsCache.set(userId, { ids, at: Date.now() });
      return ids;
    } catch {
      return [];
    }
  }
}
