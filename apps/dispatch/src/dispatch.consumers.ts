/** Dispatch event consumers — order lifecycle → T-5 scheduling; location → geofence. */

import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  EVENTS,
  OrderEventPayload,
  RiderCodStatus,
  RiderCodTier,
  RiderEventPayload,
  RiderLocationPayload,
} from '@ore/contracts';
import { ORE_BUS, ORE_DEDUPE, ConsumerDedupe } from '@ore/core';
import { Bus } from '@ore/bus';
import { DispatchService } from './dispatch.service';

@Injectable()
export class DispatchConsumers {
  private readonly logger = new Logger('DispatchConsumers');

  constructor(
    @Inject(ORE_BUS) private readonly bus: Bus,
    private readonly dispatch: DispatchService,
    @Inject(ORE_DEDUPE) private readonly dedupe: ConsumerDedupe,
  ) {}

  async init(): Promise<void> {
    await this.bus.subscribe<OrderEventPayload>(EVENTS.ORDER_ACCEPTED, async (env) => {
      if (!(await this.take(env.id))) return;
      const prep = (env.payload.prepTimeMin as number) ?? 10;
      // The event already carries the vendor, so pass it and save `scheduleT5` an order lookup.
      await this.dispatch.scheduleT5(env.payload.orderId, prep, 0, env.payload.vendorId as string | undefined);
    });

    await this.bus.subscribe<OrderEventPayload>(EVENTS.ORDER_READY_FOR_PICKUP, async (env) => {
      if (!(await this.take(env.id))) return;
      // early-finish → dispatch after the grouping join window (G12 + doc §2)
      await this.dispatch.onReady(env.payload.orderId);
    });

    await this.bus.subscribe<OrderEventPayload & { newPrepTimeMin?: number; prepTimeMin?: number; extraMinutes?: number; reason?: string }>(EVENTS.ORDER_DELAYED, async (env) => {
      if (!(await this.take(env.id))) return;
      const newPrep = (env.payload.newPrepTimeMin as number | undefined) ?? (env.payload.prepTimeMin as number | undefined);
      const extra = (env.payload.extraMinutes as number) ?? 5;
      const prep = (env.payload.prepTimeMin as number) ?? 10;
      
      // Auto-split logic (doc §1.12 & §2.5): if a vendor delays by > 10 mins and it's in a batch, split it
      if (extra >= 10) {
        await this.dispatch.autoSplitIfBatched(env.payload.orderId, 'Vendor significantly delayed the order');
      }

      if (typeof newPrep === 'number') {
        await this.dispatch.scheduleT5(env.payload.orderId, newPrep, 0, env.payload.vendorId as string | undefined);
        return;
      }
      await this.dispatch.scheduleT5(env.payload.orderId, prep, extra, env.payload.vendorId as string | undefined);
    });

    await this.bus.subscribe<OrderEventPayload>(EVENTS.ORDER_CANCELLED, async (env) => {
      if (!(await this.take(env.id))) return;
      await this.dispatch.releaseForOrder(env.payload.orderId);
    });

    await this.bus.subscribe<OrderEventPayload>(EVENTS.ORDER_REJECTED, async (env) => {
      if (!(await this.take(env.id))) return;
      await this.dispatch.releaseForOrder(env.payload.orderId);
    });

    await this.bus.subscribe<OrderEventPayload>(EVENTS.ORDER_DELIVERED, async (env) => {
      if (!(await this.take(env.id))) return;
      await this.dispatch.onDelivered(env.payload.orderId);
    });

    await this.bus.subscribe<RiderLocationPayload>(EVENTS.TRACKING_RIDER_LOCATION, async (env) => {
      if (!(await this.take(env.id))) return;
      await this.dispatch.onRiderLocation(env.payload.riderId, env.payload.lat, env.payload.lng, env.payload.orderId);
    });

    // doc §5: the wallet engine (ledger) publishes COD control verdicts — apply to the rider
    await this.bus.subscribe<{
      riderId: string;
      codTier?: RiderCodTier;
      codStatus?: RiderCodStatus;
      codBlocked?: boolean;
      codBlockReason?: string | null;
    }>(EVENTS.RIDER_COD_STATUS_CHANGED, async (env) => {
      if (!(await this.take(env.id))) return;
      await this.dispatch.applyCodStatusEvent(env.payload);
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
}
