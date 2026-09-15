/**
 * Maker-checker approvals.
 *
 * Admin-facing:
 *   GET  /auth/admin/approvals            — the ⚖ inbox
 *   GET  /auth/admin/approvals/:id
 *   POST /auth/admin/approvals/:id/approve
 *   POST /auth/admin/approvals/:id/reject
 *   POST /auth/admin/approvals/:id/cancel
 *   GET  /auth/admin/approvals/tiers      — the threshold rule, so the UI can show it
 *
 * Service-to-service (@Internal, never reachable from the gateway):
 *   POST /auth/internal/approvals                 — maker submits
 *   POST /auth/internal/approvals/:ref/execute    — claim the right to execute
 *   POST /auth/internal/approvals/:ref/complete   — money moved
 *   POST /auth/internal/approvals/:ref/fail       — it did not, and why
 *   POST /auth/internal/approvals/:ref/retry      — re-open a FAILED one
 *   GET  /auth/internal/approvals/by-ref/:ref
 *   GET  /auth/internal/approvals/cap             — per-admin daily headroom
 */
import { Body, Controller, Get, InternalServerErrorException, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser, Internal, RequirePermission, Roles } from '@ore/core';
import type { JwtPayload } from '@ore/core';
import { Role } from '@ore/contracts';
import { ApprovalService } from './approval.service';

@Controller('auth')
export class ApprovalController {
  constructor(private readonly approvals: ApprovalService) {}

  /* ------------------------------- admin --------------------------------- */

  @Get('admin/approvals')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('admin.approval.queue.read')
  async queue(@CurrentUser() user: JwtPayload, @Query('status') status?: string, @Query('limit') limit?: string) {
    // Opportunistic sweep so the inbox never shows something that lapsed an hour ago.
    await this.approvals.expireStale().catch(() => 0);
    const rows = await this.approvals.queue({ status, limit: limit ? parseInt(limit, 10) : undefined });
    return { approvals: rows, tiers: this.approvals.tiers(), me: user.sub };
  }

  @Get('admin/approvals/tiers')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('admin.approval.queue.read')
  tiers() {
    return { tiers: this.approvals.tiers() };
  }

  @Get('admin/approvals/:id')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('admin.approval.queue.read')
  one(@Param('id') id: string) {
    return this.approvals.get(id);
  }

  @Post('admin/approvals/:id/approve')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('admin.approval.check')
  approve(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: { note?: string }) {
    return this.approvals.approve(id, user.sub, body?.note);
  }

  @Post('admin/approvals/:id/reject')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('admin.approval.check')
  reject(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.approvals.reject(id, user.sub, body?.reason ?? '');
  }

  @Post('admin/approvals/:id/cancel')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('admin.approval.queue.read')
  cancel(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.approvals.cancel(id, user.sub);
  }

  /* ---------------------------- internal API ------------------------------ */

  @Post('internal/approvals')
  @Internal()
  submit(@Body() body: {
    kind: string;
    permission: string;
    service: string;
    resourceType?: string | null;
    resourceId?: string | null;
    executionRef: string;
    amountPesewas?: number;
    currency?: string;
    payload?: Record<string, unknown> | null;
    reason?: string | null;
    forceApprovals?: number;
    forceRequiresSuper?: boolean;
    makerUserId: string;
    makerAdminRole?: string | null;
  }) {
    if (!body?.makerUserId) throw new InternalServerErrorException('makerUserId is required');
    const { makerUserId, makerAdminRole, ...req } = body;
    return this.approvals.submit(req, makerUserId, makerAdminRole ?? null);
  }

  @Post('internal/approvals/:ref/execute')
  @Internal()
  execute(@Param('ref') ref: string, @Body() body: { payload?: Record<string, unknown> | null; executorUserId: string }) {
    return this.approvals.beginExecution(ref, body?.payload, body?.executorUserId ?? '');
  }

  @Post('internal/approvals/:ref/complete')
  @Internal()
  complete(@Param('ref') ref: string, @Body() body: Record<string, unknown>) {
    return this.approvals.completeExecution(ref, body ?? {}).then(() => ({ ok: true }));
  }

  @Post('internal/approvals/:ref/fail')
  @Internal()
  fail(@Param('ref') ref: string, @Body() body: { reason: string; safeToRetry?: boolean }) {
    return this.approvals.failExecution(ref, body?.reason ?? 'unknown', body?.safeToRetry ?? false);
  }

  @Post('internal/approvals/:ref/retry')
  @Internal()
  retry(@Param('ref') ref: string, @Body() body: { userId: string }) {
    return this.approvals.retry(ref, body?.userId ?? '');
  }

  @Get('internal/approvals/by-ref/:ref')
  @Internal()
  byRef(@Param('ref') ref: string) {
    return this.approvals.byExecutionRef(ref);
  }

  @Get('internal/approvals/cap')
  @Internal()
  cap(@Query('userId') userId: string, @Query('kind') kind: string, @Query('capPesewas') capPesewas: string) {
    return this.approvals.remainingDailyCap(userId, kind, parseInt(capPesewas || '0', 10));
  }
}
