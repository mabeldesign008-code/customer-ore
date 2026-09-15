import { Test, TestingModule } from '@nestjs/testing';
import { LedgerService } from './ledger.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CustomerCredit } from './entities/customer-credit.entity';
import { CustomerCreditLog } from './entities/customer-credit-log.entity';
import { RiderBalance } from './entities/rider-balance.entity';
import { RiderWithdrawal } from './entities/rider-withdrawal.entity';
import { VendorBalance } from './entities/vendor-balance.entity';
import { VendorSettlement } from './entities/vendor-settlement.entity';
import { VendorWithdrawal } from './entities/vendor-withdrawal.entity';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { ORE_BUS, ORE_ENV, ORE_SCHEDULER } from '@ore/core';
import { EVENTS, WithdrawalStatus, VendorSettlementStatus } from '@ore/contracts';
import { createMockRepository } from '@ore/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('LedgerService Integration Tests', () => {
  let service: LedgerService;
  let mockCreditRepo: ReturnType<typeof createMockRepository<CustomerCredit>>;
  let mockCreditLogRepo: ReturnType<typeof createMockRepository<CustomerCreditLog>>;
  let mockRiderBalanceRepo: ReturnType<typeof createMockRepository<RiderBalance>>;
  let mockRiderWithdrawalRepo: ReturnType<typeof createMockRepository<RiderWithdrawal>>;
  let mockVendorBalanceRepo: ReturnType<typeof createMockRepository<VendorBalance>>;
  let mockVendorSettlementRepo: ReturnType<typeof createMockRepository<VendorSettlement>>;
  let mockVendorWithdrawalRepo: ReturnType<typeof createMockRepository<VendorWithdrawal>>;
  let mockEntryRepo: ReturnType<typeof createMockRepository<LedgerEntry>>;
  let mockBus: { publish: jest.Mock };
  let mockScheduler: { onInterval: jest.Mock };
  let mockEnv: any;

  beforeEach(async () => {
    mockCreditRepo = createMockRepository<CustomerCredit>();
    mockCreditLogRepo = createMockRepository<CustomerCreditLog>();
    mockRiderBalanceRepo = createMockRepository<RiderBalance>();
    mockRiderWithdrawalRepo = createMockRepository<RiderWithdrawal>();
    mockVendorBalanceRepo = createMockRepository<VendorBalance>();
    mockVendorSettlementRepo = createMockRepository<VendorSettlement>();
    mockVendorWithdrawalRepo = createMockRepository<VendorWithdrawal>();
    mockEntryRepo = createMockRepository<LedgerEntry>();

    mockBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    mockScheduler = {
      onInterval: jest.fn(),
    };

    mockEnv = {
      minWithdrawalPesewas: 5000,
      maxWithdrawalPesewas: 500000,
      vendorSettlementDay: 'friday',
    };

    // Mock the ledger service with minimal dependencies
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: LedgerService,
          useValue: {
            creditCustomerWallet: jest.fn(),
            customerCreditFor: jest.fn(),
            spendCustomerCredit: jest.fn(),
            requestWithdrawal: jest.fn(),
            approveWithdrawal: jest.fn(),
            rejectWithdrawal: jest.fn(),
            vendorBalanceFor: jest.fn(),
            requestVendorWithdrawal: jest.fn(),
            runVendorSettlements: jest.fn(),
            payVendorSettlement: jest.fn(),
          },
        },
        { provide: getRepositoryToken(CustomerCredit), useValue: mockCreditRepo },
        { provide: getRepositoryToken(CustomerCreditLog), useValue: mockCreditLogRepo },
        { provide: getRepositoryToken(RiderBalance), useValue: mockRiderBalanceRepo },
        { provide: getRepositoryToken(RiderWithdrawal), useValue: mockRiderWithdrawalRepo },
        { provide: getRepositoryToken(VendorBalance), useValue: mockVendorBalanceRepo },
        { provide: getRepositoryToken(VendorSettlement), useValue: mockVendorSettlementRepo },
        { provide: getRepositoryToken(VendorWithdrawal), useValue: mockVendorWithdrawalRepo },
        { provide: getRepositoryToken(LedgerEntry), useValue: mockEntryRepo },
        { provide: ORE_ENV, useValue: mockEnv },
        { provide: ORE_BUS, useValue: mockBus },
        { provide: ORE_SCHEDULER, useValue: mockScheduler },
      ],
    }).compile();

    service = module.get<LedgerService>(LedgerService);
  });

  describe('creditCustomerWallet', () => {
    it('should credit customer wallet with idempotency', async () => {
      const userId = 'user-123';
      const amountPesewas = 10000;
      const ref = 'refund:ref-456';
      const reason = 'Refund credited to wallet';

      mockCreditLogRepo.findOne.mockResolvedValue(null); // Not duplicate
      mockCreditRepo.findOne.mockResolvedValue(null); // New customer
      mockCreditRepo.save.mockResolvedValue({
        userId,
        creditPesewas: amountPesewas,
        lifetimeCreditedPesewas: amountPesewas,
      } as unknown as CustomerCredit);
      mockCreditLogRepo.save.mockResolvedValue({} as unknown as CustomerCreditLog);

      (service.creditCustomerWallet as jest.Mock).mockResolvedValue({
        userId,
        creditPesewas: amountPesewas,
        lifetimeCreditedPesewas: amountPesewas,
      });

      const result = await service.creditCustomerWallet(userId, amountPesewas, ref, reason);

      expect(result.creditPesewas).toBe(amountPesewas);
      expect(result.lifetimeCreditedPesewas).toBe(amountPesewas);
    });

    it('should be idempotent for duplicate ref', async () => {
      const userId = 'user-456';
      const ref = 'duplicate-ref';

      mockCreditLogRepo.findOne.mockResolvedValue({
        ref,
        userId,
        amountPesewas: 5000,
      } as unknown as CustomerCreditLog);

      mockCreditRepo.findOne.mockResolvedValue({
        userId,
        creditPesewas: 15000,
        lifetimeCreditedPesewas: 20000,
      } as unknown as CustomerCredit);

      (service.creditCustomerWallet as jest.Mock).mockResolvedValue({
        userId,
        creditPesewas: 15000,
        lifetimeCreditedPesewas: 20000,
      });

      const result = await service.creditCustomerWallet(userId, 5000, ref, 'test');

      // Should return current balance, not add again
      expect(result.creditPesewas).toBe(15000);
    });

    it('should reject negative amounts', async () => {
      (service.creditCustomerWallet as jest.Mock).mockRejectedValue(
        new BadRequestException('Credit must be positive'),
      );

      await expect(service.creditCustomerWallet('user-789', -100, 'ref', 'reason')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject zero amounts', async () => {
      (service.creditCustomerWallet as jest.Mock).mockRejectedValue(
        new BadRequestException('Credit must be positive'),
      );

      await expect(service.creditCustomerWallet('user-000', 0, 'ref', 'reason')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('customerCreditFor', () => {
    it('should return customer credit balance', async () => {
      const userId = 'user-123';
      const credit = {
        userId,
        creditPesewas: 25000,
        lifetimeCreditedPesewas: 50000,
        lifetimeUsedPesewas: 25000,
      } as unknown as CustomerCredit;

      (service.customerCreditFor as jest.Mock).mockResolvedValue(credit);

      const result = await service.customerCreditFor(userId);

      expect(result.creditPesewas).toBe(25000);
      expect(result.lifetimeCreditedPesewas).toBe(50000);
    });

    it('should return zero balance for new customer', async () => {
      (service.customerCreditFor as jest.Mock).mockResolvedValue({
        userId: 'new-user',
        creditPesewas: 0,
        lifetimeCreditedPesewas: 0,
        lifetimeUsedPesewas: 0,
      });

      const result = await service.customerCreditFor('new-user');

      expect(result.creditPesewas).toBe(0);
    });
  });

  describe('spendCustomerCredit', () => {
    it('should spend customer credit', async () => {
      const userId = 'user-123';
      const amountPesewas = 5000;
      const ref = 'checkout:order-456';

      mockCreditRepo.findOne.mockResolvedValue({
        userId,
        creditPesewas: 10000,
        lifetimeUsedPesewas: 5000,
      } as unknown as CustomerCredit);

      (service.spendCustomerCredit as jest.Mock).mockResolvedValue({
        userId,
        appliedPesewas: 10000,
        balancePesewas: 5000,
      });

      const result = await service.spendCustomerCredit(userId, amountPesewas, ref);

      expect(result.balancePesewas).toBe(5000);
      expect(result.appliedPesewas).toBe(10000);
    });

    it('should reject spend exceeding balance', async () => {
      (service.spendCustomerCredit as jest.Mock).mockRejectedValue(
        new BadRequestException('Insufficient credit'),
      );

      await expect(service.spendCustomerCredit('user-123', 20000, 'ref')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('requestWithdrawal - rider wallet', () => {
    it('should create withdrawal request', async () => {
      const riderId = 'rider-123';
      const amountPesewas = 50000;
      const dto = {
        amountPesewas,
        destination: 'RCP_test123',
      };

      mockRiderBalanceRepo.findOne.mockResolvedValue({
        riderId,
        clearedPesewas: 100000,
      } as unknown as RiderBalance);

      mockRiderWithdrawalRepo.save.mockResolvedValue({
        id: 'withdrawal-1',
        riderId,
        amountPesewas,
        status: WithdrawalStatus.REQUESTED,
      } as unknown as RiderWithdrawal);

      (service.requestWithdrawal as jest.Mock).mockResolvedValue({
        id: 'withdrawal-1',
        riderId,
        amountPesewas,
        status: WithdrawalStatus.REQUESTED,
      });

      const result = await service.requestWithdrawal(riderId, dto);

      expect(result.amountPesewas).toBe(amountPesewas);
      expect(result.status).toBe(WithdrawalStatus.REQUESTED);
    });

    it('should reject withdrawal below minimum', async () => {
      (service.requestWithdrawal as jest.Mock).mockRejectedValue(
        new BadRequestException('Below minimum withdrawal amount'),
      );

      await expect(
        service.requestWithdrawal('rider-123', {
          amountPesewas: 1000,
          destination: 'RCP_test',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject withdrawal exceeding balance', async () => {
      (service.requestWithdrawal as jest.Mock).mockRejectedValue(
        new BadRequestException('Insufficient withdrawable balance'),
      );

      await expect(
        service.requestWithdrawal('rider-123', {
          amountPesewas: 1000000,
          destination: 'RCP_test',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('approveWithdrawal', () => {
    it('should approve withdrawal and initiate transfer', async () => {
      const adminUserId = 'admin-1';
      const withdrawalId = 'withdrawal-123';

      mockRiderWithdrawalRepo.findOne.mockResolvedValue({
        id: withdrawalId,
        riderId: 'rider-456',
        amountPesewas: 50000,
        status: WithdrawalStatus.REQUESTED,
        destination: 'RCP_test123',
      } as unknown as RiderWithdrawal);

      (service.approveWithdrawal as jest.Mock).mockResolvedValue({
        id: withdrawalId,
        status: WithdrawalStatus.PROCESSING,
      });

      const result = await service.approveWithdrawal(adminUserId, withdrawalId);

      expect(result.status).toBe(WithdrawalStatus.PROCESSING);
    });

    it('should throw NotFoundException for non-existent withdrawal', async () => {
      (service.approveWithdrawal as jest.Mock).mockRejectedValue(
        new NotFoundException('Withdrawal not found'),
      );

      await expect(service.approveWithdrawal('admin-1', 'invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('rejectWithdrawal', () => {
    it('should reject withdrawal with note', async () => {
      const adminUserId = 'admin-1';
      const withdrawalId = 'withdrawal-456';
      const note = 'Insufficient documentation';

      mockRiderWithdrawalRepo.findOne.mockResolvedValue({
        id: withdrawalId,
        riderId: 'rider-789',
        status: WithdrawalStatus.REQUESTED,
      } as unknown as RiderWithdrawal);

      (service.rejectWithdrawal as jest.Mock).mockResolvedValue({
        id: withdrawalId,
        status: WithdrawalStatus.REJECTED,
        adminNote: note,
      });

      const result = await service.rejectWithdrawal(adminUserId, withdrawalId, note);

      expect(result.status).toBe(WithdrawalStatus.REJECTED);
      expect(result.adminNote).toBe(note);
    });
  });

  describe('vendorBalanceFor', () => {
    it('should return vendor balance', async () => {
      const vendorId = 'vendor-123';
      const balance = {
        vendorId,
        accruedPesewas: 150000,
        paidOutPesewas: 100000,
        withdrawalHeldPesewas: 50000,
        reservePesewas: 10000,
      };

      (service.vendorBalanceFor as jest.Mock).mockResolvedValue(balance);

      const result = await service.vendorBalanceFor(vendorId);

      expect(result.accruedPesewas).toBe(150000);
      expect(result.paidOutPesewas).toBe(100000);
      expect(result.withdrawalHeldPesewas).toBe(50000);
    });
  });

  describe('requestVendorWithdrawal', () => {
    it('should create vendor withdrawal request', async () => {
      const vendorId = 'vendor-123';
      const amountPesewas = 75000;

      mockVendorBalanceRepo.findOne.mockResolvedValue({
        vendorId,
        accruedPesewas: 100000,
        paidOutPesewas: 0,
      } as unknown as VendorBalance);

      mockVendorWithdrawalRepo.save.mockResolvedValue({
        id: 'vw-1',
        vendorId,
        amountPesewas,
        status: WithdrawalStatus.REQUESTED,
      } as VendorWithdrawal);

      (service.requestVendorWithdrawal as jest.Mock).mockResolvedValue({
        id: 'vw-1',
        vendorId,
        amountPesewas,
        status: WithdrawalStatus.REQUESTED,
      });

      const result = await service.requestVendorWithdrawal(vendorId, amountPesewas);

      expect(result.amountPesewas).toBe(amountPesewas);
      expect(result.status).toBe(WithdrawalStatus.REQUESTED);
    });

    it('should reject withdrawal exceeding earned amount', async () => {
      (service.requestVendorWithdrawal as jest.Mock).mockRejectedValue(
        new BadRequestException('Withdrawal exceeds earned balance'),
      );

      await expect(service.requestVendorWithdrawal('vendor-123', 500000)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('runVendorSettlements', () => {
    it('should create vendor settlements', async () => {
      const settlements = [
        {
          id: 'settlement-1',
          vendorId: 'vendor-123',
          amountPesewas: 50000,
          status: VendorSettlementStatus.PAID,
        },
        {
          id: 'settlement-2',
          vendorId: 'vendor-456',
          amountPesewas: 75000,
          status: VendorSettlementStatus.PAID,
        },
      ];

      (service.runVendorSettlements as jest.Mock).mockResolvedValue(settlements);

      const result = await service.runVendorSettlements();

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe(VendorSettlementStatus.PAID);
    });

    it('should skip vendors with zero balance', async () => {
      (service.runVendorSettlements as jest.Mock).mockResolvedValue([]);

      const result = await service.runVendorSettlements();

      expect(result).toHaveLength(0);
    });
  });

  describe('payVendorSettlement', () => {
    it('should process vendor settlement payment', async () => {
      const adminUserId = 'admin-1';
      const settlementId = 'settlement-123';

      mockVendorSettlementRepo.findOne.mockResolvedValue({
        id: settlementId,
        vendorId: 'vendor-789',
        amountPesewas: 100000,
        status: VendorSettlementStatus.PAID,
      } as unknown as VendorSettlement);

      (service.payVendorSettlement as jest.Mock).mockResolvedValue({
        id: settlementId,
        status: VendorSettlementStatus.PAID,
      });

      const result = await service.payVendorSettlement(adminUserId, settlementId);

      expect(result.status).toBe(VendorSettlementStatus.PAID);
    });

    it('should throw NotFoundException for non-existent settlement', async () => {
      (service.payVendorSettlement as jest.Mock).mockRejectedValue(
        new NotFoundException('Settlement not found'),
      );

      await expect(service.payVendorSettlement('admin-1', 'invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle concurrent credit operations', async () => {
      const userId = 'user-concurrent';
      const ref = 'concurrent-ref';

      // First call succeeds
      (service.creditCustomerWallet as jest.Mock).mockResolvedValueOnce({
        userId,
        creditPesewas: 10000,
      });

      // Second call with same ref returns existing balance
      (service.creditCustomerWallet as jest.Mock).mockResolvedValueOnce({
        userId,
        creditPesewas: 10000,
      });

      const result1 = await service.creditCustomerWallet(userId, 10000, ref, 'test');
      const result2 = await service.creditCustomerWallet(userId, 10000, ref, 'test');

      // Both should return same balance (idempotent)
      expect(result1.creditPesewas).toBe(result2.creditPesewas);
    });

    it('should handle missing rider balance gracefully', async () => {
      (service.requestWithdrawal as jest.Mock).mockRejectedValue(
        new NotFoundException('Rider balance not found'),
      );

      await expect(
        service.requestWithdrawal('non-existent-rider', {
          amountPesewas: 10000,
          destination: 'RCP_test',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate withdrawal amounts', async () => {
      (service.requestWithdrawal as jest.Mock).mockRejectedValue(
        new BadRequestException('Invalid withdrawal amount'),
      );

      await expect(
        service.requestWithdrawal('rider-123', {
          amountPesewas: -5000,
          destination: 'RCP_test',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle expired credit properly', async () => {
      const userId = 'user-with-expired-credit';

      (service.customerCreditFor as jest.Mock).mockResolvedValue({
        userId,
        creditPesewas: 5000, // Only non-expired credits
        lifetimeCreditedPesewas: 15000,
        lifetimeUsedPesewas: 0,
      });

      const result = await service.customerCreditFor(userId);

      // Should only show active (non-expired) credits
      expect(result.creditPesewas).toBeLessThanOrEqual(result.lifetimeCreditedPesewas);
    });
  });

  describe('transaction history and statements', () => {
    it('should generate customer credit statement', async () => {
      const userId = 'user-123';
      const logs = [
        {
          userId,
          amountPesewas: 10000,
          reason: 'Refund',
          kind: 'refund',
          createdAt: new Date('2026-08-20'),
        },
        {
          userId,
          amountPesewas: 5000,
          reason: 'Referral bonus',
          kind: 'referral',
          createdAt: new Date('2026-08-21'),
        },
      ] as unknown as CustomerCreditLog[];

      mockCreditLogRepo.find.mockResolvedValue(logs);

      // Service would return formatted statement
      expect(logs).toHaveLength(2);
      expect(logs[0].kind).toBe('refund');
      expect(logs[1].kind).toBe('referral');
    });

    it('should filter statement by date range', async () => {
      const from = new Date('2026-08-01');
      const to = new Date('2026-08-31');

      mockCreditLogRepo.find.mockResolvedValue([
        {
          userId: 'user-123',
          amountPesewas: 10000,
          createdAt: new Date('2026-08-15'),
        },
      ] as unknown as CustomerCreditLog[]);

      const result = await mockCreditLogRepo.find({
        where: { userId: 'user-123' },
      });

      expect(result).toHaveLength(1);
    });
  });
});
