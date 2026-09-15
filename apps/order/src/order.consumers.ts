/** Event consumers for order-service: payment confirmation + dispatch lifecycle (idempotent on event id). */

import { Inject, Injectable, Logger } from '@nestjs/common';
import { EVENTS, OrderEventPayload, RiderEventPayload, ChargeSucceededPayload } from '@ore/contracts';
import { ORE_BUS, ORE_DEDUPE, ConsumerDedupe, internalFetch, serviceUrl } from '@ore/core';
import { Bus } from '@ore/bus';
import { OrderService } from './order.service';

@Injectable()
export class OrderConsumers {
  private readonly logger = new Logger('OrderConsumers');

  constructor(
    @Inject(ORE_BUS) private readonly bus: Bus,
    private readonly orders: OrderService,
    @Inject(ORE_DEDUPE) private readonly dedupe: ConsumerDedupe,
  ) {}

  async init(): Promise<void> {
    // payment.charge_succeeded → confirm all sub-orders of the checkout (G05/G06)
    await this.bus.subscribe<ChargeSucceededPayload>(EVENTS.PAYMENT_CHARGE_SUCCEEDED, async (env) => {
      if (!(await this.take(env.id))) return;
      // Audit S-1: confirm with the payment service that money actually moved before any
      // order is confirmed. The bus used to be unauthenticated and unsigned, and a forged
      // envelope with a real `checkoutId` sent riders to unpaid orders.
      if (!(await this.checkoutReallyPaid(env.payload.checkoutId, env.id))) return;
      await this.orders.confirmOnPayment(env.payload.checkoutId);
    });

    await this.bus.subscribe<OrderEventPayload>(EVENTS.ORDER_CANCELLED, async (env) => {
      // nothing to do here — payment/ledger react to order.cancelled themselves
    });

    await this.bus.subscribe<RiderEventPayload>(EVENTS.DISPATCH_RIDER_ASSIGNED, async (env) => {
      if (!(await this.take(env.id))) return;
      await this.orders.onRiderAssigned(env.payload.orderId!, env.payload.riderId!);
    });

    await this.bus.subscribe<RiderEventPayload>(EVENTS.DISPATCH_RIDER_EN_ROUTE, async (env) => {
      if (!(await this.take(env.id))) return;
      await this.orders.onRiderEnRoute(env.payload.orderId!);
    });

    await this.bus.subscribe<RiderEventPayload>(EVENTS.DISPATCH_RIDER_AT_VENDOR, async (env) => {
      if (!(await this.take(env.id))) return;
      await this.orders.onRiderAtVendor(env.payload.orderId!, env.payload.riderId);
    });

    await this.bus.subscribe<RiderEventPayload>(EVENTS.DISPATCH_RIDER_PICKED_UP, async (env) => {
      if (!(await this.take(env.id))) return;
      await this.orders.onRiderPickedUp(env.payload.orderId!);
    });

    await this.bus.subscribe<RiderEventPayload>(EVENTS.DISPATCH_RIDER_LAUNDRY_HANDOFF, async (env) => {
      if (!(await this.take(env.id))) return;
      await this.orders.onLaundryHandoff(env.payload.orderId!, env.payload.riderId!);
    });

    await this.bus.subscribe<RiderEventPayload>(EVENTS.DISPATCH_RIDER_UNASSIGNED, async (env) => {
      if (!(await this.take(env.id))) return;
      await this.orders.onRiderUnassigned(env.payload.orderId!);
    });

    await this.bus.subscribe<OrderEventPayload>(EVENTS.ORDER_WAITING_FOR_RIDER, async (env) => {
      if (!(await this.take(env.id))) return;
      await this.orders.onWaitingForRider(env.payload.orderId);
    });
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

  /**
   * Ask the payment service — the system of record for Paystack truth — whether this
   * checkout is genuinely SUCCESS before confirming orders off a bus event (audit S-1).
   *
   * Envelope signatures prove where an event came from; they cannot prove the money moved.
   * Failing closed here means a forged, replayed or premature `charge_succeeded` cannot put
   * a rider on the road for an unpaid order.
   *
   * A transport failure THROWS so the bus retries (the payment service may simply be
   * mid-deploy); only an authoritative "not paid" answer stops processing.
   */
  private async checkoutReallyPaid(checkoutId: string, envelopeId: string): Promise<boolean> {
    const res = await internalFetch(`${serviceUrl('payment')}/internal/payments/checkout/${encodeURIComponent(checkoutId)}`);
    if (!res.ok) {
      throw new Error(`charge_succeeded re-verification could not reach payment service (HTTP ${res.status}) for checkout ${checkoutId}`);
    }
    const body = (await res.json()) as { found: boolean; status: string | null };
    if (body.found && body.status === 'SUCCESS') return true;
    this.logger.error(
      `REFUSED charge_succeeded ${envelopeId}: payment service reports checkout ${checkoutId} as ` +
        `${body.found ? body.status : 'not found'} — orders NOT confirmed`,
    );
    return false;
  }
}
