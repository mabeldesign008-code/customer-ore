jest.mock('typeorm-transactional', () => ({
  Transactional: () => (target: any, key: any, descriptor: any) => descriptor,
  initializeTransactionalContext: jest.fn(),
  addTransactionalDataSource: jest.fn(),
}));
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CheckoutPayment } from './entities/checkout-payment.entity';
import { PaymentAllocation } from './entities/payment-allocation.entity';
import { Refund } from './entities/refund.entity';
import { PaymentProcessorRecord } from './entities/payment-processor-record.entity';
import { ORE_BUS, ORE_ENV, ORE_PAYSTACK, ORE_SCHEDULER } from '@ore/core';
import { CheckoutPaymentStatus, RefundStatus, EVENTS } from '@ore/contracts';
import { createMockRepository } from '@ore/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { initializeTransactionalContext } from 'typeorm-transactional';


try {
  initializeTransactionalContext();
  
} catch (e) {}

describe('PaymentService Integration Tests', () => {
  let service: PaymentService;
  let module: TestingModule;
  let mockPaymentRepo: ReturnType<typeof createMockRepository<CheckoutPayment>>;
  let mockAllocationRepo: ReturnType<typeof createMockRepository<PaymentAllocation>>;
  let mockRefundRepo: ReturnType<typeof createMockRepository<Refund>>;
  let mockProcessorRecordRepo: ReturnType<typeof createMockRepository<PaymentProcessorRecord>>;
  let mockBus: { publish: jest.Mock; flush: jest.Mock };
  let mockPaystack: {
    initialize: jest.Mock;
    verify: jest.Mock;
    transfer: jest.Mock;
    transferToRecipient: jest.Mock;
    createRecipient: jest.Mock;
    refund: jest.Mock;
    getTransferStatus: jest.Mock;
  };
  let mockScheduler: { onInterval: jest.Mock };
  let mockEnv: any;

  beforeEach(async () => {
    mockPaymentRepo = createMockRepository<CheckoutPayment>();
    mockAllocationRepo = createMockRepository<PaymentAllocation>();
    mockRefundRepo = createMockRepository<Refund>();
    mockPaymentRepo.create.mockImplementation((data) => data);
    mockAllocationRepo.create.mockImplementation((data) => data);
    mockRefundRepo.create.mockImplementation((data) => data);
    mockProcessorRecordRepo = createMockRepository<PaymentProcessorRecord>();
    mockProcessorRecordRepo.create.mockImplementation((data) => data);
    mockProcessorRecordRepo.save.mockImplementation((data) => Promise.resolve(data));
    mockProcessorRecordRepo.find.mockResolvedValue([]);

    mockBus = {
      publish: jest.fn().mockResolvedValue(undefined),
      flush: jest.fn().mockResolvedValue(undefined),
    };

    mockPaystack = {
      initialize: jest.fn(),
      verify: jest.fn(),
      transfer: jest.fn(),
      transferToRecipient: jest.fn(),
      createRecipient: jest.fn(),
      refund: jest.fn(),
      getTransferStatus: jest.fn(),
    };

    mockScheduler = {
      onInterval: jest.fn(),
    };

    mockEnv = {
      paystackRefPrefix: 'ORE-TEST',
      paystackCurrency: 'GHS',
      paystackMode: 'mock',
      paystackSecretKey: 'test-secret',
      otpTtlMin: 5,
    };

    module = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: getRepositoryToken(CheckoutPayment), useValue: mockPaymentRepo },
        { provide: getRepositoryToken(PaymentAllocation), useValue: mockAllocationRepo },
        { provide: getRepositoryToken(Refund), useValue: mockRefundRepo },
        { provide: getRepositoryToken(PaymentProcessorRecord), useValue: mockProcessorRecordRepo },
        { provide: ORE_ENV, useValue: mockEnv },
        { provide: ORE_BUS, useValue: mockBus },
        { provide: ORE_PAYSTACK, useValue: mockPaystack },
        { provide: ORE_SCHEDULER, useValue: mockScheduler },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('initialize - checkout payments', () => {
    it('should initialize checkout payment with Paystack', async () => {
      const params = {
        checkoutId: 'checkout-123',
        amountPesewas: 5000,
        phone: '0501234567',
        allocations: [
          { orderId: 'order-1', allocatedPesewas: 3000 },
          { orderId: 'order-2', allocatedPesewas: 2000 },
        ],
      };

      mockPaystack.initialize.mockResolvedValue({
        authorizationUrl: 'https://paystack.test/pay/xyz',
        mode: 'live',
      });

      mockPaymentRepo.save.mockResolvedValue({
        id: 'payment-1',
        checkoutId: params.checkoutId,
        reference: 'ORE-TEST-123',
      } as CheckoutPayment);
      mockAllocationRepo.save.mockResolvedValue([]);

      const result = await service.initialize(params);

      expect(result.reference).toMatch(/^ORE-TEST-/);
      expect(result.paystackUrl).toBe('https://paystack.test/pay/xyz');
      expect(result.mode).toBe('live');
      expect(mockPaystack.initialize).toHaveBeenCalledWith(
        expect.objectContaining({
          amountPesewas: 5000,
          email: '0501234567@customers.ore.gh',
          currency: 'GHS',
        }),
      );
    });

    it('should create payment allocations for multiple orders', async () => {
      const params = {
        checkoutId: 'checkout-123',
        amountPesewas: 10000,
        phone: '0501234567',
        allocations: [
          { orderId: 'order-1', allocatedPesewas: 4000 },
          { orderId: 'order-2', allocatedPesewas: 6000 },
        ],
      };

      mockPaystack.initialize.mockResolvedValue({
        authorizationUrl: 'https://paystack.test/pay/xyz',
        mode: 'live',
      });

      mockPaymentRepo.save.mockResolvedValue({ id: 'payment-1' } as CheckoutPayment);
      mockAllocationRepo.save.mockImplementation((allocs) => Promise.resolve(allocs));

      await service.initialize(params);

      expect(mockAllocationRepo.save).toHaveBeenCalled();
      const allocations = mockAllocationRepo.save.mock.calls[0][0];
      expect(allocations).toHaveLength(2);
    });
  });

  describe('handleChargeSuccess', () => {
    it('should complete checkout payment', async () => {
      const payment = {
        id: 'payment-1',
        checkoutId: 'checkout-123',
        reference: 'ORE-TEST-456',
        amountPesewas: 5000,
        currency: 'GHS',
        status: CheckoutPaymentStatus.INITIATED,
      } as CheckoutPayment;

      mockPaymentRepo.findOne.mockResolvedValue(payment);
      mockPaymentRepo.save.mockResolvedValue({
        ...payment,
        status: CheckoutPaymentStatus.SUCCESS,
      });

      await service.handleChargeSuccess('ORE-TEST-456', 'event-123');

      expect(payment.status).toBe(CheckoutPaymentStatus.SUCCESS);
      expect(mockPaymentRepo.save).toHaveBeenCalledWith(payment);
      expect(mockBus.publish).toHaveBeenCalledWith(
        EVENTS.PAYMENT_CHARGE_SUCCEEDED,
        expect.objectContaining({
          reference: 'ORE-TEST-456',
          checkoutId: 'checkout-123',
          amountPesewas: 5000,
        }),
        expect.any(Object),
      );
    });

    it('should be idempotent for already completed payments', async () => {
      const payment = {
        id: 'payment-1',
        reference: 'ORE-TEST-789',
        status: CheckoutPaymentStatus.SUCCESS,
        paidAt: new Date(),
      } as CheckoutPayment;

      mockPaymentRepo.findOne.mockResolvedValue(payment);

      await service.handleChargeSuccess('ORE-TEST-789', 'event-456');

      // Should not publish event again
      expect(mockBus.publish).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for unknown reference', async () => {
      mockPaymentRepo.findOne.mockResolvedValue(null);

      await expect(service.handleChargeSuccess('unknown-ref', 'event-789')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('transfer - rider withdrawals', () => {
    it('should process successful transfer immediately in mock mode', async () => {
      const params = {
        amountPesewas: 50000,
        destination: 'RCP_test123',
        reference: 'withdrawal-123',
        metadata: { withdrawalId: 'wd-456' },
      };

      mockPaystack.transfer.mockResolvedValue({
        reference: params.reference,
        status: 'success',
      });

      const result = await service.transfer(params);

      expect(result.reference).toBe('withdrawal-123');
      expect(result.status).toBe('success');
      expect(mockBus.publish).toHaveBeenCalledWith(
        EVENTS.PAYMENT_TRANSFER_SUCCEEDED,
        expect.objectContaining({
          reference: 'withdrawal-123',
          withdrawalId: 'wd-456',
        }),
        expect.any(Object),
      );
    });

    it('should return processing status for pending transfers', async () => {
      const params = {
        amountPesewas: 75000,
        destination: 'RCP_test456',
        reference: 'withdrawal-789',
        metadata: {},
      };

      mockPaystack.transfer.mockResolvedValue({
        reference: params.reference,
        status: 'processing',
      });

      const result = await service.transfer(params);

      expect(result.status).toBe('processing');
      expect(mockBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('vendorTransfer', () => {
    it('should create recipient and process vendor transfer', async () => {
      const params = {
        amountPesewas: 100000,
        reference: 'vendor-transfer-123',
        payout: {
          type: 'MOMO' as const,
          provider: 'MTN',
          accountNumber: '0501234567',
          accountName: 'Test Vendor',
        },
        metadata: { vendorWithdrawalId: 'vw-789' },
      };

      mockPaystack.createRecipient.mockResolvedValue({
        recipientCode: 'RCP_vendor123',
      });

      mockPaystack.transferToRecipient.mockResolvedValue({
        reference: params.reference,
        status: 'success',
      });

      const result = await service.vendorTransfer(params);

      expect(result.reference).toBe('vendor-transfer-123');
      expect(result.status).toBe('success');
      expect(mockPaystack.createRecipient).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'mobile_money',
          name: 'Test Vendor',
          accountNumber: '0501234567',
        }),
      );
      expect(mockBus.publish).toHaveBeenCalledWith(
        EVENTS.PAYMENT_TRANSFER_SUCCEEDED,
        expect.objectContaining({
          vendorWithdrawalId: 'vw-789',
        }),
        expect.any(Object),
      );
    });

    it('should handle bank transfers', async () => {
      const params = {
        amountPesewas: 150000,
        reference: 'vendor-bank-456',
        payout: {
          type: 'BANK' as const,
          provider: 'GCB',
          accountNumber: '1234567890',
          accountName: 'Vendor Business',
        },
        metadata: {},
      };

      mockPaystack.createRecipient.mockResolvedValue({
        recipientCode: 'RCP_bank456',
      });

      mockPaystack.transferToRecipient.mockResolvedValue({
        reference: params.reference,
        status: 'processing',
      });

      const result = await service.vendorTransfer(params);

      expect(mockPaystack.createRecipient).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ghipss',
          accountNumber: '1234567890',
        }),
      );
      expect(result.status).toBe('processing');
    });
  });

  describe('refundOrder', () => {
    it('should refund order allocation', async () => {
      const allocation = {
        orderId: 'order-123',
        checkoutPaymentId: 'payment-456',
        allocatedPesewas: 5000,
      } as PaymentAllocation;

      const payment = {
        id: 'payment-456',
        reference: 'ORE-TEST-789',
        checkoutId: 'checkout-123',
      } as CheckoutPayment;

      mockAllocationRepo.findOne.mockResolvedValue(allocation);
      mockPaymentRepo.findOne.mockResolvedValue(payment);

      mockPaystack.refund.mockResolvedValue({
        reference: 'refund-ref-123',
        status: 'processed',
      });

      mockRefundRepo.save.mockResolvedValue({
        id: 'refund-1',
        orderId: 'order-123',
        status: RefundStatus.PROCESSED,
      } as Refund);

      const result = await service.refundOrder('order-123', 'Customer request', 5000);

      expect(result.orderId).toBe('order-123');
      expect(result.status).toBe(RefundStatus.PROCESSED);
      expect(mockPaystack.refund).toHaveBeenCalledWith('ORE-TEST-789', 5000, 'Customer request');
      expect(mockBus.publish).toHaveBeenCalledWith(
        EVENTS.PAYMENT_REFUND_PROCESSED,
        expect.objectContaining({
          orderId: 'order-123',
          amountPesewas: 5000,
        }),
        expect.any(Object),
      );
    });

    it('should throw NotFoundException for non-existent allocation', async () => {
      mockAllocationRepo.findOne.mockResolvedValue(null);

      await expect(service.refundOrder('order-999', 'reason', 1000)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.refundOrder('order-999', 'reason', 1000)).rejects.toThrow(
        'No payment allocation',
      );
    });

    it('should cap refund at allocated amount', async () => {
      const allocation = {
        orderId: 'order-456',
        checkoutPaymentId: 'payment-789',
        allocatedPesewas: 3000,
      } as PaymentAllocation;

      const payment = {
        id: 'payment-789',
        reference: 'ORE-TEST-REF',
      } as CheckoutPayment;

      mockAllocationRepo.findOne.mockResolvedValue(allocation);
      mockPaymentRepo.findOne.mockResolvedValue(payment);

      mockPaystack.refund.mockResolvedValue({
        reference: 'refund-ref-456',
        status: 'processed',
      });

      mockRefundRepo.save.mockResolvedValue({
        id: 'refund-2',
        amountPesewas: 3000,
      } as Refund);

      await service.refundOrder('order-456', 'Partial refund', 5000);

      // Should only refund the allocated amount (3000), not the requested 5000
      expect(mockPaystack.refund).toHaveBeenCalledWith('ORE-TEST-REF', 3000, 'Partial refund');
    });

    it('should throw BadRequestException for zero or negative refund', async () => {
      const allocation = {
        orderId: 'order-789',
        checkoutPaymentId: 'payment-abc',
        allocatedPesewas: 5000,
      } as PaymentAllocation;

      mockAllocationRepo.findOne.mockResolvedValue(allocation);
      mockPaymentRepo.findOne.mockResolvedValue({ id: 'payment-abc' } as CheckoutPayment);

      await expect(service.refundOrder('order-789', 'reason', 0)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.refundOrder('order-789', 'reason', -100)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('mockComplete', () => {
    it('should complete payment in mock mode', async () => {
      mockEnv.paystackMode = 'mock';

      const payment = {
        reference: 'ORE-TEST-MOCK-123',
        checkoutId: 'checkout-789',
        amountPesewas: 5000,
        status: CheckoutPaymentStatus.INITIATED,
      } as CheckoutPayment;

      mockPaymentRepo.findOne.mockResolvedValue(payment);
      mockPaymentRepo.save.mockResolvedValue({
        ...payment,
        status: CheckoutPaymentStatus.SUCCESS,
      });

      await service.mockComplete('ORE-TEST-MOCK-123');

      expect(mockBus.publish).toHaveBeenCalled();
    });

    it('should throw NotFoundException in live mode', async () => {
      mockEnv.paystackMode = 'live';

      await expect(service.mockComplete('any-ref')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTransferStatus', () => {
    it('should return transfer status from Paystack', async () => {
      mockPaystack.getTransferStatus.mockResolvedValue({
        reference: 'transfer-123',
        status: 'success',
      });

      const result = await service.getTransferStatus('transfer-123');

      expect(result.reference).toBe('transfer-123');
      expect(result.status).toBe('success');
      expect(mockPaystack.getTransferStatus).toHaveBeenCalledWith('transfer-123');
    });

    it('should handle processing status', async () => {
      mockPaystack.getTransferStatus.mockResolvedValue({
        reference: 'transfer-456',
        status: 'processing',
      });

      const result = await service.getTransferStatus('transfer-456');

      expect(result.status).toBe('processing');
    });

    it('should handle failed status', async () => {
      mockPaystack.getTransferStatus.mockResolvedValue({
        reference: 'transfer-789',
        status: 'failed',
      });

      const result = await service.getTransferStatus('transfer-789');

      expect(result.status).toBe('failed');
    });
  });

  describe('getReconciliationReport', () => {
    it('should calculate settled amount for date', async () => {
      (mockPaymentRepo as any).createQueryBuilder = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: 150000 }),
      });

      const result = await service.getReconciliationReport('2026-08-20');

      expect(result.settledAmountPesewas).toBe(150000);
    });

    it('should return zero for dates with no settlements', async () => {
      (mockPaymentRepo as any).createQueryBuilder = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: null }),
      });

      const result = await service.getReconciliationReport('2026-08-21');

      expect(result.settledAmountPesewas).toBe(0);
    });
  });
});
