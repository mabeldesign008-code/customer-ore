/**
 * Telegram webhook + account linking.
 *
 * `POST /comms/telegram/webhook` is @Public() because Telegram calls it, but it verifies
 * `X-Telegram-Bot-Api-Secret-Token` before doing anything — an unauthenticated caller
 * cannot inject fake escalations into our alerting.
 *
 * Linking flow (T4.5): an admin asks the console for a code, DMs `/link <code>` to the
 * bot, and the bot resolves it to their chat id. We never ask anyone to paste a raw
 * chat_id, because a guessed chat id would mean someone else receiving our alerts.
 */
import { BadRequestException, Body, Controller, Get, Headers, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser, Public, RequirePermission, Roles } from '@ore/core';
import type { JwtPayload } from '@ore/core';
import { Role } from '@ore/contracts';
import { TelegramService } from './telegram.service';

@Controller('comms/telegram')
export class TelegramController {
  /** chatId -> adminUserId for completed links. Persisted by the caller in a real deploy. */
  private readonly linked = new Map<string, string>();

  constructor(private readonly telegram: TelegramService) {}

  @Get('status')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('support.alerting.manage')
  status() {
    const cfg = this.telegram.config();
    return {
      enabled: cfg.enabled,
      webhookConfigured: !!cfg.webhookUrl,
      webhookUrl: cfg.webhookUrl,
      linkedAccounts: this.linked.size,
      // Never return the token, not even to a super admin. The console only needs to know
      // whether it is set.
      tokenSet: !!cfg.botToken,
    };
  }

  /** Step 1: the console asks for a code to give the admin. */
  @Post('link-code')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('support.alerting.manage')
  linkCode() {
    if (!this.telegram.isEnabled()) {
      throw new BadRequestException('TELEGRAM_BOT_TOKEN is not set, so linking is unavailable');
    }
    const { code, expiresAt } = this.telegram.issueLinkCode();
    return {
      code,
      expiresAt,
      instruction: `DM the Ore support bot: /link ${code}`,
    };
  }

  /**
   * Telegram's update endpoint.
   *
   * Always answers 200 with `{ok:true}` once the secret checks out. Returning an error
   * makes Telegram retry, and a retry storm on a bug in our handler would bury the real
   * alerts. Failures are logged, not signalled.
   */
  @Post('webhook')
  @Public()
  async webhook(
    @Headers('x-telegram-bot-api-secret-token') secret: string | undefined,
    @Body() update: any,
  ): Promise<{ ok: true }> {
    if (!this.telegram.verifyWebhookSecret(secret)) {
      // Do not explain why. Just refuse.
      return { ok: true };
    }
    const message = update?.message;
    const text: string = (message?.text || '').trim();
    const chatId = message?.chat?.id ? String(message.chat.id) : null;
    if (!chatId) return { ok: true };

    if (text.startsWith('/link')) {
      const code = text.split(/\s+/)[1];
      if (!code) return { ok: true };
      const ok = this.telegram.consumeLinkCode(code, chatId);
      if (ok) {
        this.linked.set(chatId, code);
        await this.telegram.send(chatId, '✅ Linked. You will receive Ore support escalation alerts here.');
      } else {
        await this.telegram.send(chatId, '❌ That code is invalid or has expired. Ask the console for a new one.');
      }
      return { ok: true };
    }

    if (text === '/whoami') {
      await this.telegram.send(chatId, `Your chat id is ${chatId}.`);
      return { ok: true };
    }

    // Anything else gets a nudge, so an admin does not silently wonder why nothing happens.
    await this.telegram.send(chatId, 'I only handle /link <code> and /whoami. Alerts are sent automatically.');
    return { ok: true };
  }

  /** Send a test alert, so setup can be confirmed without waiting for a real escalation. */
  @Post('test')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('support.alerting.manage')
  async test(@CurrentUser() user: JwtPayload, @Body() body: { chatId?: string } = {}) {
    const chatId = body?.chatId || [...this.linked.keys()][0];
    if (!chatId) throw new BadRequestException('No linked chat to test. Complete linking first.');
    const sent = await this.telegram.send(
      chatId,
      `🔔 Test alert from Ore support (requested by ${user.sub.slice(0, 8)}). If you can read this, escalation alerts are working.`,
    );
    return { sent };
  }

  /** Which chats will receive alerts for a given escalation team. */
  @Get('routing')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('support.alerting.manage')
  routing(@Query('team') team?: string) {
    return {
      team: team ?? 'general',
      chatConfigured: !!this.telegram.teamChat(team),
      // The id itself is not returned: knowing it is not needed to verify routing, and it
      // is the one value that would let someone spoof a recipient.
    };
  }
}
