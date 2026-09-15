import { Test } from '@nestjs/testing';
import { ORE_ENV } from '@ore/core';
import { Role } from '@ore/contracts';
import { CommsGateway } from './comms.gateway';
import { CommsService } from './comms.service';

/**
 * Same defect as the tracking gateway, with a sharper edge: thread membership is derived from
 * the order's *current* rider, so a rider reassigned off an order kept receiving the customer's
 * chat messages — the bodies, not just metadata — for a delivery that was no longer theirs.
 */
describe('CommsGateway — room revalidation', () => {
  let gateway: CommsGateway;
  let comms: { findThread: jest.Mock; canAccessThread: jest.Mock };
  let sockets: Array<ReturnType<typeof makeSocket>>;

  const THREAD = { id: 'thread-1', orderId: 'order-1', kind: 'ORDER', riderId: 'rider-1' };

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
    comms = {
      findThread: jest.fn().mockResolvedValue(THREAD),
      canAccessThread: jest.fn().mockResolvedValue(true),
    };

    const module = await Test.createTestingModule({
      providers: [
        CommsGateway,
        { provide: CommsService, useValue: comms },
        { provide: ORE_ENV, useValue: { jwtSecret: 's', nodeEnv: 'test' } },
      ],
    }).compile();

    gateway = module.get(CommsGateway);
    gateway.server = server() as never;
  });

  it('leaves a still-authorised participant alone', async () => {
    sockets = [makeSocket('cust-1', Role.CUSTOMER)];
    gateway.server = server() as never;

    await gateway.revalidateRoom('thread-1');

    expect(sockets[0].leave).not.toHaveBeenCalled();
  });

  it('evicts a rider reassigned off the order behind the thread', async () => {
    sockets = [makeSocket('user-old-rider', Role.RIDER)];
    gateway.server = server() as never;
    comms.canAccessThread.mockResolvedValue(false);

    await gateway.revalidateRoom('thread-1');

    expect(sockets[0].leave).toHaveBeenCalledWith('thread:thread-1');
    expect(sockets[0].emit).toHaveBeenCalledWith('error', {
      error: { code: 'FORBIDDEN', message: 'Access to this thread has ended', statusCode: 403 },
    });
  });

  it('keeps the customer in their own thread when the rider changes', async () => {
    const customer = makeSocket('cust-1', Role.CUSTOMER);
    const oldRider = makeSocket('user-old-rider', Role.RIDER);
    sockets = [customer, oldRider];
    gateway.server = server() as never;
    comms.canAccessThread.mockImplementation(async (user: { sub: string }) => user.sub === 'cust-1');

    await gateway.revalidateRoom('thread-1');

    expect(customer.leave).not.toHaveBeenCalled();
    expect(oldRider.leave).toHaveBeenCalled();
  });

  it('evicts a socket whose token has expired', async () => {
    sockets = [makeSocket('cust-1', Role.CUSTOMER, Math.floor(Date.now() / 1000) - 1)];
    gateway.server = server() as never;

    await gateway.revalidateRoom('thread-1');

    expect(sockets[0].leave).toHaveBeenCalled();
  });

  it('does not empty the room when the thread lookup fails', async () => {
    sockets = [makeSocket('cust-1', Role.CUSTOMER)];
    gateway.server = server() as never;
    comms.findThread.mockResolvedValue(null);

    await gateway.revalidateRoom('thread-1');

    expect(sockets[0].leave).not.toHaveBeenCalled();
  });

  it('throttles repeat checks on a busy thread', async () => {
    sockets = [makeSocket('cust-1', Role.CUSTOMER)];
    gateway.server = server() as never;

    await gateway.revalidateRoom('thread-1');
    await gateway.revalidateRoom('thread-1');

    expect(comms.findThread).toHaveBeenCalledTimes(1);
  });

  it('forgets empty rooms', async () => {
    sockets = [];
    gateway.server = server() as never;

    await gateway.revalidateRoom('thread-1');

    const tracked = (gateway as never as { lastRevalidated: Map<string, number> }).lastRevalidated;
    expect(tracked.has('thread-1')).toBe(false);
  });

  it('still delivers messages', () => {
    sockets = [makeSocket('cust-1', Role.CUSTOMER)];
    const srv = server();
    gateway.server = srv as never;

    gateway.emitToThread('thread-1', 'message', { body: 'on my way' });

    expect(srv.to).toHaveBeenCalledWith('thread:thread-1');
  });
});
