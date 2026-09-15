import { Role, createCommsThreadSchema } from '@ore/contracts';
import { JwtPayload } from '@ore/core';
import {
  extractSocketToken,
  queryTokensAllowed,
  isSupportStaff,
  normalizeMessageBody,
  supportSenderRole,
  viewerMayAccessOrder,
  viewerMayAccessSupportThread,
} from './comms.auth';

function user(partial: Partial<JwtPayload> & Pick<JwtPayload, 'sub' | 'role'>): JwtPayload {
  return { phone: '+233241234567', ...partial };
}

const order = { customerId: 'cust-1', vendorId: 'vend-1', riderId: 'rider-1' };

describe('extractSocketToken', () => {
  it('reads auth.token first', () => {
    expect(extractSocketToken({ auth: { token: '  abc  ' }, query: { token: 'nope' } })).toBe('abc');
  });

  it('reads a Bearer header', () => {
    expect(extractSocketToken({ headers: { authorization: 'Bearer jwt-here' } })).toBe('jwt-here');
  });

  it('returns null when nothing is present', () => {
    expect(extractSocketToken({})).toBeNull();
  });
});

describe('viewerMayAccessOrder', () => {
  it('allows the owning customer, assigned rider, vendor owner, and admin', () => {
    expect(viewerMayAccessOrder(user({ sub: 'cust-1', role: Role.CUSTOMER }), order)).toBe(true);
    expect(viewerMayAccessOrder(user({ sub: 'user-r', role: Role.RIDER }), order, { riderId: 'rider-1' })).toBe(true);
    expect(viewerMayAccessOrder(user({ sub: 'user-v', role: Role.VENDOR }), order, { vendorIds: ['vend-1'] })).toBe(true);
    expect(viewerMayAccessOrder(user({ sub: 'ops', role: Role.ADMIN }), order)).toBe(true);
  });

  it('rejects outsiders', () => {
    expect(viewerMayAccessOrder(user({ sub: 'cust-2', role: Role.CUSTOMER }), order)).toBe(false);
    expect(viewerMayAccessOrder(user({ sub: 'user-r', role: Role.RIDER }), order, { riderId: 'other' })).toBe(false);
    expect(viewerMayAccessOrder(user({ sub: 'user-v', role: Role.VENDOR }), order, { vendorIds: ['other'] })).toBe(false);
  });

  it('rejects an unassigned rider even when they have a dispatch profile', () => {
    expect(
      viewerMayAccessOrder(user({ sub: 'user-r', role: Role.RIDER }), { ...order, riderId: null }, { riderId: 'rider-1' }),
    ).toBe(false);
  });

  it('does not treat PARCEL/ERRAND vendor ids as a catalog vendor', () => {
    expect(
      viewerMayAccessOrder(user({ sub: 'user-v', role: Role.VENDOR }), { ...order, vendorId: 'PARCEL' }, { vendorIds: ['vend-1'] }),
    ).toBe(false);
    expect(viewerMayAccessOrder(user({ sub: 'cust-1', role: Role.CUSTOMER }), { ...order, vendorId: 'ERRAND' })).toBe(true);
  });
});

describe('viewerMayAccessSupportThread', () => {
  const thread = { ownerUserId: 'user-1' };

  it('allows the owner and admin, not a stranger', () => {
    expect(viewerMayAccessSupportThread(user({ sub: 'user-1', role: Role.CUSTOMER }), thread)).toBe(true);
    expect(viewerMayAccessSupportThread(user({ sub: 'user-1', role: Role.VENDOR }), thread)).toBe(true);
    expect(viewerMayAccessSupportThread(user({ sub: 'user-1', role: Role.RIDER }), thread)).toBe(true);
    expect(viewerMayAccessSupportThread(user({ sub: 'ops', role: Role.ADMIN }), thread)).toBe(true);
    expect(viewerMayAccessSupportThread(user({ sub: 'user-2', role: Role.CUSTOMER }), thread)).toBe(false);
    expect(viewerMayAccessSupportThread(user({ sub: 'user-2', role: Role.RIDER }), thread)).toBe(false);
  });

  it('rejects a thread with no owner even for a signed-in customer', () => {
    expect(viewerMayAccessSupportThread(user({ sub: 'user-1', role: Role.CUSTOMER }), { ownerUserId: null })).toBe(false);
    expect(viewerMayAccessSupportThread(user({ sub: 'ops', role: Role.ADMIN }), { ownerUserId: null })).toBe(true);
  });
});

describe('supportSenderRole', () => {
  it('stores admin replies on support threads as role support', () => {
    expect(supportSenderRole(user({ sub: 'ops', role: Role.ADMIN }), 'support')).toBe('support');
    expect(supportSenderRole(user({ sub: 'ops', role: Role.ADMIN }), 'order')).toBe(Role.ADMIN);
    expect(supportSenderRole(user({ sub: 'cust-1', role: Role.CUSTOMER }), 'support')).toBe(Role.CUSTOMER);
    expect(isSupportStaff(user({ sub: 'ops', role: Role.ADMIN }))).toBe(true);
    expect(isSupportStaff(user({ sub: 'cust-1', role: Role.CUSTOMER }))).toBe(false);
  });
});

describe('createCommsThreadSchema', () => {
  it('keeps orderId-only posts as an order thread', () => {
    expect(createCommsThreadSchema.parse({ orderId: 'ord-1' })).toEqual({ orderId: 'ord-1' });
  });

  it('accepts kind=support without an order id', () => {
    expect(createCommsThreadSchema.parse({ kind: 'support' })).toEqual({ kind: 'support' });
  });

  it('rejects an empty body and an order kind without orderId', () => {
    expect(() => createCommsThreadSchema.parse({})).toThrow();
    expect(() => createCommsThreadSchema.parse({ kind: 'order' })).toThrow();
  });
});

describe('normalizeMessageBody', () => {
  it('trims and rejects empty or oversized bodies', () => {
    expect(normalizeMessageBody('  hello  ')).toBe('hello');
    expect(normalizeMessageBody('   ')).toBeNull();
    expect(normalizeMessageBody('x'.repeat(2001))).toBeNull();
  });
});

describe('query-string tokens', () => {
  it('is refused in production', () => {
    expect(extractSocketToken({ query: { token: 'leaky' } }, false)).toBeNull();
  });

  it('is still accepted outside production', () => {
    expect(extractSocketToken({ query: { token: 'from-query' } }, true)).toBe('from-query');
  });

  it('does not disable the safe sources in production', () => {
    expect(extractSocketToken({ auth: { token: 'ok' } }, false)).toBe('ok');
    expect(extractSocketToken({ headers: { authorization: 'Bearer ok' } }, false)).toBe('ok');
  });

  it('follows NODE_ENV by default', () => {
    expect(queryTokensAllowed({ NODE_ENV: 'production' } as NodeJS.ProcessEnv)).toBe(false);
    expect(queryTokensAllowed({ NODE_ENV: 'staging' } as NodeJS.ProcessEnv)).toBe(true);
  });
});
