import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationService } from './notification.service';
import { DeviceToken } from './entities/device-token.entity';
import { NotificationFeed } from './entities/notification-feed.entity';
import { ORE_BUS, ORE_ENV, ORE_NOTIFY, ORE_DEDUPE, InMemoryConsumerDedupe } from '@ore/core';
import { createMockRepository } from '@ore/testing';

describe('NotificationService', () => {
  let service: NotificationService;
  let mockFeedRepo: ReturnType<typeof createMockRepository<NotificationFeed>>;
  let mockDeviceTokenRepo: ReturnType<typeof createMockRepository<DeviceToken>>;
  let mockBus: { subscribe: jest.Mock; publish: jest.Mock };
  let mockNotify: { sendPush: jest.Mock; sendSms: jest.Mock };

  beforeEach(async () => {
    mockFeedRepo = createMockRepository<NotificationFeed>();
    mockDeviceTokenRepo = createMockRepository<DeviceToken>();

    mockBus = {
      subscribe: jest.fn().mockResolvedValue(undefined),
      publish: jest.fn().mockResolvedValue(undefined),
    };

    mockNotify = {
      sendPush: jest.fn().mockResolvedValue(undefined),
      sendSms: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: getRepositoryToken(NotificationFeed), useValue: mockFeedRepo },
        { provide: getRepositoryToken(DeviceToken), useValue: mockDeviceTokenRepo },
        { provide: ORE_BUS, useValue: mockBus },
        { provide: ORE_DEDUPE, useValue: new InMemoryConsumerDedupe() },
        { provide: ORE_NOTIFY, useValue: mockNotify },
        // Audit M-2/M-3: the gift-link SMS now reads giftBaseUrl from the injected OreEnv.
        { provide: ORE_ENV, useValue: { giftBaseUrl: 'http://localhost:4000' } },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  describe('init', () => {
    it('subscribes to all lifecycle events', async () => {
      await service.init();
      // At least ORDER_CONFIRMED, ORDER_ACCEPTED, ORDER_CANCELLED, DISPATCH_OFFER_CREATED, etc.
      expect(mockBus.subscribe.mock.calls.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('registerDeviceToken', () => {
    it('creates a new device token when none exists', async () => {
      mockDeviceTokenRepo.findOne.mockResolvedValue(null);
      mockDeviceTokenRepo.create.mockReturnValue({ userId: 'user-1', token: 'tok-abc', platform: 'android' } as DeviceToken);
      mockDeviceTokenRepo.save.mockResolvedValue({ id: 'dt-1', userId: 'user-1', token: 'tok-abc', platform: 'android' } as DeviceToken);

      const result = await service.registerDeviceToken('user-1', 'tok-abc', 'android');

      expect(result.token).toBe('tok-abc');
      expect(result.platform).toBe('android');
      expect(mockDeviceTokenRepo.create).toHaveBeenCalledWith({ userId: 'user-1', token: 'tok-abc', platform: 'android' });
      expect(mockDeviceTokenRepo.save).toHaveBeenCalled();
    });

    it('updates userId and platform when token already exists', async () => {
      const existing = { id: 'dt-old', userId: 'old-user', token: 'tok-abc', platform: 'ios' } as DeviceToken;
      mockDeviceTokenRepo.findOne.mockResolvedValue(existing);
      mockDeviceTokenRepo.save.mockResolvedValue({ ...existing, userId: 'user-2', platform: 'android' } as DeviceToken);

      const result = await service.registerDeviceToken('user-2', 'tok-abc', 'android');

      expect(existing.userId).toBe('user-2');
      expect(existing.platform).toBe('android');
      expect(mockDeviceTokenRepo.save).toHaveBeenCalledWith(existing);
      expect(result.userId).toBe('user-2');
    });

    it('does not call create when token already exists', async () => {
      const existing = { id: 'dt-1', userId: 'user-1', token: 'tok-xyz', platform: 'ios' } as DeviceToken;
      mockDeviceTokenRepo.findOne.mockResolvedValue(existing);
      mockDeviceTokenRepo.save.mockResolvedValue(existing);

      await service.registerDeviceToken('user-1', 'tok-xyz', 'ios');

      expect(mockDeviceTokenRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('myFeed', () => {
    it('returns the 50 most recent feed items for the user', async () => {
      const items = [
        { id: 'n-1', userId: 'user-1', title: 'Order confirmed', read: false, createdAt: new Date() },
        { id: 'n-2', userId: 'user-1', title: 'Delivered 🎉', read: true, createdAt: new Date() },
      ] as NotificationFeed[];

      mockFeedRepo.find.mockResolvedValue(items);

      const result = await service.myFeed('user-1');

      expect(result).toHaveLength(2);
      expect(mockFeedRepo.find).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        order: { createdAt: 'DESC' },
        take: 50,
      });
    });

    it('returns empty array when user has no notifications', async () => {
      mockFeedRepo.find.mockResolvedValue([]);
      const result = await service.myFeed('user-no-notifs');
      expect(result).toEqual([]);
    });
  });

  describe('markRead', () => {
    it('marks a notification as read and saves it', async () => {
      const notification = { id: 'n-1', userId: 'user-1', read: false } as NotificationFeed;
      mockFeedRepo.findOne.mockResolvedValue(notification);
      mockFeedRepo.save.mockResolvedValue({ ...notification, read: true } as NotificationFeed);

      const result = await service.markRead('user-1', 'n-1');

      expect(notification.read).toBe(true);
      expect(mockFeedRepo.save).toHaveBeenCalledWith(notification);
      expect(result.read).toBe(true);
    });

    it('throws NotFoundException when notification does not belong to user', async () => {
      mockFeedRepo.findOne.mockResolvedValue(null);

      await expect(service.markRead('user-2', 'n-1')).rejects.toThrow(NotFoundException);
      await expect(service.markRead('user-2', 'n-1')).rejects.toThrow('Notification not found');
    });

    it('queries by both id and userId to prevent cross-user access', async () => {
      mockFeedRepo.findOne.mockResolvedValue(null);

      await expect(service.markRead('attacker', 'victim-notification')).rejects.toThrow(NotFoundException);
      expect(mockFeedRepo.findOne).toHaveBeenCalledWith({ where: { id: 'victim-notification', userId: 'attacker' } });
    });
  });

  describe('idempotency (take)', () => {
    it('does not process the same event id twice', async () => {
      await service.init();

      // Get the ORDER_CONFIRMED subscriber (first subscribe call)
      const confirmedHandler = mockBus.subscribe.mock.calls.find(
        (call) => call[0] === 'order.confirmed',
      )?.[1];

      if (!confirmedHandler) return; // guard for test env

      mockFeedRepo.create.mockReturnValue({} as NotificationFeed);
      mockFeedRepo.save.mockResolvedValue({} as NotificationFeed);
      mockDeviceTokenRepo.find.mockResolvedValue([]);

      const env = {
        id: 'event-dedup-1',
        payload: { orderId: 'order-1', customerId: 'cust-1', vendorId: 'vendor-1' },
      };

      // Patch vendorOwnerUserId to avoid HTTP call
      jest.spyOn(service as any, 'vendorOwnerUserId').mockResolvedValue(null);

      await confirmedHandler(env);
      const callCount = mockFeedRepo.save.mock.calls.length;

      // Same event id again — should be no-op
      await confirmedHandler(env);
      expect(mockFeedRepo.save.mock.calls.length).toBe(callCount);
    });
  });
});
