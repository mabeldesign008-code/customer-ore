/** Order threads + Ore Support threads. No bot seed data. */

import { BadRequestException, Inject, Injectable, Logger, NotFoundException, ForbiddenException, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { EVENTS, CommsMessageDto, CommsThreadDto, CreateCommsThreadDto } from '@ore/contracts';
import { JwtPayload, ORE_BUS } from '@ore/core';
import { Bus } from '@ore/bus';
import { CommsMessage } from './entities/message.entity';
import { CommsThread } from './entities/thread.entity';
import { CommsAccessService } from './comms.access';
import { SupportAiService } from './ai/support-ai.service';
import { SlaService } from './support-sla';
import { CommsGateway } from './comms.gateway';
import {
  isSupportStaff,
  normalizeMessageBody,
  supportSenderRole,
  viewerMayAccessSupportThread,
} from './comms.auth';

@Injectable()
export class CommsService {
  private readonly logger = new Logger(CommsService.name);

  constructor(
    @InjectRepository(CommsThread) private readonly threads: Repository<CommsThread>,
    @InjectRepository(CommsMessage) private readonly messages: Repository<CommsMessage>,
    private readonly access: CommsAccessService,
    @Inject(forwardRef(() => CommsGateway)) private readonly gateway: CommsGateway,
    @Inject(ORE_BUS) private readonly bus: Bus,
    private readonly supportAi: SupportAiService,
    private readonly sla: SlaService,
  ) {}

  async openThread(user: JwtPayload, input: CreateCommsThreadDto): Promise<CommsThreadDto> {
    const kind = input.kind === 'support' ? 'support' : 'order';
    if (kind === 'support') return this.openSupportThread(user);
    if (!input.orderId) throw new BadRequestException('orderId is required for an order thread');
    return this.openOrderThread(user, input.orderId);
  }

  async getThread(user: JwtPayload, threadId: string): Promise<CommsThreadDto> {
    const thread = await this.requireThread(threadId);
    await this.assertCanAccess(user, thread);
    return this.toThreadDto(thread);
  }

  async listSupportThreads(user: JwtPayload): Promise<CommsThreadDto[]> {
    if (isSupportStaff(user)) {
      const rows = await this.threads.find({
        where: { kind: 'support' },
        order: { updatedAt: 'DESC' },
        take: 50,
      });
      return rows.map((row) => this.toThreadDto(row));
    }
    const mine = await this.threads.findOne({ where: { kind: 'support', ownerUserId: user.sub } });
    return mine ? [this.toThreadDto(mine)] : [];
  }

  async findThread(threadId: string): Promise<CommsThread | null> {
    return this.threads.findOne({ where: { id: threadId } });
  }

  async findThreadByOrder(orderId: string): Promise<CommsThread | null> {
    return this.threads.findOne({ where: { orderId, kind: 'order' } });
  }

  async listMessages(user: JwtPayload, threadId: string, before?: string, limit?: number): Promise<CommsMessageDto[]> {
    const thread = await this.requireThread(threadId);
    await this.assertCanAccess(user, thread);
    const take = Math.min(100, Math.max(1, limit ?? 50));
    let createdBefore: Date | undefined;
    if (before) {
      const pivot = await this.messages.findOne({ where: { id: before, threadId } });
      if (pivot) createdBefore = pivot.createdAt;
    }
    // Internal notes are staff-only. A customer requesting the thread must never receive
    // them — filter at the query, not in the response, so they cannot leak by accident.
    const staff = isSupportStaff(user);
    const scope: Record<string, unknown> = createdBefore ? { threadId, createdAt: LessThan(createdBefore) } : { threadId };
    if (!staff) scope.visibility = 'customer';
    const rows = await this.messages.find({
      where: scope,
      order: { createdAt: 'DESC' },
      take,
    });
    return rows.reverse().map((row) => this.toMessageDto(row));
  }

  async postMessage(user: JwtPayload, threadId: string, rawBody?: string, attachments?: { url: string; type: string; name: string }[]): Promise<CommsMessageDto> {
    const thread = await this.requireThread(threadId);
    await this.assertCanAccess(user, thread);
    const body = normalizeMessageBody(rawBody);
    if (!body && (!attachments || attachments.length === 0)) throw new BadRequestException(`Message body or attachments must be provided`);
    const saved = await this.messages.save(
      this.messages.create({
        threadId: thread.id,
        senderUserId: user.sub,
        senderRole: supportSenderRole(user, thread.kind),
        body: body || '',
        attachments: attachments || null,
      }),
    );
    thread.updatedAt = new Date();
    await this.threads.save(thread);
    const dto = this.toMessageDto(saved);
    this.gateway.emitToThread(thread.id, 'message', dto);
    await this.bus.publish(EVENTS.COMMS_MESSAGE_CREATED, {
      threadId: thread.id,
      kind: thread.kind,
      orderId: thread.orderId,
      customerId: thread.customerId,
      ownerUserId: thread.ownerUserId,
      messageId: saved.id,
      senderUserId: saved.senderUserId,
      senderRole: saved.senderRole,
    });

    // Support AI. Deliberately not awaited: the customer's message must be acknowledged
    // immediately, and a slow or failing model must never block or fail the POST.
    if (thread.kind === 'support' && this.supportAi.shouldRespond(thread, saved.senderRole as any)) {
      void this.runSupportAi(thread, saved.senderUserId as any, saved.senderRole as any, body as any);
    }
    return dto;
  }

  /**
   * Run the assistant and push its reply over the socket. Every failure path degrades to
   * human support; the customer's message is already saved either way.
   */
  private async runSupportAi(thread: CommsThread, userId: string, role: string, body: string): Promise<void> {
    try {
      const outcome = await this.supportAi.respond(thread, body, userId, role);
      if (outcome.replied && outcome.messageId) {
        const saved = await this.messages.findOne({ where: { id: outcome.messageId } });
        if (saved) this.gateway.emitToThread(thread.id, 'message', this.toMessageDto(saved));
      }
      const fresh = await this.threads.findOne({ where: { id: thread.id } });
      if (fresh) this.gateway.emitToThread(thread.id, 'thread', this.toThreadDto(fresh));
    } catch (err) {
      this.logger.warn(`support AI failed: ${(err as Error).message}`);
    }
  }

  async canAccessThread(user: JwtPayload, thread: CommsThread): Promise<boolean> {
    if (thread.kind === 'support') return viewerMayAccessSupportThread(user, thread);
    if (!thread.orderId) return false;
    const order = await this.access.fetchOrder(thread.orderId);
    if (!order) return false;
    return this.access.canView(user, order);
  }

  private async openOrderThread(user: JwtPayload, orderId: string): Promise<CommsThreadDto> {
    const order = await this.access.assertCanView(user, orderId);
    let thread = await this.threads.findOne({ where: { orderId } });
    if (!thread) {
      try {
        thread = await this.threads.save(
          this.threads.create({
            kind: 'order',
            orderId,
            ownerUserId: null,
            ownerRole: null,
            customerId: order.customerId,
            vendorId: order.vendorId,
            riderId: order.riderId,
          }),
        );
      } catch (err) {
        // Concurrent POST /threads for the same order — unique(orderId) wins.
        const existing = await this.threads.findOne({ where: { orderId } });
        if (!existing) throw err;
        thread = existing;
      }
    }
    return this.toThreadDto(await this.syncRider(thread, order.riderId));
  }

  /**
   * Next human-facing ticket reference, e.g. SUP-00042.
   *
   * Derived from the existing row count plus one, then made collision-safe by retrying on
   * the unique index rather than by holding a separate counter table. Ticket refs are for
   * humans to quote, so gaps do not matter but duplicates do.
   */
  private async nextTicketRef(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const count = await this.threads.count({ where: { kind: 'support' } });
      const ref = `SUP-${String(count + 1 + attempt).padStart(5, '0')}`;
      const clash = await this.threads.findOne({ where: { ticketRef: ref } });
      if (!clash) return ref;
    }
    // Extremely unlikely; fall back to something guaranteed unique rather than failing to
    // open a conversation because of a numbering hiccup.
    return `SUP-${Date.now().toString(36).toUpperCase()}`;
  }

  private async openSupportThread(user: JwtPayload): Promise<CommsThreadDto> {
    let thread = await this.threads.findOne({ where: { kind: 'support', ownerUserId: user.sub } });
    if (!thread) {
      try {
        const now = new Date();
        thread = await this.threads.save(
          this.threads.create({
            kind: 'support',
            orderId: null,
            ownerUserId: user.sub,
            ownerRole: user.role,
            status: 'AI_HANDLING',
            customerId: null,
            vendorId: null,
            riderId: null,
            // A conversation is a ticket from the moment it opens: it gets a reference the
            // customer can quote, a priority, and a response clock. Assigning these later,
            // when a human happens to look, means the threads nobody looks at have no
            // clock at all — which is exactly when you need one.
            ticketRef: await this.nextTicketRef(),
            priority: 'normal',
            slaDueAt: this.sla.due(now, 'normal'),
            reopenCount: 0,
            tagsJson: [],
          }),
        );
      } catch (err) {
        const existing = await this.threads.findOne({ where: { kind: 'support', ownerUserId: user.sub } });
        if (!existing) throw err;
        thread = existing;
      }
    }
    return this.toThreadDto(thread);
  }

  private async assertCanAccess(user: JwtPayload, thread: CommsThread): Promise<void> {
    if (thread.kind === 'support') {
      if (!viewerMayAccessSupportThread(user, thread)) {
        throw new ForbiddenException('Not your support thread');
      }
      return;
    }
    if (!thread.orderId) throw new NotFoundException('Thread not found');
    const order = await this.access.assertCanView(user, thread.orderId);
    await this.syncRider(thread, order.riderId);
  }

  private async requireThread(threadId: string): Promise<CommsThread> {
    const thread = await this.threads.findOne({ where: { id: threadId } });
    if (!thread) throw new NotFoundException('Thread not found');
    return thread;
  }

  /** Thread.riderId is a snapshot; live assignment is the ACL source of truth. */
  private async syncRider(thread: CommsThread, riderId: string | null): Promise<CommsThread> {
    if (thread.riderId === riderId) return thread;
    thread.riderId = riderId;
    return this.threads.save(thread);
  }

  private toThreadDto(thread: CommsThread): CommsThreadDto {
    return {
      threadId: thread.id,
      kind: thread.kind === 'support' ? 'support' : 'order',
      orderId: thread.orderId,
      ownerUserId: thread.ownerUserId,
      ownerRole: thread.ownerRole,
      customerId: thread.customerId,
      vendorId: thread.vendorId,
      riderId: thread.riderId,
      createdAt: thread.createdAt.toISOString(),
      updatedAt: thread.updatedAt.toISOString(),
    };
  }

  private toMessageDto(message: CommsMessage): CommsMessageDto {
    return {
      id: message.id,
      threadId: message.threadId,
      senderUserId: message.senderUserId,
      senderRole: message.senderRole,
      body: message.body,
      visibility: message.visibility,
      attachments: message.attachments,
      createdAt: message.createdAt.toISOString(),
    };
  }
}
