import { BadRequestException, Body, Controller, Get, Header, Headers, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { OnboardingService } from './onboarding.service';
import { AuthGuard, CurrentUser, Public, Roles, RequirePermission } from '@ore/core';
import { JwtPayload } from '@ore/core';
import { AdminRole, Role, riderStage4Schema } from '@ore/contracts';
import { SmileDocumentVerificationService } from './smile-document-verification.service';
import { SmileVerificationWebhookService } from './smile-verification-webhook.service';

type RawOnboardingRequest = FastifyRequest & {
  rawBody?: Buffer;
  body?: unknown;
};

@Controller()
export class OnboardingController {
  constructor(
    private readonly onboarding: OnboardingService,
    private readonly smileDocuments: SmileDocumentVerificationService,
    private readonly smileWebhookService: SmileVerificationWebhookService,
  ) {}

  @Get('applications/me/status')
  @UseGuards(AuthGuard)
  myStatus(@CurrentUser() user: JwtPayload, @Query('kind') kind: 'RIDER' | 'VENDOR') {
    return this.onboarding.getMyStatus(user.sub, kind || 'RIDER', user.phone);
  }

  /**
   * Issues a short-lived SmileID token to an authenticated rider.
   * Partner credentials and token generation remain inside the onboarding service.
   */
  @Post('applications/me/smile/token')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER)
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  async smileDocumentToken() {
    return this.smileDocuments.getToken();
  }

  /** Accepts the project-owner-provided multipart document verification contract. */
  @Post('applications/me/smile/document')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER)
  @HttpCode(HttpStatus.ACCEPTED)
  async submitSmileDocument(
    @CurrentUser() user: JwtPayload,
    @Req() request: FastifyRequest,
  ) {
    return this.smileDocuments.submitDocumentVerification(user, request);
  }

  @Post('applications/me/vendor/smile/document')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR)
  @HttpCode(HttpStatus.ACCEPTED)
  async submitVendorSmileDocument(
    @CurrentUser() user: JwtPayload,
    @Req() request: FastifyRequest,
  ) {
    return this.smileDocuments.submitVendorDocumentVerification(user, request);
  }

  /** Public SmileID callback; authenticity is enforced by the webhook service. */
  @Post('smile/webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  async smileWebhook(
    @Req() request: RawOnboardingRequest,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const rawBody = request.rawBody ?? Buffer.from(JSON.stringify(request.body ?? {}));
    const configuredSignatureHeader = (
      process.env.SMILE_WEBHOOK_SIGNATURE_HEADER ?? 'x-smile-signature'
    ).toLowerCase();
    const signatureHeader = firstHeader(
      headers[configuredSignatureHeader] ??
        headers['x-smile-signature'] ??
        headers['smileid-signature'],
    );
    return this.smileWebhookService.handleWebhook(rawBody, signatureHeader);
  }

  // ── Rider Staged Endpoints ─────────────────────────────────────────
  @Post('applications/rider/stage/:stage')
  @UseGuards(AuthGuard)
  saveRiderStage(
    @CurrentUser() user: JwtPayload,
    @Param('stage', ParseIntPipe) stage: number,
    @Body() body: Record<string, unknown>,
  ) {
    return this.onboarding.saveRiderStage(user, stage, body);
  }

  // ── Vendor Staged Endpoints ────────────────────────────────────────
  @Post('applications/vendor/stage/:stage')
  @UseGuards(AuthGuard)
  saveVendorStage(
    @CurrentUser() user: JwtPayload,
    @Param('stage', ParseIntPipe) stage: number,
    @Body() body: Record<string, unknown>,
  ) {
    return this.onboarding.saveVendorStage(user, stage, body);
  }

  // ── Payout Verification ────────────────────────────────────────────
  @Get('applications/payout/providers')
  @UseGuards(AuthGuard)
  async payoutProviders(@Query('type') type: 'MOMO' | 'BANK' = 'MOMO') {
    if (type !== 'MOMO' && type !== 'BANK') throw new BadRequestException('Payout type must be MOMO or BANK');
    return this.onboarding.listPayoutProviders(type);
  }

  @Post('applications/payout/verify')
  @UseGuards(AuthGuard)
  verifyPayout(@Body() body: unknown) {
    const payout = riderStage4Schema.shape.payout.parse(body);
    return this.onboarding.verifyPayout(payout);
  }

  @Get('applications/me')
  @UseGuards(AuthGuard)
  mine(@CurrentUser() user: JwtPayload) {
    return this.onboarding.myApplications(user.sub);
  }

  @Get('applications/me/documents')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER, Role.VENDOR)
  myDocuments(@CurrentUser() user: JwtPayload) {
    return this.onboarding.myDocuments(user.sub);
  }

  // ── Admin Review & Decisioning ─────────────────────────────────────
  @Get('admin/applications')
  @RequirePermission('onboarding.application.read')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  list(@Query('status') status?: string, @Query('kind') kind?: string) {
    return this.onboarding.adminList(status, kind);
  }

  @Get('admin/applications/:id')
  @RequirePermission('onboarding.application.read')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  get(@Param('id') id: string) {
    return this.onboarding.adminGet(id);
  }

  @Get('admin/applications/:id/audit-logs')
  @RequirePermission('onboarding.audit_log.read')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  auditLogs(@Param('id') id: string) {
    return this.onboarding.getAuditLogs(id);
  }

  @Post('admin/applications/:id/approve')
  @RequirePermission('onboarding.application.approve')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  approve(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.onboarding.approve(user, id);
  }

  @Post('admin/applications/:id/reject')
  @RequirePermission('onboarding.application.reject')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  reject(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: { reason: string }) {
    return this.onboarding.reject(user, id, body.reason);
  }

  /**
   * Manual biometrics decision for the QUEUED_FOR_MANUAL compliance queue (audit
   * F-BUG-22). approve() requires smileIdStatus===APPROVED, but when SmileID is down the
   * applicant is parked at QUEUED_FOR_MANUAL with no way to clear it — this lets a
   * compliance/super admin record an out-of-band review. Dual-control (onboarding.kyc.override).
   */
  @Post('admin/applications/:id/smile/manual')
  @RequirePermission('onboarding.kyc.override')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  manualSmileDecision(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { decision: 'approved' | 'failed'; note: string },
  ) {
    if (body?.decision !== 'approved' && body?.decision !== 'failed') {
      throw new BadRequestException("decision must be 'approved' or 'failed'");
    }
    return this.onboarding.manualSmileDecision(user, id, body.decision, body.note ?? '');
  }

  @Post('admin/applications/:id/requires-action')
  @RequirePermission('onboarding.application.requires_action')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  requiresAction(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { field: string; message: string; stage: number },
  ) {
    return this.onboarding.requiresAction(user, id, body.field, body.message, body.stage);
  }

  @Get('admin/stats')
  @RequirePermission('onboarding.stats.read')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  adminStats() {
    return this.onboarding.adminStats();
  }

  @Get('admin/applications/:id/documents')
  @RequirePermission('onboarding.document.read')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  adminDocuments(@Param('id') id: string) {
    return this.onboarding.adminGetDocuments(id);
  }
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

@Controller('media')
export class MediaController {
  constructor(private readonly onboarding: OnboardingService) {}

  /**
   * Legacy local-storage compatibility route.
   *
   * It is intentionally authenticated and scoped to the caller's current
   * onboarding application. New Rider clients use the server-side multipart
   * Smile submission route instead of this endpoint.
   */
  @Post('upload')
  @UseGuards(AuthGuard)
  async upload(
    @CurrentUser() user: JwtPayload,
    @Body() body: { key: string; contentType?: string; dataBase64: string },
  ) {
    return this.onboarding.uploadFileForUser(
      user.sub,
      body.key,
      body.contentType ?? 'application/octet-stream',
      body.dataBase64,
    );
  }

  @Get('documents/:id')
  @UseGuards(AuthGuard)
  async get(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Res() res: FastifyReply,
  ) {
    const isAdmin = user.role === Role.ADMIN || (user.roles && user.roles.includes(Role.ADMIN));
    const result = await this.onboarding.readDocumentByIdForUser(user.sub, id, isAdmin);
    if ('downloadUrl' in result) {
      return res.redirect(result.downloadUrl);
    }
    return res.type(result.contentType).send(result.body);
  }
}
