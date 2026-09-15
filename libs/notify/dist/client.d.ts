/** Notification client — push (log / FCM HTTP v1) + SMS (log / twilio / hubtel). */
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
export declare const PUSH_BATCH_SIZE = 500;
export declare function chunk<T>(rows: T[], size: number): T[][];
export declare class LogNotifyClient implements NotifyClient {
    sendPush(msg: PushMessage): Promise<void>;
    sendPushBatch(msgs: PushMessage[]): Promise<PushOutcome[]>;
    sendTopic(topic: string, msg: Omit<PushMessage, 'userId' | 'deviceToken'>): Promise<void>;
    sendSms(msg: SmsMessage): Promise<void>;
}
/** Hubtel SMS (Ghana) — smsc.hubtel.com/v1/messages/send, HTTP Basic (ClientId:ClientSecret).
 *  Payload: { From, To, Content }. Doc/business: Hubtel is our SMS provider (locked).
 *  Audit S-5: the host is `smsc.hubtel.com` — `sms.hubtel.com` REJECTS the real credentials
 *  (proved live: "Provided ClientId could not be found"). Both this comment and .env.example
 *  used to say `sms.hubtel.com`; deployed as-is every OTP would have failed. */
export declare class HubtelSmsClient implements NotifyClient {
    private readonly env;
    sendPush(): Promise<void>;
    constructor(env?: Record<string, string | undefined>);
    private get ore();
    sendSms(msg: SmsMessage): Promise<void>;
}
/** Twilio-style SMS (optional, when SMS_PROVIDER=twilio). */
export declare class TwilioSmsClient implements NotifyClient {
    private readonly env;
    sendPush(): Promise<void>;
    constructor(env?: Record<string, string | undefined>);
    sendSms(msg: SmsMessage): Promise<void>;
}
export declare class FirebaseNotifyClient implements NotifyClient {
    private readonly env;
    constructor(env?: Record<string, string | undefined>);
    private get ore();
    sendPush(msg: PushMessage): Promise<void>;
    private accessToken;
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
    sendPushBatch(msgs: PushMessage[]): Promise<PushOutcome[]>;
    /**
     * Send to a topic.
     *
     * Topics are how a broadcast reaches every rider without holding 50,000 device tokens in a
     * table. The constraint that matters: an app instance can hold at most 2,000 topic
     * subscriptions, so the design here is a small fixed topic set (per role, per city) — not
     * one topic per campaign, which would exhaust the budget almost immediately.
     */
    sendTopic(topic: string, msg: Omit<PushMessage, 'userId' | 'deviceToken'>): Promise<void>;
    sendSms(): Promise<void>;
}
export declare class ResilientSmsClient implements NotifyClient {
    private primary;
    private secondary?;
    constructor(env?: Record<string, string | undefined>);
    sendPush(msg: PushMessage): Promise<void>;
    /** Delegate when the underlying client can batch; otherwise loop, so callers never branch. */
    sendPushBatch(msgs: PushMessage[]): Promise<PushOutcome[]>;
    sendTopic(topic: string, msg: Omit<PushMessage, 'userId' | 'deviceToken'>): Promise<void>;
    sendSms(msg: SmsMessage): Promise<void>;
}
export declare function createNotifyClient(env?: Record<string, string | undefined>): NotifyClient;
//# sourceMappingURL=client.d.ts.map