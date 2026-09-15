/**
 * Decides when the assistant speaks, runs it, and records what happened.
 *
 * The assistant only ever speaks when ALL of these hold:
 *   - the thread is a `support` thread
 *   - its status is AI_HANDLING (an admin takeover flips this and the AI goes silent)
 *   - the last message came from the customer, not from support or the AI
 *   - an API key is configured
 *
 * Attachment rule: if the customer's message looks like it carries an attachment we
 * escalate immediately and do NOT ask the model about it. The model cannot see images,
 * and a support bot guessing at a receipt photo is how a wrong refund gets justified.
 *
 * Nothing in this file writes to the ledger, orders, payments or wallets. The only writes
 * are to the comms schema: messages, thread status, and the two audit tables.
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommsMessage } from '../entities/message.entity';
import { CommsThread } from '../entities/thread.entity';
import { SupportEscalation } from '../entities/support-escalation.entity';
import { SupportToolAudit } from '../entities/support-tool-audit.entity';
import { SupportAgentService, AgentHistoryEntry } from './ai.agent';
import { SupportToolRegistry } from './support-tool.registry';
import { ToolContext } from './ai.tools';

export const SUPPORT_STATUSES = [
  'AI_HANDLING',
  'AI_OFFERED_HUMAN',
  'QUEUED_FOR_HUMAN',
  'HUMAN_ACTIVE',
  'RESOLVED',
] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

/** Only these statuses let the assistant reply. */
const AI_MAY_SPEAK: SupportStatus[] = ['AI_HANDLING'];

/**
 * Cheap, deterministic attachment detection that runs BEFORE the model is called.
 * We do not rely on the model to notice an attachment it cannot see.
 */
const ATTACHMENT_PATTERNS = [
  /\[attachment\b/i,
  /\[image\b/i,
  /\[photo\b/i,
  /\[file\b/i,
  /\battached\b/i,
  /\bscreenshot\b/i,
  /\breceipt\b.*\b(sent|attached|here)\b/i,
  /data:image\//i,
  /\.(png|jpe?g|pdf|webp|heic)\b/i,
];

export function looksLikeAttachment(body: string): boolean {
  return ATTACHMENT_PATTERNS.some((re) => re.test(body));
}

export interface AiReplyOutcome {
  replied: boolean;
  escalated: boolean;
  messageId: string | null;
  reason: string;
}

@Injectable()
export class SupportAiService {
  private readonly logger = new Logger(SupportAiService.name);

  constructor(
    private readonly registry: SupportToolRegistry,
    @InjectRepository(CommsMessage) private readonly messages: Repository<CommsMessage>,
    @InjectRepository(SupportEscalation) private readonly escalations: Repository<SupportEscalation>,
    @InjectRepository(SupportToolAudit) private readonly audits: Repository<SupportToolAudit>,
  ) {}

  get enabled(): boolean {
    return this.registry.enabled;
  }

  /** Should the assistant respond to this thread right now? */
  shouldRespond(thread: CommsThread, lastSenderRole: string): boolean {
    if (!this.enabled) return false;
    if (thread.kind !== 'support') return false;
    if (!AI_MAY_SPEAK.includes(thread.status as SupportStatus)) return false;
    // Never answer our own message, and never talk over a human.
    return lastSenderRole !== 'ai' && lastSenderRole !== 'support';
  }

  /**
   * Run the assistant for a thread. Returns what happened so the caller can emit the
   * reply over the socket. Failures are swallowed deliberately: a broken AI must degrade
   * to human support, never break messaging.
   */
  async respond(thread: CommsThread, customerMessage: string, userId: string, role: string): Promise<AiReplyOutcome> {
    // Attachment -> escalate without consulting the model at all.
    if (looksLikeAttachment(customerMessage)) {
      await this.escalate(thread, {
        reason: 'attachment',
        summary:
          'The customer sent an attachment. The assistant cannot view images or documents, ' +
          'so a human agent must review it. Message text: ' + customerMessage.slice(0, 500),
        team: 'general',
      }, 'AI');
      return { replied: false, escalated: true, messageId: null, reason: 'attachment' };
    }

    const history = await this.buildHistory(thread.id);

    const ctx: ToolContext = {
      userId,
      role,
      threadId: thread.id,
      lookups: this.registry.lookups,
    };

    let result;
    try {
      result = await this.registry.agent.respond(ctx, history, customerMessage);
    } catch (err) {
      this.logger.error(`agent threw: ${(err as Error).message}`);
      await this.escalate(thread, {
        reason: 'agent_error',
        summary: `The assistant failed with an internal error: ${(err as Error).message}. A human should pick this up.`,
        team: 'general',
      }, 'AI');
      return { replied: false, escalated: true, messageId: null, reason: 'agent_error' };
    }

    await this.recordAudit(thread.id, result.toolCalls, result.model, result.promptTokens, result.completionTokens);

    if (result.escalation) {
      await this.escalate(thread, result.escalation, 'AI');
      return { replied: false, escalated: true, messageId: null, reason: result.escalation.reason };
    }

    if (!result.reply) {
      return { replied: false, escalated: false, messageId: null, reason: 'empty_reply' };
    }

    const saved = await this.messages.save(
      this.messages.create({
        threadId: thread.id,
        // Distinct from 'support' so the admin console can show who actually answered.
        senderUserId: 'ai',
        senderRole: 'ai',
        body: result.reply.slice(0, 2000),
      }),
    );

    thread.lastAiAt = new Date();
    await this.saveThread(thread);

    return { replied: true, escalated: false, messageId: saved.id, reason: 'answered' };
  }

  /**
   * Move a thread to the human queue. Idempotent: if it is already queued or with a human,
   * we record the escalation for the audit trail but do not regress the status.
   */
  async escalate(
    thread: CommsThread,
    input: { reason: string; summary: string; team: 'finance' | 'operations' | 'general' },
    actor: string,
  ): Promise<void> {
    const from = thread.status;
    const already = from === 'QUEUED_FOR_HUMAN' || from === 'HUMAN_ACTIVE';
    const to = already ? from : 'QUEUED_FOR_HUMAN';

    await this.escalations.save(
      this.escalations.create({
        threadId: thread.id,
        reason: input.reason,
        summary: input.summary.slice(0, 2000),
        team: input.team,
        actor,
        fromStatus: from,
        toStatus: to,
      }),
    );

    thread.status = to;
    thread.escalationReason = input.reason;
    thread.escalationTeam = input.team;
    await this.saveThread(thread);

    this.logger.log(`thread ${thread.id} escalated: ${input.reason} -> ${to} (actor=${actor})`);
  }

  /** Admin takes over. The assistant stops replying from this moment. */
  async adminTakeover(thread: CommsThread, adminUserId: string): Promise<void> {
    const from = thread.status;
    thread.status = 'HUMAN_ACTIVE';
    thread.assignedToUserId = adminUserId;
    thread.lastHumanAt = new Date();
    await this.saveThread(thread);

    await this.escalations.save(
      this.escalations.create({
        threadId: thread.id,
        reason: 'admin_takeover',
        summary: null,
        team: 'general',
        actor: adminUserId,
        fromStatus: from,
        toStatus: 'HUMAN_ACTIVE',
      }),
    );
  }

  /** Hand the thread back to the assistant. */
  async returnToAi(thread: CommsThread): Promise<void> {
    const from = thread.status;
    thread.status = 'AI_HANDLING';
    thread.assignedToUserId = null;
    await this.saveThread(thread);
    await this.escalations.save(
      this.escalations.create({
        threadId: thread.id,
        reason: 'returned_to_ai',
        summary: null,
        team: 'general',
        actor: thread.assignedToUserId ?? 'system',
        fromStatus: from,
        toStatus: 'AI_HANDLING',
      }),
    );
  }

  async escalationHistory(threadId: string): Promise<SupportEscalation[]> {
    return this.escalations.find({ where: { threadId }, order: { createdAt: 'ASC' } });
  }

  async toolAudit(threadId: string): Promise<SupportToolAudit[]> {
    return this.audits.find({ where: { threadId }, order: { createdAt: 'ASC' } });
  }

  private async buildHistory(threadId: string): Promise<AgentHistoryEntry[]> {
    const rows = await this.messages.find({
      where: { threadId },
      order: { createdAt: 'DESC' },
      take: 20,
    });
    return rows.reverse().map((m) => ({
      role: m.senderRole === 'customer' ? ('user' as const) : ('support' as const),
      body: m.body,
    }));
  }

  private async recordAudit(
    threadId: string,
    toolCalls: string[],
    model: string,
    promptTokens: number,
    completionTokens: number,
  ): Promise<void> {
    if (toolCalls.length === 0) return;
    try {
      await this.audits.save(
        toolCalls.map((tool) =>
          this.audits.create({
            threadId,
            tool,
            argsJson: null,
            outcome: 'called',
            model,
            promptTokens,
            completionTokens,
          }),
        ),
      );
    } catch (err) {
      // Auditing must never break the conversation.
      this.logger.warn(`tool audit failed: ${(err as Error).message}`);
    }
  }

  private async saveThread(thread: CommsThread): Promise<void> {
    thread.updatedAt = new Date();
    try {
      await this.escalations.manager.getRepository(CommsThread).save(thread);
    } catch (err) {
      this.logger.error(`thread save failed: ${(err as Error).message}`);
    }
  }
}
