import { Test, TestingModule } from '@nestjs/testing';
import { WebhookService } from './webhook.service';
import { PaymentService } from './payment.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WebhookEvent } from './entities/webhook-event.entity';
import { ORE_BUS, ORE_ENV, ORE_SCHEDULER } from '@ore/core';
import { EVENTS } from '@ore/contracts';
import { UnauthorizedException } from '@nestjs/common';
import { createMockRepository } from '@ore/testing';
import { QueryFailedError } from 'typeorm';

describe('WebhookService', () => {
  let service: WebhookService;
  let mockEventRepo: ReturnType<typeof createMockRepository<WebhookEvent>>;
  let mockPaymentService: {
    handleChargeSuccess: jest.Mock;
  };
  let mockBus: { publish: jest.Mock };
  let mockScheduler: { onInterval: jest.Mock };
  let mockEnv: any;

  beforeEach(async () => {
    mockEventRepo = createMockRepository<WebhookEvent>();

    mockPaymentService = {
      handleChargeSuccess: jest.fn().mockResolvedValue(undefined),
    };

    mockBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    mockScheduler = {
      onInterval: jest.fn(),
    };

    mockEnv = {
      paystackSecretKey: 'sk_test_secret123',
      paystackMode: 'mock',
      otpTtlMin: 5,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        { provide: getRepositoryToken(WebhookEvent), useValue: mockEventRepo },
        { provide: PaymentService, useValue: mockPaymentService },
        { provide: ORE_BUS, useValue: mockBus },
        { provide: ORE_ENV, useValue: mockEnv },
        { provide: ORE_SCHEDULER, useValue: mockScheduler },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
  });

  describe('handleWebhook', () => {
    it('should reject webhook with invalid signature', async () => {
      const payload = JSON.stringify({
        event: 'charge.success',
        data: { reference: 'test-ref' },
      });

      await expect(
        service.handleWebhook(Buffer.from(payload), 'invalid-signature'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.handleWebhook(Buffer.from(payload), 'invalid-signature'),
      ).rejects.toThrow('Invalid webhook signature');
    });

    it('should accept webhook with valid signature', async () => {
      const payload = {
        event: 'charge.success',
        data: { reference: 'test-ref-123' },
        id: 'evt_123',
      };

      const rawBody = JSON.stringify(payload);
      
      // Mock signature verification by using the actual secret
      const crypto = require('crypto');
      const hash = crypto
        .createHmac('sha512', mockEnv.paystackSecretKey)
        .update(rawBody)
        .digest('hex');

      mockEventRepo.save.mockResolvedValue({
        eventId: 'evt_123',
        event: 'charge.success',
      } as WebhookEvent);

      const result = await service.handleWebhook(Buffer.from(rawBody), hash);

      expect(result.accepted).toBe(true);
      expect(mockEventRepo.save).toHaveBeenCalled();
    });

    it('should deduplicate webhook events', async () => {
      const payload = {
        event: 'charge.success',
        data: { reference: 'duplicate-ref' },
        id: 'evt_duplicate',
      };

      const rawBody = JSON.stringify(payload);
      const crypto = require('crypto');
      const hash = crypto
        .createHmac('sha512', mockEnv.paystackSecretKey)
        .update(rawBody)
        .digest('hex');

      // Simulate unique constraint violation
      const uniqueError = new QueryFailedError('INSERT', [], new Error());
      (uniqueError as any).driverError = { code: '23505' };
      mockEventRepo.save.mockRejectedValue(uniqueError);

      const result = await service.handleWebhook(Buffer.from(rawBody), hash);

      // Should accept duplicate without processing
      expect(result.accepted).toBe(true);
      expect(mockPaymentService.handleChargeSuccess).not.toHaveBeenCalled();
    });

    it('should process charge.success event', async () => {
      const payload = {
        event: 'charge.success',
        data: {
          reference: 'ORE-TEST-456',
          paid_at: '2026-08-20T10:00:00Z',
        },
        id: 'evt_456',
      };

      const rawBody = JSON.stringify(payload);
      const crypto = require('crypto');
      const hash = crypto
        .createHmac('sha512', mockEnv.paystackSecretKey)
        .update(rawBody)
        .digest('hex');

      mockEventRepo.save.mockResolvedValue({} as WebhookEvent);

      const result = await service.handleWebhook(Buffer.from(rawBody), hash);

      expect(result.accepted).toBe(true);

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockPaymentService.handleChargeSuccess).toHaveBeenCalledWith(
        'ORE-TEST-456',
        'evt_456',
        '2026-08-20T10:00:00Z',
      );
    });

    it('should process transfer.success event', async () => {
      const payload = {
        event: 'transfer.success',
        data: {
          reference: 'transfer-789',
          metadata: {
            withdrawalId: 'wd-123',
          },
        },
        id: 'evt_transfer_success',
      };

      const rawBody = JSON.stringify(payload);
      const crypto = require('crypto');
      const hash = crypto
        .createHmac('sha512', mockEnv.paystackSecretKey)
        .update(rawBody)
        .digest('hex');

      mockEventRepo.save.mockResolvedValue({} as WebhookEvent);
      mockEventRepo.findOne.mockResolvedValue({
        eventId: 'evt_transfer_success',
        processed: false,
      } as WebhookEvent);

      const result = await service.handleWebhook(Buffer.from(rawBody), hash);

      expect(result.accepted).toBe(true);

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockBus.publish).toHaveBeenCalledWith(
        EVENTS.PAYMENT_TRANSFER_SUCCEEDED,
        expect.objectContaining({
          reference: 'transfer-789',
          withdrawalId: 'wd-123',
        }),
        expect.any(Object),
      );
    });

    it('should process transfer.failed event', async () => {
      const payload = {
        event: 'transfer.failed',
        data: {
          reference: 'transfer-failed-123',
          metadata: {
            vendorWithdrawalId: 'vw-456',
          },
        },
        id: 'evt_transfer_failed',
      };

      const rawBody = JSON.stringify(payload);
      const crypto = require('crypto');
      const hash = crypto
        .createHmac('sha512', mockEnv.paystackSecretKey)
        .update(rawBody)
        .digest('hex');

      mockEventRepo.save.mockResolvedValue({} as WebhookEvent);
      mockEventRepo.findOne.mockResolvedValue({
        eventId: 'evt_transfer_failed',
        processed: false,
      } as WebhookEvent);

      const result = await service.handleWebhook(Buffer.from(rawBody), hash);

      expect(result.accepted).toBe(true);

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockBus.publish).toHaveBeenCalledWith(
        EVENTS.PAYMENT_TRANSFER_FAILED,
        expect.objectContaining({
          reference: 'transfer-failed-123',
          vendorWithdrawalId: 'vw-456',
        }),
        expect.any(Object),
      );
    });

    it('should handle refund events', async () => {
      const payload = {
        event: 'refund.processed',
        data: {
          reference: 'refund-ref-123',
        },
        id: 'evt_refund',
      };

      const rawBody = JSON.stringify(payload);
      const crypto = require('crypto');
      const hash = crypto
        .createHmac('sha512', mockEnv.paystackSecretKey)
        .update(rawBody)
        .digest('hex');

      mockEventRepo.save.mockResolvedValue({} as WebhookEvent);
      mockEventRepo.findOne.mockResolvedValue({
        eventId: 'evt_refund',
        processed: false,
      } as WebhookEvent);

      const result = await service.handleWebhook(Buffer.from(rawBody), hash);

      expect(result.accepted).toBe(true);
    });

    it('should generate eventId when not provided', async () => {
      const payload = {
        event: 'charge.success',
        data: { reference: 'test-ref-no-id' },
        // No id field
      };

      const rawBody = JSON.stringify(payload);
      const crypto = require('crypto');
      const hash = crypto
        .createHmac('sha512', mockEnv.paystackSecretKey)
        .update(rawBody)
        .digest('hex');

      mockEventRepo.save.mockResolvedValue({} as WebhookEvent);

      const result = await service.handleWebhook(Buffer.from(rawBody), hash);

      expect(result.accepted).toBe(true);
      expect(mockEventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: expect.stringMatching(/^charge\.success:/),
        }),
      );
    });

    it('should handle unknown event types', async () => {
      const payload = {
        event: 'unknown.event',
        data: {},
        id: 'evt_unknown',
      };

      const rawBody = JSON.stringify(payload);
      const crypto = require('crypto');
      const hash = crypto
        .createHmac('sha512', mockEnv.paystackSecretKey)
        .update(rawBody)
        .digest('hex');

      mockEventRepo.save.mockResolvedValue({} as WebhookEvent);
      mockEventRepo.findOne.mockResolvedValue({
        eventId: 'evt_unknown',
        processed: false,
      } as WebhookEvent);

      const result = await service.handleWebhook(Buffer.from(rawBody), hash);

      // Should accept but not process
      expect(result.accepted).toBe(true);
    });

    it('should continue on processing errors', async () => {
      const payload = {
        event: 'charge.success',
        data: { reference: 'error-ref' },
        id: 'evt_error',
      };

      const rawBody = JSON.stringify(payload);
      const crypto = require('crypto');
      const hash = crypto
        .createHmac('sha512', mockEnv.paystackSecretKey)
        .update(rawBody)
        .digest('hex');

      mockEventRepo.save.mockResolvedValue({} as WebhookEvent);
      mockPaymentService.handleChargeSuccess.mockRejectedValue(new Error('Processing failed'));

      const result = await service.handleWebhook(Buffer.from(rawBody), hash);

      // Should still accept the webhook
      expect(result.accepted).toBe(true);

      // Wait for async processing attempt
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Event should not be marked as processed on error
      expect(mockPaymentService.handleChargeSuccess).toHaveBeenCalled();
    });
  });

  describe('startSweeper', () => {
    it('should register sweeper interval', () => {
      service.startSweeper();

      expect(mockScheduler.onInterval).toHaveBeenCalledWith(
        'payment-sweeper',
        5 * 60_000, // 5 minutes
        expect.any(Function),
      );
    });
  });

  describe('webhook signature verification', () => {
    it('should verify correct HMAC-SHA512 signature', async () => {
      const payload = {
        event: 'charge.success',
        data: { reference: 'verify-test' },
        id: 'evt_verify',
      };

      const rawBody = JSON.stringify(payload);
      const crypto = require('crypto');
      const correctHash = crypto
        .createHmac('sha512', mockEnv.paystackSecretKey)
        .update(rawBody)
        .digest('hex');

      mockEventRepo.save.mockResolvedValue({} as WebhookEvent);

      const result = await service.handleWebhook(Buffer.from(rawBody), correctHash);

      expect(result.accepted).toBe(true);
    });

    it('should reject tampered payload', async () => {
      const originalPayload = {
        event: 'charge.success',
        data: { reference: 'original-ref', amount: 10000 },
        id: 'evt_original',
      };

      const tamperedPayload = {
        event: 'charge.success',
        data: { reference: 'original-ref', amount: 1000 }, // Amount changed!
        id: 'evt_original',
      };

      const crypto = require('crypto');
      const originalRawBody = JSON.stringify(originalPayload);
      const tamperedRawBody = JSON.stringify(tamperedPayload);
      
      // Signature computed for original payload
      const signature = crypto
        .createHmac('sha512', mockEnv.paystackSecretKey)
        .update(originalRawBody)
        .digest('hex');

      // Try to submit tampered payload with original signature
      await expect(
        service.handleWebhook(Buffer.from(tamperedRawBody), signature),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject webhook with missing signature', async () => {
      const payload = JSON.stringify({
        event: 'charge.success',
        data: { reference: 'no-sig' },
      });

      await expect(service.handleWebhook(Buffer.from(payload), undefined)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle string body format', async () => {
      const payload = {
        event: 'charge.success',
        data: { reference: 'string-body' },
        id: 'evt_string',
      };

      const rawBody = JSON.stringify(payload);
      const crypto = require('crypto');
      const hash = crypto
        .createHmac('sha512', mockEnv.paystackSecretKey)
        .update(rawBody)
        .digest('hex');

      mockEventRepo.save.mockResolvedValue({} as WebhookEvent);

      // Pass string instead of Buffer
      const result = await service.handleWebhook(rawBody, hash);

      expect(result.accepted).toBe(true);
    });
  });

  describe('metadata handling', () => {
    it('should preserve withdrawal metadata', async () => {
      const payload = {
        event: 'transfer.success',
        data: {
          reference: 'transfer-with-meta',
          metadata: {
            withdrawalId: 'wd-789',
            settlementId: 'settle-456',
            customField: 'custom-value',
          },
        },
        id: 'evt_meta',
      };

      const rawBody = JSON.stringify(payload);
      const crypto = require('crypto');
      const hash = crypto
        .createHmac('sha512', mockEnv.paystackSecretKey)
        .update(rawBody)
        .digest('hex');

      mockEventRepo.save.mockResolvedValue({} as WebhookEvent);
      mockEventRepo.findOne.mockResolvedValue({
        eventId: 'evt_meta',
        processed: false,
      } as WebhookEvent);

      await service.handleWebhook(Buffer.from(rawBody), hash);

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockBus.publish).toHaveBeenCalledWith(
        EVENTS.PAYMENT_TRANSFER_SUCCEEDED,
        expect.objectContaining({
          withdrawalId: 'wd-789',
          settlementId: 'settle-456',
        }),
        expect.any(Object),
      );
    });

    it('should handle missing metadata gracefully', async () => {
      const payload = {
        event: 'transfer.success',
        data: {
          reference: 'transfer-no-meta',
          // No metadata field
        },
        id: 'evt_no_meta',
      };

      const rawBody = JSON.stringify(payload);
      const crypto = require('crypto');
      const hash = crypto
        .createHmac('sha512', mockEnv.paystackSecretKey)
        .update(rawBody)
        .digest('hex');

      mockEventRepo.save.mockResolvedValue({} as WebhookEvent);
      mockEventRepo.findOne.mockResolvedValue({
        eventId: 'evt_no_meta',
        processed: false,
      } as WebhookEvent);

      await service.handleWebhook(Buffer.from(rawBody), hash);

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockBus.publish).toHaveBeenCalledWith(
        EVENTS.PAYMENT_TRANSFER_SUCCEEDED,
        expect.objectContaining({
          reference: 'transfer-no-meta',
          withdrawalId: undefined,
        }),
        expect.any(Object),
      );
    });
  });
});
