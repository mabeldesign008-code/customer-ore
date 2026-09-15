import { JwtPayload } from '@ore/core';
import { Role } from '@ore/contracts';

/**
 * Factory functions for creating test data
 * Based on patterns found in existing tests (comms.auth.spec.ts)
 */

/**
 * Creates a test JWT payload for authentication testing
 * 
 * Usage:
 * ```typescript
 * const customer = createTestUser({ role: Role.CUSTOMER, sub: 'cust-123' });
 * const admin = createTestUser({ role: Role.ADMIN });
 * ```
 */
export function createTestUser(
  partial: Partial<JwtPayload> & Pick<JwtPayload, 'sub' | 'role'>,
): JwtPayload {
  return {
    phone: '+233241234567',
    ...partial,
  };
}

/**
 * Creates a test customer user
 */
export function createTestCustomer(customerId: string = 'cust-1'): JwtPayload {
  return createTestUser({ sub: customerId, role: Role.CUSTOMER });
}

/**
 * Creates a test rider user
 */
export function createTestRider(riderId: string = 'rider-1'): JwtPayload {
  return createTestUser({ sub: riderId, role: Role.RIDER });
}

/**
 * Creates a test vendor user
 */
export function createTestVendor(vendorId: string = 'vendor-1'): JwtPayload {
  return createTestUser({ sub: vendorId, role: Role.VENDOR });
}

/**
 * Creates a test admin user
 */
export function createTestAdmin(adminId: string = 'admin-1'): JwtPayload {
  return createTestUser({ sub: adminId, role: Role.ADMIN });
}

/**
 * Creates a test order object
 * 
 * Usage:
 * ```typescript
 * const order = createTestOrder({ customerId: 'cust-123', vendorId: 'vend-456' });
 * ```
 */
export function createTestOrder(partial: {
  orderId?: string;
  customerId: string;
  vendorId: string;
  riderId?: string | null;
  totalPesewas?: number;
  status?: string;
}) {
  return {
    orderId: partial.orderId || `order-${Date.now()}`,
    customerId: partial.customerId,
    vendorId: partial.vendorId,
    riderId: partial.riderId || null,
    totalPesewas: partial.totalPesewas || 5000,
    status: partial.status || 'CONFIRMED',
    createdAt: new Date(),
  };
}

/**
 * Creates a test menu item
 * Based on cart.validation.spec.ts pattern
 */
export function createTestMenuItem(partial: {
  id?: string;
  vendorId?: string;
  name?: string;
  pricePesewas?: number;
  addonGroups?: any[];
}) {
  return {
    id: partial.id || `item-${Date.now()}`,
    vendorId: partial.vendorId || 'vendor-1',
    name: partial.name || 'Test Item',
    category: 'Mains',
    pricePesewas: partial.pricePesewas || 2500,
    prepTimeMin: 15,
    available: true,
    addonGroups: partial.addonGroups || [],
  };
}

/**
 * Creates a test payment record
 */
export function createTestPayment(partial: {
  id?: string;
  reference?: string;
  amountPesewas: number;
  status?: string;
  checkoutId?: string;
}) {
  return {
    id: partial.id || `payment-${Date.now()}`,
    reference: partial.reference || `ref-${Date.now()}`,
    amountPesewas: partial.amountPesewas,
    status: partial.status || 'INITIATED',
    checkoutId: partial.checkoutId || `checkout-${Date.now()}`,
    currency: 'GHS',
    createdAt: new Date(),
  };
}

/**
 * Creates a test ledger balance
 */
export function createTestBalance(partial: {
  userId?: string;
  riderId?: string;
  vendorId?: string;
  clearedPesewas?: number;
  pendingPesewas?: number;
}) {
  return {
    id: `balance-${Date.now()}`,
    userId: partial.userId,
    riderId: partial.riderId,
    vendorId: partial.vendorId,
    clearedPesewas: partial.clearedPesewas || 0,
    pendingPesewas: partial.pendingPesewas || 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Generates a random ID for testing
 */
export function randomTestId(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Creates a date in the past for testing
 */
export function pastDate(daysAgo: number = 1): Date {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
}

/**
 * Creates a date in the future for testing
 */
export function futureDate(daysFromNow: number = 1): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
}
