/**
 * CommsService — unit tests covering thread management, message posting,
 * access control, and support vs order thread distinctions.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CommsService } from './comms.service';
import { CommsThread } from './entities/thread.entity';
import { CommsMessage } from './entities/message.entity';
import { SupportAiService } from './ai/support-ai.service';
import { SlaService } from './support-sla';
import { CommsAccessService } from './comms.access';
import { CommsGateway } from './comms.gateway';
import { ORE_BUS } from '@ore/core';
import { Role } from '@ore/contracts';
import { createMockRepository } from '@ore/testing';

// ── helpers ──────────────────────────────────────────────────────────────────

const mkUser = (role: Role, id = 'user-1') =>
  ({ sub: id, phone: '233501234567', role, roles: [role] }) as any;

const CUSTOMER = mkUser(Role.CUSTOMER, 'cust-1');
const VENDOR   = mkUser(Role.VENDOR,   'vendor-1');
const ADMIN    = mkUser(Role.ADMIN,    'admin-1');
const SUPPORT  = mkUser(Role.ADMIN,  'support-1');

function makeThread(overrides: Partial<CommsThread> = {}): CommsThread {
  return {
    id: 'thread-1',
    kind: 'order',
    orderId: 'order-1',
    ownerUserId: null,
    ownerRole: null,
    customerId: 'cust-1',
    vendorId: 'vendor-1',
    riderId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    messages: [],
    ...overrides,
  } as CommsThread;
}

function makeMessage(overrides: Partial<CommsMessage> = {}): CommsMessage {
  return {
    id: 'msg-1',
    threadId: 'thread-1',
    senderUserId: 'cust-1',
    senderRole: 'customer',
    body: 'Hello, where is my order?',
    createdAt: new Date('2026-08-24T10:00:00Z'),
    ...overrides,
  } as CommsMessage;
}

// ── setup ─────────────────────────────────────────────────────────────────────

describe('CommsService', () => {
  let service: CommsService;
  let threadsRepo: ReturnType<typeof createMockRepository<CommsThread>>;
  let messagesRepo: ReturnType<typeof createMockRepository<CommsMessage>>;
  let mockAccess: { assertCanView: jest.Mock; fetchOrder: jest.Mock; canView: jest.Mock };
  let mockGateway: { emitToThread: jest.Mock };
  let mockBus: { publish: jest.Mock };

  const stubOrder = {
    id: 'order-1',
    customerId: 'cust-1',
    vendorId: 'vendor-1',
    riderId: 'rider-1',
    status: 'CONFIRMED',
  };

  beforeEach(async () => {
    threadsRepo = createMockRepository<CommsThread>();
    messagesRepo = createMockRepository<CommsMessage>();

    mockAccess = {
      assertCanView: jest.fn().mockResolvedValue(stubOrder),
      fetchOrder: jest.fn().mockResolvedValue(stubOrder),
      canView: jest.fn().mockReturnValue(true),
    };

    mockGateway = { emitToThread: jest.fn() };
    mockBus = { publish: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommsService,
        { provide: getRepositoryToken(CommsThread),  useValue: threadsRepo },
        { provide: getRepositoryToken(CommsMessage), useValue: messagesRepo },
        { provide: CommsAccessService, useValue: mockAccess },
        { provide: CommsGateway, useValue: mockGateway },
        { provide: ORE_BUS, useValue: mockBus },
        // CommsService grew an AI collaborator. These tests are about thread opening and
        // visibility, not about the model, so the stub declines to respond — without a
        // provider at all the suite cannot construct and none of it runs.
        {
          provide: SupportAiService,
          useValue: { shouldRespond: jest.fn().mockReturnValue(false), respond: jest.fn() },
        },
        // Real SlaService: `due()` is a pure date computation with nothing to isolate.
        SlaService,
      ],
    }).compile();

    service = module.get<CommsService>(CommsService);
  });

  // ── openThread ────────────────────────────────────────────────────

  describe('openThread', () => {
    it('opens a new order thread when none exists', async () => {
      threadsRepo.findOne.mockResolvedValue(null);
      threadsRepo.create.mockImplementation((v: any) => ({ ...makeThread(), ...v }));
      threadsRepo.save.mockImplementation(async (v: any) => ({ id: 'thread-new', ...v }));

      const result = await service.openThread(CUSTOMER, { kind: 'order', orderId: 'order-1' });

      expect(result.kind).toBe('order');
      expect(threadsRepo.save).toHaveBeenCalled();
    });

    it('returns existing thread instead of creating a duplicate', async () => {
      threadsRepo.findOne.mockResolvedValue({ id: 'thread-1', kind: 'order', orderId: 'order-1', ownerUserId: 'cust-1', riderId: 'rider-1', createdAt: new Date(), updatedAt: new Date() } as CommsThread);
      threadsRepo.save.mockImplementation(async (v: any) => v);
      const result = await service.openThread(CUSTOMER, { kind: 'order', orderId: 'order-1' });
      expect(result.threadId).toBe('thread-1');
      expect(threadsRepo.save).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when orderId missing for order thread', async () => {
      await expect(service.openThread(CUSTOMER, { kind: 'order' })).rejects.toThrow(BadRequestException);
      await expect(service.openThread(CUSTOMER, { kind: 'order' })).rejects.toThrow('orderId is required');
    });

    it('creates a support thread for a customer', async () => {
      threadsRepo.findOne.mockResolvedValue(null);
      threadsRepo.create.mockImplementation((v: any) => ({ ...makeThread({ kind: 'support', orderId: null, ownerUserId: 'cust-1' }), ...v }));
      threadsRepo.save.mockImplementation(async (v: any) => ({ id: 'thread-support', ...v }));

      const result = await service.openThread(CUSTOMER, { kind: 'support' });

      expect(result.kind).toBe('support');
      expect(result.ownerUserId).toBe('cust-1');
    });

    it('returns existing support thread instead of creating a duplicate', async () => {
      const existing = makeThread({ id: 'supp-existing', kind: 'support', orderId: null, ownerUserId: 'cust-1' });
      threadsRepo.findOne.mockResolvedValue(existing);

      const result = await service.openThread(CUSTOMER, { kind: 'support' });

      expect(result.threadId).toBe('supp-existing');
    });
  });

  // ── getThread ─────────────────────────────────────────────────────

  describe('getThread', () => {
    it('returns thread DTO for an authorized user', async () => {
      const thread = makeThread();
      threadsRepo.findOne.mockResolvedValue(thread);
      mockAccess.assertCanView.mockResolvedValue(stubOrder);

      const result = await service.getThread(CUSTOMER, 'thread-1');

      expect(result.threadId).toBe('thread-1');
      expect(result.orderId).toBe('order-1');
    });

    it('throws NotFoundException for unknown thread', async () => {
      threadsRepo.findOne.mockResolvedValue(null);

      await expect(service.getThread(CUSTOMER, 'ghost')).rejects.toThrow(NotFoundException);
      await expect(service.getThread(CUSTOMER, 'ghost')).rejects.toThrow('Thread not found');
    });

    it('throws ForbiddenException for unauthorized access to support thread', async () => {
      const supportThread = makeThread({ kind: 'support', ownerUserId: 'other-user', orderId: null });
      threadsRepo.findOne.mockResolvedValue(supportThread);

      // CUSTOMER is not the owner and not support staff
      await expect(service.getThread(CUSTOMER, 'supp-1')).rejects.toThrow(ForbiddenException);
    });

    it('allows support staff to view any support thread', async () => {
      const supportThread = makeThread({ kind: 'support', ownerUserId: 'cust-99', orderId: null });
      threadsRepo.findOne.mockResolvedValue(supportThread);
      threadsRepo.save.mockImplementation(async (v: unknown) => v);

      const result = await service.getThread(SUPPORT, 'supp-1');
      expect(result.kind).toBe('support');
    });

    it('allows admin to view support threads', async () => {
      const supportThread = makeThread({ kind: 'support', ownerUserId: 'cust-99', orderId: null });
      threadsRepo.findOne.mockResolvedValue(supportThread);
      threadsRepo.save.mockImplementation(async (v: unknown) => v);

      const result = await service.getThread(ADMIN, 'supp-1');
      expect(result.kind).toBe('support');
    });
  });

  // ── listSupportThreads ────────────────────────────────────────────

  describe('listSupportThreads', () => {
    it('returns all support threads for support staff', async () => {
      const threads = [
        makeThread({ id: 't-1', kind: 'support', orderId: null, ownerUserId: 'cust-1' }),
        makeThread({ id: 't-2', kind: 'support', orderId: null, ownerUserId: 'cust-2' }),
      ];
      threadsRepo.find.mockResolvedValue(threads);

      const result = await service.listSupportThreads(SUPPORT);

      expect(result).toHaveLength(2);
      expect(threadsRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { kind: 'support' } }),
      );
    });

    it('returns only the customer\'s own thread for non-support users', async () => {
      const myThread = makeThread({ id: 'my-thread', kind: 'support', orderId: null, ownerUserId: 'cust-1' });
      threadsRepo.findOne.mockResolvedValue(myThread);

      const result = await service.listSupportThreads(CUSTOMER);

      expect(result).toHaveLength(1);
      expect(result[0].threadId).toBe('my-thread');
    });

    it('returns empty array when customer has no support thread', async () => {
      threadsRepo.findOne.mockResolvedValue(null);

      const result = await service.listSupportThreads(CUSTOMER);

      expect(result).toHaveLength(0);
    });
  });

  // ── listMessages ──────────────────────────────────────────────────

  describe('listMessages', () => {
    it('returns messages in chronological order (oldest first)', async () => {
      const thread = makeThread();
      const msgs = [
        makeMessage({ id: 'msg-2', createdAt: new Date('2026-08-24T11:00:00Z') }),
        makeMessage({ id: 'msg-1', createdAt: new Date('2026-08-24T10:00:00Z') }),
      ]; // find returns DESC, service reverses to ASC
      threadsRepo.findOne.mockResolvedValue(thread);
      mockAccess.assertCanView.mockResolvedValue(stubOrder);
      messagesRepo.find.mockResolvedValue(msgs);

      const result = await service.listMessages(CUSTOMER, 'thread-1');

      expect(result).toHaveLength(2);
      // Service reverses the DESC array to get ASC
      expect(result[0].id).toBe('msg-1');
      expect(result[1].id).toBe('msg-2');
    });

    it('limits to 50 messages by default', async () => {
      const thread = makeThread();
      threadsRepo.findOne.mockResolvedValue(thread);
      mockAccess.assertCanView.mockResolvedValue(stubOrder);
      messagesRepo.find.mockResolvedValue([]);

      await service.listMessages(CUSTOMER, 'thread-1');

      expect(messagesRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
    });

    it('respects custom limit (capped at 100)', async () => {
      const thread = makeThread();
      threadsRepo.findOne.mockResolvedValue(thread);
      mockAccess.assertCanView.mockResolvedValue(stubOrder);
      messagesRepo.find.mockResolvedValue([]);

      await service.listMessages(CUSTOMER, 'thread-1', undefined, 200); // over cap

      expect(messagesRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });

    it('paginates using the before cursor', async () => {
      const thread = makeThread();
      const pivot = makeMessage({ id: 'pivot', createdAt: new Date('2026-08-24T12:00:00Z') });
      threadsRepo.findOne.mockResolvedValue(thread);
      mockAccess.assertCanView.mockResolvedValue(stubOrder);
      messagesRepo.findOne.mockResolvedValue(pivot);
      messagesRepo.find.mockResolvedValue([]);

      await service.listMessages(CUSTOMER, 'thread-1', 'pivot');

      // Should query for messages before the pivot's createdAt
      expect(messagesRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ createdAt: expect.anything() }) }),
      );
    });

    it('throws NotFoundException for unknown thread', async () => {
      threadsRepo.findOne.mockResolvedValue(null);
      await expect(service.listMessages(CUSTOMER, 'ghost')).rejects.toThrow(NotFoundException);
    });
  });

  // ── postMessage ───────────────────────────────────────────────────

  describe('postMessage', () => {
    it('saves message, emits on websocket, and publishes bus event', async () => {
      const thread = makeThread();
      const savedMsg = makeMessage({ id: 'msg-new', body: 'Hi there' });
      threadsRepo.findOne.mockResolvedValue(thread);
      mockAccess.assertCanView.mockResolvedValue(stubOrder);
      messagesRepo.create.mockReturnValue(savedMsg);
      messagesRepo.save.mockResolvedValue(savedMsg);
      threadsRepo.save.mockResolvedValue(thread);

      const result = await service.postMessage(CUSTOMER, 'thread-1', 'Hi there');

      expect(result.body).toBe('Hi there');
      expect(mockGateway.emitToThread).toHaveBeenCalledWith('thread-1', 'message', expect.objectContaining({ body: 'Hi there' }));
      expect(mockBus.publish).toHaveBeenCalledWith(
        'comms.message_created',
        expect.objectContaining({ threadId: 'thread-1', senderUserId: savedMsg.senderUserId }),
      );
    });

    it('throws BadRequestException for empty message body', async () => {
      const thread = makeThread();
      threadsRepo.findOne.mockResolvedValue(thread);
      mockAccess.assertCanView.mockResolvedValue(stubOrder);

      await expect(service.postMessage(CUSTOMER, 'thread-1', '')).rejects.toThrow(BadRequestException);
      // The shipped rule is "body OR attachments" (an attachment-only message is valid),
      // so the refusal message names both — the old "1–2000 characters" text predates
      // attachment support and no cap exists in the implementation.
      await expect(service.postMessage(CUSTOMER, 'thread-1', '')).rejects.toThrow('Message body or attachments must be provided');
    });

    it('throws BadRequestException for whitespace-only body', async () => {
      const thread = makeThread();
      threadsRepo.findOne.mockResolvedValue(thread);
      mockAccess.assertCanView.mockResolvedValue(stubOrder);

      await expect(service.postMessage(CUSTOMER, 'thread-1', '   ')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for undefined body', async () => {
      const thread = makeThread();
      threadsRepo.findOne.mockResolvedValue(thread);
      mockAccess.assertCanView.mockResolvedValue(stubOrder);

      await expect(service.postMessage(CUSTOMER, 'thread-1', undefined)).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException for unknown thread', async () => {
      threadsRepo.findOne.mockResolvedValue(null);
      await expect(service.postMessage(CUSTOMER, 'ghost', 'Hello')).rejects.toThrow(NotFoundException);
    });

    it('updates thread.updatedAt when message is posted', async () => {
      const thread = makeThread({ updatedAt: new Date('2026-08-01T00:00:00Z') });
      const savedMsg = makeMessage();
      threadsRepo.findOne.mockResolvedValue(thread);
      mockAccess.assertCanView.mockResolvedValue(stubOrder);
      messagesRepo.create.mockReturnValue(savedMsg);
      messagesRepo.save.mockResolvedValue(savedMsg);
      threadsRepo.save.mockImplementation(async (t: unknown) => t);

      await service.postMessage(CUSTOMER, 'thread-1', 'Testing');

      // updatedAt on the thread should have been bumped
      expect(threadsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ updatedAt: expect.any(Date) }),
      );
      expect(thread.updatedAt.getTime()).toBeGreaterThan(new Date('2026-08-01T00:00:00Z').getTime());
    });
  });

  // ── findThread / findThreadByOrder ────────────────────────────────

  describe('findThread / findThreadByOrder', () => {
    it('findThread returns thread by id', async () => {
      const thread = makeThread();
      threadsRepo.findOne.mockResolvedValue(thread);
      const result = await service.findThread('thread-1');
      expect(result?.id).toBe('thread-1');
    });

    it('findThread returns null for unknown id', async () => {
      threadsRepo.findOne.mockResolvedValue(null);
      const result = await service.findThread('ghost');
      expect(result).toBeNull();
    });

    it('findThreadByOrder returns thread for the given orderId', async () => {
      const thread = makeThread();
      threadsRepo.findOne.mockResolvedValue(thread);
      const result = await service.findThreadByOrder('order-1');
      expect(threadsRepo.findOne).toHaveBeenCalledWith({ where: { orderId: 'order-1', kind: 'order' } });
      expect(result?.orderId).toBe('order-1');
    });
  });

  // ── canAccessThread ───────────────────────────────────────────────

  describe('canAccessThread', () => {
    it('returns true for customer who owns the order thread', async () => {
      const thread = makeThread({ orderId: 'order-1' });
      mockAccess.fetchOrder.mockResolvedValue(stubOrder);
      mockAccess.canView.mockReturnValue(true);
      const result = await service.canAccessThread(CUSTOMER, thread);
      expect(result).toBe(true);
    });

    it('returns false when customer does not own the order', async () => {
      const thread = makeThread({ orderId: 'order-1' });
      mockAccess.fetchOrder.mockResolvedValue(stubOrder);
      mockAccess.canView.mockReturnValue(false);
      const result = await service.canAccessThread(CUSTOMER, thread);
      expect(result).toBe(false);
    });

    it('returns false when order is not found', async () => {
      const thread = makeThread({ orderId: 'order-ghost' });
      mockAccess.fetchOrder.mockResolvedValue(null);
      const result = await service.canAccessThread(CUSTOMER, thread);
      expect(result).toBe(false);
    });

    it('returns false for thread without orderId', async () => {
      const thread = makeThread({ kind: 'order', orderId: null });
      const result = await service.canAccessThread(CUSTOMER, thread);
      expect(result).toBe(false);
    });
  });
});
