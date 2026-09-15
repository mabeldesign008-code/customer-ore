/**
 * Read-only data access for the support AI, over the existing internal service APIs.
 *
 * TWO RULES GOVERN THIS FILE
 *
 * 1. READ ONLY. Every method is a GET against an `/internal/...` endpoint using
 *    `internalFetch`. There is no POST/PUT/PATCH/DELETE anywhere in this file and no
 *    repository is injected. If a future change needs to write, it does not belong here.
 *
 * 2. SCOPED TO THE CALLER. The AI must never be able to read another customer's data by
 *    guessing an id. `orderForUser` resolves the order and then verifies
 *    `customerId === userId` before returning anything; a mismatch returns null, which
 *    the model sees as "not found" rather than a permission error it might try to route
 *    around. The same scoping applies to every lookup below.
 */

import { Injectable, Logger } from '@nestjs/common';
import { internalFetch, serviceUrl } from '@ore/core';
import { SupportLookups } from './ai.tools';

interface RawOrder {
  id?: string;
  ref?: string;
  customerId?: string;
  vendorId?: string;
  riderId?: string | null;
  [key: string]: unknown;
}

@Injectable()
export class SupportToolService implements SupportLookups {
  private readonly logger = new Logger(SupportToolService.name);

  async ordersForUser(userId: string): Promise<unknown[]> {
    const rows = await this.getJson<unknown[]>(
      `${serviceUrl('order')}/internal/orders?customerId=${encodeURIComponent(userId)}&limit=10`,
    );
    return Array.isArray(rows) ? rows : [];
  }

  /** Resolve an order by id or ref and PROVE it belongs to this user. */
  async orderForUser(userId: string, orderRef: string): Promise<RawOrder | null> {
    const ref = typeof orderRef === 'string' ? orderRef.trim() : '';
    if (!ref) return null;

    // Try a direct lookup first (ids and refs both resolve on this endpoint).
    const direct = await this.getJson<RawOrder>(`${serviceUrl('order')}/internal/orders/${encodeURIComponent(ref)}`);
    if (direct && typeof direct === 'object') {
      return this.ownedBy(direct, userId);
    }

    // Fall back to scanning the user's own orders — this can only ever return their data.
    const mine = await this.ordersForUser(userId);
    const hit = (mine as RawOrder[]).find(
      (o) => o && (o.id === ref || o.ref === ref || String(o.ref ?? '').toLowerCase() === ref.toLowerCase()),
    );
    return hit ? this.ownedBy(hit, userId) : null;
  }

  async orderTimeline(orderId: string): Promise<unknown> {
    const events = await this.getJson<unknown>(`${serviceUrl('order')}/internal/orders/${encodeURIComponent(orderId)}/events`);
    return events ?? { events: [] };
  }

  async riderLocation(orderId: string): Promise<unknown | null> {
    // TrackingController is mounted under the /tracking prefix (like the gateway path),
    // so the internal route is /tracking/internal/orders/:orderId/rider.
    return this.getJson<unknown>(`${serviceUrl('tracking')}/tracking/internal/orders/${encodeURIComponent(orderId)}/rider`);
  }

  async paymentForOrder(orderId: string): Promise<unknown | null> {
    return this.getJson<unknown>(`${serviceUrl('payment')}/internal/payments/order/${encodeURIComponent(orderId)}`);
  }

  /** Wallet/credit for a user. Returns balance and withdrawal state — never mutates. */
  async walletForUser(userId: string): Promise<unknown | null> {
    return this.getJson<unknown>(`${serviceUrl('ledger')}/internal/ledger/customers/${encodeURIComponent(userId)}/credit`);
  }

  async vendorStatus(vendorId: string): Promise<unknown | null> {
    return this.getJson<unknown>(`${serviceUrl('catalog')}/internal/vendors/${encodeURIComponent(vendorId)}`);
  }

  /** The single gate that stops the AI reading someone else's order. */
  private ownedBy(order: RawOrder, userId: string): RawOrder | null {
    if (!order || typeof order !== 'object') return null;
    if (order.customerId !== userId) {
      this.logger.warn(`Blocked cross-user order read: order=${order.id ?? order.ref} requester=${userId}`);
      return null;
    }
    return order;
  }

  /**
   * The ONLY network primitive in this file. Hardcoded to GET so no future edit can
   * quietly turn a lookup into a mutation.
   */
  private async getJson<T>(url: string): Promise<T | null> {
    try {
      const res = await internalFetch(url, { method: 'GET' });
      if (!res.ok) {
        if (res.status !== 404) this.logger.warn(`read-only lookup ${res.status} ${url}`);
        return null;
      }
      return (await res.json()) as T;
    } catch (err) {
      this.logger.warn(`read-only lookup failed ${url}: ${(err as Error).message}`);
      return null;
    }
  }
}
