/**
 * Example tests demonstrating how to use @ore/testing utilities
 * These tests serve as documentation and can be run to verify the library works
 */

import { createTestCustomer, createTestOrder, createMockNatsClient } from './index';
import { Role } from '@ore/contracts';

describe('@ore/testing examples', () => {
  describe('Test Data Factories', () => {
    it('createTestCustomer creates a valid customer JWT payload', () => {
      const customer = createTestCustomer('cust-123');

      expect(customer.sub).toBe('cust-123');
      expect(customer.role).toBe(Role.CUSTOMER);
      expect(customer.phone).toBeDefined();
    });

    it('createTestOrder creates a valid order object', () => {
      const order = createTestOrder({
        customerId: 'cust-123',
        vendorId: 'vendor-456',
      });

      expect(order.customerId).toBe('cust-123');
      expect(order.vendorId).toBe('vendor-456');
      expect(order.orderId).toBeDefined();
      expect(order.totalPesewas).toBe(5000); // default
    });
  });

  describe('NATS Mock', () => {
    it('captures published messages', () => {
      const natsMock = createMockNatsClient();

      natsMock.publish('order.created', { orderId: 'order-123' });
      natsMock.publish('order.confirmed', { orderId: 'order-123' });

      expect(natsMock.published).toHaveLength(2);
      expect(natsMock.published[0].subject).toBe('order.created');
      expect(natsMock.published[1].subject).toBe('order.confirmed');
    });

    it('filters messages by subject', () => {
      const natsMock = createMockNatsClient();

      natsMock.publish('order.created', { orderId: 'order-1' });
      natsMock.publish('payment.success', { paymentId: 'pay-1' });
      natsMock.publish('order.created', { orderId: 'order-2' });

      const orderEvents = natsMock.getPublishedBySubject('order.created');
      expect(orderEvents).toHaveLength(2);
      expect(orderEvents[0].data.orderId).toBe('order-1');
      expect(orderEvents[1].data.orderId).toBe('order-2');
    });

    it('clears published messages', () => {
      const natsMock = createMockNatsClient();

      natsMock.publish('test.event', { data: 'test' });
      expect(natsMock.published).toHaveLength(1);

      natsMock.clearPublished();
      expect(natsMock.published).toHaveLength(0);
    });
  });
});
