/**
 * Email sending.
 *
 * WHY A SEPARATE INTERFACE
 * The notify client grew up around *transactional* messages — an OTP, an order update —
 * where the recipient is one person and the message is a fact. A campaign is different: it
 * is thousands of recipients, it needs per-recipient unsubscribe links, and a bounce has to
 * feed back into a suppression list. Bolting that onto the push/SMS client would mean every
 * caller that only wants to send an OTP carries campaign concerns.
 *
 * WHY RESEND
 * It is the sane default for a modern Node/TypeScript service: a real HTTP API with a Bearer
 * key, no IP warming programme, a free tier that covers a small platform, and webhooks for
 * delivered/bounced/complained. Postmark has better raw deliverability but its dev tier is
 * 100 messages a month, which is not enough to test a campaign; SES is cheapest at scale but
 * needs reputation operations nobody here has time for. Switching later is one class.
 *
 * THE FALLBACK IS NOT OPTIONAL
 * `LogEmailClient` exists so that a campaign can be composed, approved, analytics-tested and
 * dry-run with no credentials at all. Email is the one channel where "we could not send it"
 * must never break a user-facing flow.
 */
export interface EmailMessage {
    to: string;
    subject: string;
    /** Plain text. Always sent, even when html is present — clients that reject html are real. */
    text?: string;
    html?: string;
    from?: string;
    replyTo?: string;
    /** Per-recipient unsubscribe target. Resend sets List-Unsubscribe from it. */
    unsubscribeUrl?: string;
    /** Returned by the provider; stored so a bounce or complaint can be matched to the send. */
    headers?: Record<string, string>;
}
export interface EmailResult {
    /** Provider message id, when there is one. Empty for the log client. */
    id: string;
    provider: 'resend' | 'log';
}
export interface EmailClient {
    readonly name: 'resend' | 'log';
    send(msg: EmailMessage): Promise<EmailResult>;
}
/** Dev / no-credentials fallback. Prints instead of sending. */
export declare class LogEmailClient implements EmailClient {
    readonly name: "log";
    send(msg: EmailMessage): Promise<EmailResult>;
}
/**
 * Resend — POST https://api.resend.com/emails with a Bearer key.
 *
 * Failures throw. The caller decides what that means: for a campaign send, a failure has to
 * be counted as a failure, because silently reporting a send that never happened would put a
 * wrong number in front of whoever is reading the analytics.
 */
export declare class ResendEmailClient implements EmailClient {
    private readonly env;
    readonly name: "resend";
    constructor(env?: Record<string, string | undefined>);
    private get ore();
    send(msg: EmailMessage): Promise<EmailResult>;
}
/**
 * Pick a client.
 *
 * Falls back to logging rather than throwing when no key is configured, so a deployment
 * without email credentials still boots and still lets you exercise the whole campaign path.
 */
export declare function createEmailClient(env?: Record<string, string | undefined>): EmailClient;
//# sourceMappingURL=email.d.ts.map