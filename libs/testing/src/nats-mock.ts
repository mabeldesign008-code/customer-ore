import { of } from 'rxjs';

/**
 * Mock NATS client for testing event bus operations
 * Prevents actual NATS connections during tests
 */

export interface MockNatsMessage {
  subject: string;
  data: any;
  timestamp: Date;
}

/**
 * Creates a mock NATS client that captures published events
 * 
 * Usage:
 * ```typescript
 * const natsMock = createMockNatsClient();
 * 
 * // In your test module:
 * .overrideProvider('NATS_CLIENT')
 * .useValue(natsMock)
 * 
 * // In your tests:
 * await service.doSomething();
 * expect(natsMock.published).toHaveLength(1);
 * expect(natsMock.published[0].subject).toBe('order.created');
 * ```
 */
export function createMockNatsClient() {
  const published: MockNatsMessage[] = [];
  const subscriptions: Map<string, Array<(data: any) => void>> = new Map();

  return {
    published,
    subscriptions,

    /**
     * Mock publish method - captures the event
     */
    publish(subject: string, data: any) {
      const message: MockNatsMessage = {
        subject,
        data,
        timestamp: new Date(),
      };
      published.push(message);

      // Trigger any subscriptions for this subject
      const handlers = subscriptions.get(subject) || [];
      handlers.forEach(handler => handler(data));

      return of(null);
    },

    /**
     * Mock emit method (alias for publish)
     */
    emit(subject: string, data: any) {
      return this.publish(subject, data);
    },

    /**
     * Mock send method (for request-response pattern)
     */
    send(subject: string, data: any) {
      return this.publish(subject, data);
    },

    /**
     * Mock subscribe method
     */
    subscribe(subject: string, handler: (data: any) => void) {
      if (!subscriptions.has(subject)) {
        subscriptions.set(subject, []);
      }
      subscriptions.get(subject)!.push(handler);
      return of(null);
    },

    /**
     * Helper: Get all published messages for a specific subject
     */
    getPublishedBySubject(subject: string): MockNatsMessage[] {
      return published.filter(msg => msg.subject === subject);
    },

    /**
     * Helper: Clear all captured messages
     */
    clearPublished() {
      published.length = 0;
    },

    /**
     * Helper: Get the last published message
     */
    getLastPublished(): MockNatsMessage | undefined {
      return published[published.length - 1];
    },

    /**
     * Helper: Simulate receiving a message on a subject
     */
    simulateMessage(subject: string, data: any) {
      const handlers = subscriptions.get(subject) || [];
      handlers.forEach(handler => handler(data));
    },

    /**
     * Mock connect method
     */
    connect() {
      return Promise.resolve(this);
    },

    /**
     * Mock close method
     */
    close() {
      return Promise.resolve();
    },
  };
}

/**
 * Type for the mock NATS client
 */
export type MockNatsClient = ReturnType<typeof createMockNatsClient>;

/**
 * Creates a simple mock for the NATS module
 * Use this when you just want to prevent NATS connections without capturing events
 */
export function createSimpleMockNatsClient() {
  return {
    publish: jest.fn().mockReturnValue(of(null)),
    emit: jest.fn().mockReturnValue(of(null)),
    send: jest.fn().mockReturnValue(of(null)),
    subscribe: jest.fn().mockReturnValue(of(null)),
    connect: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
  };
}
