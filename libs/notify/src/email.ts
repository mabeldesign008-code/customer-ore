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

import { loadEnv } from '@ore/config';

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
export class LogEmailClient implements EmailClient {
  readonly name = 'log' as const;

  async send(msg: EmailMessage): Promise<EmailResult> {
    console.log(
      `[email→${msg.to}] ${msg.subject}` +
        `${msg.unsubscribeUrl ? ` (unsubscribe: ${msg.unsubscribeUrl})` : ''}` +
        `\n${(msg.text ?? msg.html ?? '').slice(0, 240)}`,
    );
    return { id: '', provider: 'log' };
  }
}

/**
 * Resend — POST https://api.resend.com/emails with a Bearer key.
 *
 * Failures throw. The caller decides what that means: for a campaign send, a failure has to
 * be counted as a failure, because silently reporting a send that never happened would put a
 * wrong number in front of whoever is reading the analytics.
 */
export class ResendEmailClient implements EmailClient {
  readonly name = 'resend' as const;

  constructor(private readonly env: Record<string, string | undefined> = process.env) {}

  private get ore() {
    return loadEnv(this.env);
  }

  async send(msg: EmailMessage): Promise<EmailResult> {
    const { resendApiKey, emailFrom } = this.ore;
    if (!resendApiKey) throw new Error('RESEND_API_KEY is not set');
    if (!msg.to) throw new Error('Email has no recipient');

    const headers: Record<string, string> = { ...(msg.headers ?? {}) };
    if (msg.unsubscribeUrl) {
      // RFC 8058 one-click. Without this every campaign is a spam-complaint generator, and
      // the complaints land on the domain, not on the campaign.
      headers['List-Unsubscribe'] = `<${msg.unsubscribeUrl}>`;
      headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: msg.from ?? emailFrom,
        to: [msg.to],
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
        reply_to: msg.replyTo,
        headers: Object.keys(headers).length ? headers : undefined,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Resend failed: ${res.status} ${detail.slice(0, 300)}`);
    }
    const json = (await res.json().catch(() => ({}))) as { id?: string };
    return { id: json.id ?? '', provider: 'resend' };
  }
}

/**
 * Pick a client.
 *
 * Falls back to logging rather than throwing when no key is configured, so a deployment
 * without email credentials still boots and still lets you exercise the whole campaign path.
 */
export function createEmailClient(env: Record<string, string | undefined> = process.env): EmailClient {
  const ore = loadEnv(env);
  if (ore.emailProvider === 'resend' && ore.resendApiKey) return new ResendEmailClient(env);
  if (ore.emailProvider === 'resend' && !ore.resendApiKey) {
    console.warn('[email] EMAIL_PROVIDER=resend but RESEND_API_KEY is not set — logging instead of sending');
  }
  return new LogEmailClient();
}
