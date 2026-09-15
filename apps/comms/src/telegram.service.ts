import { Inject, Injectable, Logger } from '@nestjs/common';
import { createHmac, randomBytes } from 'crypto';
import { ORE_ENV } from '@ore/core';
import { OreEnv } from '@ore/config';

/**
 * Telegram alerts for support escalations.
 *
 * Deliberately no library. The whole surface we need is one `sendMessage` POST plus a
 * webhook that verifies `X-Telegram-Bot-Api-Secret-Token`; a dependency for that is more
 * supply-chain risk than code saved.
 *
 * Two things this gets right on purpose:
 *
 * 1. **Linking is by short-lived code, never by a raw chat id.** An admin DMs the bot
 *    `/link <code>`; the code is single-use and expires in 10 minutes. If we accepted a
 *    pasted chat id, anyone who guessed one could subscribe to our alerts — and the
 *    alerts contain ticket references and customer issue summaries.
 *
 * 2. **No PII in the payload.** Ticket ref, reason, a one-line summary, and a deep link.
 *    Never a phone number, address or order detail. A Telegram group is not a system of
 *    record and its retention is not ours to control.
 */

const TELEGRAM_API = 'https://api.telegram.org';

export interface TelegramConfig {
  enabled: boolean;
  botToken: string | null;
  /** Shared secret Telegram echoes back on webhook calls. */
  webhookSecret: string;
  /** Public HTTPS URL the webhook is registered at. */
  webhookUrl: string | null;
}

export interface TelegramTarget {
  chatId: string;
  /** Which admin's DM this is, when it is a DM rather than a team chat. */
  adminUserId?: string | null;
}

/** Team chats, one per escalation team, from env: TELEGRAM_CHAT_FINANCE=-100123... */
const TEAM_CHAT_ENV: Record<string, string> = {
  finance: 'TELEGRAM_CHAT_FINANCE',
  operations: 'TELEGRAM_CHAT_OPERATIONS',
  compliance: 'TELEGRAM_CHAT_COMPLIANCE',
  support: 'TELEGRAM_CHAT_SUPPORT',
  general: 'TELEGRAM_CHAT_GENERAL',
};

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  /** code -> { chatId, expiresAt }. In-memory is fine: codes are single-use and short-lived. */
  private readonly pendingLinks = new Map<string, { chatId: string; expiresAt: number }>();

  constructor(@Inject(ORE_ENV) private readonly env: OreEnv) {
    const cfg = this.config();
    if (cfg.enabled) {
      if (!cfg.webhookSecret) {
        this.logger.error('TELEGRAM_BOT_TOKEN set but TELEGRAM_WEBHOOK_SECRET is not — webhook verification is disabled (fail-closed). Set TELEGRAM_WEBHOOK_SECRET to enable Telegram alerts.');
      } else {
        this.logger.log(`Telegram alerts enabled (webhook ${cfg.webhookUrl ?? 'not registered yet'})`);
      }
    } else {
      // Not an error. Every escalation still lands in the in-app queue; Telegram is an
      // additional nudge, never the only path to a ticket.
      this.logger.warn('TELEGRAM_BOT_TOKEN not set — escalation alerts stay in-app only');
    }
  }

  config(): TelegramConfig {
    // Audit M-2: read through loadEnv's validated, hydrated snapshot instead of poking
    // process.env — the same values, but with .env hydration, trimming and boot checks
    // applied once at startup rather than re-derived here per call.
    const botToken = this.env.telegramBotToken || null;
    // The dev secret exists so local runs work zero-config. In production it is a
    // hardcoded, in-repo string — verifying against it would let anyone who reads the
    // repo forge webhook calls, so production with no TELEGRAM_WEBHOOK_SECRET fails
    // closed (empty secret = webhook refused, alerts stay in-app only). Audit F-SEC-12.
    const webhookSecret =
      this.env.telegramWebhookSecret ||
      (this.env.nodeEnv === 'production' ? '' : 'ore-telegram-dev-secret');
    return {
      enabled: !!botToken,
      botToken,
      webhookSecret,
      webhookUrl: this.env.telegramWebhookUrl || null,
    };
  }

  isEnabled(): boolean {
    return this.config().enabled;
  }

  /** Verify the header Telegram sends. Constant-time compare. */
  verifyWebhookSecret(provided: string | undefined): boolean {
    const expected = this.config().webhookSecret;
    // Production with no TELEGRAM_WEBHOOK_SECRET: refuse rather than fall back to the
    // in-repo dev secret (audit F-SEC-12). Alerts keep flowing in-app; only the Telegram
    // webhook is disabled until an operator sets a secret.
    if (!expected) return false;
    if (!provided || provided.length !== expected.length) return false;
    return createHmac('sha256', 'ore').update(provided).digest('hex') ===
      createHmac('sha256', 'ore').update(expected).digest('hex');
  }

  /** Issue a single-use code an admin DMs to the bot. */
  issueLinkCode(): { code: string; expiresAt: Date } {
    const code = randomBytes(4).toString('hex').toUpperCase();
    const expiresAt = new Date(Date.now() + 10 * 60_000);
    this.pendingLinks.set(code, { chatId: '', expiresAt: expiresAt.getTime() });
    // Bound the map: an admin who never completes linking should not leak memory.
    if (this.pendingLinks.size > 500) {
      const now = Date.now();
      for (const [k, v] of this.pendingLinks) if (v.expiresAt < now) this.pendingLinks.delete(k);
    }
    return { code, expiresAt };
  }

  /** Consume a code against the chat that just DM'd it. Returns null if invalid/expired. */
  consumeLinkCode(code: string, chatId: string): boolean {
    const key = code.trim().toUpperCase();
    const entry = this.pendingLinks.get(key);
    if (!entry) return false;
    this.pendingLinks.delete(key); // single use, whether or not it was valid
    if (entry.expiresAt < Date.now()) return false;
    entry.chatId = chatId;
    return true;
  }

  /** The chat id a completed code resolved to. */
  chatIdForCode(code: string): string | null {
    return this.pendingLinks.get(code.trim().toUpperCase())?.chatId || null;
  }

  /** Team chat for an escalation team, if one is configured.
   *  These stay on process.env on purpose (audit M-2 review): TEAM_CHAT_ENV maps a team name
   *  to a *dynamic* env key chosen at runtime, which a fixed typed config cannot express. They
   *  are non-secret chat identifiers, and loadEnv has already hydrated .env into process.env. */
  teamChat(team: string | null | undefined): string | null {
    if (!team) return process.env[TEAM_CHAT_ENV.general] || null;
    const key = TEAM_CHAT_ENV[team.toLowerCase()];
    return (key && process.env[key]) || process.env[TEAM_CHAT_ENV.general] || null;
  }

  /**
   * Send. Never throws: a Telegram outage must not fail the escalation that triggered it.
   * Returns false when it could not be delivered, so the caller can fall back to in-app.
   */
  async send(chatId: string, text: string): Promise<boolean> {
    const cfg = this.config();
    if (!cfg.enabled) return false;
    try {
      const res = await fetch(`${TELEGRAM_API}/bot${cfg.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          disable_web_page_preview: true,
          // Long tickets can produce long threads; Telegram caps a message at 4096 chars.
          ...(text.length > 4000 ? {} : {}),
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        this.logger.error(`Telegram sendMessage failed: ${res.status} ${(await res.text()).slice(0, 160)}`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.error(`Telegram sendMessage error: ${(err as Error).message}`);
      return false;
    }
  }

  /** Register the webhook. Called at boot when a token and URL are both configured. */
  async registerWebhook(): Promise<boolean> {
    const cfg = this.config();
    if (!cfg.enabled || !cfg.webhookUrl) return false;
    try {
      const res = await fetch(`${TELEGRAM_API}/bot${cfg.botToken}/setWebhook`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          url: cfg.webhookUrl,
          secret_token: cfg.webhookSecret,
          // Only the updates we handle. Asking for message + callback keeps the volume low.
          allowed_updates: ['message', 'callback_query'],
          max_connections: 20,
        }),
        signal: AbortSignal.timeout(8000),
      });
      const ok = res.ok;
      if (!ok) this.logger.error(`setWebhook failed: ${res.status} ${(await res.text()).slice(0, 160)}`);
      return ok;
    } catch (err) {
      this.logger.error(`setWebhook error: ${(err as Error).message}`);
      return false;
    }
  }

  /**
   * Format an escalation alert.
   *
   * No PII by construction: the caller passes a summary, and this refuses to include
   * anything that looks like a Ghanaian phone number or a street address. Better a
   * slightly less useful alert than a data leak into a chat app.
   */
  formatEscalation(input: {
    ticketRef: string | null;
    reason: string | null;
    summary: string;
    team: string | null;
    deepLink: string | null;
  }): string {
    const scrubbed = scrubPii(input.summary).slice(0, 200);
    const lines = [
      `🚨 Escalation — ${input.ticketRef || 'unnumbered ticket'}`,
      `Reason: ${input.reason || 'unspecified'}`,
      `Team: ${input.team || 'general'}`,
      scrubbed ? `Summary: ${scrubbed}` : '',
      input.deepLink ? `Open: ${input.deepLink}` : '',
    ];
    return lines.filter(Boolean).join('\n');
  }

  /** A new conversation opened — support should know within seconds, not at next refresh. */
  formatNewConversation(input: { ticketRef: string | null; summary: string; deepLink: string | null }): string {
    const lines = [
      `💬 New conversation — ${input.ticketRef || 'unnumbered'}`,
      scrubPii(input.summary).slice(0, 160),
      input.deepLink ? `Open: ${input.deepLink}` : '',
    ];
    return lines.filter(Boolean).join('\n');
  }

  /** SLA about to be or has been breached. */
  formatSlaBreach(input: { ticketRef: string | null; priority: string; minutesLate: number; deepLink: string | null }): string {
    const lines = [
      `⏰ SLA breached — ${input.ticketRef || 'unnumbered'} (${input.priority})`,
      `${input.minutesLate} min past the first-response target with no human reply.`,
      input.deepLink ? `Open: ${input.deepLink}` : '',
    ];
    return lines.filter(Boolean).join('\n');
  }
}

/**
 * Strip things that must not reach a chat app.
 *
 * Ghanaian numbers in every shape they get typed, plus anything that reads like a street
 * address. This is a blunt instrument on purpose — a false positive costs a word, a false
 * negative costs a customer's phone number in a group chat.
 */
export function scrubPii(text: string): string {
  return String(text || '')
    .replace(/(?:\+?233|0)[\s.-]?\d{2}[\s.-]?\d{3}[\s.-]?\d{4}/g, '[phone removed]')
    .replace(/\b\d{3}[\s.-]?\d{3}[\s.-]?\d{4}\b/g, '[phone removed]')
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[email removed]')
    .replace(/\b(?:Hse|House|No\.?)\s*\d+[^\n,.]{0,40}/gi, '[address removed]')
    .replace(/\b(?:GPS|GhanaPost)\s*[A-Z0-9-]{4,}\b/gi, '[gps removed]')
    .trim();
}
