/** Twilio Voice sessions for orders and support.
 *
 * Order calls stay VoIP-only in TwiML (never a PSTN noun): the "regular network call"
 * fallback is a CLIENT-side handoff to the native dialer using the callee's stored
 * number (`fallbackPhone`), because masking is explicitly not a product requirement
 * (owner decision 2026-09-11). Support calls may forward to an agent's mobile when no
 * browser agent answers — that is the one PSTN leg we place.
 *
 * Every attempt writes a `voice_call` CDR row BEFORE Twilio is involved, so calls that
 * never connect are still evidenced.
 */

import { BadRequestException, ForbiddenException, Injectable, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Redis } from 'ioredis';
import { randomBytes } from 'crypto';
import {
  CommsCallEventDto,
  CommsCallRecordDto,
  CommsVoicePlatform,
  CommsVoiceSessionDto,
  CommsVoiceTarget,
  SupportContactDto,
} from '@ore/contracts';
import { JwtPayload, ORE_ENV } from '@ore/core';
import { Inject } from '@nestjs/common';
import { OreEnv } from '@ore/config';
import {
  dialClientTwiml,
  dialSupportAgentsTwiml,
  forwardAgentMobileTwiml,
  hangupTwiml,
  mintTwilioVoiceAccessToken,
  rejectTwiml,
  supportVoicemailTwiml,
  twilioSignatureIsValid,
} from '@ore/twilio-voice';
import { CommsAccessService } from './comms.access';
import { userRoles } from './comms.auth';
import { VoiceCall } from './entities';
import { Role } from '@ore/contracts';
import {
  VoiceCallTarget,
  callerMayDial,
  isSyntheticVendor,
  normalizeE164,
  parseVoiceClientIdentity,
  voiceClientIdentity,
} from './voice.auth';

/** `To` value the apps send when calling support instead of an order party. */
export const SUPPORT_IDENTITY = 'support';

const PRESENCE_TTL_SEC = 45;
const AGENT_RING_TIMEOUT_SEC = 20;
const ORDER_RING_TIMEOUT_SEC = 30;

interface AgentPresence {
  userId: string;
  forwardPhone?: string;
  at: number;
}

/**
 * Twilio signs URL + POST-body params. `callId` rides in the URL query on callbacks, so
 * it must never leak into the signed param map even if a caller merged it there.
 */
function signedParams(params: Record<string, string>): Record<string, string> {
  if (!('callId' in params)) return params;
  const { callId: _callId, ...rest } = params;
  return rest;
}

@Injectable()
export class VoiceService implements OnModuleDestroy {
  private redis: Redis | null = null;

  constructor(
    @Inject(ORE_ENV) private readonly env: OreEnv,
    private readonly access: CommsAccessService,
    @InjectRepository(VoiceCall) private readonly calls: Repository<VoiceCall>,
  ) {}

  async onModuleDestroy(): Promise<void> {
    await this.redis?.quit().catch(() => undefined);
    this.redis = null;
  }

  isTwilioLive(): boolean {
    return (
      this.env.voiceProvider === 'twilio' &&
      this.env.twilioAccountSid.startsWith('AC') &&
      this.env.twilioApiKeySid.startsWith('SK') &&
      this.env.twilioApiSecret.length > 0 &&
      this.env.twilioTwimlAppSid.startsWith('AP')
    );
  }

  // ── sessions ────────────────────────────────────────────────────────

  async issueToken(user: JwtPayload, orderId: string, platform?: CommsVoicePlatform): Promise<CommsVoiceSessionDto> {
    await this.access.assertCanView(user, orderId);
    if (!this.isTwilioLive()) return { provider: 'log' };
    const minted = this.mint(user.sub, platform);
    return {
      provider: 'twilio',
      identity: minted.identity,
      token: minted.token,
      expiresAt: minted.expiresAt.toISOString(),
      ttlSec: minted.ttlSec,
    };
  }

  /**
   * Softphone token for support agents — no order context. Permission-gated in the
   * controller (support.voice.answer). Registering a Device with this token is what
   * makes the agent ringable by the support TwiML flow's <Client> nouns.
   */
  async agentToken(user: JwtPayload, platform?: CommsVoicePlatform): Promise<CommsVoiceSessionDto> {
    if (!this.isTwilioLive()) return { provider: 'log', support: true };
    const minted = this.mint(user.sub, platform);
    return {
      provider: 'twilio',
      support: true,
      identity: minted.identity,
      token: minted.token,
      expiresAt: minted.expiresAt.toISOString(),
      ttlSec: minted.ttlSec,
    };
  }

  async startCall(
    user: JwtPayload,
    orderId: string,
    target: CommsVoiceTarget,
    platform?: CommsVoicePlatform,
  ): Promise<CommsVoiceSessionDto> {
    const order = await this.access.assertCanView(user, orderId);
    const roles = userRoles(user);
    const riderId = roles.includes(Role.RIDER) ? await this.access.riderIdForUser(user.sub) : null;
    const vendorIds = roles.includes(Role.VENDOR) ? await this.access.vendorIdsForUser(user.sub) : [];
    const targetUserId = await this.resolveTargetUserId(target, order.customerId, order.vendorId, order.riderId);
    if (!callerMayDial(user, order, target, { riderId, vendorIds, targetUserId })) {
      throw new ForbiddenException('You cannot call that party on this order');
    }
    if (!targetUserId) throw new BadRequestException('That party is not on this order');

    // The callee's stored number travels with the session so the caller's app can offer
    // "switch to a regular call" the moment VoIP is not viable — before ringing, on
    // connect failure, or mid-call when the SDK reports the network degrading.
    const fallbackPhone = await this.access.phoneForUser(targetUserId);
    const callId = await this.createCall({
      kind: 'order',
      orderId,
      caller: user,
      targetUserId,
      target,
      platform,
    });

    if (!this.isTwilioLive()) {
      await this.markStatus(callId, 'failed', 'voice provider not configured');
      return { provider: 'log', target, callId, fallbackPhone };
    }

    const minted = this.mint(user.sub, platform);
    return {
      provider: 'twilio',
      target,
      callId,
      fallbackPhone,
      identity: minted.identity,
      toIdentity: voiceClientIdentity(targetUserId),
      token: minted.token,
      expiresAt: minted.expiresAt.toISOString(),
      ttlSec: minted.ttlSec,
    };
  }

  /**
   * Support call: no order context. The apps connect the SDK with `To=support`; the TwiML
   * webhook rings every browser agent with fresh presence, forwards to an agent mobile on
   * no-answer, and takes a recorded message when nobody is anywhere.
   */
  async startSupportCall(
    user: JwtPayload,
    platform?: CommsVoicePlatform,
    topic?: string,
  ): Promise<CommsVoiceSessionDto> {
    const callId = await this.createCall({ kind: 'support', caller: user, platform, topic });
    if (!this.isTwilioLive()) {
      await this.markStatus(callId, 'failed', 'voice provider not configured');
      return { provider: 'log', support: true, callId, fallbackPhone: normalizeE164(this.env.supportPhone) };
    }
    const minted = this.mint(user.sub, platform);
    return {
      provider: 'twilio',
      support: true,
      callId,
      fallbackPhone: normalizeE164(this.env.supportPhone),
      identity: minted.identity,
      toIdentity: SUPPORT_IDENTITY,
      token: minted.token,
      expiresAt: minted.expiresAt.toISOString(),
      ttlSec: minted.ttlSec,
    };
  }

  supportContact(): SupportContactDto {
    return { phone: normalizeE164(this.env.supportPhone), appCallingEnabled: this.isTwilioLive() };
  }

  // ── TwiML webhook ───────────────────────────────────────────────────

  async twiml(opts: { signature: string | undefined; params: Record<string, string> }): Promise<string> {
    if (!this.isTwilioLive()) return hangupTwiml();
    if (!this.env.twilioAuthToken || !this.env.twilioVoiceWebhookUrl) return rejectTwiml();
    if (!twilioSignatureIsValid(this.env.twilioAuthToken, this.env.twilioVoiceWebhookUrl, opts.params, opts.signature)) {
      return rejectTwiml();
    }

    const callId = opts.params['callId']?.trim() || null;
    if (callId) await this.attachTwilioSid(callId, opts.params['CallSid']);

    const toRaw = (opts.params['To'] ?? '').replace(/^client:/i, '').trim();
    if (toRaw === SUPPORT_IDENTITY || opts.params['support'] === 'true') {
      return this.supportTwiml(callId);
    }

    const toIdentity = toRaw;
    const fromUserId = parseVoiceClientIdentity(opts.params['From']);
    const orderId = opts.params['orderId']?.trim();
    const target = opts.params['target'] as VoiceCallTarget | undefined;
    if (!orderId || !fromUserId || !toIdentity || !target) return hangupTwiml();

    const order = await this.access.fetchOrder(orderId);
    if (!order) return hangupTwiml();

    const caller = {
      sub: fromUserId,
      role: Role.CUSTOMER,
      roles: [Role.CUSTOMER, Role.RIDER, Role.VENDOR],
      phone: '',
    } as JwtPayload;
    const riderId = await this.access.riderIdForUser(fromUserId);
    const vendorIds = await this.access.vendorIdsForUser(fromUserId);
    const targetUserId = parseVoiceClientIdentity(toIdentity);
    if (!callerMayDial(caller, order, target, { riderId, vendorIds, targetUserId })) {
      return hangupTwiml();
    }
    return dialClientTwiml(toIdentity, {
      timeoutSec: ORDER_RING_TIMEOUT_SEC,
      statusCallbackUrl: this.callbackUrl('voice/status', callId) ?? undefined,
    });
  }

  private async supportTwiml(callId: string | null): Promise<string> {
    const agents = await this.onlineAgents();
    const record: 'record-from-answer-dual' | undefined = this.env.voiceRecordSupport
      ? 'record-from-answer-dual'
      : undefined;
    const recordingCb = this.callbackUrl('voice/recording-status', callId) ?? undefined;
    if (agents.length === 0) {
      return supportVoicemailTwiml({ recordingStatusCallbackUrl: recordingCb ?? undefined });
    }
    return dialSupportAgentsTwiml(
      agents.map((a) => voiceClientIdentity(a.userId)),
      {
        timeoutSec: AGENT_RING_TIMEOUT_SEC,
        actionUrl: this.callbackUrl('voice/support-forward', callId) ?? undefined,
        statusCallbackUrl: this.callbackUrl('voice/status', callId) ?? undefined,
        record,
        recordingStatusCallbackUrl: recordingCb,
      },
    );
  }

  /**
   * `<Dial action>` fires here when the agent ring finished while the CALLER is still on
   * the line. DialCallStatus=completed means the caller hung up after talking; anything
   * else (no-answer/busy/failed) forwards to the on-duty agent's mobile, and with no
   * mobile on file we take a message.
   */
  async supportForward(opts: { signature: string | undefined; params: Record<string, string>; callId?: string }): Promise<string> {
    if (!this.isTwilioLive()) return hangupTwiml();
    const callId = opts.callId?.trim() || opts.params['callId']?.trim() || null;
    const url = this.callbackUrl('voice/support-forward', callId);
    if (!url || !this.env.twilioAuthToken) return hangupTwiml();
    if (!twilioSignatureIsValid(this.env.twilioAuthToken, url, signedParams(opts.params), opts.signature)) {
      return rejectTwiml();
    }

    const dialStatus = opts.params['DialCallStatus'] ?? '';
    if (dialStatus === 'completed') return hangupTwiml();

    const agents = await this.onlineAgents();
    const forwardPhone = agents.find((a) => a.forwardPhone)?.forwardPhone ?? null;
    const callerId = normalizeE164(this.env.supportPhone) ?? normalizeE164(this.env.twilioFromNumber) ?? '';
    if (!forwardPhone || !callerId.startsWith('+')) {
      return supportVoicemailTwiml({
        recordingStatusCallbackUrl: this.callbackUrl('voice/recording-status', callId) ?? undefined,
      });
    }
    return forwardAgentMobileTwiml(forwardPhone, callerId, {
      timeoutSec: AGENT_RING_TIMEOUT_SEC,
      statusCallbackUrl: this.callbackUrl('voice/status', callId) ?? undefined,
      record: this.env.voiceRecordSupport ? 'record-from-answer-dual' : undefined,
      recordingStatusCallbackUrl: this.callbackUrl('voice/recording-status', callId) ?? undefined,
    });
  }

  /** Twilio statusCallback for dialed legs — keeps the CDR honest. */
  async status(opts: { signature: string | undefined; params: Record<string, string>; callId?: string }): Promise<void> {
    const callId = opts.callId?.trim() || opts.params['callId']?.trim() || null;
    if (!callId) return;
    const url = this.callbackUrl('voice/status', callId);
    if (!url || !this.env.twilioAuthToken) return;
    if (!twilioSignatureIsValid(this.env.twilioAuthToken, url, signedParams(opts.params), opts.signature)) return;

    const callStatus = opts.params['CallStatus'] ?? '';
    const sid = opts.params['CallSid'] ?? null;
    if (sid) await this.attachTwilioSid(callId, sid);
    const mapped =
      callStatus === 'in-progress' || callStatus === 'answered'
        ? 'answered'
        : callStatus === 'ringing'
          ? 'ringing'
          : callStatus === 'busy'
            ? 'busy'
            : callStatus === 'no-answer'
              ? 'no-answer'
              : callStatus === 'failed'
                ? 'failed'
                : callStatus === 'canceled'
                  ? 'canceled'
                  : callStatus === 'completed'
                    ? 'completed'
                    : null;
    if (!mapped) return;
    // Twilio sends CallDuration (whole seconds) on the final callback of a dial leg —
    // it is the authoritative talk time; the CDR column exists for exactly this.
    const durRaw = (opts.params['CallDuration'] ?? '').trim();
    const durationSec = /^\d+$/.test(durRaw) ? Math.min(Number.parseInt(durRaw, 10), 86400) : null;
    await this.markStatus(callId, mapped, callStatus === 'failed' ? (opts.params['ErrorCode'] ?? null) : null, durationSec);
  }

  /** Twilio recordingStatusCallback — persists the recording URL on the CDR. */
  async recordingStatus(opts: { signature: string | undefined; params: Record<string, string>; callId?: string }): Promise<void> {
    const callId = opts.callId?.trim() || opts.params['callId']?.trim() || null;
    if (!callId) return;
    const url = this.callbackUrl('voice/recording-status', callId);
    if (!url || !this.env.twilioAuthToken) return;
    if (!twilioSignatureIsValid(this.env.twilioAuthToken, url, signedParams(opts.params), opts.signature)) return;
    const recordingUrl = opts.params['RecordingUrl']?.trim();
    if (!recordingUrl) return;
    await this.calls.update({ callId }, { recordingUrl });
  }

  // ── agent presence (Redis, short TTL) ───────────────────────────────

  async setPresence(user: JwtPayload, online: boolean, forwardPhone?: string): Promise<{ online: boolean }> {
    const redis = await this.redisClient();
    if (!redis) return { online: false };
    const key = `comms:voice:presence:${user.sub}`;
    if (!online) {
      await redis.del(key);
      await redis.srem('comms:voice:agents', user.sub);
      return { online: false };
    }
    const value: AgentPresence = { userId: user.sub, forwardPhone, at: Date.now() };
    await redis.set(key, JSON.stringify(value), 'EX', PRESENCE_TTL_SEC);
    await redis.sadd('comms:voice:agents', user.sub);
    return { online: true };
  }

  async onlineAgents(): Promise<AgentPresence[]> {
    const redis = await this.redisClient();
    if (!redis) return [];
    try {
      const ids = await redis.smembers('comms:voice:agents');
      if (ids.length === 0) return [];
      const rows = await redis.mget(ids.map((id) => `comms:voice:presence:${id}`));
      const agents: AgentPresence[] = [];
      const stale: string[] = [];
      ids.forEach((id, i) => {
        const raw = rows[i];
        if (!raw) {
          stale.push(id);
          return;
        }
        try {
          const parsed = JSON.parse(raw) as AgentPresence;
          if (parsed.userId) agents.push(parsed);
        } catch {
          stale.push(id);
        }
      });
      if (stale.length > 0) await redis.srem('comms:voice:agents', ...stale).catch(() => undefined);
      return agents;
    } catch {
      // Redis dying mid-flight (failover/restart) must not 500 the TwiML webhook —
      // Twilio would play an error to the caller. Degrade to voicemail instead:
      // the support flow's promise is that the caller is always caught and recorded.
      return [];
    }
  }

  // ── client-reported events (fallback happens on-device) ─────────────

  async clientEvent(user: JwtPayload, callId: string, event: CommsCallEventDto): Promise<{ ok: boolean }> {
    const row = await this.calls.findOne({ where: { callId } });
    if (!row) throw new BadRequestException('Unknown call');
    const isAdmin = userRoles(user).includes(Role.ADMIN);
    if (row.callerUserId !== user.sub && !isAdmin) throw new ForbiddenException('Not your call');
    const events = [...(row.fallbackEvents ?? []), { kind: event.kind, detail: event.detail, at: new Date().toISOString() }];
    const patch: Partial<VoiceCall> = { fallbackEvents: events };
    if (event.kind === 'fallback_started') patch.fallbackUsed = true;
    if (event.kind === 'voip_failed' && ['initiated', 'ringing'].includes(row.status)) {
      patch.status = 'failed';
      patch.lastError = event.detail ?? 'client reported voip failure';
      patch.endedAt = new Date();
    }
    await this.calls.update({ callId }, patch);
    return { ok: true };
  }

  async recentCalls(limit = 50): Promise<CommsCallRecordDto[]> {
    // Number('abc') from ?limit=abc arrives as NaN, and NaN is falsy — TypeORM would
    // silently DROP the take clause and dump the whole CDR table. Sanitize first.
    const safe = Number.isFinite(limit) ? Math.floor(limit) : 50;
    const rows = await this.calls.find({ order: { startedAt: 'DESC' }, take: Math.min(200, Math.max(1, safe)) });
    return rows.map((r) => ({
      callId: r.callId,
      kind: r.kind === 'support' ? 'support' : 'order',
      orderId: r.orderId,
      callerUserId: r.callerUserId,
      targetUserId: r.targetUserId,
      target: (r.target as CommsVoiceTarget | null) ?? null,
      provider: r.provider === 'twilio' ? 'twilio' : 'log',
      platform: (r.platform as CommsVoicePlatform | null) ?? null,
      status: r.status as CommsCallRecordDto['status'],
      fallbackUsed: !!r.fallbackUsed,
      twilioCallSid: r.twilioCallSid,
      recordingUrl: r.recordingUrl,
      startedAt: r.startedAt.toISOString(),
      answeredAt: r.answeredAt ? r.answeredAt.toISOString() : null,
      endedAt: r.endedAt ? r.endedAt.toISOString() : null,
      durationSec: r.durationSec,
    }));
  }

  // ── internals ───────────────────────────────────────────────────────

  private mint(identity: string, platform?: CommsVoicePlatform) {
    const pushCredentialSid =
      platform === 'android'
        ? this.env.twilioPushCredAndroid
        : platform === 'ios'
          ? this.env.twilioPushCredIos
          : undefined;
    return mintTwilioVoiceAccessToken({
      accountSid: this.env.twilioAccountSid,
      apiKeySid: this.env.twilioApiKeySid,
      apiSecret: this.env.twilioApiSecret,
      twimlAppSid: this.env.twilioTwimlAppSid,
      identity: voiceClientIdentity(identity),
      // Web needs no push credential; mobile without one simply cannot ring in background.
      ...(pushCredentialSid ? { pushCredentialSid } : {}),
    });
  }

  /**
   * Absolute URL of a voice callback endpoint, derived from TWILIO_VOICE_WEBHOOK_URL so
   * the URL Twilio signs is byte-identical to the one we validate against. `null` when
   * the webhook URL is not configured (dev without a public tunnel).
   */
  private callbackUrl(endpoint: 'voice/status' | 'voice/support-forward' | 'voice/recording-status', callId: string | null): string | null {
    const base = this.env.twilioVoiceWebhookUrl.trim().replace(/voice\/twiml\/?$/, '');
    if (!base) return null;
    const url = `${base}${endpoint}`;
    return callId ? `${url}?callId=${encodeURIComponent(callId)}` : url;
  }

  private async createCall(input: {
    kind: 'order' | 'support';
    caller: JwtPayload;
    orderId?: string;
    targetUserId?: string | null;
    target?: CommsVoiceTarget;
    platform?: CommsVoicePlatform;
    topic?: string;
  }): Promise<string> {
    const callId = `vc_${randomBytes(12).toString('hex')}`;
    const row = this.calls.create({
      callId,
      kind: input.kind,
      orderId: input.orderId ?? null,
      callerUserId: input.caller.sub,
      callerRole: String(input.caller.role ?? 'customer'),
      targetUserId: input.targetUserId ?? null,
      target: input.target ?? null,
      provider: this.isTwilioLive() ? 'twilio' : 'log',
      platform: input.platform ?? null,
      status: 'initiated',
      fallbackUsed: false,
      fallbackEvents: null,
      twilioCallSid: null,
      recordingUrl: null,
      topic: input.topic ?? null,
      lastError: null,
      answeredAt: null,
      endedAt: null,
      durationSec: null,
    });
    // A CDR failure must never block a call — the row is evidence, not a gate.
    await this.calls.save(row).catch(() => undefined);
    return callId;
  }

  /** CDR statuses that are final. Twilio retries callbacks and deliveries can arrive
   *  out of order — a late `ringing`/`in-progress` must never resurrect a finished call. */
  private static readonly TERMINAL_STATUSES = ['completed', 'no-answer', 'busy', 'failed', 'canceled'];

  private async markStatus(callId: string, status: string, error?: string | null, durationSec?: number | null): Promise<void> {
    const patch: Partial<VoiceCall> = { status };
    if (error) patch.lastError = String(error).slice(0, 200);
    if (durationSec != null) patch.durationSec = durationSec;
    if (status === 'answered') patch.answeredAt = new Date();
    if (VoiceService.TERMINAL_STATUSES.includes(status)) patch.endedAt = new Date();
    await this.calls
      .createQueryBuilder()
      .update(VoiceCall)
      .set(patch)
      .where('callId = :callId', { callId })
      .andWhere('status NOT IN (:...terminal)', { terminal: VoiceService.TERMINAL_STATUSES })
      .execute()
      .catch(() => undefined);
  }

  private async attachTwilioSid(callId: string, sid: string | undefined): Promise<void> {
    if (!sid) return;
    await this.calls
      .createQueryBuilder()
      .update(VoiceCall)
      .set({ twilioCallSid: sid })
      .where('callId = :callId AND twilioCallSid IS NULL', { callId })
      .execute()
      .catch(() => undefined);
  }

  private async redisClient(): Promise<Redis | null> {
    if (this.redis) return this.redis;
    if (!this.env.redisUrl) return null;
    try {
      this.redis = new Redis(this.env.redisUrl, { maxRetriesPerRequest: 2, lazyConnect: false });
      this.redis.on('error', () => {
        // Presence is best-effort: if Redis is down, agents simply look offline and
        // support calls roll to voicemail/forwarding instead of crashing requests.
        this.redis?.disconnect();
        this.redis = null;
      });
      return this.redis;
    } catch {
      return null;
    }
  }

  private async resolveTargetUserId(
    target: VoiceCallTarget,
    customerId: string,
    vendorId: string,
    riderId: string | null,
  ): Promise<string | null> {
    if (target === 'customer') return customerId;
    if (target === 'rider') {
      if (!riderId) return null;
      return this.access.userIdForRider(riderId);
    }
    if (target === 'vendor') {
      if (isSyntheticVendor(vendorId)) return null;
      return this.access.ownerUserIdForVendor(vendorId);
    }
    return null;
  }
}
