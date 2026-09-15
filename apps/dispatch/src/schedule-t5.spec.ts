import { OrderStatus } from '@ore/contracts';
import { buildDispatchHarness, makeOrderSnapshot, DispatchHarness } from './dispatch-test-harness';

/**
 * The prep-time trigger, and the event race it used to lose.
 *
 * `order.accepted` and `order.ready_for_pickup` travel on two independent NATS consumers, so
 * nothing orders them relative to each other. `scheduleT5` (the accepted handler) is the slow
 * one — it makes an HTTP call to catalog for live prep signals before doing anything — while
 * `onReady` is nearly instant. A vendor who accepts and immediately marks an order ready
 * therefore reliably lands the two handlers in the wrong order.
 *
 * The old code responded by cancelling `JOB_READY` unconditionally and installing a prep-time
 * timer in its place. Observed on a live stack: an order marked ready at 00:07:55 had its
 * dispatch job created and then removed 7 ms later, replaced by a timer 9 minutes out. No rider
 * was ever offered the order, and nothing anywhere logged a problem.
 */
describe('DispatchService.scheduleT5 — event-order race', () => {
  let h: DispatchHarness;

  const scheduleT5 = (orderId = 'order-1', prep = 14) =>
    (h.service as never as { scheduleT5: Function }).scheduleT5(orderId, prep) as Promise<void>;

  const orderIs = (status: OrderStatus) =>
    jest.spyOn(h.service as never, 'fetchOrder' as never).mockResolvedValue(
      makeOrderSnapshot({ status }) as never,
    );

  beforeEach(async () => {
    h = await buildDispatchHarness();
    h.audit.save.mockImplementation(async (a: unknown) => a);
    h.audit.create.mockImplementation((a: unknown) => a);
    // Keep the estimate static; the adjustment itself is covered elsewhere.
    jest.spyOn(h.service as never, 'adjustedPrepTime' as never).mockResolvedValue({
      estimatedPrepTimeMin: 14,
      queueMinutes: 0,
      stressMinutes: 0,
      reason: 'static',
    } as never);
  });

  afterEach(async () => {
    await h.module.close();
    jest.restoreAllMocks();
  });

  const auditTypes = () => h.audit.save.mock.calls.map((c: unknown[]) => (c[0] as { eventType: string }).eventType);

  describe('while the kitchen is still cooking, it schedules as before', () => {
    it.each([OrderStatus.CONFIRMED, OrderStatus.ACCEPTED, OrderStatus.PREPARING])(
      'schedules the trigger when the order is %s',
      async (status) => {
        orderIs(status);

        await scheduleT5();

        expect(h.scheduler.schedule).toHaveBeenCalledWith(
          'dispatch-t5',
          { orderId: 'order-1' },
          expect.any(Number),
          'dispatch-t5-order-1',
        );
        expect(auditTypes()).toContain('dispatch_trigger_scheduled');
      },
    );

    it('still clears a stale ready job when it does schedule', async () => {
      orderIs(OrderStatus.PREPARING);

      await scheduleT5();

      expect(h.scheduler.cancel).toHaveBeenCalledWith('dispatch-ready-order-1');
      expect(h.scheduler.cancel).toHaveBeenCalledWith('dispatch-t5-order-1');
    });

    it('schedules anyway when the order cannot be read', async () => {
      // An unreachable order service must not stop an order being dispatched — an unscheduled
      // order is a lost order, which is strictly worse than a redundant timer.
      jest.spyOn(h.service as never, 'fetchOrder' as never).mockRejectedValue(new Error('down') as never);

      await scheduleT5();

      expect(h.scheduler.schedule).toHaveBeenCalledWith('dispatch-t5', { orderId: 'order-1' }, expect.any(Number), 'dispatch-t5-order-1');
    });
  });

  describe('once the order has moved on, a late accepted event must not undo it', () => {
    it.each([
      OrderStatus.READY_FOR_PICKUP,
      OrderStatus.WAITING_FOR_RIDER,
      OrderStatus.RIDER_ASSIGNED,
      OrderStatus.PICKED_UP,
      OrderStatus.DELIVERED,
      OrderStatus.CANCELLED,
    ])('does not cancel the pending dispatch when the order is already %s', async (status) => {
      orderIs(status);

      await scheduleT5();

      // The regression: this used to cancel `dispatch-ready-order-1`, killing an imminent
      // dispatch, and then install a 9-minute timer in its place.
      expect(h.scheduler.cancel).not.toHaveBeenCalled();
      expect(h.scheduler.schedule).not.toHaveBeenCalled();
    });

    it('records why it stood down, so the decision is visible', async () => {
      orderIs(OrderStatus.READY_FOR_PICKUP);

      await scheduleT5();

      expect(auditTypes()).toContain('dispatch_trigger_skipped');
      const skipped = h.audit.save.mock.calls
        .map((c: unknown[]) => c[0] as { eventType: string; detailJson: Record<string, unknown> })
        .find((a) => a.eventType === 'dispatch_trigger_skipped');
      expect(skipped!.detailJson).toMatchObject({ status: OrderStatus.READY_FOR_PICKUP });
    });

    it('re-reads the order after the prep-signal call, not before it', async () => {
      // The whole race lives inside that HTTP call: the order is CONFIRMED when the handler
      // starts and READY_FOR_PICKUP by the time it returns. Checking the status first would
      // reproduce the bug exactly.
      const fetchOrder = jest
        .spyOn(h.service as never, 'fetchOrder' as never)
        .mockResolvedValue(makeOrderSnapshot({ status: OrderStatus.CONFIRMED }) as never);

      jest.spyOn(h.service as never, 'adjustedPrepTime' as never).mockImplementation((async () => {
        // the vendor marks it ready mid-flight
        fetchOrder.mockResolvedValue(makeOrderSnapshot({ status: OrderStatus.READY_FOR_PICKUP }) as never);
        return { estimatedPrepTimeMin: 14, queueMinutes: 0, stressMinutes: 0, reason: 'static' };
      }) as never);

      await scheduleT5();

      expect(h.scheduler.schedule).not.toHaveBeenCalled();
      expect(auditTypes()).toContain('dispatch_trigger_skipped');
    });
  });
});
