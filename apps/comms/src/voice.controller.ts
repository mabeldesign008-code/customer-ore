import { Body, Controller, Get, Headers, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { AuthGuard, CurrentUser, Public, RequirePermission, Roles } from '@ore/core';
import { JwtPayload } from '@ore/core';
import {
  Role,
  commsCallEventSchema,
  commsVoicePresenceSchema,
  createCommsAgentTokenSchema,
  createCommsCallSchema,
  createCommsSupportCallSchema,
  createCommsVoiceTokenSchema,
} from '@ore/contracts';
import { VoiceService } from './voice.service';

/** Twilio POSTs application/x-www-form-urlencoded; flatten to string params for signing. */
function twilioParams(raw: unknown): Record<string, string> {
  const params: Record<string, string> = {};
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof value === 'string') params[key] = value;
    }
  }
  return params;
}

@Controller('comms')
export class VoiceController {
  constructor(private readonly voice: VoiceService) {}

  @Post('voice/token')
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER, Role.VENDOR, Role.RIDER, Role.ADMIN)
  token(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    const dto = createCommsVoiceTokenSchema.parse(body);
    return this.voice.issueToken(user, dto.orderId, dto.platform);
  }

  @Post('calls')
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER, Role.VENDOR, Role.RIDER, Role.ADMIN)
  startCall(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    const dto = createCommsCallSchema.parse(body);
    return this.voice.startCall(user, dto.orderId, dto.target, dto.platform);
  }

  /** Support call — rings the browser agents, forwards to agent mobiles, then voicemail. */
  @Post('voice/support')
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER, Role.VENDOR, Role.RIDER, Role.ADMIN)
  startSupportCall(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    const dto = createCommsSupportCallSchema.parse(body ?? {});
    return this.voice.startSupportCall(user, dto.platform, dto.topic);
  }

  /** What the support screens render: real PSTN line (or null) + in-app availability. */
  @Get('support/contact')
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER, Role.VENDOR, Role.RIDER, Role.ADMIN)
  supportContact() {
    return this.voice.supportContact();
  }

  /**
   * Client-reported call events. The tel: fallback handoff happens entirely on the
   * device — Twilio never sees it — so the CDR would claim nothing happened without
   * this. Ownership is enforced in the service.
   */
  @Post('calls/:callId/events')
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER, Role.VENDOR, Role.RIDER, Role.ADMIN)
  callEvent(@CurrentUser() user: JwtPayload, @Param('callId') callId: string, @Body() body: unknown) {
    const dto = commsCallEventSchema.parse(body);
    return this.voice.clientEvent(user, callId, dto);
  }

  // ── agent softphone (admin console) ─────────────────────────────────

  /** Softphone registration token — the agent browser's Device identity for support rings. */
  @Post('voice/agent-token')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('support.voice.answer')
  agentToken(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    const dto = createCommsAgentTokenSchema.parse(body ?? {});
    return this.voice.agentToken(user, dto.platform);
  }

  /** Presence heartbeat. TTL-based: stop beating and you stop ringing. */
  @Post('voice/presence')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('support.voice.answer')
  presence(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    const dto = commsVoicePresenceSchema.parse(body);
    return this.voice.setPresence(user, dto.online, dto.forwardPhone);
  }

  @Get('voice/agents')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('support.voice.answer')
  async agents() {
    const agents = await this.voice.onlineAgents();
    return agents.map((a) => ({ userId: a.userId, forwardPhone: a.forwardPhone ?? null, at: a.at }));
  }

  @Get('voice/calls')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('support.voice.cdr.read')
  calls(@Query('limit') limit?: string) {
    return this.voice.recentCalls(limit ? Number(limit) : 50);
  }

  // ── Twilio webhooks (public, signature-validated in the service) ────

  /** TwiML App Voice URL. Twilio POSTs form fields; response is XML. */
  @Post('voice/twiml')
  @Public()
  async twiml(
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
    @Headers('x-twilio-signature') signature: string | undefined,
  ): Promise<void> {
    const xml = await this.voice.twiml({ signature, params: twilioParams(req.body) });
    // Explicit 200: Nest's Fastify adapter defaults POST replies to 201, and Twilio's
    // webhook docs specify 200 OK for TwiML responses — don't gamble a live call on it.
    void res.status(200).header('Content-Type', 'text/xml').send(xml);
  }

  /** `<Dial action>` — agent ring ended while the caller holds: forward or voicemail. */
  @Post('voice/support-forward')
  @Public()
  async supportForward(
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
    @Headers('x-twilio-signature') signature: string | undefined,
    @Query('callId') callId: string | undefined,
  ): Promise<void> {
    // callId arrives BOTH as a query param (we put it in the action URL) and merged into
    // the form body by Twilio; the service rebuilds the exact signed URL from it.
    // callId lives in the URL query, NOT the signed POST body — keep them separate or
    // signature validation fails (Twilio signs URL + body params only).
    const xml = await this.voice.supportForward({ signature, params: twilioParams(req.body), callId });
    void res.status(200).header('Content-Type', 'text/xml').send(xml);
  }

  /** Status callbacks for dialed legs — CDR truth. */
  @Post('voice/status')
  @Public()
  async status(
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
    @Headers('x-twilio-signature') signature: string | undefined,
    @Query('callId') callId: string | undefined,
  ): Promise<void> {
    // callId lives in the URL query, NOT the signed POST body — keep them separate or
    // signature validation fails (Twilio signs URL + body params only).
    await this.voice.status({ signature, params: twilioParams(req.body), callId });
    void res.status(204).send();
  }

  /** Recording completed — persist the URL on the CDR. */
  @Post('voice/recording-status')
  @Public()
  async recordingStatus(
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
    @Headers('x-twilio-signature') signature: string | undefined,
    @Query('callId') callId: string | undefined,
  ): Promise<void> {
    // callId lives in the URL query, NOT the signed POST body — keep them separate or
    // signature validation fails (Twilio signs URL + body params only).
    await this.voice.recordingStatus({ signature, params: twilioParams(req.body), callId });
    void res.status(204).send();
  }
}
