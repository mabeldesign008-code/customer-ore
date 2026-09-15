"use strict";
/** Notification client — push (log / FCM HTTP v1) + SMS (log / twilio / hubtel). */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResilientSmsClient = exports.FirebaseNotifyClient = exports.TwilioSmsClient = exports.HubtelSmsClient = exports.LogNotifyClient = exports.PUSH_BATCH_SIZE = void 0;
exports.chunk = chunk;
exports.createNotifyClient = createNotifyClient;
const config_1 = require("@ore/config");
/**
 * FCM caps a multicast/`sendEach` call, and a campaign is thousands of recipients, so sends
 * are chunked. 500 is the documented HTTP v1 batch ceiling; going over it fails the whole
 * request rather than the one bad message, which is the worst possible failure shape.
 */
exports.PUSH_BATCH_SIZE = 500;
function chunk(rows, size) {
    const out = [];
    for (let i = 0; i < rows.length; i += size)
        out.push(rows.slice(i, i + size));
    return out;
}
class LogNotifyClient {
    async sendPush(msg) {
        console.log(`[push→${msg.userId}] ${msg.title}: ${msg.body}`, msg.data ?? '');
    }
    async sendPushBatch(msgs) {
        for (const m of msgs)
            await this.sendPush(m);
        // Every recipient "succeeded" — that is the point of the log client. A campaign dry run
        // must be able to produce a real sent-count without a push credential.
        return msgs.map((m) => ({ userId: m.userId, ok: true }));
    }
    async sendTopic(topic, msg) {
        console.log(`[push→topic:${topic}] ${msg.title}: ${msg.body}`, msg.data ?? '');
    }
    async sendSms(msg) {
        console.log(`[sms→${msg.phone}] ${msg.text}`);
    }
}
exports.LogNotifyClient = LogNotifyClient;
/** Hubtel SMS (Ghana) — smsc.hubtel.com/v1/messages/send, HTTP Basic (ClientId:ClientSecret).
 *  Payload: { From, To, Content }. Doc/business: Hubtel is our SMS provider (locked).
 *  Audit S-5: the host is `smsc.hubtel.com` — `sms.hubtel.com` REJECTS the real credentials
 *  (proved live: "Provided ClientId could not be found"). Both this comment and .env.example
 *  used to say `sms.hubtel.com`; deployed as-is every OTP would have failed. */
class HubtelSmsClient {
    env;
    async sendPush() { }
    constructor(env = process.env) {
        this.env = env;
    }
    get ore() {
        return (0, config_1.loadEnv)(this.env);
    }
    async sendSms(msg) {
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
        let body = {};
        try {
            body = text ? JSON.parse(text) : {};
        }
        catch {
            throw new Error(`Hubtel SMS returned an unparsable success body: ${text.slice(0, 120)}`);
        }
        const status = body.Status ?? body.status;
        if (status !== 0) {
            throw new Error(`Hubtel SMS rejected: status ${status ?? 'missing'} — ${body.StatusDescription ?? body.statusDescription ?? 'no description'}`);
        }
    }
}
exports.HubtelSmsClient = HubtelSmsClient;
/** Twilio-style SMS (optional, when SMS_PROVIDER=twilio). */
class TwilioSmsClient {
    env;
    async sendPush() { }
    constructor(env = process.env) {
        this.env = env;
    }
    async sendSms(msg) {
        const e = this.env;
        const sid = e.TWILIO_ACCOUNT_SID ?? '';
        const token = e.TWILIO_AUTH_TOKEN ?? '';
        const from = e.TWILIO_FROM_NUMBER ?? '';
        if (!sid || !token || !from)
            throw new Error('Twilio credentials not set');
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ To: msg.phone, From: from, Body: msg.text }).toString(),
        });
        if (!res.ok)
            throw new Error(`Twilio SMS failed: ${res.status}`);
    }
}
exports.TwilioSmsClient = TwilioSmsClient;
class FirebaseNotifyClient {
    env;
    constructor(env = process.env) {
        this.env = env;
    }
    get ore() {
        return (0, config_1.loadEnv)(this.env);
    }
    async sendPush(msg) {
        if (!msg.deviceToken)
            return;
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
    async accessToken() {
        const { GoogleAuth } = await Promise.resolve().then(() => __importStar(require('google-auth-library')));
        const auth = new GoogleAuth({
            keyFile: this.ore.fcmServiceAccountPath,
            scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
        });
        const client = await auth.getClient();
        const token = await client.getAccessToken();
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
    async sendPushBatch(msgs) {
        const out = [];
        const CONCURRENCY = 20;
        for (const group of chunk(msgs, CONCURRENCY)) {
            const settled = await Promise.allSettled(group.map(async (m) => {
                await this.sendPush(m);
                return m.userId;
            }));
            settled.forEach((r, i) => {
                out.push(r.status === 'fulfilled'
                    ? { userId: group[i].userId, ok: true }
                    : { userId: group[i].userId, ok: false, error: String(r.reason?.message ?? r.reason).slice(0, 200) });
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
    async sendTopic(topic, msg) {
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
        if (!res.ok)
            throw new Error(`FCM topic send failed: ${res.status} ${await res.text().catch(() => '')}`);
    }
    async sendSms() {
        console.warn('[notify] SMS not implemented in firebase mode; use hubtel/twilio provider');
    }
}
exports.FirebaseNotifyClient = FirebaseNotifyClient;
class ResilientSmsClient {
    primary;
    secondary;
    constructor(env = process.env) {
        const ore = (0, config_1.loadEnv)(env);
        if (ore.smsProvider === 'hubtel' && ore.hubtelClientId) {
            this.primary = new HubtelSmsClient(env);
            if (env.TWILIO_ACCOUNT_SID) {
                this.secondary = new TwilioSmsClient(env);
            }
        }
        else if (ore.smsProvider === 'twilio' && env.TWILIO_ACCOUNT_SID) {
            this.primary = new TwilioSmsClient(env);
        }
        else {
            // Audit S-9: this branch used to fall through to the log client with no error and no
            // warning. `SMS_PROVIDER=hubtel` with an empty HUBTEL_CLIENT_ID therefore turned every
            // OTP and COD-remittance message into a console.log, and an SMS outage became invisible
            // — nothing anywhere said a message had not actually been sent. Misconfiguration is now
            // fatal in production; deliberately running the log client in dev still warns.
            const misconfigured = (ore.smsProvider === 'hubtel' && !ore.hubtelClientId) ||
                (ore.smsProvider === 'twilio' && !env.TWILIO_ACCOUNT_SID);
            if (misconfigured && ore.nodeEnv === 'production') {
                throw new Error(`SMS_PROVIDER=${ore.smsProvider} but its credentials are missing — refusing to boot with SMS silently downgraded to logging`);
            }
            if (misconfigured) {
                console.error(`[SMS] SMS_PROVIDER=${ore.smsProvider} but its credentials are missing — SMS will be LOGGED, NOT SENT`);
            }
            else if (ore.nodeEnv === 'production') {
                console.warn('[SMS] No SMS provider configured — running with the log client in production');
            }
            this.primary = new LogNotifyClient();
        }
    }
    async sendPush(msg) {
        return this.primary.sendPush(msg);
    }
    /** Delegate when the underlying client can batch; otherwise loop, so callers never branch. */
    async sendPushBatch(msgs) {
        if (this.primary.sendPushBatch)
            return this.primary.sendPushBatch(msgs);
        const out = [];
        for (const m of msgs) {
            try {
                await this.primary.sendPush(m);
                out.push({ userId: m.userId, ok: true });
            }
            catch (err) {
                out.push({ userId: m.userId, ok: false, error: String(err.message).slice(0, 200) });
            }
        }
        return out;
    }
    async sendTopic(topic, msg) {
        if (this.primary.sendTopic)
            return this.primary.sendTopic(topic, msg);
        console.log(`[push→topic:${topic}] ${msg.title}: ${msg.body}`, msg.data ?? '');
    }
    async sendSms(msg) {
        try {
            await this.primary.sendSms(msg);
        }
        catch (err) {
            console.warn(`[SMS Primary Failed] ${err}. Attempting failover...`);
            if (this.secondary) {
                try {
                    await this.secondary.sendSms(msg);
                    console.log('[SMS Failover Succeeded via Secondary Provider]');
                    return;
                }
                catch (secErr) {
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
exports.ResilientSmsClient = ResilientSmsClient;
function createNotifyClient(env = process.env) {
    const ore = (0, config_1.loadEnv)(env);
    if (ore.fcmMode === 'firebase' && ore.fcmServiceAccountPath) {
        return new FirebaseNotifyClient(env);
    }
    return new ResilientSmsClient(env);
}
function normalizeGhPhone(phone) {
    const p = phone.replace(/[^0-9]/g, '');
    if (p.startsWith('0'))
        return `233${p.slice(1)}`;
    return p;
}
//# sourceMappingURL=client.js.map