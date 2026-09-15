/**
 * Payment controller — API contract tests.
 *
 * Verifies:
 *   - Webhook signature enforcement (raw body required, missing sig → service handles)
 *   - Internal endpoints require correct body shapes
 *   - Refund endpoint role-gating and delegation
 *   - Response shapes for all public endpoints
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PaymentController } from './payment.controller';

// `refund` records who authorised it, so the controller takes the caller first.
const ADMIN = { sub: 'admin-1', role: 'ADMIN', adminRole: 'super_admin' } as any;
// handleWebhook takes the Fastify request as its third argument for the source-IP
// allowlist (audit M-1). Loopback is always allowed by isAllowedWebhookIp.
const LOCAL_REQ = { ip: '127.0.0.1' } as any;
import { PaymentService } from './payment.service';
import { WebhookService } from './webhook.service';
import { RefundService } from './refund.service';
import { AuthGuard, ORE_ENV } from '@ore/core';
import { Role } from '@ore/contracts';
import { PaymentIdempotencyInterceptor } from './idempotency';

// ── helpers ──────────────────────────────────────────────────────────────────

function customerJwt(id = 'cust-1') {
  return { sub: id, phone: '233501234567', role: Role.CUSTOMER, roles: [Role.CUSTOMER] } as any;
}

function makePaymentService() {
  return {
    initialize: jest.fn().mockResolvedValue({ reference: 'PAY-ref-1', paystackUrl: 'https://paystack.co/pay/ref-1' }),
    mockComplete: jest.fn().mockResolvedValue({ ok: true }),
    getTransferStatus: jest.fn().mockResolvedValue({ status: 'success' }),
    getReconciliationReport: jest.fn().mockResolvedValue({ date: '2026-08-23', matched: 100, unmatched: 0 }),
    transfer: jest.fn().mockResolvedValue({ transferCode: 'TRF-abc' }),
    vendorTransfer: jest.fn().mockResolvedValue({ transferCode: 'TRF-vendor-1' }),
  };
}

function makeWebhookService() {
  return {
    handleWebhook: jest.fn().mockResolvedValue({ ok: true }),
  };
}

function makeRefundService() {
  return {
    refund: jest.fn().mockResolvedValue({ refundId: 'refund-1', status: 'queued' }),
    // The customer/admin route goes through refundForUser, which needs the caller to decide
    // whether the requester may authorise the refund at all.
    refundForUser: jest.fn().mockResolvedValue({ refundId: 'refund-1', status: 'queued' }),
  };
}

// ── setup ─────────────────────────────────────────────────────────────────────

describe('PaymentController — API contract', () => {
  let controller: PaymentController;
  let paymentService: ReturnType<typeof makePaymentService>;
  let webhookService: ReturnType<typeof makeWebhookService>;
  let refundService: ReturnType<typeof makeRefundService>;

  beforeEach(async () => {
    paymentService = makePaymentService();
    webhookService = makeWebhookService();
    refundService = makeRefundService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        { provide: PaymentService, useValue: paymentService },
        { provide: WebhookService, useValue: webhookService },
        { provide: RefundService, useValue: refundService },
        { provide: ORE_ENV, useValue: { paystackWebhookAllowedIps: [], paystackMode: 'live' } },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideInterceptor(PaymentIdempotencyInterceptor)
      .useValue({ intercept: (context: any, next: any) => next.handle() })
      .compile();

    controller = module.get<PaymentController>(PaymentController);
  });

  // ── POST /payments/webhook/paystack ───────────────────────────────

  describe('handleWebhook', () => {
    it('calls webhookService with raw body and signature', async () => {
      const rawBody = Buffer.from(JSON.stringify({ event: 'charge.success', data: { reference: 'ref-1' } }));
      const sig = 'sha512-valid-signature';

      const result = await controller.handleWebhook(
        { rawBody, body: undefined },
        sig,
        LOCAL_REQ,
      );

      expect(result).toEqual({ ok: true });
      expect(webhookService.handleWebhook).toHaveBeenCalledWith(rawBody, sig);
    });

    it('throws BadRequestException when rawBody is missing (req has no raw body)', async () => {
      await expect(
        controller.handleWebhook({ body: { event: 'charge.success' } }, 'sig', LOCAL_REQ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.handleWebhook({ body: { event: 'charge.success' } }, 'sig', LOCAL_REQ),
      ).rejects.toThrow('Raw webhook body is required');
    });

    it('throws BadRequestException when rawBody is undefined', async () => {
      await expect(
        controller.handleWebhook({ rawBody: undefined }, 'sig', LOCAL_REQ),
      ).rejects.toThrow(BadRequestException);
    });

    it('passes undefined signature to webhookService when header is absent', async () => {
      const rawBody = Buffer.from('{}');
      await controller.handleWebhook({ rawBody }, undefined, LOCAL_REQ);
      expect(webhookService.handleWebhook).toHaveBeenCalledWith(rawBody, undefined);
    });

    it('does not call webhookService when rawBody is missing', async () => {
      try { await controller.handleWebhook({}, 'sig', LOCAL_REQ); } catch {}
      expect(webhookService.handleWebhook).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the source IP is not allowlisted (audit M-1)', async () => {
      const rawBody = Buffer.from('{}');
      await expect(
        controller.handleWebhook({ rawBody }, 'sig', { ip: '203.0.113.9' } as any),
      ).rejects.toThrow('Invalid webhook source IP');
      expect(webhookService.handleWebhook).not.toHaveBeenCalled();
    });

    it('accepts a Buffer rawBody (not a string or object)', async () => {
      const rawBody = Buffer.from('{"event":"charge.success"}');
      const result = await controller.handleWebhook({ rawBody }, 'sig', LOCAL_REQ);
      expect(webhookService.handleWebhook).toHaveBeenCalledWith(expect.any(Buffer), 'sig');
    });
  });

  // ── POST /payments/mock/complete ─────────────────────────────────

  describe('mockComplete', () => {
    it('delegates reference to paymentService.mockComplete', async () => {
      const result = await controller.mockComplete({ reference: 'mock-ref-1' });
      expect(result).toEqual({ ok: true });
      expect(paymentService.mockComplete).toHaveBeenCalledWith('mock-ref-1');
    });
  });

  // ── Internal: POST /internal/payments/initialize ──────────────────

  describe('initialize (internal)', () => {
    const validBody = {
      checkoutId: 'chk-1',
      amountPesewas: 50_000,
      phone: '233501234567',
      allocations: [{ orderId: 'order-1', allocatedPesewas: 50_000 }],
    };

    it('delegates to paymentService.initialize with full body', async () => {
      const result = await controller.initialize(validBody);
      expect((result as any).payment ? (result as any).payment.reference : (result as any).reference).toBe('PAY-ref-1');
      expect(paymentService.initialize).toHaveBeenCalledWith(validBody);
    });

    it('passes allocations array through to service', async () => {
      const multiAlloc = {
        ...validBody,
        allocations: [
          { orderId: 'order-1', allocatedPesewas: 30_000 },
          { orderId: 'order-2', allocatedPesewas: 20_000 },
        ],
      };
      await controller.initialize(multiAlloc);
      expect(paymentService.initialize).toHaveBeenCalledWith(
        expect.objectContaining({ allocations: expect.arrayContaining([expect.objectContaining({ orderId: 'order-1' })]) }),
      );
    });
  });

  // ── Internal: GET /internal/payments/settlements/report ───────────

  describe('reconciliationReport (internal)', () => {
    it('returns reconciliation report for a given date', async () => {
      const result = await controller.reconciliationReport('2026-08-23');
      expect((result as any).date).toBe('2026-08-23');
      expect((result as any).matched).toBe(100);
      expect(paymentService.getReconciliationReport).toHaveBeenCalledWith('2026-08-23');
    });

    it('throws BadRequestException when date is missing', () => {
      expect(() => controller.reconciliationReport(undefined as any)).toThrow(BadRequestException);
      expect(() => controller.reconciliationReport(undefined as any)).toThrow('date is required');
    });

    it('throws BadRequestException when date is empty string', () => {
      expect(() => controller.reconciliationReport('')).toThrow(BadRequestException);
    });
  });

  // ── Internal: POST /internal/payments/transfers ───────────────────

  describe('transfer (internal)', () => {
    it('initiates a Paystack transfer with correct parameters', async () => {
      const result = await controller.transfer({
        amountPesewas: 5000,
        destination: 'RCP_abc123',
        reference: 'TRF-rider-1',
        metadata: { riderId: 'rider-1' },
      });
      expect((result as any).transferCode).toBe('TRF-abc');
      expect(paymentService.transfer).toHaveBeenCalledWith(
        expect.objectContaining({ amountPesewas: 5000, destination: 'RCP_abc123' }),
      );
    });
  });

  // ── Internal: POST /internal/payments/vendor-transfers ────────────

  describe('vendorTransfer (internal)', () => {
    it('initiates a vendor payout via Paystack', async () => {
      const result = await controller.vendorTransfer({
        amountPesewas: 40_000,
        reference: 'VTF-vendor-1',
        payout: { type: 'MOMO', provider: 'MTN', accountNumber: '0501234567', accountName: 'Kwame Foods' },
      });
      expect((result as any).transferCode).toBe('TRF-vendor-1');
    });
  });

  // ── POST /internal/payments/refund ───────────────────────────────

  describe('internalRefund', () => {
    it('delegates to refundService with orderId and reason', async () => {
      const result = await controller.internalRefund({ orderId: 'order-1', reason: 'Dispute resolved' });
      expect((result as any).refundId).toBe('refund-1');
      expect(refundService.refund).toHaveBeenCalledWith('order-1', 'Dispute resolved', undefined);
    });

    it('passes optional amountPesewas for partial refunds', async () => {
      await controller.internalRefund({ orderId: 'order-1', reason: 'Partial refund', amountPesewas: 2000 });
      expect(refundService.refund).toHaveBeenCalledWith('order-1', 'Partial refund', 2000);
    });
  });

  // ── POST /payments/refund ─────────────────────────────────────────

  describe('refund (customer/admin)', () => {
    it('delegates to refundService with orderId and reason', async () => {
      const result = await controller.refund(ADMIN, { orderId: 'order-2', reason: 'Wrong item' });
      expect(result.status).toBe('queued');
      expect(refundService.refundForUser).toHaveBeenCalledWith(ADMIN, 'order-2', 'Wrong item', undefined);
    });

    it('passes optional amountPesewas', async () => {
      await controller.refund(ADMIN, { orderId: 'order-2', reason: 'Partial', amountPesewas: 1500 });
      expect(refundService.refundForUser).toHaveBeenCalledWith(ADMIN, 'order-2', 'Partial', 1500);
    });
  });

  // ── Webhook response shape ────────────────────────────────────────

  describe('webhook response shape', () => {
    it('responds with HTTP 200 body { ok: true } for valid webhook', async () => {
      const rawBody = Buffer.from('{"event":"transfer.success"}');
      const result = await controller.handleWebhook({ rawBody }, 'valid-sig', LOCAL_REQ);
      expect(result).toEqual({ ok: true });
    });

    it('propagates errors from webhookService (invalid signature, duplicate event)', async () => {
      webhookService.handleWebhook.mockRejectedValue(new BadRequestException('Invalid signature'));
      const rawBody = Buffer.from('{}');
      await expect(controller.handleWebhook({ rawBody }, 'bad-sig', LOCAL_REQ)).rejects.toThrow(BadRequestException);
    });
  });
});
