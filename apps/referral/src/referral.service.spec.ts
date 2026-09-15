import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReferralService } from './referral.service';
import { ReferralCode } from './entities/referral-code.entity';
import { Referral } from './entities/referral.entity';
import { ORE_BUS, ORE_ENV, ORE_DEDUPE, InMemoryConsumerDedupe } from '@ore/core';
import { ReferralStatus, EVENTS } from '@ore/contracts';
import { createMockRepository } from '@ore/testing';

describe('ReferralService', () => {
  let service: ReferralService;
  let mockCodesRepo: ReturnType<typeof createMockRepository<ReferralCode>>;
  let mockReferralsRepo: ReturnType<typeof createMockRepository<Referral>>;
  let mockBus: { subscribe: jest.Mock; publish: jest.Mock };
  let mockEnv: any;

  beforeEach(async () => {
    mockCodesRepo = createMockRepository<ReferralCode>();
    mockReferralsRepo = createMockRepository<Referral>();

    mockBus = {
      subscribe: jest.fn().mockResolvedValue(undefined),
      publish: jest.fn().mockResolvedValue(undefined),
    };

    mockEnv = {
      referralMonthlyCap: 20,
      referralVelocityMin: 3,
      referralMinOrderPesewas: 2000,
      referralReferrerCreditPesewas: 500,
      referralRefereeCreditPesewas: 1000,
      referralCreditExpiryDays: 14,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralService,
        { provide: getRepositoryToken(ReferralCode), useValue: mockCodesRepo },
        { provide: getRepositoryToken(Referral), useValue: mockReferralsRepo },
        { provide: ORE_BUS, useValue: mockBus },
        { provide: ORE_DEDUPE, useValue: new InMemoryConsumerDedupe() },
        { provide: ORE_ENV, useValue: mockEnv },
      ],
    }).compile();

    service = module.get<ReferralService>(ReferralService);
  });

  describe('getOrCreateCode', () => {
    it('returns existing code when one exists for the user', async () => {
      const code = { id: 'code-1', userId: 'user-1', code: 'OR-ABCDE' } as ReferralCode;
      mockCodesRepo.findOne.mockResolvedValue(code);

      const result = await service.getOrCreateCode('user-1', '0501234567');

      expect(result.code).toBe('OR-ABCDE');
      expect(mockCodesRepo.save).not.toHaveBeenCalled();
    });

    it('creates a new code when none exists', async () => {
      mockCodesRepo.findOne.mockResolvedValueOnce(null); // no existing code
      mockCodesRepo.findOne.mockResolvedValueOnce(null); // no duplicate during generation
      mockCodesRepo.create.mockReturnValue({ userId: 'user-2', code: 'OR-XYZAB' } as ReferralCode);
      mockCodesRepo.save.mockResolvedValue({ id: 'code-2', userId: 'user-2', code: 'OR-XYZAB' } as ReferralCode);

      const result = await service.getOrCreateCode('user-2', '0509876543');

      expect(result.userId).toBe('user-2');
      expect(mockCodesRepo.save).toHaveBeenCalled();
    });
  });

  describe('claim', () => {
    const referrerCode = { id: 'code-1', userId: 'referrer-1', code: 'OR-REF01' } as ReferralCode;

    beforeEach(() => {
      // Default: referrer is a different user
      jest.spyOn(service as any, 'fetchUser').mockResolvedValue({ id: 'referrer-1', phone: '0501111111' });
      mockCodesRepo.findOne.mockResolvedValue(referrerCode);
      mockReferralsRepo.findOne.mockResolvedValue(null); // no duplicate
      mockReferralsRepo.count.mockResolvedValue(0);       // no velocity flag
      mockReferralsRepo.create.mockImplementation((v: any) => v as Referral);
      mockReferralsRepo.save.mockImplementation(async (v: any) => ({ id: 'ref-1', ...v } as Referral));
      mockCodesRepo.save.mockResolvedValue(referrerCode);
    });

    it('creates a referral record and publishes REFERRAL_CLAIMED', async () => {
      const result = await service.claim('OR-REF01', '0502222222', 'new-user-1');

      expect(result.referrerUserId).toBe('referrer-1');
      expect(result.refereePhone).toBe('0502222222');
      expect(mockBus.publish).toHaveBeenCalledWith(
        EVENTS.REFERRAL_CLAIMED,
        expect.objectContaining({ code: 'OR-REF01', referrerUserId: 'referrer-1' }),
      );
    });

    it('counts claims in the current calendar month instead of a lifetime counter', async () => {
      await service.claim('OR-REF01', '0502222222', 'new-user-1');
      // the cap query is scoped to claims since the 1st of this month
      const monthQuery = mockReferralsRepo.count.mock.calls[0][0];
      expect(monthQuery.where.code).toBe('OR-REF01');
      expect(monthQuery.where.createdAt._value).toBeInstanceOf(Date);
      // no mutation of a stored counter anymore
      expect(mockCodesRepo.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for unknown referral code', async () => {
      mockCodesRepo.findOne.mockResolvedValue(null);
      await expect(service.claim('INVALID', '0502222222')).rejects.toThrow(NotFoundException);
      await expect(service.claim('INVALID', '0502222222')).rejects.toThrow('Referral code not found');
    });

    it('blocks self-referral and throws BadRequestException', async () => {
      // Referrer's phone matches the claiming phone
      jest.spyOn(service as any, 'fetchUser').mockResolvedValue({ id: 'referrer-1', phone: '0502222222' });
      mockReferralsRepo.create.mockImplementation((v: any) => v as Referral);
      mockReferralsRepo.save.mockImplementation(async (v: any) => v as Referral);

      await expect(service.claim('OR-REF01', '0502222222', 'referrer-1')).rejects.toThrow(BadRequestException);
      await expect(service.claim('OR-REF01', '0502222222', 'referrer-1')).rejects.toThrow(
        'You cannot use your own referral code',
      );
    });

    it('returns existing referral for repeat phone on same code (not re-credited)', async () => {
      const existing = { id: 'ref-existing', code: 'OR-REF01', refereePhone: '0502222222', status: ReferralStatus.PENDING } as Referral;
      mockReferralsRepo.findOne.mockResolvedValue(existing);

      const result = await service.claim('OR-REF01', '0502222222');

      // No new save, returns the existing record
      expect(result.id).toBe('ref-existing');
    });

    it('throws ConflictException if phone already credited on this code', async () => {
      const credited = { id: 'ref-credited', code: 'OR-REF01', refereePhone: '0502222222', status: ReferralStatus.CREDITED } as Referral;
      mockReferralsRepo.findOne.mockResolvedValue(credited);

      await expect(service.claim('OR-REF01', '0502222222')).rejects.toThrow(ConflictException);
      await expect(service.claim('OR-REF01', '0502222222')).rejects.toThrow(
        'This phone has already been referred by that code',
      );
    });

    it('throws ConflictException when referrer hits monthly cap', async () => {
      mockReferralsRepo.findOne.mockResolvedValue(null);
      // 20 claims this calendar month → over the cap (no stored counter involved)
      mockReferralsRepo.count.mockResolvedValue(20);
      mockReferralsRepo.create.mockImplementation((v: any) => v as Referral);
      mockReferralsRepo.save.mockImplementation(async (v: any) => v as Referral);

      await expect(service.claim('OR-REF01', '0502222222')).rejects.toThrow(ConflictException);
      await expect(service.claim('OR-REF01', '0502222222')).rejects.toThrow(
        'monthly referral cap',
      );
    });

    it('throws ConflictException when velocity limit is hit', async () => {
      mockReferralsRepo.findOne.mockResolvedValue(null);
      // 3 recent claims from this phone in the last 24h
      mockReferralsRepo.count.mockResolvedValue(3);
      mockReferralsRepo.create.mockImplementation((v: any) => v as Referral);
      mockReferralsRepo.save.mockImplementation(async (v: any) => v as Referral);

      await expect(service.claim('OR-REF01', '0502222222')).rejects.toThrow(ConflictException);
      await expect(service.claim('OR-REF01', '0502222222')).rejects.toThrow('flagged for review');
    });
  });

  describe('listMine', () => {
    it('returns referrals where userId is the referrer', async () => {
      const referrals = [
        { id: 'ref-1', referrerUserId: 'user-1', status: ReferralStatus.CREDITED },
        { id: 'ref-2', referrerUserId: 'user-1', status: ReferralStatus.PENDING },
      ] as Referral[];
      mockReferralsRepo.find.mockResolvedValue(referrals);

      const result = await service.listMine('user-1');

      expect(result).toHaveLength(2);
      expect(mockReferralsRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { referrerUserId: 'user-1' } }),
      );
    });
  });

  describe('listAll', () => {
    it('returns all referrals ordered by createdAt desc', async () => {
      mockReferralsRepo.find.mockResolvedValue([]);
      await service.listAll();
      expect(mockReferralsRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ order: { createdAt: 'DESC' } }),
      );
    });
  });

  describe('block', () => {
    it('sets status to BLOCKED and appends fraud flag', async () => {
      const referral = { id: 'ref-1', status: ReferralStatus.PENDING, fraudFlags: ['velocity'] } as Referral;
      mockReferralsRepo.findOne.mockResolvedValue(referral);
      mockReferralsRepo.save.mockImplementation(async (v: any) => v as Referral);

      const result = await service.block('admin-1', 'ref-1', 'suspected fraud');

      expect(result.status).toBe(ReferralStatus.BLOCKED);
      expect(result.fraudFlags).toContain('admin_block:suspected fraud');
    });

    it('throws NotFoundException for unknown referral', async () => {
      mockReferralsRepo.findOne.mockResolvedValue(null);
      await expect(service.block('admin-1', 'invalid-id', 'reason')).rejects.toThrow(NotFoundException);
    });
  });

  describe('stats', () => {
    it('returns code, pending count, credited count, and earned pesewas', async () => {
      const code = { id: 'code-1', userId: 'user-1', code: 'OR-STATS' } as ReferralCode;
      mockCodesRepo.findOne.mockResolvedValue(code);
      mockReferralsRepo.find.mockResolvedValue([
        { status: ReferralStatus.CREDITED } as Referral,
        { status: ReferralStatus.CREDITED } as Referral,
        { status: ReferralStatus.PENDING } as Referral,
      ]);

      const result = await service.stats('user-1');

      expect(result.code).toBe(code);
      expect(result.credited).toBe(2);
      expect(result.pending).toBe(1);
      expect(result.earnedPesewas).toBe(2 * mockEnv.referralReferrerCreditPesewas);
    });
  });

  describe('init', () => {
    it('subscribes to ORDER_DELIVERED to handle qualification', async () => {
      await service.init();
      expect(mockBus.subscribe).toHaveBeenCalledWith(
        EVENTS.ORDER_DELIVERED,
        expect.any(Function),
      );
    });
  });
});
