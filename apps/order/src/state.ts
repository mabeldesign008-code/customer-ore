/** Order state machine — the single source of truth for legal transitions (G33). */

import { OrderStatus } from '@ore/contracts';

export const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.AWAITING_RECIPIENT]: [OrderStatus.PENDING_PAYMENT, OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.PENDING_PAYMENT]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED, OrderStatus.AWAITING_RECIPIENT],
  // READY_FOR_PICKUP direct from CONFIRMED is the errand path (no vendor accept — the
  // escrow is paid, the rider shops directly; doc §Errands)
  [OrderStatus.CONFIRMED]: [OrderStatus.ACCEPTED, OrderStatus.CANCELLED, OrderStatus.REJECTED, OrderStatus.READY_FOR_PICKUP],
  [OrderStatus.ACCEPTED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY_FOR_PICKUP, OrderStatus.CANCELLED],
  [OrderStatus.READY_FOR_PICKUP]: [
    OrderStatus.RIDER_ASSIGNED,
    OrderStatus.WAITING_FOR_RIDER,
    OrderStatus.CANCELLED,
    OrderStatus.FAILED_DELIVERY,
  ],
  [OrderStatus.RIDER_ASSIGNED]: [
    OrderStatus.RIDER_EN_ROUTE_TO_VENDOR,
    OrderStatus.READY_FOR_PICKUP, // rider unassigned → re-dispatch
    OrderStatus.WAITING_FOR_RIDER,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.RIDER_EN_ROUTE_TO_VENDOR]: [OrderStatus.RIDER_AT_VENDOR, OrderStatus.READY_FOR_PICKUP, OrderStatus.CANCELLED],
  [OrderStatus.RIDER_AT_VENDOR]: [OrderStatus.PICKED_UP, OrderStatus.READY_FOR_PICKUP, OrderStatus.CANCELLED],
  [OrderStatus.PICKED_UP]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.FAILED_DELIVERY],
  // Laundry returns to the dispatch queue after the collection handoff and
  // Vendor processing; the service layer gates this transition to Laundry.
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.OTP_VERIFIED, OrderStatus.FAILED_DELIVERY, OrderStatus.READY_FOR_PICKUP],
  [OrderStatus.OTP_VERIFIED]: [OrderStatus.DELIVERED],
  [OrderStatus.WAITING_FOR_RIDER]: [OrderStatus.RIDER_ASSIGNED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.REJECTED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.FAILED_DELIVERY]: [OrderStatus.CANCELLED],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}
