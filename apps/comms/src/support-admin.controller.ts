/**
 * Admin support console API.
 *
 * Every route requires role=ADMIN. Which admin *sub*-role you are decides what your queue
 * contains (see SupportAdminService.queue) rather than whether you may call the route —
 * support lives in every admin role, and ownership/visibility is enforced per thread.
 */

import { Body, Controller, Get, NotFoundException, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@ore/contracts';
import { AuthGuard, CurrentUser, Roles, RequirePermission } from '@ore/core';
import { JwtPayload } from '@ore/core';
import { SupportAdminService } from './support-admin.service';

@Controller('comms/admin/support')
@UseGuards(AuthGuard)
@Roles(Role.ADMIN)
export class SupportAdminController {
  constructor(private readonly admin: SupportAdminService) {}

  /** My queue, filtered by my admin sub-role. */
  @Get('queue')
  @RequirePermission('support.queue.read')
  queue(@CurrentUser() user: JwtPayload, @Query('status') status?: string, @Query('limit') limit?: string) {
    return this.admin.queue(user, { status, limit: limit ? Number(limit) : undefined });
  }

  /** Full conversation: transcript, internal notes, participants, escalations, AI trace. */
  @Get('threads/:id')
  @RequirePermission('support.thread.read_flagged')
  detail(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.admin.detail(user, id);
  }

  /** Become the owner. Refused if someone else already owns it (unless super-admin). */
  @Post('threads/:id/claim')
  @RequirePermission('support.claim')
  claim(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.admin.claim(user, id).then((t) => ({ threadId: t.id, status: t.status, ownerAdminUserId: t.ownerAdminUserId }));
  }

  /** THE SWARM SIGNAL — pull a specialist in. Ownership does not move. */
  @Post('threads/:id/invite')
  @RequirePermission('support.invite')
  invite(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { userId: string; adminRole: string; note?: string },
  ) {
    return this.admin.invite(user, id, body);
  }

  @Post('threads/:id/participants/:userId/remove')
  @RequirePermission('support.participant.remove')
  removeParticipant(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Param('userId') userId: string) {
    return this.admin.removeParticipant(user, id, userId).then(() => ({ ok: true }));
  }

  /** Super-admin only: transfer ownership. */
  @Post('threads/:id/reassign')
  @RequirePermission('support.reassign')
  reassign(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: { ownerAdminUserId: string }) {
    return this.admin.reassign(user, id, body.ownerAdminUserId).then((t) => ({ threadId: t.id, ownerAdminUserId: t.ownerAdminUserId }));
  }

  /**
   * Staff reply. visibility 'internal' is a note to other staff and never reaches the
   * customer. A customer-facing reply hard-stops the AI.
   */
  @Post('threads/:id/messages')
  @RequirePermission('support.reply.customer')
  reply(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { body: string; visibility?: 'customer' | 'internal'; attachments?: { url: string; type: string; name: string }[] },
  ) {
    const visibility = body?.visibility === 'internal' ? 'internal' : 'customer';
    return this.admin.reply(user, id, body?.body, visibility, body?.attachments);
  }

  /** Hand the conversation back to the assistant. */
  @Post('threads/:id/return-to-ai')
  @RequirePermission('support.return_to_ai')
  returnToAi(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.admin.returnToAi(user, id).then((t) => ({ threadId: t.id, status: t.status }));
  }

  @Post('threads/:id/resolve')
  @RequirePermission('support.resolve')
  resolve(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: { note?: string }) {
    // Owner-only: a visiting specialist can contribute but cannot end someone else's ticket.
    return this.admin.resolve(user, id, body?.note).then((t) => ({ threadId: t.id, status: t.status }));
  }

  /* ─────────────────────── ticket lifecycle (T4.4) ─────────────────────── */

  /** Terminal. Unlike resolve, a closed ticket does not reopen on the next message. */
  @Post('threads/:id/close')
  @RequirePermission('support.resolve')
  close(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: { note?: string }) {
    return this.admin.close(user, id, body?.note).then((t) => ({ threadId: t.id, status: t.status }));
  }

  @Post('threads/:id/reopen')
  @RequirePermission('support.resolve')
  reopen(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.admin.reopen(user, id, body?.reason).then((t) => ({
      threadId: t.id, status: t.status, reopenCount: t.reopenCount,
    }));
  }

  @Post('threads/:id/meta')
  @RequirePermission('support.resolve')
  meta(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { priority?: string; category?: string; tags?: string[] },
  ) {
    return this.admin.setTicketMeta(user, id, body ?? {});
  }

  /* ─────────────────────── macros (T4.9) ───────────────────────────────── */

  @Get('macros')
  @RequirePermission('support.reply.customer')
  macros() {
    return { macros: MACROS };
  }

  /**
   * Insert a macro into a draft. It returns TEXT — the rep sends it explicitly.
   * An endpoint that auto-sends on insert would fire a half-chosen message at a customer,
   * which is worse than not having macros at all.
   */
  @Get('macros/:id')
  @RequirePermission('support.reply.customer')
  macro(@Param('id') id: string) {
    const found = MACROS.find((m) => m.id === id);
    if (!found) throw new NotFoundException('No such macro');
    return found;
  }

  /* ─────────────────────── metrics (T4.12) ─────────────────────────────── */

  @Get('ai-quality')
  @RequirePermission('support.metrics.read')
  aiQuality() {
    return this.admin.aiQuality();
  }

  @Get('sla')
  @RequirePermission('support.metrics.read')
  async sla() {
    const breached = await this.admin.findSlaBreaches();
    return {
      breached: breached.length,
      threads: breached.map((t) => ({
        threadId: t.id,
        ticketRef: t.ticketRef,
        priority: t.priority,
        dueAt: t.slaDueAt,
        status: t.status,
      })),
    };
  }
}

/**
 * Canned replies (T4.9).
 *
 * Kept in code rather than a table on purpose for now: they are few, they change rarely,
 * and a table would need its own edit UI and audit trail before it is worth having. The
 * `{name}` and `{eta}` placeholders are filled by the console, never by the server, so
 * the rep always sees the exact text before it goes to the customer.
 */
export const MACROS: { id: string; label: string; body: string }[] = [
  {
    id: 'greeting',
    label: 'Greeting',
    body: 'Hi {name}, thanks for getting in touch — I\'m looking into this for you now.',
  },
  {
    id: 'checking_order',
    label: 'Checking the order',
    body: 'I\'ve pulled up your order and I\'m checking with the team now. I\'ll come back to you shortly with exactly what happened.',
  },
  {
    id: 'rider_delay',
    label: 'Rider running late',
    body: 'Your rider is running behind schedule — I\'m sorry about that. The current estimate is {eta}. I\'ll keep you updated and will let you know the moment it moves.',
  },
  {
    id: 'refund_started',
    label: 'Refund raised',
    body: 'I\'ve raised a refund request for you. It now needs a second member of our finance team to approve it, which we do for every refund to keep your money safe. I\'ll confirm here as soon as it is approved.',
  },
  {
    id: 'need_more_info',
    label: 'Need more detail',
    body: 'To sort this out quickly, could you tell me a little more about what happened? A photo helps if you have one.',
  },
  {
    id: 'resolved',
    label: 'Resolved',
    body: 'That\'s all sorted now. Thank you for your patience — if anything else comes up, just reply here and it will reach me.',
  },
];
