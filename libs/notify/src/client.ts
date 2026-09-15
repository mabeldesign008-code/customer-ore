/** Notification client — push (log / FCM HTTP v1) + SMS (log / twilio / hubtel). */

import { loadEnv } from '@ore/config';

export interface PushMessage {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  deviceToken?: string;
}

export interface SmsMessage {
  phone: string;
  text: string;
}

/**
 * The result of one push attempt. A campaign needs per-recipient outcomes: "sent 4,102,
 * failed 37" is the number marketing reads, and a bare `void` cannot produce it.
 */
export interface PushOutcome {
  userId: string;
  ok: boolean;
  error?: string;
}

export interface NotifyClient {
  sendPush(msg: PushMessage): Promise<void>;
  sendSms(msg: SmsMessage): Promise<void>;
  /**
   * Send the same message to many users. Optional: callers must fall back to looping over
   * `sendPush` when a client does not implement it, so adding this cannot break one.
   */
  sendPushBatch?(msgs: PushMessage[]): Promise<PushOutcome[]>;
  /** Send to an FCM topic. Optional for the same reason. */
  sendTopic?(topic: string, msg: Omit<PushMessage, 'userId' | 'deviceToken'>): Promise<void>;
}

/**
 * FCM caps a multicast/`sendEach` call, and a campaign is thousands of recipients, so sends
 * are chunked. 500 is the documented HTTP v1 batch ceiling; going over it fails the whole
 * request rather than the one bad message, which is the worst possible failure shape.
 */
export const PUSH_BATCH_SIZE = 500;

export function chunk<T>(rows: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

export class LogNotifyClient implements NotifyClient {
  async sendPush(msg: PushMessage): Promise<void> {
    console.log(`[push→${msg.userId}] ${msg.title}: ${msg.body}`, msg.data ?? '');
  }
  async sendPushBatch(msgs: PushMessage[]): Promise<PushOutcome[]> {
    for (const m of msgs) await this.sendPush(m);
    // Every recipient "succeeded" — that is the point of the log client. A campaign dry run
    // must be able to produce a real sent-count without a push credential.
    return msgs.map((m) => ({ userId: m.userId, ok: true }));
  }
  async sendTopic(topic: string, msg: Omit<PushMessage, 'userId' | 'deviceToken'>): Promise<void> {
    console.log(`[push→topic:${topic}] ${msg.title}: ${msg.body}`, msg.data ?? '');
  }
  async sendSms(msg: SmsMessage): Promise<void> {
    console.log(`[sms→${msg.phone}] ${msg.text}`);
  }
}

/** Hubtel SMS (Ghana) — smsc.hubtel.com/v1/messages/send, HTTP Basic (ClientId:ClientSecret).
 *  Payload: { From, To, Content }. Doc/business: Hubtel is our SMS provider (locked).
 *  Audit S-5: the host is `smsc.hubtel.com` — `sms.hubtel.com` REJECTS the real credentials
 *  (proved live: "Provided ClientId could not be found"). Both this comment and .env.example
 *  used to say `sms.hubtel.com`; deployed as-is every OTP would have failed. */
export class HubtelSmsClient implements NotifyClient {
  async sendPush(): Promise<void> { /* SMS-only */ }
  constructor(private readonly env: Record<string, string | undefined> = process.env) {}

  private get ore() {
    return loadEnv(this.env);
  }

  async sendSms(msg: SmsMessage): Promise<void> {
    const { hubtelClientId, hubtelClientSecret, hubtelFrom, hubtelBaseUrl } = this.ore;
    if (!hubtelClientId || !hubtelClientSecret) {
      throw new Error('HUBTEL_CLIENT_ID / HUBTEL_CLIENT_SECRET not set');
    }
    const to = normalizeGhPhone(msg.phone);
    const res = await fetch(`${hubtelBaseUrl}/v1/messages/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${hubtelClientId}:${hubtelClientSecret}`).toString('base64')}`,
      },
      body: JSON.stringify({ From: hubtelFrom || 'OREDEL', To: to, Content: msg.text }),
    });
    const text = await res.text().catch(() => '');
    if (!res.ok) {
      throw new Error(`Hubtel SMS failed: HTTP ${res.status} ${text.slice(0, 200)}`);
    }
    // Audit S-8: Hubtel encodes the real outcome in the JSON body (Status/status +
    // StatusDescription), and only SOME failures come back as HTTP 4xx. Checking `res.ok`
    // alone let insufficient credit or an unregistered sender ID report success while the
    // OTP never arrived and the logs said it was sent. Assert the body says success.
    let body: { Status?: number; status?: number; StatusDescription?: string; statusDescription?: string } = {};
    try {
      body = text ? (JSON.parse(text) as typeof body) : {};
    } catch {
      throw new Error(`Hubtel SMS returned an unparsable success body: ${text.slice(0, 120)}`);
    }
    const status = body.Status ?? body.status;
    if (status !== 0) {
      throw new Error(
        `Hubtel SMS rejected: status ${status ?? 'missing'} — ${body.StatusDescription ?? body.statusDescription ?? 'no description'}`,
      );
    }
  }
}

/** Twilio-style SMS (optional, when SMS_PROVIDER=twilio). */
export class TwilioSmsClient implements NotifyClient {
  async sendPush(): Promise<void> { /* SMS-only */ }
  constructor(private readonly env: Record<string, string | undefined> = process.env) {}

  async sendSms(msg: SmsMessage): Promise<void> {
    const e = this.env;
    const sid = e.TWILIO_ACCOUNT_SID ?? '';
    const token = e.TWILIO_AUTH_TOKEN ?? '';
    const from = e.TWILIO_FROM_NUMBER ?? '';
    if (!sid || !token || !from) throw new Error('Twilio credentials not set');
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: msg.phone, From: from, Body: msg.text }).toString(),
    });
    if (!res.ok) throw new Error(`Twilio SMS failed: ${res.status}`);
  }
}

export class FirebaseNotifyClient implements NotifyClient {
  constructor(private readonly env: Record<string, string | undefined> = process.env) {}

  private get ore() {
    return loadEnv(this.env);
  }

  async sendPush(msg: PushMessage): Promise<void> {
    if (!msg.deviceToken) return;
    const accessToken = await this.accessToken();
    const res = await fetch('https://fcm.googleapis.com/v1/projects/ore-delivery/messages:send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          token: msg.deviceToken,
          notification: { title: msg.title, body: msg.body },
          data: msg.data ?? {},
        },
      }),
    });
    // The old version ignored res.ok — FCM 4xx/5xx (bad token, quota, server error)
    // were reported as successful deliveries (audit F-BUG-3). Throw so sendPushBatch's
    // allSettled records a real failure and callers can react.
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      if (res.status === 404 || detail.includes('UNREGISTERED') || detail.includes('INVALID_ARGUMENT')) {
        throw new Error(`FCM_TOKEN_INVALID: ${msg.deviceToken}`);
      }
      throw new Error(`FCM push to ${msg.userId} failed: ${res.status} ${detail}`.slice(0, 300));
    }
  }

  private async accessToken(): Promise<string> {
    const { GoogleAuth } = await import('google-auth-library');
    const auth = new GoogleAuth({
      keyFile: this.ore.fcmServiceAccountPath,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });
    const client = await auth.getClient();
    const token = await (client as { getAccessToken(): Promise<{ token?: string }> }).getAccessToken();
    return token.token ?? '';
  }

  /**
   * Batched push.
   *
   * Uses FCM's `sendEach` semantics — one HTTP request per message, issued in bounded
   * concurrency — rather than the deprecated `sendAll`. Two reasons: `sendAll` was removed
   * from the v1 API, and per-message requests mean one bad token fails one message instead
   * of poisoning a batch of 500.
   *
   * Concurrency is bounded because a 50,000-recipient campaign fired all at once is a
   * self-inflicted rate-limit, and FCM answers rate limits by *delaying*, which looks like a
   * hang rather than an error.
   */
  async sendPushBatch(msgs: PushMessage[]): Promise<PushOutcome[]> {
    const out: PushOutcome[] = [];
    const CONCURRENCY = 20;
    for (const group of chunk(msgs, CONCURRENCY)) {
      const settled = await Promise.allSettled(group.map(async (m) => {
        await this.sendPush(m);
        return m.userId;
      }));
      settled.forEach((r, i) => {
        out.push(
          r.status === 'fulfilled'
            ? { userId: group[i].userId, ok: true }
            : { userId: group[i].userId, ok: false, error: String((r.reason as Error)?.message ?? r.reason).slice(0, 200) },
        );
      });
    }
    return out;
  }

  /**
   * Send to a topic.
   *
   * Topics are how a broadcast reaches every rider without holding 50,000 device tokens in a
   * table. The constraint that matters: an app instance can hold at most 2,000 topic
   * subscriptions, so the design here is a small fixed topic set (per role, per city) — not
   * one topic per campaign, which would exhaust the budget almost immediately.
   */
  async sendTopic(topic: string, msg: Omit<PushMessage, 'userId' | 'deviceToken'>): Promise<void> {
    const accessToken = await this.accessToken();
    const res = await fetch('https://fcm.googleapis.com/v1/projects/ore-delivery/messages:send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          topic,
          notification: { title: msg.title, body: msg.body },
          data: msg.data ?? {},
        },
      }),
    });
    if (!res.ok) throw new Error(`FCM topic send failed: ${res.status} ${await res.text().catch(() => '')}`);
  }

  async sendSms(): Promise<void> {
    console.warn('[notify] SMS not implemented in firebase mode; use hubtel/twilio provider');
  }
}

export class ResilientSmsClient implements NotifyClient {
  private primary: NotifyClient;
  private secondary?: NotifyClient;

  constructor(env: Record<string, string | undefined> = process.env) {
    const ore = loadEnv(env);
    if (ore.smsProvider === 'hubtel' && ore.hubtelClientId) {
      this.primary = new HubtelSmsClient(env);
      if (env.TWILIO_ACCOUNT_SID) {
        this.secondary = new TwilioSmsClient(env);
      }
    } else if (ore.smsProvider === 'twilio' && env.TWILIO_ACCOUNT_SID) {
      this.primary = new TwilioSmsClient(env);
    } else {
      // Audit S-9: this branch used to fall through to the log client with no error and no
      // warning. `SMS_PROVIDER=hubtel` with an empty HUBTEL_CLIENT_ID therefore turned every
      // OTP and COD-remittance message into a console.log, and an SMS outage became invisible
      // — nothing anywhere said a message had not actually been sent. Misconfiguration is now
      // fatal in production; deliberately running the log client in dev still warns.
      const misconfigured =
        (ore.smsProvider === 'hubtel' && !ore.hubtelClientId) ||
        (ore.smsProvider === 'twilio' && !env.TWILIO_ACCOUNT_SID);
      if (misconfigured && ore.nodeEnv === 'production') {
        throw new Error(
          `SMS_PROVIDER=${ore.smsProvider} but its credentials are missing — refusing to boot with SMS silently downgraded to logging`,
        );
      }
      if (misconfigured) {
        console.error(
          `[SMS] SMS_PROVIDER=${ore.smsProvider} but its credentials are missing — SMS will be LOGGED, NOT SENT`,
        );
      } else if (ore.nodeEnv === 'production') {
        console.warn('[SMS] No SMS provider configured — running with the log client in production');
      }
      this.primary = new LogNotifyClient();
    }
  }

  async sendPush(msg: PushMessage): Promise<void> {
    return this.primary.sendPush(msg);
  }

  /** Delegate when the underlying client can batch; otherwise loop, so callers never branch. */
  async sendPushBatch(msgs: PushMessage[]): Promise<PushOutcome[]> {
    if (this.primary.sendPushBatch) return this.primary.sendPushBatch(msgs);
    const out: PushOutcome[] = [];
    for (const m of msgs) {
      try {
        await this.primary.sendPush(m);
        out.push({ userId: m.userId, ok: true });
      } catch (err) {
        out.push({ userId: m.userId, ok: false, error: String((err as Error).message).slice(0, 200) });
      }
    }
    return out;
  }

  async sendTopic(topic: string, msg: Omit<PushMessage, 'userId' | 'deviceToken'>): Promise<void> {
    if (this.primary.sendTopic) return this.primary.sendTopic(topic, msg);
    console.log(`[push→topic:${topic}] ${msg.title}: ${msg.body}`, msg.data ?? '');
  }

  async sendSms(msg: SmsMessage): Promise<void> {
    try {
      await this.primary.sendSms(msg);
    } catch (err) {
      console.warn(`[SMS Primary Failed] ${err}. Attempting failover...`);
      if (this.secondary) {
        try {
          await this.secondary.sendSms(msg);
          console.log('[SMS Failover Succeeded via Secondary Provider]');
          return;
        } catch (secErr) {
          console.error(`[SMS Failover Also Failed] ${secErr}`);
          // Every provider failed: the message was NOT delivered. Swallowing this
          // (the old behavior) let OTPs and COD-remittance reminders silently never
          // arrive in production while callers believed they had been sent (audit
          // F-BUG-3). Fail loud — the caller decides the remedy (auth OTP flows
          // surface it as a retryable error; fan-out callers catch per-recipient).
          throw new Error(`SMS to ${msg.phone} failed on all providers: ${String(secErr).slice(0, 200)}`);
        }
      }
      // No secondary configured (single-provider deploy): same rule — do not report a
      // send that did not happen.
      throw new Error(`SMS to ${msg.phone} failed: ${String(err).slice(0, 200)}`);
    }
  }
}

export function createNotifyClient(env: Record<string, string | undefined> = process.env): NotifyClient {
  const ore = loadEnv(env);
  if (ore.fcmMode === 'firebase' && ore.fcmServiceAccountPath) {
    return new FirebaseNotifyClient(env);
  }
  return new ResilientSmsClient(env);
}

function normalizeGhPhone(phone: string): string {
  const p = phone.replace(/[^0-9]/g, '');
  if (p.startsWith('0')) return `233${p.slice(1)}`;
  return p;
}
