import { Test } from '@nestjs/testing';
import { ORE_ENV } from '@ore/core';
import { Role } from '@ore/contracts';
import { TrackingGateway } from './tracking.gateway';
import { TrackingAccessService } from './tracking.access';

/**
 * Authorisation for a tracking socket used to be decided once, at `subscribe`, and never
 * revisited. But the facts it rests on change while the socket is open: riders get reassigned,
 * and access tokens expire. A rider taken off an order carried on receiving the live position of
 * the rider who replaced them until they happened to disconnect.
 */
describe('TrackingGateway — room revalidation', () => {
  let gateway: TrackingGateway;
  let access: { fetchOrder: jest.Mock; canView: jest.Mock };
  let sockets: Array<ReturnType<typeof makeSocket>>;

  const ORDER = { customerId: 'cust-1', vendorId: 'vend-1', riderId: 'rider-1' };

  const makeSocket = (sub: string, role: Role, exp?: number) => ({
    data: { user: { sub, role, phone: '233500000000', ...(exp ? { exp } : {}) } },
    emit: jest.fn(),
    leave: jest.fn(),
  });

  const server = () => ({
    in: jest.fn().mockReturnValue({ fetchSockets: jest.fn().mockResolvedValue(sockets) }),
    to: jest.fn().mockReturnValue({ emit: jest.fn() }),
  });

  beforeEach(async () => {
    sockets = [];
    access = {
      fetchOrder: jest.fn().mockResolvedValue(ORDER),
      canView: jest.fn().mockResolvedValue(true),
    };

    const module = await Test.createTestingModule({
      providers: [
        TrackingGateway,
        { provide: TrackingAccessService, useValue: access },
        { provide: ORE_ENV, useValue: { jwtSecret: 's', nodeEnv: 'test' } },
      ],
    }).compile();

    gateway = module.get(TrackingGateway);
    gateway.server = server() as never;
  });

  const advancePastThrottle = () => {
    (gateway as never as { lastRevalidated: Map<string, number> }).lastRevalidated.clear();
  };

  it('leaves a still-authorised viewer alone', async () => {
    sockets = [makeSocket('cust-1', Role.CUSTOMER)];
    gateway.server = server() as never;

    await gateway.revalidateRoom('order-1');

    expect(sockets[0].leave).not.toHaveBeenCalled();
  });

  it('evicts a rider who has been reassigned off the order', async () => {
    sockets = [makeSocket('user-old-rider', Role.RIDER)];
    gateway.server = server() as never;
    access.canView.mockResolvedValue(false);

    await gateway.revalidateRoom('order-1');

    expect(sockets[0].leave).toHaveBeenCalledWith('order:order-1');
  });

  it('tells the evicted socket why, instead of going quiet', async () => {
    sockets = [makeSocket('user-old-rider', Role.RIDER)];
    gateway.server = server() as never;
    access.canView.mockResolvedValue(false);

    await gateway.revalidateRoom('order-1');

    expect(sockets[0].emit).toHaveBeenCalledWith('error', {
      error: { code: 'FORBIDDEN', message: 'Access to this order has ended', statusCode: 403 },
    });
  });

  it('evicts only the viewer who lost access, not the whole room', async () => {
    const customer = makeSocket('cust-1', Role.CUSTOMER);
    const oldRider = makeSocket('user-old-rider', Role.RIDER);
    sockets = [customer, oldRider];
    gateway.server = server() as never;
    access.canView.mockImplementation(async (user: { sub: string }) => user.sub === 'cust-1');

    await gateway.revalidateRoom('order-1');

    expect(customer.leave).not.toHaveBeenCalled();
    expect(oldRider.leave).toHaveBeenCalled();
  });

  it('evicts a socket whose access token has expired', async () => {
    // The socket outlives the credential that opened it: a 15-minute token would otherwise buy
    // an hours-long subscription.
    sockets = [makeSocket('cust-1', Role.CUSTOMER, Math.floor(Date.now() / 1000) - 60)];
    gateway.server = server() as never;

    await gateway.revalidateRoom('order-1');

    expect(sockets[0].leave).toHaveBeenCalled();
  });

  it('keeps a socket whose token is still valid', async () => {
    sockets = [makeSocket('cust-1', Role.CUSTOMER, Math.floor(Date.now() / 1000) + 600)];
    gateway.server = server() as never;

    await gateway.revalidateRoom('order-1');

    expect(sockets[0].leave).not.toHaveBeenCalled();
  });

  it('evicts a socket with no authenticated user at all', async () => {
    const anon = makeSocket('x', Role.CUSTOMER);
    anon.data.user = undefined as never;
    sockets = [anon];
    gateway.server = server() as never;

    await gateway.revalidateRoom('order-1');

    expect(anon.leave).toHaveBeenCalled();
  });

  describe('when the order lookup fails', () => {
    it('does not evict anyone, because a failed fetch is not a revoked permission', async () => {
      // internalFetch returns null on a network error as readily as on a 404. Treating that as
      // "access denied" would empty every live tracking room whenever the order service hiccups.
      sockets = [makeSocket('cust-1', Role.CUSTOMER)];
      gateway.server = server() as never;
      access.fetchOrder.mockResolvedValue(null);

      await gateway.revalidateRoom('order-1');

      expect(sockets[0].leave).not.toHaveBeenCalled();
    });

    it('still enforces token expiry', async () => {
      sockets = [makeSocket('cust-1', Role.CUSTOMER, Math.floor(Date.now() / 1000) - 60)];
      gateway.server = server() as never;
      access.fetchOrder.mockResolvedValue(null);

      await gateway.revalidateRoom('order-1');

      expect(sockets[0].leave).toHaveBeenCalled();
    });
  });

  describe('throttling', () => {
    it('does not re-check on every position ping', async () => {
      // Rider locations arrive every few seconds; one internal lookup per ping per order would
      // multiply tracking traffic by the size of every room.
      sockets = [makeSocket('cust-1', Role.CUSTOMER)];
      gateway.server = server() as never;

      await gateway.revalidateRoom('order-1');
      await gateway.revalidateRoom('order-1');
      await gateway.revalidateRoom('order-1');

      expect(access.fetchOrder).toHaveBeenCalledTimes(1);
    });

    it('re-checks again once the interval has passed', async () => {
      sockets = [makeSocket('cust-1', Role.CUSTOMER)];
      gateway.server = server() as never;

      await gateway.revalidateRoom('order-1');
      advancePastThrottle();
      await gateway.revalidateRoom('order-1');

      expect(access.fetchOrder).toHaveBeenCalledTimes(2);
    });

    it('throttles each order separately', async () => {
      sockets = [makeSocket('cust-1', Role.CUSTOMER)];
      gateway.server = server() as never;

      await gateway.revalidateRoom('order-1');
      await gateway.revalidateRoom('order-2');

      expect(access.fetchOrder).toHaveBeenCalledTimes(2);
    });

    it('forgets empty rooms so the throttle map does not grow forever', async () => {
      sockets = [];
      gateway.server = server() as never;

      await gateway.revalidateRoom('order-1');

      const tracked = (gateway as never as { lastRevalidated: Map<string, number> }).lastRevalidated;
      expect(tracked.has('order-1')).toBe(false);
    });

    it('skips the order lookup entirely when nobody is listening', async () => {
      sockets = [];
      gateway.server = server() as never;

      await gateway.revalidateRoom('order-1');

      expect(access.fetchOrder).not.toHaveBeenCalled();
    });
  });

  describe('emitToOrder', () => {
    it('still delivers the payload', () => {
      sockets = [makeSocket('cust-1', Role.CUSTOMER)];
      const srv = server();
      gateway.server = srv as never;

      gateway.emitToOrder('order-1', 'rider.location', { lat: 5.6, lng: -0.2 });

      expect(srv.to).toHaveBeenCalledWith('order:order-1');
    });

    it('does not make callers wait on the revalidation round trip', () => {
      // Position updates are the hot path; blocking each one on two internal HTTP calls would
      // trade a security fix for a latency regression.
      sockets = [makeSocket('cust-1', Role.CUSTOMER)];
      gateway.server = server() as never;

      expect(gateway.emitToOrder('order-1', 'rider.location', {})).toBeUndefined();
    });
  });
});
