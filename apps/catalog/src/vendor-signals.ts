/**
 * Live kitchen signals for prep-time estimation.
 *
 * Kept as pure functions over the order list the order service already exposes at
 * `/internal/vendors/:id/orders`, so the policy can be tested without standing up two services.
 */

import { PrepTimeSignals } from '@ore/contracts';

export interface VendorSignalOrder {
  orderId: string;
  status: string;
  prepTimeMin: number;
  timeline?: { from?: string; to: string; at: string }[];
}

/** Statuses where the kitchen is actively working on the order. */
const IN_KITCHEN = new Set(['ACCEPTED', 'PREPARING', 'CONFIRMED']);

/** Statuses that mean the kitchen has finished with it, whatever happened afterwards. */
const LEFT_KITCHEN = new Set([
  'READY_FOR_PICKUP',
  'WAITING_FOR_RIDER',
  'PICKED_UP',
  'IN_TRANSIT',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
]);

/**
 * How many orders this kitchen is working on right now.
 *
 * Counted from status rather than from a stored counter so it cannot drift: a counter that is
 * incremented on accept and decremented on ready is one missed event away from claiming a
 * kitchen is permanently busy, and it would take a manual reset to notice.
 */
export function queueDepth(orders: VendorSignalOrder[]): number {
  return orders.filter((o) => IN_KITCHEN.has(o.status) && !LEFT_KITCHEN.has(o.status)).length;
}

/**
 * Fraction of recently completed orders that missed their promised ready time.
 *
 * Only orders that actually reached the kitchen door count: an order cancelled by the customer
 * before anyone started cooking says nothing about how fast this kitchen is, and counting it
 * would punish vendors for their customers' behaviour.
 */
export function lateRate(
  orders: VendorSignalOrder[],
  now: Date = new Date(),
  windowHours = 4,
): { lateRate: number; sampleSize: number } {
  const cutoff = now.getTime() - windowHours * 3_600_000;
  let considered = 0;
  let late = 0;

  for (const order of orders) {
    const accepted = timelineAt(order, 'ACCEPTED') ?? timelineAt(order, 'CONFIRMED');
    const ready = timelineAt(order, 'READY_FOR_PICKUP') ?? timelineAt(order, 'WAITING_FOR_RIDER');
    if (!accepted || !ready) continue;
    if (ready.getTime() < cutoff) continue;

    considered += 1;
    const actualMin = (ready.getTime() - accepted.getTime()) / 60_000;
    // Compared against what was promised, not against a fixed target: a vendor who honestly
    // declares 40 minutes and takes 40 is not late, and should not be treated as though they are.
    if (actualMin > order.prepTimeMin) late += 1;
  }

  return { lateRate: considered ? late / considered : 0, sampleSize: considered };
}

export function prepTimeSignals(
  orders: VendorSignalOrder[],
  parallelCapacity?: number,
  now: Date = new Date(),
): PrepTimeSignals {
  const { lateRate: rate, sampleSize } = lateRate(orders, now);
  return {
    queueDepth: queueDepth(orders),
    lateRate: rate,
    sampleSize,
    ...(parallelCapacity !== undefined ? { parallelCapacity } : {}),
  };
}

function timelineAt(order: VendorSignalOrder, status: string): Date | null {
  const hit = (order.timeline ?? []).find((e) => e.to === status);
  if (!hit) return null;
  const at = new Date(hit.at);
  return Number.isNaN(at.getTime()) ? null : at;
}
