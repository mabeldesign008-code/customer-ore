/** Notification service — consumes every lifecycle event → feed + push (G25). */

import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EVENTS,
  OrderEventPayload,
  ChargeSucceededPayload,
  RiderEventPayload,
} from '@ore/contracts';
import { ORE_BUS, ORE_ENV, ORE_NOTIFY, internalFetch, serviceUrl, ORE_DEDUPE, ConsumerDedupe } from '@ore/core';
import { Bus } from '@ore/bus';
import { NotifyClient } from '@ore/notify';
import { OreEnv } from '@ore/config';
import { DeviceToken } from './entities/device-token.entity';
import { NotificationFeed } from './entities/notification-feed.entity';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger('NotificationService');

  constructor(
    @InjectRepository(NotificationFeed) private readonly feed: Repository<NotificationFeed>,
    @InjectRepository(DeviceToken) private readonly deviceTokens: Repository<DeviceToken>,
    @Inject(ORE_BUS) private readonly bus: Bus,
    @Inject(ORE_NOTIFY) private readonly notify: NotifyClient,
    @Inject(ORE_DEDUPE) private readonly dedupe: ConsumerDedupe,
    @Inject(ORE_ENV) private readonly oreEnv: OreEnv,
  ) {}

  async init(): Promise<void> {
    const subscribe = <T>(event: string, builder: (payload: T) => { userId: string; title: string; body: string; data?: Record<string, string> }[]) =>
      this.bus.subscribe<T>(event as never, async (env) => {
        if (!(await this.take(env.id))) return;
        for (const m of builder(env.payload)) await this.deliver(m.userId, event, m.title, m.body, m.data);
      });

    await this.bus.subscribe<OrderEventPayload>(EVENTS.ORDER_CONFIRMED, async (env) => {
      if (!(await this.take(env.id))) return;
      const p = env.payload;
      await this.deliver(p.customerId, EVENTS.ORDER_CONFIRMED, 'Order confirmed', 'Payment received — the kitchen is getting started.', { orderId: p.orderId });
      const ownerUserId = await this.vendorOwnerUserId(p.vendorId);
      if (ownerUserId) {
        await this.deliver(ownerUserId, EVENTS.ORDER_CONFIRMED, 'New order', 'A new order is waiting — accept it now.', { orderId: p.orderId });
      }
    });

    await subscribe<OrderEventPayload>(EVENTS.ORDER_ACCEPTED, (p) => [
      { userId: p.customerId, title: 'Order accepted', body: 'The vendor accepted your order and started cooking.', data: { orderId: p.orderId } },
    ]);

    await subscribe<OrderEventPayload>(EVENTS.ORDER_READY_FOR_PICKUP, (p) => [
      { userId: p.customerId, title: 'Ready for pickup', body: 'Your order is ready — a rider is on the way.', data: { orderId: p.orderId } },
    ]);

    // Copy must not promise a refund that does not exist: COD orders and orders cancelled
    // before payment have nothing to refund (audit P2).
    await subscribe<OrderEventPayload>(EVENTS.ORDER_CANCELLED, (p) => [
      // Wording stays neutral on refunds: COD orders never had a card charge, and card
      // refunds follow the payment pipeline (auto for pre-fulfilment cancels).
      { userId: p.customerId, title: 'Order cancelled', body: 'Your order was cancelled. If you paid by card, any refund appears on your payment method.', data: { orderId: p.orderId } },
    ]);

    await subscribe<OrderEventPayload>(EVENTS.ORDER_REJECTED, (p) => [
      { userId: p.customerId, title: 'Order rejected', body: 'The vendor could not fulfill this order. If you paid by card, any refund appears on your payment method.', data: { orderId: p.orderId } },
    ]);

    await subscribe<any>(EVENTS.COMMS_MESSAGE_CREATED, (p) => {
      // Only notify customer if an admin/support agent replies
      if (p.senderRole === 'customer') return [];
      const targetId = p.customerId || p.ownerUserId;
      if (!targetId) return [];
      
      return [{ 
        userId: targetId,
        title: 'New message from Support', 
        body: 'An agent has replied to your request.', 
        data: { threadId: p.threadId, orderId: p.orderId || undefined }
      }];
    });

    // ONE subscription per event — a second durable consumer with the same name fails to
    // bind and its recreation swallows deliveries. This handler does both the customer
    // push and the gift-recipient OTP SMS (doc §3 Case 2).
    await this.bus.subscribe<OrderEventPayload>(EVENTS.ORDER_PICKED_UP, async (env) => {
      if (!(await this.take(env.id))) return;
      const p = env.payload;
      await this.deliver(p.customerId, EVENTS.ORDER_PICKED_UP, 'Picked up', 'The rider picked up your order and is on the way!', { orderId: p.orderId });
      // Gift: the recipient is not an app user — the delivery OTP reaches them by SMS.
      // The plaintext never leaves the order service; it is revealed over the internal
      // boundary on demand.
      const order = await this.fetchOrderCustomer(p.orderId);
      if (!order?.recipientJson || order.recipientJson.status !== 'CONFIRMED' || !order.recipientJson.phone) return;
      const res = await internalFetch(
        `${serviceUrl('order')}/internal/orders/${encodeURIComponent(p.orderId)}/otp/reveal`,
        { method: 'POST' },
      ).catch(() => null);
      if (!res || !res.ok) return;
      const { otp } = (await res.json()) as { otp: string };
      await this.notify.sendSms({ phone: order.recipientJson.phone, text: `Ore: your delivery is on the way. Your OTP is ${otp}.` }).catch((err) => { this.logger.warn(`SMS fan-out failed: ${err instanceof Error ? err.message : String(err)}`); });
    });

    await subscribe<OrderEventPayload>(EVENTS.ORDER_DELIVERED, (p) => [
      { userId: p.customerId, title: 'Delivered 🎉', body: 'Your order has arrived. Enjoy!', data: { orderId: p.orderId } },
    ]);

    // payment.charge_succeeded is not needed here: the customer's "Payment received"
    // push already fires on ORDER_CONFIRMED, and charge_failed is not published (the pay
    // page is the source of truth for a failed charge; abandoned charges are reconciled
    // by the payment sweeper, not by a push).

    await subscribe<RiderEventPayload>(EVENTS.DISPATCH_OFFER_CREATED, (p) => [
      { userId: p.riderId, title: 'New delivery offer', body: 'Tap to view pickup details.', data: { orderId: p.orderId ?? '', offerId: p.offerId ?? '' } },
    ]);

    // ETA updates need the real customer id — resolve it from the order before delivering.
    await this.bus.subscribe<{ orderId: string; etaMinutes: number }>(EVENTS.TRACKING_ETA_CHANGED, async (env) => {
      if (!(await this.take(env.id))) return;
      const p = env.payload;
      const order = await this.fetchOrderCustomer(p.orderId);
      if (!order?.customerId) return;
      await this.deliver(order.customerId, EVENTS.TRACKING_ETA_CHANGED, 'ETA updated', `Your rider arrives in ~${p.etaMinutes} min.`, { orderId: p.orderId });
    });

    // doc §5 rider money: payout sent / failed / rejected
    await subscribe<{ userId?: string; amountPesewas: number; feePesewas?: number }>(EVENTS.WITHDRAWAL_PAID, (p) =>
      p.userId
        ? [{ userId: p.userId, title: 'Payout sent 🎉', body: `GHS ${(p.amountPesewas / 100).toFixed(2)} paid out${p.feePesewas ? ` (fee GHS ${(p.feePesewas / 100).toFixed(2)})` : ''}.`, data: {} }]
        : [],
    );
    await subscribe<{ userId?: string; amountPesewas: number }>(EVENTS.WITHDRAWAL_FAILED, (p) =>
      p.userId
        ? [{ userId: p.userId, title: 'Payout failed', body: `GHS ${(p.amountPesewas / 100).toFixed(2)} could not be paid — returned to your wallet.`, data: {} }]
        : [],
    );
    await subscribe<{ userId?: string; amountPesewas: number }>(EVENTS.WITHDRAWAL_REJECTED, (p) =>
      p.userId
        ? [{ userId: p.userId, title: 'Payout request declined', body: `GHS ${(p.amountPesewas / 100).toFixed(2)} was not approved — contact support.`, data: {} }]
        : [],
    );

    // doc §4 vendor settlement: ready / paid / reversed
    await subscribe<{ userId?: string; payoutPesewas: number }>(EVENTS.VENDOR_SETTLEMENT_CREATED, (p) =>
      p.userId
        ? [{ userId: p.userId, title: 'Weekly settlement ready', body: `GHS ${(p.payoutPesewas / 100).toFixed(2)} is ready to pay out.`, data: {} }]
        : [],
    );
    await subscribe<{ userId?: string; payoutPesewas: number }>(EVENTS.VENDOR_SETTLEMENT_PAID, (p) =>
      p.userId
        ? [{ userId: p.userId, title: 'Settlement paid 🎉', body: `GHS ${(p.payoutPesewas / 100).toFixed(2)} has been paid to your account.`, data: {} }]
        : [],
    );
    await subscribe<{ userId?: string; amountPesewas: number }>(EVENTS.VENDOR_SETTLEMENT_REVERSED, (p) =>
      p.userId
        ? [{ userId: p.userId, title: 'Settlement reversed', body: `GHS ${(p.amountPesewas / 100).toFixed(2)} was reversed — please contact support.`, data: {} }]
        : [],
    );

    // doc §Payment: dispute resolved → customer, wallet credit → customer
    await subscribe<{ customerId: string; decision: string; amountPesewas: number; refundMethod?: string | null }>(EVENTS.DISPUTE_RESOLVED, (p) => [
      p.amountPesewas > 0
        ? { userId: p.customerId, title: 'Dispute resolved', body: `GHS ${(p.amountPesewas / 100).toFixed(2)} refunded to your ${p.refundMethod === 'ORIGINAL' ? 'payment method' : 'wallet credit'} (${p.decision.replace('_', ' ')}).`, data: {} }
        : { userId: p.customerId, title: 'Dispute resolved', body: 'We reviewed your dispute — no refund was granted.', data: {} },
    ]);
    await subscribe<{ userId: string; creditPesewas: number; deltaPesewas: number }>(EVENTS.CUSTOMER_CREDIT_CHANGED, (p) => [
      { userId: p.userId, title: 'Wallet credit 💰', body: `GHS ${(p.deltaPesewas / 100).toFixed(2)} credited — balance GHS ${(p.creditPesewas / 100).toFixed(2)}.`, data: {} },
    ]);
    // doc §3 Case 2: gift — SMS the recipient the confirm-location link; delivery OTP to the recipient
    await this.bus.subscribe<{ orderId: string; recipientPhone?: string; recipientToken?: string; isGift?: boolean }>(EVENTS.ORDER_CREATED, async (env) => {
      if (!(await this.take(env.id))) return;
      if (env.payload.isGift && env.payload.recipientPhone && env.payload.recipientToken) {
        // Audit M-2/M-3: GIFT_BASE_URL now comes from loadEnv — the raw process.env read
        // used to include the inline comment from .env in the URL, texting customers a
        // broken gift link with "# base for gift confirm links" appended.
        const link = `${this.oreEnv.giftBaseUrl || 'http://localhost:4000'}/gift/${env.payload.recipientToken}`;
        await this.notify.sendSms({ phone: env.payload.recipientPhone, text: `Ore: someone is sending you a delivery! Confirm your location to begin: ${link}` }).catch((err) => { this.logger.warn(`SMS fan-out failed: ${err instanceof Error ? err.message : String(err)}`); });
      }
    });

    // doc §5 COD ladder: warning / suspension / investigation / termination — SMS + push
    await this.bus.subscribe<{
      userId?: string;
      phone?: string;
      codStatus?: string;
      outstandingPesewas?: number;
    }>(EVENTS.RIDER_COD_STATUS_CHANGED, async (env) => {
      if (!(await this.take(env.id))) return;
      const p = env.payload;
      const map: Record<string, { title: string; body: string }> = {
        WARNING: { title: 'COD reminder', body: `Remit GHS ${((p.outstandingPesewas ?? 0) / 100).toFixed(2)} COD cash today to keep delivering.` },
        SUSPENDED: { title: 'COD suspended', body: `COD deliveries paused until you remit GHS ${((p.outstandingPesewas ?? 0) / 100).toFixed(2)}.` },
        INVESTIGATION: { title: 'COD investigation', body: 'Unremitted COD cash — you are offline pending investigation. Contact support.' },
        TERMINATED: { title: 'Account terminated', body: 'Unremitted COD cash — your rider account has been terminated. Contact support.' },
      };
      const msg = p.codStatus ? map[p.codStatus] : undefined;
      if (!msg || !p.userId) return;
      await this.deliver(p.userId, EVENTS.RIDER_COD_STATUS_CHANGED, msg.title, msg.body, {});
      if (p.phone) {
        await this.notify.sendSms({ phone: p.phone, text: `Ore: ${msg.title} — ${msg.body}` }).catch((err) => { this.logger.warn(`SMS fan-out failed: ${err instanceof Error ? err.message : String(err)}`); });
      }
    });
  }

  async registerDeviceToken(userId: string, token: string, platform: string): Promise<DeviceToken> {
    const existing = await this.deviceTokens.findOne({ where: { token } });
    if (existing) {
      existing.userId = userId;
      existing.platform = platform;
      return this.deviceTokens.save(existing);
    }
    return this.deviceTokens.save(
      this.deviceTokens.create({ userId, token, platform }),
    );
  }

  private async deliver(userId: string, type: string, title: string, body: string, data?: Record<string, string>): Promise<void> {
    await this.feed.save(this.feed.create({ userId, type, title, body, dataJson: (data ?? {}) as unknown as Record<string, unknown> }));
    const tokens = await this.deviceTokens.find({ where: { userId } });
    if (tokens.length === 0) {
      await this.notify.sendPush({ userId, title, body, data }).catch(() => null);
      return;
    }
    await Promise.all(
      tokens.map(async (device) => {
        try {
          await this.notify.sendPush({ userId, deviceToken: device.token, title, body, data });
        } catch (err) {
          if (err instanceof Error && err.message.includes('FCM_TOKEN_INVALID')) {
            await this.deviceTokens.delete({ token: device.token });
            this.logger.warn(`Cleaned up invalid FCM token for user ${userId}`);
          }
        }
      })
    );
  }

  async myFeed(userId: string): Promise<NotificationFeed[]> {
    return this.feed.find({ where: { userId }, order: { createdAt: 'DESC' }, take: 50 });
  }

  async markRead(userId: string, id: string): Promise<NotificationFeed> {
    const row = await this.feed.findOne({ where: { id, userId } });
    if (!row) throw new NotFoundException('Notification not found');
    row.read = true;
    return this.feed.save(row);
  }

  private async vendorOwnerUserId(vendorId: string): Promise<string | null> {
    try {
      const res = await internalFetch(`${serviceUrl('catalog')}/internal/vendors/${vendorId}/owner`);
      if (!res.ok) return null;
      const body = (await res.json()) as { ownerUserId?: string } | null;
      return body?.ownerUserId ?? null;
    } catch {
      return null;
    }
  }

  private async fetchOrderCustomer(orderId: string): Promise<{
    customerId?: string;
    recipientJson?: { phone?: string; status?: string } | null;
  } | null> {
    try {
      const res = await internalFetch(`${serviceUrl('order')}/internal/orders/${encodeURIComponent(orderId)}`);
      if (!res.ok) return null;
      return (await res.json()) as { customerId?: string; recipientJson?: { phone?: string; status?: string } | null };
    } catch {
      return null;
    }
  }

  /**
   * Claim an envelope for processing, exactly once across every replica and every restart.
   *
   * This was a plain in-memory `Set`. It died with the process, so a redelivery after a deploy
   * was reprocessed; it was per-replica, so a fanned-out event was handled once per replica; and
   * it called `.clear()` wholesale at 10 000 entries, so the next redelivery of any of those
   * events was reprocessed too. All three are reachable on an at-least-once bus.
   */
  private take(id: string): Promise<boolean> {
    return this.dedupe.take(id);
  }
}
