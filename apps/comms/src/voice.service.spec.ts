/**
 * VoiceService — in-app calling sessions, support routing, CDR bookkeeping and the
 * Twilio webhook handlers.
 *
 * The fallback to a regular cellular call is deliberately a CLIENT concern: this service
 * only has to hand the app the callee's stored number. So the assertions that matter most
 * here are (a) `fallbackPhone` is returned for order calls, (b) a CDR row exists before
 * Twilio is involved, and (c) support calls ring agents rather than hanging up.
 */

import { ForbiddenException } from '@nestjs/common';
import { Role } from '@ore/contracts';
import { loadEnv } from '@ore/config';
import { createMockRepository } from '@ore/testing';
import { twilioRequestSignature } from '@ore/twilio-voice';
import { VoiceService, SUPPORT_IDENTITY } from './voice.service';
import { CommsAccessService } from './comms.access';
import { VoiceCall } from './entities';

const WEBHOOK_URL = 'https://api.test.ore.delivery/api/comms/voice/twiml';

const LIVE = {
  voiceProvider: 'twilio',
  twilioAccountSid: 'ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  twilioAuthToken: 'auth-token-for-signatures',
  twilioApiKeySid: 'SKbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  twilioApiSecret: 'api-secret',
  twilioTwimlAppSid: 'APcccccccccccccccccccccccccccccccc',
  twilioVoiceWebhookUrl: WEBHOOK_URL,
  twilioPushCredAndroid: 'CRandroidandroidandroidandroidan',
  twilioPushCredIos: 'CRiosiosiosiosiosiosiosiosiosios',
  supportPhone: '+233302000000',
  voiceRecordSupport: true,
} as const;

const mkUser = (role: Role, id = 'user-1') => ({ sub: id, phone: '+233241234567', role, roles: [role] }) as any;
const CUSTOMER = mkUser(Role.CUSTOMER, 'cust-1');
const RIDER = mkUser(Role.RIDER, 'rider-1');

const ORDER = { customerId: 'cust-1', vendorId: 'vend-1', riderId: 'rider-user' };

function buildService(overrides: Record<string, unknown> = {}, access: Record<string, unknown> = {}) {
  const repo = createMockRepository<VoiceCall>();
  repo.create.mockImplementation((row: unknown) => row as VoiceCall);
  repo.save.mockImplementation(async (row: VoiceCall) => row);
  repo.update.mockResolvedValue({ affected: 1 });
  repo.find.mockResolvedValue([]);

  const accessStub = {
    assertCanView: jest.fn().mockResolvedValue(ORDER),
    fetchOrder: jest.fn().mockResolvedValue(ORDER),
    riderIdForUser: jest.fn().mockResolvedValue('rider-user'),
    userIdForRider: jest.fn().mockResolvedValue('rider-user'),
    vendorIdsForUser: jest.fn().mockResolvedValue([]),
    ownerUserIdForVendor: jest.fn().mockResolvedValue('vendor-user'),
    phoneForUser: jest.fn().mockResolvedValue('+233249999999'),
    ...access,
  };

  const env = { ...loadEnv(), ...LIVE, ...overrides };
  const service = new VoiceService(env as any, accessStub as any, repo as any);
  return { service, repo, accessStub, env };
}

/** Sign a param map exactly the way Twilio does for a given endpoint URL. */
function sign(params: Record<string, string>, endpointPath = 'voice/twiml', callId?: string) {
  const base = WEBHOOK_URL.replace(/voice\/twiml\/?$/, '');
  const url = callId ? `${base}${endpointPath}?callId=${encodeURIComponent(callId)}` : `${base}${endpointPath}`;
  return twilioRequestSignature(String(LIVE.twilioAuthToken), url, params);
}

/** The query builder from the most recent createQueryBuilder() call (mock repo). */
function lastBuilder(repo: { createQueryBuilder: jest.Mock }): Record<string, jest.Mock> {
  const results = repo.createQueryBuilder.mock.results;
  return results[results.length - 1]?.value as Record<string, jest.Mock>;
}

/** markStatus writes through a guarded UPDATE ... WHERE status NOT IN (terminal). */
function expectGuardedStatusUpdate(repo: { createQueryBuilder: jest.Mock }, patch: Record<string, unknown>) {
  const qb = lastBuilder(repo);
  expect(qb.set).toHaveBeenCalledWith(expect.objectContaining(patch));
  expect(qb.andWhere).toHaveBeenCalledWith(
    'status NOT IN (:...terminal)',
    expect.objectContaining({ terminal: expect.arrayContaining(['completed', 'no-answer', 'busy', 'failed', 'canceled']) }),
  );
}

describe('VoiceService — agent softphone token', () => {
  const AGENT = mkUser(Role.ADMIN, 'agent-1');

  it('mints a support registration token for an agent without any order context', async () => {
    const { service, accessStub } = buildService();
    const session = await service.agentToken(AGENT, 'web');

    expect(session.provider).toBe('twilio');
    expect(session.support).toBe(true);
    expect(session.identity).toBe('ore_agent-1');
    expect(typeof session.token).toBe('string');
    expect((session.token ?? '').split('.')).toHaveLength(3);
    expect(session.ttlSec).toBeGreaterThan(60);
    // No order means no order-access probe: the controller permission is the gate.
    expect(accessStub.assertCanView).not.toHaveBeenCalled();
  });

  it('omits a mobile push credential for web agents but embeds it for android', async () => {
    const { service } = buildService();
    const decode = (token: string) => {
      const payload = token.split('.')[1];
      return JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    };

    const web = decode((await service.agentToken(AGENT, 'web')).token ?? '');
    expect(web.grants.voice.push_credential_sid).toBeUndefined();

    const android = decode((await service.agentToken(AGENT, 'android')).token ?? '');
    expect(android.grants.voice.push_credential_sid).toBe(LIVE.twilioPushCredAndroid);
    expect(android.grants.voice.outgoing.application_sid).toBe(LIVE.twilioTwimlAppSid);
    expect(android.grants.identity).toBe('ore_agent-1');
  });

  it('reports log mode instead of inventing a token when Twilio is not provisioned', async () => {
    const { service } = buildService({ voiceProvider: 'log' });
    const session = await service.agentToken(AGENT, 'web');

    expect(session).toEqual({ provider: 'log', support: true });
  });
});

describe('VoiceService — order calls', () => {
  it('returns the callee stored number so the app can fall back to a cellular call', async () => {
    const { service, accessStub } = buildService();
    const session = await service.startCall(CUSTOMER, 'order-1', 'rider', 'android');

    expect(session.provider).toBe('twilio');
    expect(session.fallbackPhone).toBe('+233249999999');
    expect(session.toIdentity).toBe('ore_rider-user');
    expect(accessStub.phoneForUser).toHaveBeenCalledWith('rider-user');
  });

  it('still returns the fallback number when Twilio is not provisioned', async () => {
    const { service, repo } = buildService({ voiceProvider: 'log' });
    const session = await service.startCall(CUSTOMER, 'order-1', 'rider', 'android');

    expect(session.provider).toBe('log');
    expect(session.token).toBeUndefined();
    // A call we could not place is still evidence: the CDR says why.
    expect(session.fallbackPhone).toBe('+233249999999');
    expect(repo.save).toHaveBeenCalled();
    const saved = repo.save.mock.calls[0][0] as VoiceCall;
    expect(saved.provider).toBe('log');
    expect(saved.kind).toBe('order');
    expectGuardedStatusUpdate(repo, { status: 'failed' });
    expect(lastBuilder(repo).where).toHaveBeenCalledWith('callId = :callId', { callId: saved.callId });
  });

  it('writes the CDR row before Twilio is involved', async () => {
    const { service, repo } = buildService();
    const session = await service.startCall(RIDER, 'order-1', 'customer', 'ios');

    const saved = repo.save.mock.calls[0][0] as VoiceCall;
    expect(saved.callId).toBe(session.callId);
    expect(saved.callerUserId).toBe('rider-1');
    expect(saved.target).toBe('customer');
    expect(saved.platform).toBe('ios');
    expect(saved.status).toBe('initiated');
  });

  it('keeps refusing callers who are not on the order', async () => {
    const { service } = buildService({}, { assertCanView: jest.fn().mockResolvedValue({ ...ORDER, customerId: 'someone-else' }) });
    await expect(service.startCall(CUSTOMER, 'order-1', 'vendor')).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('VoiceService — access tokens', () => {
  it('embeds the platform-specific push credential', async () => {
    const { service } = buildService();
    const android = await service.startCall(CUSTOMER, 'order-1', 'rider', 'android');
    const ios = await service.startCall(CUSTOMER, 'order-1', 'rider', 'ios');
    const web = await service.startCall(CUSTOMER, 'order-1', 'rider', 'web');

    const grantOf = (token: string) =>
      (JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).grants.voice ?? {}) as {
        push_credential_sid?: string;
      };

    expect(grantOf(android.token!).push_credential_sid).toBe(LIVE.twilioPushCredAndroid);
    expect(grantOf(ios.token!).push_credential_sid).toBe(LIVE.twilioPushCredIos);
    // Web has no push transport; an empty SID would make registration fail outright.
    expect(grantOf(web.token!).push_credential_sid).toBeUndefined();
  });
});

describe('VoiceService — TwiML webhook', () => {
  const baseParams = { To: 'client:ore_rider-user', From: 'client:ore_cust-1', orderId: 'order-1', target: 'rider', callId: 'vc_1' };

  it('rejects a request whose signature does not match', async () => {
    const { service } = buildService();
    const xml = await service.twiml({ signature: 'wrong', params: { ...baseParams } });
    expect(xml).toContain('<Reject/>');
  });

  it('dials the client identity with a ring timeout and CDR callback, never a phone number', async () => {
    const { service, accessStub } = buildService({}, { riderIdForUser: jest.fn().mockResolvedValue('rider-1') });
    accessStub.fetchOrder.mockResolvedValue({ ...ORDER, riderId: 'rider-1' });
    const xml = await service.twiml({ signature: sign(baseParams), params: baseParams });

    expect(xml).toContain('<Client>ore_rider-user</Client>');
    expect(xml).toContain('timeout="30"');
    expect(xml).toContain('voice/status?callId=vc_1');
    expect(xml).not.toContain('<Number');
    expect(xml).not.toContain('+233');
  });

  it('hangs up when a stranger tries to use the webhook to dial an order party', async () => {
    const { service, accessStub } = buildService();
    accessStub.fetchOrder.mockResolvedValue({ customerId: 'someone-else', vendorId: 'vend-1', riderId: null });
    const xml = await service.twiml({ signature: sign(baseParams), params: baseParams });
    expect(xml).toContain('<Hangup/>');
  });
});

describe('VoiceService — support calls', () => {
  it('takes a recorded message when no agent has presence', async () => {
    const { service } = buildService();
    jest.spyOn(service, 'onlineAgents').mockResolvedValue([]);
    const xml = await service.twiml({ signature: sign({ To: SUPPORT_IDENTITY, callId: 'vc_s1' }), params: { To: SUPPORT_IDENTITY, callId: 'vc_s1' } });

    expect(xml).toContain('<Record');
    expect(xml).not.toContain('<Client>');
  });

  it('rings every online agent browser, announces recording, and keeps an action URL for forwarding', async () => {
    const { service } = buildService();
    jest.spyOn(service, 'onlineAgents').mockResolvedValue([
      { userId: 'agent-1', at: Date.now() },
      { userId: 'agent-2', forwardPhone: '+233241111111', at: Date.now() },
    ]);
    const params = { To: SUPPORT_IDENTITY, callId: 'vc_s2' };
    const xml = await service.twiml({ signature: sign(params), params });

    expect(xml).toContain('<Client>ore_agent-1</Client>');
    expect(xml).toContain('<Client>ore_agent-2</Client>');
    expect(xml).toContain('record="record-from-answer-dual"');
    expect(xml).toContain('This call may be recorded');
    expect(xml).toContain('voice/support-forward?callId=vc_s2');
  });

  it('does not record support calls when the owner turns recording off', async () => {
    const { service } = buildService({ voiceRecordSupport: false });
    jest.spyOn(service, 'onlineAgents').mockResolvedValue([{ userId: 'agent-1', at: Date.now() }]);
    const params = { To: SUPPORT_IDENTITY, callId: 'vc_s3' };
    const xml = await service.twiml({ signature: sign(params), params });

    expect(xml).not.toContain('record=');
    expect(xml).not.toContain('This call may be recorded');
  });

  it('returns the real support line and whether in-app calling is live', () => {
    expect(buildService().service.supportContact()).toEqual({ phone: '+233302000000', appCallingEnabled: true });
    expect(buildService({ voiceProvider: 'log' }).service.supportContact()).toEqual({ phone: '+233302000000', appCallingEnabled: false });
  });

  it('gives the app the PSTN support line when voice is unprovisioned', async () => {
    const { service } = buildService({ voiceProvider: 'log' });
    const session = await service.startSupportCall(CUSTOMER, 'android');
    expect(session.provider).toBe('log');
    expect(session.fallbackPhone).toBe('+233302000000');
  });
});

describe('VoiceService — onlineAgents resilience', () => {
  function fakeRedis(overrides: Record<string, unknown> = {}) {
    return {
      smembers: jest.fn().mockResolvedValue([]),
      mget: jest.fn().mockResolvedValue([]),
      srem: jest.fn().mockResolvedValue(0),
      quit: jest.fn().mockResolvedValue('OK'),
      ...overrides,
    };
  }

  it('degrades to voicemail (empty list) when Redis is unavailable', async () => {
    const { service } = buildService();
    jest.spyOn(service as any, 'redisClient').mockResolvedValue(null);
    expect(await service.onlineAgents()).toEqual([]);
  });

  it('degrades to voicemail when Redis commands fail mid-flight instead of 500ing the webhook', async () => {
    const { service } = buildService();
    jest.spyOn(service as any, 'redisClient').mockResolvedValue(fakeRedis({
      smembers: jest.fn().mockRejectedValue(new Error('READONLY replica failover')),
    }));
    expect(await service.onlineAgents()).toEqual([]);
  });

  it('still returns healthy agents when only the stale-set cleanup fails', async () => {
    const { service } = buildService();
    jest.spyOn(service as any, 'redisClient').mockResolvedValue(fakeRedis({
      smembers: jest.fn().mockResolvedValue(['agent-1', 'agent-2']),
      mget: jest.fn().mockResolvedValue([JSON.stringify({ userId: 'agent-1', at: 1 }), null]),
      srem: jest.fn().mockRejectedValue(new Error('connection lost')),
    }));
    expect(await service.onlineAgents()).toEqual([{ userId: 'agent-1', at: 1 }]);
  });
});

describe('VoiceService — support forwarding', () => {
  it('hangs up when the caller already finished talking to an agent', async () => {
    const { service } = buildService();
    const xml = await service.supportForward({
      signature: sign({ DialCallStatus: 'completed' }, 'voice/support-forward', 'vc_f1'),
      params: { DialCallStatus: 'completed' },
      callId: 'vc_f1',
    });
    expect(xml).toContain('<Hangup/>');
  });

  it('forwards to an agent mobile when nobody answered in the browser', async () => {
    const { service } = buildService();
    jest.spyOn(service, 'onlineAgents').mockResolvedValue([{ userId: 'agent-1', forwardPhone: '+233241111111', at: Date.now() }]);
    const xml = await service.supportForward({
      signature: sign({ DialCallStatus: 'no-answer' }, 'voice/support-forward', 'vc_f2'),
      params: { DialCallStatus: 'no-answer' },
      callId: 'vc_f2',
    });

    expect(xml).toContain('<Number>+233241111111</Number>');
    expect(xml).toContain('callerId="+233302000000"');
  });

  it('takes a message when no agent mobile is on file', async () => {
    const { service } = buildService();
    jest.spyOn(service, 'onlineAgents').mockResolvedValue([{ userId: 'agent-1', at: Date.now() }]);
    const xml = await service.supportForward({
      signature: sign({ DialCallStatus: 'no-answer' }, 'voice/support-forward', 'vc_f3'),
      params: { DialCallStatus: 'no-answer' },
      callId: 'vc_f3',
    });
    expect(xml).toContain('<Record');
  });

  it('refuses a forward request with a bad signature', async () => {
    const { service } = buildService();
    const xml = await service.supportForward({ signature: 'nope', params: { DialCallStatus: 'no-answer' }, callId: 'vc_f4' });
    expect(xml).toContain('<Reject/>');
  });
});

describe('VoiceService — CDR from callbacks and client events', () => {
  it('maps Twilio call statuses onto the CDR and stamps answer/end times', async () => {
    const { service, repo } = buildService();
    await service.status({
      signature: sign({ CallStatus: 'in-progress', CallSid: 'CA123' }, 'voice/status', 'vc_c1'),
      params: { CallStatus: 'in-progress', CallSid: 'CA123' },
      callId: 'vc_c1',
    });
    expectGuardedStatusUpdate(repo, { status: 'answered', answeredAt: expect.any(Date) });

    await service.status({
      signature: sign({ CallStatus: 'no-answer' }, 'voice/status', 'vc_c1'),
      params: { CallStatus: 'no-answer' },
      callId: 'vc_c1',
    });
    expectGuardedStatusUpdate(repo, { status: 'no-answer', endedAt: expect.any(Date) });
  });

  it('ignores a status callback whose signature is wrong', async () => {
    const { service, repo } = buildService();
    await service.status({ signature: 'bad', params: { CallStatus: 'completed' }, callId: 'vc_c2' });
    expect(repo.createQueryBuilder).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('persists CallDuration as durationSec on the completed callback', async () => {
    const { service, repo } = buildService();
    await service.status({
      signature: sign({ CallStatus: 'completed', CallDuration: '42' }, 'voice/status', 'vc_c4'),
      params: { CallStatus: 'completed', CallDuration: '42' },
      callId: 'vc_c4',
    });
    expectGuardedStatusUpdate(repo, { status: 'completed', durationSec: 42, endedAt: expect.any(Date) });
  });

  it('ignores a non-numeric CallDuration', async () => {
    const { service, repo } = buildService();
    await service.status({
      signature: sign({ CallStatus: 'completed', CallDuration: 'NaN' }, 'voice/status', 'vc_c5'),
      params: { CallStatus: 'completed', CallDuration: 'NaN' },
      callId: 'vc_c5',
    });
    const patch = lastBuilder(repo).set.mock.calls[0][0] as Partial<VoiceCall>;
    expect(patch.status).toBe('completed');
    expect(patch.durationSec).toBeUndefined();
  });

  it('freezes terminal CDR rows against late or retried callbacks', async () => {
    // Twilio retries status callbacks and deliveries can arrive out of order; a late
    // `in-progress` must never resurrect a call that already reached a terminal status.
    const { service, repo } = buildService();
    await service.status({
      signature: sign({ CallStatus: 'in-progress' }, 'voice/status', 'vc_c9'),
      params: { CallStatus: 'in-progress' },
      callId: 'vc_c9',
    });
    const qb = lastBuilder(repo);
    expect(qb.where).toHaveBeenCalledWith('callId = :callId', { callId: 'vc_c9' });
    expect(qb.andWhere).toHaveBeenCalledWith(
      'status NOT IN (:...terminal)',
      expect.objectContaining({
        terminal: expect.arrayContaining(['completed', 'no-answer', 'busy', 'failed', 'canceled']),
      }),
    );
  });

  it('records the client-side fallback, which Twilio never sees', async () => {
    const { service, repo } = buildService();
    repo.findOne.mockResolvedValue({ callId: 'vc_c3', callerUserId: 'cust-1', status: 'ringing', fallbackEvents: null } as VoiceCall);

    await service.clientEvent(CUSTOMER, 'vc_c3', { kind: 'fallback_started', detail: 'weak network' });
    const patch = repo.update.mock.calls[0][1] as Partial<VoiceCall>;
    expect(patch.fallbackUsed).toBe(true);
    expect(patch.fallbackEvents?.[0]).toMatchObject({ kind: 'fallback_started', detail: 'weak network' });
  });

  it('marks the CDR failed when the client reports VoIP could not connect', async () => {
    const { service, repo } = buildService();
    repo.findOne.mockResolvedValue({ callId: 'vc_c4', callerUserId: 'cust-1', status: 'initiated', fallbackEvents: null } as VoiceCall);

    await service.clientEvent(CUSTOMER, 'vc_c4', { kind: 'voip_failed', detail: 'callee offline' });
    expect(repo.update).toHaveBeenCalledWith(
      { callId: 'vc_c4' },
      expect.objectContaining({ status: 'failed', lastError: 'callee offline' }),
    );
  });

  it('will not let one user annotate another user call', async () => {
    const { service, repo } = buildService();
    repo.findOne.mockResolvedValue({ callId: 'vc_c5', callerUserId: 'someone-else', status: 'ringing', fallbackEvents: null } as VoiceCall);
    await expect(service.clientEvent(CUSTOMER, 'vc_c5', { kind: 'fallback_started' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('persists a support recording URL', async () => {
    const { service, repo } = buildService();
    await service.recordingStatus({
      signature: sign({ RecordingUrl: 'https://api.twilio.com/rec/1.wav' }, 'voice/recording-status', 'vc_c6'),
      params: { RecordingUrl: 'https://api.twilio.com/rec/1.wav' },
      callId: 'vc_c6',
    });
    expect(repo.update).toHaveBeenCalledWith({ callId: 'vc_c6' }, { recordingUrl: 'https://api.twilio.com/rec/1.wav' });
  });
});

describe('VoiceService — CDR listing (recentCalls)', () => {
  async function takeFor(limit?: number): Promise<number> {
    const { service, repo } = buildService();
    await service.recentCalls(limit as number);
    return (repo.find as jest.Mock).mock.calls[0][0].take;
  }

  it('defaults to 50 and clamps into 1..200', async () => {
    expect(await takeFor(undefined)).toBe(50);
    expect(await takeFor(10000)).toBe(200);
    expect(await takeFor(-5)).toBe(1);
    expect(await takeFor(7.9)).toBe(7);
  });

  it('treats a non-numeric limit (NaN from ?limit=abc) as the default instead of dropping the take clause', async () => {
    expect(await takeFor(Number('abc'))).toBe(50);
  });
});
