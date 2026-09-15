import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ORE_BUS, ORE_ENV, ORE_SCHEDULER } from '@ore/core';
import { createMockRepository } from '@ore/testing';
import { WebhookService } from './webhook.service';
import { WebhookEvent } from './entities/webhook-event.entity';
import { PaymentService } from './payment.service';

/**
 * Webhooks that were accepted but never finished processing.
 *
 * `handleWebhook` inserts the row, acks Paystack immediately, then processes in the background
 * with `void processAsync(...)`. Anything that interrupted that — a thrown handler, a pod
 * rescheduled mid-flight, a deploy — left the row at `processed = false` with nothing on any
 * timer to pick it up. Paystack had already been told 200, so it would never redeliver. The
 * event was lost, silently, and the only trace was one error line.
 */
describe('WebhookService — stuck webhook retry', () => {
  let service: WebhookService;
  let events: ReturnType<typeof createMockRepository<WebhookEvent>>;
  let payments: { handleChargeSuccess: jest.Mock; finalizeRefundFromWebhook: jest.Mock };
  let scheduler: { onInterval: jest.Mock };
  let bus: { publish: jest.Mock };

  const row = (over: Partial<WebhookEvent> = {}): WebhookEvent => ({
    id: 'row-1',
    eventId: 'evt_1',
    event: 'charge.success',
    payloadJson: { event: 'charge.success', data: { reference: 'ref_1' } },
    processed: false,
    attempts: 0,
    lastError: null,
    abandoned: false,
    lastAttemptAt: null,
    createdAt: new Date('2026-09-01T10:00:00.000Z'),
    ...over,
  } as WebhookEvent);

  beforeEach(async () => {
    events = createMockRepository<WebhookEvent>();
    payments = {
      handleChargeSuccess: jest.fn().mockResolvedValue(undefined),
      finalizeRefundFromWebhook: jest.fn().mockResolvedValue(undefined),
    };
    scheduler = { onInterval: jest.fn() };
    bus = { publish: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        { provide: getRepositoryToken(WebhookEvent), useValue: events },
        { provide: PaymentService, useValue: payments },
        { provide: ORE_BUS, useValue: bus },
        { provide: ORE_SCHEDULER, useValue: scheduler },
        { provide: ORE_ENV, useValue: { paystackSecretKey: 'sk_test', paystackMode: 'test', otpTtlMin: 5 } },
      ],
    }).compile();

    service = module.get(WebhookService);
    events.save.mockImplementation(async (r: WebhookEvent) => r);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('the sweeper is actually registered', () => {
    it('schedules a retry sweep separate from the payment reconciliation sweep', () => {
      service.startSweeper();

      const jobs = scheduler.onInterval.mock.calls.map((c) => c[0] as string);
      expect(jobs).toContain('webhook-retry-sweeper');
      // Separate job: a stuck webhook row is a different problem from a stale payment, and one
      // failing must not stop the other.
      expect(jobs).toContain('payment-sweeper');
    });
  });

  describe('selecting what to retry', () => {
    it('only picks rows that are unprocessed, not abandoned, and old enough', async () => {
      events.find.mockResolvedValue([]);

      await service.retryStuckWebhooks();

      const where = events.find.mock.calls[0][0].where as Record<string, unknown>;
      expect(where.processed).toBe(false);
      expect(where.abandoned).toBe(false);
      // A row created seconds ago is probably still being processed by the original request;
      // retrying it would race the in-flight attempt.
      expect(where.createdAt).toBeDefined();
      expect(where.attempts).toBeDefined();
    });

    it('takes the oldest first and caps the batch', async () => {
      events.find.mockResolvedValue([]);

      await service.retryStuckWebhooks();

      const opts = events.find.mock.calls[0][0] as { order: Record<string, string>; take: number };
      expect(opts.order).toEqual({ createdAt: 'ASC' });
      expect(opts.take).toBeGreaterThan(0);
    });
  });

  describe('retrying', () => {
    it('replays a stuck charge.success against the payment service', async () => {
      events.find.mockResolvedValue([row()]);
      events.findOne.mockResolvedValue(row());

      const result = await service.retryStuckWebhooks();

      expect(payments.handleChargeSuccess).toHaveBeenCalledWith('ref_1', 'evt_1', undefined);
      expect(result.retried).toBe(1);
    });

    it('marks a successful retry as processed, so it is not swept again', async () => {
      const stored = row();
      events.find.mockResolvedValue([stored]);
      events.findOne.mockResolvedValue(stored);

      await service.retryStuckWebhooks();

      expect(stored.processed).toBe(true);
    });

    it('replays a refund webhook through the refund path', async () => {
      const refund = row({
        eventId: 'evt_refund',
        event: 'refund.success',
        payloadJson: { event: 'refund.success', data: { reference: 'ref_r' } },
      });
      events.find.mockResolvedValue([refund]);
      events.findOne.mockResolvedValue(refund);

      await service.retryStuckWebhooks();

      expect(payments.finalizeRefundFromWebhook).toHaveBeenCalledWith('refund.success', { reference: 'ref_r' });
    });

    it('retries several stuck rows in one sweep', async () => {
      events.find.mockResolvedValue([row({ eventId: 'a' }), row({ eventId: 'b' }), row({ eventId: 'c' })]);
      events.findOne.mockImplementation(async () => row());

      await expect(service.retryStuckWebhooks()).resolves.toEqual({ retried: 3 });
    });

    it('reports nothing retried when there is nothing stuck', async () => {
      events.find.mockResolvedValue([]);
      await expect(service.retryStuckWebhooks()).resolves.toEqual({ retried: 0 });
    });
  });

  describe('failure accounting', () => {
    it('counts an attempt and records the error when a retry fails again', async () => {
      const stored = row({ attempts: 1 });
      events.find.mockResolvedValue([stored]);
      events.findOne.mockResolvedValue(stored);
      payments.handleChargeSuccess.mockRejectedValue(new Error('ledger unreachable'));
      jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);

      await service.retryStuckWebhooks();

      expect(stored.attempts).toBe(2);
      expect(stored.lastError).toContain('ledger unreachable');
      expect(stored.lastAttemptAt).toBeInstanceOf(Date);
      expect(stored.processed).toBe(false);
    });

    it('buries an event once attempts are exhausted, rather than retrying forever', async () => {
      const stored = row({ attempts: 7 }); // next failure is the eighth
      events.find.mockResolvedValue([stored]);
      events.findOne.mockResolvedValue(stored);
      payments.handleChargeSuccess.mockRejectedValue(new Error('permanently broken'));
      jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);

      await service.retryStuckWebhooks();

      // Left in the queue it would mask genuinely stuck events behind it.
      expect(stored.abandoned).toBe(true);
      expect(stored.attempts).toBe(8);
    });

    it('does not bury an event that still has attempts left', async () => {
      const stored = row({ attempts: 2 });
      events.find.mockResolvedValue([stored]);
      events.findOne.mockResolvedValue(stored);
      payments.handleChargeSuccess.mockRejectedValue(new Error('transient'));
      jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);

      await service.retryStuckWebhooks();

      expect(stored.abandoned).toBe(false);
    });

    it('truncates a huge error message', async () => {
      const stored = row();
      events.find.mockResolvedValue([stored]);
      events.findOne.mockResolvedValue(stored);
      payments.handleChargeSuccess.mockRejectedValue(new Error('x'.repeat(5_000)));
      jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);

      await service.retryStuckWebhooks();

      expect(stored.lastError!.length).toBe(500);
    });

    it('buries a row whose payload has no event name, instead of re-reading it every sweep', async () => {
      const malformed = row({ event: '', payloadJson: {} as Record<string, unknown> });
      events.find.mockResolvedValue([malformed]);

      const result = await service.retryStuckWebhooks();

      expect(malformed.abandoned).toBe(true);
      expect(malformed.lastError).toContain('malformed');
      expect(result.retried).toBe(0);
    });

    it('never lets failure bookkeeping mask the original failure', async () => {
      const stored = row();
      events.find.mockResolvedValue([stored]);
      events.findOne.mockRejectedValue(new Error('db gone too'));
      payments.handleChargeSuccess.mockRejectedValue(new Error('original problem'));
      const log = jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);

      await expect(service.retryStuckWebhooks()).resolves.toEqual({ retried: 1 });
      expect(log).toHaveBeenCalled();
    });
  });
});
