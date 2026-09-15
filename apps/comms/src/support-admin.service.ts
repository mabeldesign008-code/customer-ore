import { ORE_BUS } from "@ore/core";
import { EVENTS } from "@ore/contracts";
import { Inject } from "@nestjs/common";
/**
 * The human half of Ore Support: queue routing, ownership, and swarming.
 *
 * THE MODEL (support swarming, per Consortium for Service Innovation / HDI)
 *   - One owner per conversation. Ownership lives on the thread and DOES NOT change when
 *     someone joins. "The person who first takes the issue owns it through to resolution."
 *   - Specialists are pulled TO the conversation; the customer is never transferred away.
 *   - Swarming is deliberate, never automatic. Otherwise finance burns out and this
 *     quietly becomes tiered escalation again.
 *
 * VISIBILITY RULES
 *   - Every admin may see threads they own, are a participant on, or that are flagged to
 *     their role. Super-admin sees everything. This keeps least-privilege while still
 *     letting a specialist contribute without a licence-style gate.
 *   - Messages are 'customer' or 'internal'. Internal notes never reach the customer.
 *
 * THE AI
 *   - Goes silent the moment status != AI_HANDLING. A human joining hard-stops it.
 */

import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Like, Repository } from 'typeorm';
import { AdminRole } from '@ore/contracts';
import { JwtPayload, internalFetch, serviceUrl } from '@ore/core';
import { CommsMessage } from './entities/message.entity';
import { CommsThread } from './entities/thread.entity';
import { SupportEscalation } from './entities/support-escalation.entity';
import { SupportParticipant } from './entities/support-participant.entity';
import { SupportToolAudit } from './entities/support-tool-audit.entity';
import { SupportAiService } from './ai/support-ai.service';
import { CommsGateway } from './comms.gateway';
import { SlaService, PRIORITIES } from './support-sla';
import type { Priority } from './support-sla';

/** Which admin roles each escalation reason is flagged to. Owner is always SUPPORT. */
const FLAG_BY_REASON: Record<string, AdminRole[]> = {
  refund_request: [AdminRole.FINANCE],
  payment_failed: [AdminRole.FINANCE],
  withdrawal: [AdminRole.FINANCE],
  chargeback: [AdminRole.FINANCE],
  complaint: [AdminRole.OPERATIONS],
  delivery_failed: [AdminRole.OPERATIONS],
  rider_conduct: [AdminRole.OPERATIONS],
  vendor_conduct: [AdminRole.OPERATIONS],
  fraud: [AdminRole.COMPLIANCE],
  account_compromise: [AdminRole.COMPLIANCE],
  data_deletion: [AdminRole.COMPLIANCE],
  legal: [AdminRole.COMPLIANCE],
};

/**
 * Statuses shown in the default queue.
 *
 * `AI_HANDLING` is deliberately included. It used to be excluded, which meant a rep could
 * not see the conversations the AI was currently handling — so they had no way to notice
 * an AI going in circles on an angry customer, and the first a human saw of it was after
 * it had already escalated. Watching the AI is part of the job, not an optional extra.
 */
const ACTIVE = ['AI_HANDLING', 'AI_OFFERED_HUMAN', 'QUEUED_FOR_HUMAN', 'HUMAN_ACTIVE'];

export interface QueueItem {
  threadId: string;
  status: string;
  ownerAdminUserId: string | null;
  assignedToUserId: string | null;
  escalationReason: string | null;
  escalationTeam: string | null;
  flaggedTeams: string[];
  ownerUserId: string | null;
  participantCount: number;
  updatedAt: Date;
  lastMessage: string | null;
}

export function flagsForReason(reason: string | null | undefined): AdminRole[] {
  if (!reason) return [];
  return FLAG_BY_REASON[reason] ?? [];
}

@Injectable()
export class SupportAdminService {
  private readonly logger = new Logger(SupportAdminService.name);

  constructor(
    @InjectRepository(CommsThread) private readonly threads: Repository<CommsThread>,
    @InjectRepository(CommsMessage) private readonly messages: Repository<CommsMessage>,
    @InjectRepository(SupportParticipant) private readonly participants: Repository<SupportParticipant>,
    @InjectRepository(SupportEscalation) private readonly escalations: Repository<SupportEscalation>,
    @InjectRepository(SupportToolAudit) private readonly audits: Repository<SupportToolAudit>,
    private readonly supportAi: SupportAiService,
    private readonly gateway: CommsGateway,
    private readonly sla: SlaService, @Inject(ORE_BUS) private readonly bus: any,
  ) {}

  /* ─────────────────────────── permissions ─────────────────────────── */

  private adminRoleOf(user: JwtPayload): string {
    if (user.role !== 'admin') throw new ForbiddenException('Support console is for admins');
    return user.adminRole || AdminRole.SUPPORT;
  }

  private isSuper(user: JwtPayload): boolean {
    return this.adminRoleOf(user) === AdminRole.SUPER_ADMIN;
  }

  /** May this admin see this thread? Owner, participant, flagged-to-role, or super. */
  /**
   * May this admin open this thread?
   *
   * This MUST agree with `queue()`. It did not: the queue shows a support rep every
   * unowned thread so they can pick work up, but this check had no equivalent rule, so
   * clicking any unclaimed conversation returned 403 "Not your support thread". A queue
   * you cannot open is worse than no queue — it looks like the system is broken.
   *
   * The rule is therefore the same one, in the same order: super sees all; a support rep
   * sees unowned threads and their own; a specialist sees what is flagged to their role
   * or that they have joined.
   */
  async canView(user: JwtPayload, thread: CommsThread): Promise<boolean> {
    if (this.isSuper(user)) return true;
    if (thread.ownerAdminUserId === user.sub) return true;
    if (thread.assignedToUserId === user.sub) return true;
    // Support owns the unclaimed queue: an unowned thread is theirs to pick up.
    if (this.adminRoleOf(user) === AdminRole.SUPPORT && !thread.ownerAdminUserId) return true;
    const flags = (thread.flaggedTeams ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    if (flags.includes(this.adminRoleOf(user))) return true;
    const mine = await this.participants.findOne({ where: { threadId: thread.id, userId: user.sub, leftAt: IsNull() } });
    return !!mine;
  }

  private async requireThread(threadId: string): Promise<CommsThread> {
    const thread = await this.threads.findOne({ where: { id: threadId, kind: 'support' } });
    if (!thread) throw new NotFoundException('Support thread not found');
    return thread;
  }

  private async requireAccess(user: JwtPayload, threadId: string): Promise<CommsThread> {
    const thread = await this.requireThread(threadId);
    if (!(await this.canView(user, thread))) throw new ForbiddenException('Not your support thread');
    return thread;
  }

  /* ───────────────────────────── queue ───────────────────────────── */

  /**
   * My queue. A support rep sees everything unowned plus her own; a specialist sees only
   * threads flagged to their role or that they have joined.
   */
  async queue(user: JwtPayload, opts: { status?: string; limit?: number } = {}): Promise<QueueItem[]> {
    const role = this.adminRoleOf(user);
    const take = Math.min(100, Math.max(1, opts.limit ?? 50));

    const where: Record<string, unknown>[] = [];
    if (this.isSuper(user)) {
      where.push({ kind: 'support' });
    } else if (role === AdminRole.SUPPORT) {
      // The default owner of support work: unclaimed queue plus my own threads.
      where.push({ kind: 'support', ownerAdminUserId: IsNull() });
      where.push({ kind: 'support', ownerAdminUserId: user.sub });
    } else {
      // Specialists see what is flagged to them or what they joined.
      where.push({ kind: 'support', flaggedTeams: Like(`%${role}%`) });
      const joined = await this.participants.find({ where: { userId: user.sub, leftAt: IsNull() } });
      if (joined.length) where.push({ kind: 'support', id: In(joined.map((j) => j.threadId)) });
    }
    if (opts.status) {
      for (const w of where) w.status = opts.status;
    } else {
      for (const w of where) w.status = In(ACTIVE);
    }

    const rows = await this.threads.find({ where, order: { updatedAt: 'DESC' }, take });

    const items: QueueItem[] = [];
    for (const t of rows) {
      const last = await this.messages.findOne({
        where: { threadId: t.id, visibility: 'customer' },
        order: { createdAt: 'DESC' },
      });
      const participantCount = await this.participants.count({ where: { threadId: t.id, leftAt: IsNull() } });
      items.push({
        threadId: t.id,
        status: t.status,
        ownerAdminUserId: t.ownerAdminUserId,
        assignedToUserId: t.assignedToUserId,
        escalationReason: t.escalationReason,
        escalationTeam: t.escalationTeam,
        flaggedTeams: (t.flaggedTeams ?? '').split(',').map((s) => s.trim()).filter(Boolean),
        ownerUserId: t.ownerUserId,
        participantCount,
        updatedAt: t.updatedAt,
        lastMessage: last?.body?.slice(0, 160) ?? null,
      });
    }
    return items;
  }

  /* ─────────────────────────── ownership ─────────────────────────── */

  /** Become the owner. Only one owner; claiming an owned thread is refused unless super. */
  async claim(user: JwtPayload, threadId: string): Promise<CommsThread> {
    const thread = await this.requireThread(threadId);
    if (thread.ownerAdminUserId && thread.ownerAdminUserId !== user.sub && !this.isSuper(user)) {
      throw new BadRequestException('This conversation already has an owner');
    }
    thread.ownerAdminUserId = user.sub;
    thread.assignedToUserId = user.sub;
    if (thread.status === 'QUEUED_FOR_HUMAN' || thread.status === 'AI_HANDLING') {
      thread.status = 'HUMAN_ACTIVE';
      thread.lastHumanAt = new Date();
    }
    await this.save(thread);
    await this.addParticipant(thread, user, null);
    this.emit(thread);
    return thread;
  }

  /**
   * THE SWARM SIGNAL. Pull a specialist into the conversation.
   * Ownership does NOT move — that is the difference between swarming and escalation.
   */
  async invite(
    user: JwtPayload,
    threadId: string,
    input: { userId: string; adminRole: string; note?: string },
  ): Promise<SupportParticipant> {
    const thread = await this.requireAccess(user, threadId);
    if (!thread.ownerAdminUserId) throw new BadRequestException('Claim the conversation before inviting a specialist');

    const role = (input.adminRole || '').toLowerCase();
    const known = Object.values(AdminRole) as string[];
    if (!known.includes(role)) throw new BadRequestException(`Unknown admin role. Expected one of: ${known.join(', ')}`);

    // Flag the role so it shows in that team's queue even before they join.
    const flags = new Set((thread.flaggedTeams ?? '').split(',').map((s) => s.trim()).filter(Boolean));
    flags.add(role);
    thread.flaggedTeams = [...flags].join(',');
    await this.save(thread);

    const participant = await this.addParticipant(thread, { sub: input.userId, adminRole: role, role: 'admin' } as JwtPayload, user.sub);

    await this.escalations.save(
      this.escalations.create({
        threadId: thread.id,
        reason: 'specialist_invited',
        summary: `${this.adminRoleOf(user)} invited ${role}${input.note ? `: ${input.note}` : ''}. Ownership unchanged.`,
        team: role,
        actor: user.sub,
        fromStatus: thread.status,
        toStatus: thread.status,
      }),
    );

    this.emit(thread);
    this.logger.log(`swarm: ${user.sub} invited ${role} into ${thread.id}`);
    return participant;
  }

  async removeParticipant(user: JwtPayload, threadId: string, userId: string): Promise<void> {
    const thread = await this.requireAccess(user, threadId);
    const onlyOwnerOrSuper = thread.ownerAdminUserId === user.sub || this.isSuper(user);
    if (!onlyOwnerOrSuper && userId !== user.sub) {
      throw new ForbiddenException('Only the owner can remove another participant');
    }
    const p = await this.participants.findOne({ where: { threadId, userId, leftAt: IsNull() } });
    if (!p) throw new NotFoundException('Participant not found');
    if (userId === thread.ownerAdminUserId) throw new BadRequestException('The owner cannot be removed; transfer ownership first');
    p.leftAt = new Date();
    await this.participants.save(p);
    this.emit(thread);
  }

  /** Super-admin only: move ownership to someone else. */
  async reassign(user: JwtPayload, threadId: string, newOwnerUserId: string): Promise<CommsThread> {
    if (!this.isSuper(user)) throw new ForbiddenException('Only a super admin can reassign ownership');
    const thread = await this.requireThread(threadId);
    const from = thread.ownerAdminUserId;
    thread.ownerAdminUserId = newOwnerUserId;
    await this.save(thread);
    await this.escalations.save(
      this.escalations.create({
        threadId, reason: 'ownership_reassigned', summary: null, team: 'general',
        actor: user.sub, fromStatus: thread.status, toStatus: thread.status,
      }),
    );
    this.logger.warn(`ownership of ${threadId} moved ${from} -> ${newOwnerUserId} by super admin ${user.sub}`);
    this.emit(thread);
    return thread;
  }

  /* ─────────────────────────── messaging ─────────────────────────── */

  /**
   * Staff reply. `visibility: 'internal'` is a note to other staff and never reaches the
   * customer. Replying as a customer-facing message hard-stops the AI.
   */
  async reply(
    user: JwtPayload,
    threadId: string,
    body: string,
    visibility: 'customer' | 'internal' = 'customer',
    attachments?: { url: string; type: string; name: string }[],
  ): Promise<CommsMessage> {
    const thread = await this.requireAccess(user, threadId);
    const text = body?.trim() ?? '';
    if (!text && (!attachments || attachments.length === 0)) throw new BadRequestException('Message body or attachments must be provided');

    const saved = await this.messages.save(
      this.messages.create({
        threadId: thread.id,
        senderUserId: user.sub,
        senderRole: 'support',
        body: text,
        visibility,
        attachments: attachments || null,
      }),
    );

    // Only a customer-facing reply changes who is speaking. Internal notes must not
    // silently take the conversation away from the AI or from the owner.
    if (visibility === 'customer') {
      thread.status = 'HUMAN_ACTIVE';
      thread.lastHumanAt = new Date();
      if (!thread.ownerAdminUserId) thread.ownerAdminUserId = user.sub;
    }
    await this.save(thread);

    // Internal notes go only to staff sockets.
    this.gateway.emitToThread(thread.id, visibility === 'internal' ? 'internal_note' : 'message', this.toDto(saved));
    this.gateway.emitToThread(thread.id, 'thread', this.toThreadDto(thread));
    
    if (visibility === 'customer') {
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
    }

    return saved;
  }

  /** Hand back to the assistant. */
  async returnToAi(user: JwtPayload, threadId: string): Promise<CommsThread> {
    const thread = await this.requireAccess(user, threadId);
    await this.supportAi.returnToAi(thread);
    this.emit(thread);
    return thread;
  }

  async resolve(user: JwtPayload, threadId: string, note?: string): Promise<CommsThread> {
    const thread = await this.requireAccess(user, threadId);
    // Owner-only. Swarming lets a finance or ops specialist join a thread to help, but
    // joining must not let them end it — the rep who took the issue owns it through to
    // resolution, and a visiting expert closing the ticket is how customers get dropped.
    this.assertOwnerOrSuper(user, thread, 'resolve');
    const from = thread.status;
    thread.status = 'RESOLVED';
    thread.resolvedAt = new Date();
    // Resolving without ever having answered is a closed loop nobody noticed; record it.
    if (!thread.firstResponseAt) thread.firstResponseAt = new Date();
    await this.save(thread);
    await this.escalations.save(
      this.escalations.create({
        threadId, reason: 'resolved', summary: note ?? null, team: 'general',
        actor: user.sub, fromStatus: from, toStatus: 'RESOLVED',
      }),
    );
    this.emit(thread);
    return thread;
  }

  /* ─────────────────────────── detail view ─────────────────────────── */

  /** Everything an admin needs so they never have to re-ask the customer. */
  async detail(user: JwtPayload, threadId: string) {
    const thread = await this.requireAccess(user, threadId);
    const all = await this.messages.find({ where: { threadId }, order: { createdAt: 'ASC' }, take: 200 });
    const parts = await this.participants.find({ where: { threadId }, order: { joinedAt: 'ASC' } });
    const esc = await this.supportAi.escalationHistory(threadId);
    const audit = await this.supportAi.toolAudit(threadId);

    // 360-Degree Context View Lookups
    let orderContext: any = null;
    let paymentContext: any = null;
    let riderContext: any = null;
    let vendorContext: any = null;
    if (thread.orderId) {
      try {
        const oRes = await internalFetch(`${serviceUrl('order')}/internal/orders/${thread.orderId}`);
        if (oRes.ok) orderContext = await oRes.json();
        
        const pRes = await internalFetch(`${serviceUrl('payment')}/internal/payments/order/${thread.orderId}`);
        if (pRes.ok) paymentContext = await pRes.json();
        
        if (orderContext?.riderId) {
          const rRes = await internalFetch(`${serviceUrl('dispatch')}/internal/riders/${orderContext.riderId}`);
          if (rRes.ok) riderContext = await rRes.json();
        }
        if (orderContext?.vendorId) {
          const vRes = await internalFetch(`${serviceUrl('catalog')}/internal/vendors/${orderContext.vendorId}`);
          if (vRes.ok) vendorContext = await vRes.json();
        }
      } catch (err) {
        // Suppress lookup errors so we don't break the ticket view
      }
    }

    return {
      thread: this.toThreadDto(thread),
      context: {
        order: orderContext,
        payment: paymentContext,
        rider: riderContext,
        vendor: vendorContext,
      },
      // Staff see internal notes; this endpoint is admin-only so it is safe.
      messages: all.map((m) => this.toDto(m)),
      participants: parts.map((p) => ({
        userId: p.userId, adminRole: p.adminRole, invitedBy: p.invitedBy,
        joinedAt: p.joinedAt, active: !p.leftAt,
      })),
      escalations: esc.map((e) => ({
        reason: e.reason, summary: e.summary, team: e.team, actor: e.actor,
        fromStatus: e.fromStatus, toStatus: e.toStatus, createdAt: e.createdAt,
      })),
      // Why the AI said what it said.
      aiToolCalls: audit.map((a) => ({ tool: a.tool, outcome: a.outcome, model: a.model, createdAt: a.createdAt })),
    };
  }

  /* ─────────────────────────── helpers ─────────────────────────── */

  private async addParticipant(thread: CommsThread, user: JwtPayload, invitedBy: string | null): Promise<SupportParticipant> {
    const existing = await this.participants.findOne({ where: { threadId: thread.id, userId: user.sub } });
    if (existing) {
      if (existing.leftAt) {
        existing.leftAt = null;
        existing.invitedBy = invitedBy;
        return this.participants.save(existing);
      }
      return existing;
    }
    try {
      return await this.participants.save(
        this.participants.create({
          threadId: thread.id,
          userId: user.sub,
          adminRole: user.adminRole ?? null,
          invitedBy,
        }),
      );
    } catch (err) {
      // Concurrent join — the unique(threadId,userId) index means someone won; take theirs.
      const winner = await this.participants.findOne({ where: { threadId: thread.id, userId: user.sub } });
      if (!winner) throw err;
      return winner;
    }
  }

  /**
   * Only the owning rep — or a super admin — may end a ticket.
   * An unowned thread (still in the AI's hands or unclaimed) may be resolved by anyone who
   * can see it, otherwise a queue item could never be cleared.
   */
  private assertOwnerOrSuper(user: JwtPayload, thread: CommsThread, action: string): void {
    if (this.isSuper(user)) return;
    if (!thread.ownerAdminUserId) return;
    if (thread.ownerAdminUserId !== user.sub) {
      throw new ForbiddenException(
        `Only the rep who owns this ticket can ${action} it. Ask them, or have a super admin reassign it.`,
      );
    }
  }

  /** Close is terminal; resolve is not. Closing records who did it. */
  async close(user: JwtPayload, threadId: string, note?: string): Promise<CommsThread> {
    const thread = await this.requireAccess(user, threadId);
    this.assertOwnerOrSuper(user, thread, 'close');
    const from = thread.status;
    thread.status = 'CLOSED';
    thread.closedAt = new Date();
    thread.closedBy = user.sub;
    if (!thread.resolvedAt) thread.resolvedAt = thread.closedAt;
    await this.save(thread);
    await this.escalations.save(
      this.escalations.create({
        threadId, reason: 'closed', summary: note ?? null, team: 'general',
        actor: user.sub, fromStatus: from, toStatus: 'CLOSED',
      }),
    );
    this.emit(thread);
    return thread;
  }

  /**
   * Reopen a resolved ticket. Increments `reopenCount` — a high reopen rate means we are
   * closing conversations before the customer's problem is actually fixed, and that is a
   * number worth staring at.
   */
  async reopen(user: JwtPayload, threadId: string, reason?: string): Promise<CommsThread> {
    const thread = await this.requireThread(threadId);
    if (thread.status !== 'RESOLVED' && thread.status !== 'CLOSED') {
      throw new BadRequestException(`Only a resolved or closed ticket can be reopened; this is ${thread.status}`);
    }
    const from = thread.status;
    thread.status = 'QUEUED_FOR_HUMAN';
    thread.reopenCount = (thread.reopenCount ?? 0) + 1;
    thread.resolvedAt = null;
    thread.closedAt = null;
    thread.closedBy = null;
    // The SLA clock restarts: a reopened ticket deserves a fresh response target.
    thread.firstResponseAt = null;
    thread.slaDueAt = this.sla.due(new Date(), thread.priority || 'normal');
    await this.save(thread);
    await this.escalations.save(
      this.escalations.create({
        threadId, reason: 'reopened', summary: reason ?? null, team: 'general',
        actor: user.sub, fromStatus: from, toStatus: thread.status,
      }),
    );
    this.emit(thread);
    return thread;
  }

  /** Priority and category, settable by whoever owns the ticket. */
  async setTicketMeta(
    user: JwtPayload,
    threadId: string,
    input: { priority?: string; category?: string; tags?: string[] },
  ): Promise<CommsThread> {
    const thread = await this.requireAccess(user, threadId);
    if (input.priority) {
      if (!PRIORITIES.includes(input.priority as Priority)) {
        throw new BadRequestException(`priority must be one of ${PRIORITIES.join(', ')}`);
      }
      thread.priority = input.priority;
      // A priority change moves the target, so the due time moves with it.
      thread.slaDueAt = this.sla.due(thread.createdAt, thread.priority);
    }
    if (input.category) thread.category = input.category;
    if (input.tags) thread.tagsJson = input.tags.slice(0, 20);
    await this.save(thread);
    this.emit(thread);
    return thread;
  }

  /** The customer's 1-5 rating after resolution. */
  async submitCsat(threadId: string, score: number, comment?: string): Promise<{ ok: true }> {
    if (!Number.isFinite(score) || score < 1 || score > 5) {
      throw new BadRequestException('csat score must be between 1 and 5');
    }
    const thread = await this.requireThread(threadId);
    thread.csatScore = Math.trunc(score);
    thread.csatComment = (comment ?? '').slice(0, 1000) || null;
    await this.save(thread);
    return { ok: true };
  }

  /**
   * AI quality metrics, straight off `support_tool_audit`.
   *
   * These four numbers are what tell you whether the AI is helping or merely busy:
   * containment (never needed a human), escalation rate by reason, tool failure rate, and
   * how often the "I'll connect you to a human" promise fired — that last one is the
   * escalation-theory guard, and a rising count means the AI is promising handoffs it
   * cannot deliver.
   */
  async aiQuality(): Promise<{
    threads: number;
    containmentRate: number;
    escalationRate: number;
    toolFailureRate: number;
    promisedHandoffs: number;
    escalationsByReason: Record<string, number>;
    avgFirstResponseMinutes: number | null;
    avgCsat: number | null;
    reopenRate: number;
    slaBreachRate: number;
  }> {
    // Aggregated in SQL. Loading every support thread into the process grows
    // without bound and is a denial-of-service on the support console itself.
    const agg = await this.threads
      .createQueryBuilder('t')
      .select('COUNT(1)', 'total')
      .addSelect(
        "SUM(CASE WHEN t.escalationReason IS NOT NULL OR t.status IN ('QUEUED_FOR_HUMAN', 'HUMAN_ACTIVE') THEN 1 ELSE 0 END)",
        'escalated',
      )
      .addSelect(
        "SUM(CASE WHEN t.status IN ('RESOLVED', 'CLOSED') AND t.escalationReason IS NULL AND t.firstResponseAt IS NULL THEN 1 ELSE 0 END)",
        'contained',
      )
      .addSelect('SUM(CASE WHEN t.reopenCount > 0 THEN 1 ELSE 0 END)', 'reopened')
      .addSelect('SUM(CASE WHEN t.csatScore IS NOT NULL THEN 1 ELSE 0 END)', 'ratedCount')
      .addSelect('AVG(t.csatScore)', 'avgCsat')
      .addSelect('SUM(CASE WHEN t.firstResponseAt IS NOT NULL THEN 1 ELSE 0 END)', 'respondedCount')
      // Mirrors SlaService.isBreached: a response that landed after the due time, or
      // no response at all on a ticket still open past its due time.
      .addSelect(
        "SUM(CASE " +
          "WHEN t.slaDueAt IS NULL THEN 0 " +
          "WHEN t.firstResponseAt IS NOT NULL AND t.firstResponseAt > t.slaDueAt THEN 1 " +
          "WHEN t.status IN ('RESOLVED', 'CLOSED') THEN 0 " +
          "WHEN t.slaDueAt < :now THEN 1 " +
          "ELSE 0 END)",
        'breached',
      )
      .where('t.kind = :kind', { kind: 'support' })
      .setParameter('now', new Date())
      .getRawOne();
    const aggRow = agg as Record<string, string | number | null> | undefined;

    const n = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));
    const threads = n(aggRow?.total);
    const total = threads || 1;

    const audits = await this.audits.find({ take: 2000, order: { createdAt: 'DESC' } });
    // SupportToolAudit records `outcome` (there is no status/error column).
    const failed = audits.filter((a) => new RegExp('fail|error|denied', 'i').test(String(a.outcome ?? '')));
    const promised = audits.filter((a) => new RegExp('promised_handoff|handoff', 'i').test(String(a.tool ?? '')));

    const reasonRows = await this.threads
      .createQueryBuilder('t')
      .select('t.escalationReason', 'reason')
      .addSelect('COUNT(1)', 'count')
      .where('t.kind = :kind AND t.escalationReason IS NOT NULL', { kind: 'support' })
      .groupBy('t.escalationReason')
      .getRawMany<{ reason: string; count: string | number }>();
    const byReason: Record<string, number> = {};
    for (const r of reasonRows) byReason[r.reason] = n(r.count);

    // Average first-response time is computed in the DB so no rows are materialised.
    // Time arithmetic is dialect-specific: julianday() is SQLite-only and does not exist
    // in Postgres, so this endpoint 500'd in production (audit F-BUG-26). Both compute
    // the same (firstResponseAt - createdAt) in minutes.
    const dbType = process.env.DB_TYPE ?? 'postgres';
    const frtExpr =
      dbType === 'postgres'
        ? "AVG(EXTRACT(EPOCH FROM (t.firstResponseAt - t.createdAt)) / 60)"
        : 'AVG((julianday(t.firstResponseAt) - julianday(t.createdAt)) * 1440)';
    const frt = await this.threads
      .createQueryBuilder('t')
      .select(frtExpr, 'minutes')
      .where('t.kind = :kind AND t.firstResponseAt IS NOT NULL', { kind: 'support' })
      .getRawOne();
    const frtRow = frt as { minutes: string | number | null } | undefined;
    const avgFirstResponseMinutes =
      frtRow?.minutes === null || frtRow?.minutes === undefined ? null : Number(frtRow.minutes);

    const ratedCount = n(aggRow?.ratedCount);
    const avgCsat = ratedCount && aggRow?.avgCsat !== null && aggRow?.avgCsat !== undefined
      ? Number(aggRow.avgCsat)
      : null;

    return {
      threads,
      containmentRate: +(n(aggRow?.contained) / total).toFixed(3),
      escalationRate: +(n(aggRow?.escalated) / total).toFixed(3),
      toolFailureRate: audits.length ? +(failed.length / audits.length).toFixed(3) : 0,
      promisedHandoffs: promised.length,
      escalationsByReason: byReason,
      avgFirstResponseMinutes: avgFirstResponseMinutes === null ? null : +avgFirstResponseMinutes.toFixed(1),
      avgCsat: avgCsat === null ? null : +avgCsat.toFixed(2),
      reopenRate: +(n(aggRow?.reopened) / total).toFixed(3),
      slaBreachRate: +(n(aggRow?.breached) / total).toFixed(3),
    };
  }

  /** Tickets whose first-response SLA has expired and nobody has answered yet. */
  async findSlaBreaches(): Promise<CommsThread[]> {
    const candidates = await this.threads.find({
      where: { kind: 'support', firstResponseAt: IsNull() },
      order: { slaDueAt: 'ASC' },
      take: 200,
    });
    const now = Date.now();
    return candidates.filter(
      (t) =>
        t.slaDueAt &&
        t.slaDueAt.getTime() < now &&
        t.status !== 'RESOLVED' &&
        t.status !== 'CLOSED' &&
        !t.slaBreachedAt,
    );
  }

  /** Mark a breach as alerted so it is announced once, not every sweep. */
  async markSlaAlerted(thread: CommsThread): Promise<void> {
    thread.slaBreachedAt = new Date();
    await this.save(thread);
  }

  private async save(thread: CommsThread): Promise<void> {
    thread.updatedAt = new Date();
    await this.threads.save(thread);
  }

  private emit(thread: CommsThread): void {
    this.gateway.emitToThread(thread.id, 'thread', this.toThreadDto(thread));
  }

  private toDto(m: CommsMessage) {
    return {
      messageId: m.id, threadId: m.threadId, senderUserId: m.senderUserId,
      senderRole: m.senderRole, body: m.body, visibility: m.visibility, createdAt: m.createdAt,
    };
  }

  private toThreadDto(t: CommsThread) {
    return {
      threadId: t.id, kind: t.kind, status: t.status,
      ownerAdminUserId: t.ownerAdminUserId, assignedToUserId: t.assignedToUserId,
      ownerUserId: t.ownerUserId, escalationReason: t.escalationReason,
      escalationTeam: t.escalationTeam, flaggedTeams: t.flaggedTeams,
      createdAt: t.createdAt, updatedAt: t.updatedAt,
      // Ticket identity and clocks. Without these in the DTO the console can show a
      // conversation but cannot show a ticket: no reference to quote to the customer, no
      // response timer, no way to tell a resolved thread from a closed one.
      ticketRef: t.ticketRef,
      priority: t.priority,
      category: t.category,
      tags: t.tagsJson ?? [],
      firstResponseAt: t.firstResponseAt,
      resolvedAt: t.resolvedAt,
      closedAt: t.closedAt,
      closedBy: t.closedBy,
      reopenCount: t.reopenCount ?? 0,
      csatScore: t.csatScore,
      slaDueAt: t.slaDueAt,
      slaBreachedAt: t.slaBreachedAt,
      slaBreached: this.sla.isBreached(t),
    };
  }
}

