import { canTransition } from './state';
import { OrderStatus } from '@ore/contracts';

describe('order state machine (G33)', () => {
  it('allows the happy path', () => {
    expect(canTransition(OrderStatus.PENDING_PAYMENT, OrderStatus.CONFIRMED)).toBe(true);
    expect(canTransition(OrderStatus.CONFIRMED, OrderStatus.ACCEPTED)).toBe(true);
    expect(canTransition(OrderStatus.ACCEPTED, OrderStatus.PREPARING)).toBe(true);
    expect(canTransition(OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP)).toBe(true);
    expect(canTransition(OrderStatus.READY_FOR_PICKUP, OrderStatus.RIDER_ASSIGNED)).toBe(true);
    expect(canTransition(OrderStatus.RIDER_ASSIGNED, OrderStatus.RIDER_EN_ROUTE_TO_VENDOR)).toBe(true);
    expect(canTransition(OrderStatus.RIDER_EN_ROUTE_TO_VENDOR, OrderStatus.RIDER_AT_VENDOR)).toBe(true);
    expect(canTransition(OrderStatus.RIDER_AT_VENDOR, OrderStatus.PICKED_UP)).toBe(true);
    expect(canTransition(OrderStatus.PICKED_UP, OrderStatus.OUT_FOR_DELIVERY)).toBe(true);
    expect(canTransition(OrderStatus.OUT_FOR_DELIVERY, OrderStatus.OTP_VERIFIED)).toBe(true);
    expect(canTransition(OrderStatus.OTP_VERIFIED, OrderStatus.DELIVERED)).toBe(true);
  });

  it('rejects illegal transitions', () => {
    expect(canTransition(OrderStatus.PENDING_PAYMENT, OrderStatus.DELIVERED)).toBe(false);
    expect(canTransition(OrderStatus.CONFIRMED, OrderStatus.PICKED_UP)).toBe(false);
    expect(canTransition(OrderStatus.PREPARING, OrderStatus.DELIVERED)).toBe(false);
    expect(canTransition(OrderStatus.DELIVERED, OrderStatus.CANCELLED)).toBe(false);
  });

  it('allows abort paths (refund matrix G26)', () => {
    expect(canTransition(OrderStatus.PENDING_PAYMENT, OrderStatus.CANCELLED)).toBe(true);
    expect(canTransition(OrderStatus.CONFIRMED, OrderStatus.REJECTED)).toBe(true);
    expect(canTransition(OrderStatus.CONFIRMED, OrderStatus.CANCELLED)).toBe(true);
    expect(canTransition(OrderStatus.PREPARING, OrderStatus.CANCELLED)).toBe(true);
    expect(canTransition(OrderStatus.RIDER_ASSIGNED, OrderStatus.CANCELLED)).toBe(true);
    expect(canTransition(OrderStatus.OUT_FOR_DELIVERY, OrderStatus.FAILED_DELIVERY)).toBe(true);
  });

  it('forbids customer cancel after pickup', () => {
    expect(canTransition(OrderStatus.PICKED_UP, OrderStatus.CANCELLED)).toBe(false);
    expect(canTransition(OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED)).toBe(false);
    expect(canTransition(OrderStatus.OTP_VERIFIED, OrderStatus.CANCELLED)).toBe(false);
  });
});
