/**
 * Compliance admin + the internal hold check.
 *
 * Route map (all under /auth):
 *   holds       GET    compliance.hold.place    POST/DELETE same
 *   kyc         GET    compliance.kyc.read      POST decide  compliance.kyc.decide
 *   flags       GET    compliance.fraud.flag    POST/resolve same
 *   access-log  GET    compliance.access_log.review
 *
 * Internal (never reachable through the gateway):
 *   GET /auth/internal/holds/withdrawal/:targetType/:targetId — what the ledger asks before a payout
 */
import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser, Internal, RequirePermission, Roles } from '@ore/core';
import type { JwtPayload } from '@ore/core';
import { Role } from '@ore/contracts';
import { ComplianceService } from './compliance.service';
import type { HoldTargetType } from './entities/compliance-hold.entity';

@Controller('auth')
export class ComplianceController {
  constructor(private readonly compliance: ComplianceService) {}

  // ── holds ──
  @Get('admin/holds')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('compliance.hold.place')
  listHolds(
    @Query('targetType') targetType?: string,
    @Query('targetId') targetId?: string,
    @Query('status') status?: string,
  ) {
    return this.compliance.listHolds({ targetType, targetId, status });
  }

  @Post('admin/holds')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('compliance.hold.place')
  placeHold(@CurrentUser() user: JwtPayload, @Body() body: {
    targetType: string; targetId: string; scope?: string; reason: string; until?: string | null; fraudFlagId?: string | null;
  }) {
    return this.compliance.placeHold(user, body);
  }

  @Delete('admin/holds/:id')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('compliance.hold.place')
  liftHold(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: { note?: string }) {
    return this.compliance.liftHold(user, id, body?.note);
  }

  // ── KYC ──
  @Get('admin/kyc')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('compliance.kyc.read')
  kycQueue(@Query('status') status?: string) {
    return this.compliance.kycQueue(status ?? 'PENDING');
  }

  @Get('admin/kyc/:id')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('compliance.kyc.read')
  getKyc(@Param('id') id: string) {
    return this.compliance.getKyc(id);
  }

  @Post('admin/kyc/:id/decide')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('compliance.kyc.decide')
  decideKyc(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: { decision: string; note?: string }) {
    return this.compliance.decideKyc(user, id, body?.decision, body?.note);
  }

  // ── fraud flags ──
  @Get('admin/fraud-flags')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('compliance.fraud.flag')
  listFlags(
    @Query('status') status?: string,
    @Query('targetType') targetType?: string,
    @Query('targetId') targetId?: string,
    @Query('severity') severity?: string,
  ) {
    return this.compliance.listFlags({ status, targetType, targetId, severity });
  }

  @Post('admin/fraud-flags')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('compliance.fraud.flag')
  raiseFlag(@CurrentUser() user: JwtPayload, @Body() body: {
    targetType: string; targetId: string; severity?: string; category: string;
    reason: string; evidence?: Record<string, unknown>;
  }) {
    return this.compliance.raiseFlag(user, body);
  }

  @Post('admin/fraud-flags/:id/assign')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('compliance.fraud.flag')
  assignFlag(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.compliance.assignFlag(user, id);
  }

  @Post('admin/fraud-flags/:id/resolve')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('compliance.fraud.flag')
  resolveFlag(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: { status: string; note: string }) {
    return this.compliance.resolveFlag(user, id, body?.status, body?.note);
  }

  // ── access log ──
  @Get('admin/compliance/access-log')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('compliance.access_log.review')
  accessLog(@Query('userId') userId?: string, @Query('limit') limit?: string) {
    return this.compliance.documentAccessLog({ userId, limit: limit ? Number(limit) : undefined });
  }

  // ── customer-facing KYC submission ──
  @Post('kyc/submit')
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER, Role.RIDER, Role.VENDOR)
  submitKyc(@CurrentUser() user: JwtPayload, @Body() body: {
    documents: Array<{ type: string; key: string }>; idNumber?: string; fullName?: string;
  }) {
    return this.compliance.submitKyc(user.sub, user.role, body);
  }

  /** What the ledger asks before paying anyone out. Internal only. */
  @Get('internal/holds/withdrawal/:targetType/:targetId')
  @Internal()
  withdrawalBlock(@Param('targetType') targetType: string, @Param('targetId') targetId: string) {
    return this.compliance.withdrawalBlockFor(targetType as HoldTargetType, targetId);
  }
}
