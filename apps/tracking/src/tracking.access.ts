/** Resolves whether a JWT principal may see an order's live rider location. */

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@ore/contracts';
import { JwtPayload, internalFetch, serviceUrl } from '@ore/core';
import { TrackingOrderAccess, userRoles, viewerMayAccessOrder } from './tracking.auth';

@Injectable()
export class TrackingAccessService {
  private readonly riderIdCache = new Map<string, { riderId: string; at: number }>();
  private readonly vendorIdsCache = new Map<string, { ids: string[]; at: number }>();

  async assertCanView(user: JwtPayload, orderId: string): Promise<TrackingOrderAccess> {
    const order = await this.fetchOrder(orderId);
    if (!order) throw new NotFoundException('Order not found');
    const allowed = await this.canView(user, order);
    if (!allowed) throw new ForbiddenException('Not your order');
    return order;
  }

  async canView(user: JwtPayload, order: TrackingOrderAccess): Promise<boolean> {
    const roles = userRoles(user);
    const riderId = roles.includes(Role.RIDER) ? await this.riderIdForUser(user.sub) : null;
    const vendorIds = roles.includes(Role.VENDOR) ? await this.vendorIdsForUser(user.sub) : [];
    return viewerMayAccessOrder(user, order, { riderId, vendorIds });
  }

  async fetchOrder(orderId: string): Promise<TrackingOrderAccess | null> {
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

  private async vendorIdsForUser(userId: string): Promise<string[]> {
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
