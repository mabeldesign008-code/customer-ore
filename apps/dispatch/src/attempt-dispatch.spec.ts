import { OrderStatus, OfferStatus, PaymentMethod, OrderType } from '@ore/contracts';
import { buildDispatchHarness, makeOrderSnapshot, DispatchHarness } from './dispatch-test-harness';

/**
 * The dispatch entry point: the guards that stop an order being offered twice, and the
 * radius-expansion retry loop that widens the search when nobody is near.
 *
 * These guards are the difference between one rider being offered an order and five riders
 * being offered the same order, so they are worth pinning down explicitly.
 */
describe('DispatchService.attemptDispatch', () => {
  let h: DispatchHarness;

  const attempt = (orderId = 'order-1', n = 0) =>
    (h.service as never as { attemptDispatch: Function }).attemptDispatch(orderId, n) as Promise<void>;

  /** Wire up the happy path: order exists, nothing assigned, no wave out, nobody in range. */
  const arrange = (order: unknown = makeOrderSnapshot({ status: OrderStatus.READY_FOR_PICKUP })) => {
    jest.spyOn(h.service as never, 'fetchOrder' as never).mockResolvedValue(order as never);
    jest.spyOn(h.service as never, 'fetchVendor' as never).mockResolvedValue({ id: 'vendor-1', lat: 5.6, lng: -0.18 } as never);
    h.assignments.findOne.mockResolvedValue(null);
    h.offers.findOne.mockResolvedValue(null);
    h.audit.save.mockImplementation(async (a: unknown) => a);
    h.audit.create.mockImplementation((a: unknown) => a);
    // Grouping queries other services over HTTP; default it to "nothing to group with" so each
    // test opts in to grouping explicitly rather than hitting the network.
    jest.spyOn(h.service as never, 'findGroupFor' as never).mockResolvedValue(null as never);
    jest.spyOn(h.service as never, 'computeAndPersistRiderFee' as never).mockResolvedValue({ fee: 800, peak: 0 } as never);
  };

  const poolOf = (n: number) => jest.spyOn(h.service as never, 'buildPool' as never).mockResolvedValue(
    Array.from({ length: n }, (_, i) => ({ rider: { id: `r${i}` }, distanceKm: 1, score: 1 })) as never,
  );

  beforeEach(async () => {
    h = await buildDispatchHarness();
    h.assignments.find.mockResolvedValue([]);
  });

  afterEach(async () => {
    await h.module.close();
    jest.restoreAllMocks();
  });

  describe('guards — an order must not be dispatched twice', () => {
    it('does nothing when the order cannot be fetched', async () => {
      jest.spyOn(h.service as never, 'fetchOrder' as never).mockRejectedValue(new Error('order service down') as never);
      const pool = poolOf(1);

      await attempt();

      expect(pool).not.toHaveBeenCalled();
    });

    it.each([
      OrderStatus.DELIVERED,
      OrderStatus.CANCELLED,
      OrderStatus.PENDING_PAYMENT,
    ])('does nothing when the order is %s', async (status) => {
      arrange(makeOrderSnapshot({ status }));
      const pool = poolOf(1);

      await attempt();

      expect(pool).not.toHaveBeenCalled();
    });

    it.each([
      OrderStatus.READY_FOR_PICKUP,
      OrderStatus.WAITING_FOR_RIDER,
      OrderStatus.CONFIRMED,
      OrderStatus.PREPARING,
    ])('proceeds when the order is %s', async (status) => {
      arrange(makeOrderSnapshot({ status }));
      const pool = poolOf(0);

      await attempt();

      expect(pool).toHaveBeenCalled();
    });

    it('does nothing when the order already has an active assignment', async () => {
      arrange();
      h.assignments.findOne.mockResolvedValue({ id: 'a1', orderId: 'order-1', status: 'ACTIVE' });
      const pool = poolOf(1);

      await attempt();

      expect(pool).not.toHaveBeenCalled();
    });

    it('does nothing when a wave of offers is already out', async () => {
      arrange();
      h.offers.findOne.mockResolvedValue({ id: 'o1', orderId: 'order-1', status: OfferStatus.PENDING });
      const pool = poolOf(1);

      await attempt();

      expect(pool).not.toHaveBeenCalled();
    });
  });

  describe('grouping', () => {
    it('is only tried on the first attempt, never on a retry', async () => {
      arrange();
      poolOf(0);
      const group = jest.spyOn(h.service as never, 'findGroupFor' as never).mockResolvedValue(null as never);

      await attempt('order-1', 1);
      expect(group).not.toHaveBeenCalled();

      await attempt('order-1', 0);
      expect(group).toHaveBeenCalled();
    });

    it('is skipped for errands, which are always dispatched solo', async () => {
      arrange(makeOrderSnapshot({ status: OrderStatus.READY_FOR_PICKUP, orderType: OrderType.ERRAND }));
      poolOf(0);
      const group = jest.spyOn(h.service as never, 'findGroupFor' as never).mockResolvedValue(null as never);

      await attempt();

      expect(group).not.toHaveBeenCalled();
    });

    it('stops after a successful group dispatch instead of also dispatching solo', async () => {
      arrange();
      const pool = poolOf(1);
      jest.spyOn(h.service as never, 'findGroupFor' as never)
        .mockResolvedValue({ orderIds: ['order-1', 'order-2'], type: 'MULTI_ORDER' } as never);
      jest.spyOn(h.service as never, 'dispatchGroup' as never).mockResolvedValue(true as never);

      await attempt();

      expect(pool).not.toHaveBeenCalled();
    });

    it('falls through to solo dispatch when the group dispatch fails', async () => {
      arrange();
      const pool = poolOf(0);
      jest.spyOn(h.service as never, 'findGroupFor' as never)
        .mockResolvedValue({ orderIds: ['order-1', 'order-2'], type: 'MULTI_ORDER' } as never);
      jest.spyOn(h.service as never, 'dispatchGroup' as never).mockResolvedValue(false as never);

      await attempt();

      expect(pool).toHaveBeenCalled();
    });

    it('does not group a single-order "group"', async () => {
      arrange();
      const pool = poolOf(0);
      jest.spyOn(h.service as never, 'findGroupFor' as never)
        .mockResolvedValue({ orderIds: ['order-1'], type: 'MULTI_ORDER' } as never);
      const dispatchGroup = jest.spyOn(h.service as never, 'dispatchGroup' as never);

      await attempt();

      expect(dispatchGroup).not.toHaveBeenCalled();
      expect(pool).toHaveBeenCalled();
    });
  });

  describe('empty pool — radius expansion and retry', () => {
    it('tells the customer we are still looking, rather than failing silently', async () => {
      arrange();
      poolOf(0);

      await attempt();

      expect(h.bus.publish).toHaveBeenCalledWith(
        expect.stringContaining('waiting_for_rider'),
        expect.objectContaining({ orderId: 'order-1', status: OrderStatus.WAITING_FOR_RIDER }),
      );
    });

    it('schedules a retry at the next attempt number', async () => {
      arrange();
      poolOf(0);

      await attempt('order-1', 0);

      expect(h.scheduler.schedule).toHaveBeenCalledWith(
        'dispatch-retry',
        { orderId: 'order-1', attempt: 1 },
        expect.any(Number),
        expect.any(String),
      );
    });

    it('widens the search radius on each successive attempt', async () => {
      arrange();
      const pool = poolOf(0);

      await attempt('order-1', 0);
      await attempt('order-1', 1);
      await attempt('order-1', 2);

      const radii = pool.mock.calls.map((c) => c[2] as number);
      expect(radii[1]).toBeGreaterThan(radii[0]);
      expect(radii[2]).toBeGreaterThan(radii[1]);
    });

    it('stops widening at the configured maximum', async () => {
      arrange();
      const pool = poolOf(0);

      await attempt('order-1', 500);

      const radius = pool.mock.calls[0][2] as number;
      const max = (h.service as never as { maxRadiusKm: () => number }).maxRadiusKm();
      expect(radius).toBe(max);
    });

    it('stops retrying once the radius is maxed out, rather than looping forever', async () => {
      arrange();
      poolOf(0);

      await attempt('order-1', 500);

      expect(h.scheduler.schedule).not.toHaveBeenCalled();
    });

    it('records the expansion so an unfilled order can be explained afterwards', async () => {
      arrange();
      poolOf(0);

      await attempt('order-1', 2);

      expect(h.audit.save).toHaveBeenCalled();
    });
  });

  describe('COD orders', () => {
    it('tells buildPool to apply COD rules', async () => {
      arrange(makeOrderSnapshot({ status: OrderStatus.READY_FOR_PICKUP, paymentMethod: PaymentMethod.COD }));
      const pool = poolOf(0);

      await attempt();

      expect(pool.mock.calls[0][3]).toBe(true);
    });

    it('does not apply COD rules to a prepaid order', async () => {
      arrange();
      const pool = poolOf(0);

      await attempt();

      expect(pool.mock.calls[0][3]).toBe(false);
    });
  });
});
