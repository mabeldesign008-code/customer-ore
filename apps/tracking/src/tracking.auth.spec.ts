import { Role } from '@ore/contracts';
import { JwtPayload } from '@ore/core';
import { extractSocketToken, queryTokensAllowed, viewerMayAccessOrder } from './tracking.auth';

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

  it('reads query.token when query tokens are allowed', () => {
    // The flag is passed explicitly rather than left to its default: nx loads the workspace
    // .env into every task's environment, and that file legitimately sets NODE_ENV=production,
    // so the process default here depends on how the suite was launched. This test is about
    // extraction, not about the environment gate — the gate has its own describe block below.
    expect(extractSocketToken({ query: { token: 'from-query' } }, true)).toBe('from-query');
  });

  it('returns null when nothing is present', () => {
    expect(extractSocketToken({})).toBeNull();
  });
});

describe('viewerMayAccessOrder', () => {
  it('allows the owning customer', () => {
    expect(viewerMayAccessOrder(user({ sub: 'cust-1', role: Role.CUSTOMER }), order)).toBe(true);
  });

  it('rejects another customer', () => {
    expect(viewerMayAccessOrder(user({ sub: 'cust-2', role: Role.CUSTOMER }), order)).toBe(false);
  });

  it('allows the assigned rider after Dispatch id resolution', () => {
    expect(viewerMayAccessOrder(user({ sub: 'user-r', role: Role.RIDER }), order, { riderId: 'rider-1' })).toBe(true);
  });

  it('rejects a rider who is not assigned', () => {
    expect(viewerMayAccessOrder(user({ sub: 'user-r', role: Role.RIDER }), order, { riderId: 'other' })).toBe(false);
  });

  it('allows the vendor owner', () => {
    expect(viewerMayAccessOrder(user({ sub: 'user-v', role: Role.VENDOR }), order, { vendorIds: ['vend-1'] })).toBe(true);
  });

  it('rejects a vendor who does not own the shop', () => {
    expect(viewerMayAccessOrder(user({ sub: 'user-v', role: Role.VENDOR }), order, { vendorIds: ['other'] })).toBe(false);
  });

  it('allows admin regardless of ownership', () => {
    expect(viewerMayAccessOrder(user({ sub: 'ops', role: Role.ADMIN }), order)).toBe(true);
  });
});

describe('query-string tokens', () => {
  it('is refused in production', () => {
    // A token in a query string is a token in places nobody audits: access logs, Referer,
    // CDN and proxy logs, browser history, error trackers. These are 30-day JWTs, so one log
    // export is a month of impersonation for everyone in it.
    expect(extractSocketToken({ query: { token: 'leaky' } }, false)).toBeNull();
  });

  it('is still accepted outside production, where it is a debugging convenience', () => {
    expect(extractSocketToken({ query: { token: 'from-query' } }, true)).toBe('from-query');
  });

  it('does not disable the safe sources in production', () => {
    expect(extractSocketToken({ auth: { token: 'ok' } }, false)).toBe('ok');
    expect(extractSocketToken({ headers: { authorization: 'Bearer ok' } }, false)).toBe('ok');
  });

  it('follows NODE_ENV by default', () => {
    expect(queryTokensAllowed({ NODE_ENV: 'production' } as NodeJS.ProcessEnv)).toBe(false);
    expect(queryTokensAllowed({ NODE_ENV: 'test' } as NodeJS.ProcessEnv)).toBe(true);
    // Unset must not read as production — but it must not read as *safe* either; the risk of an
    // unset NODE_ENV is a dev machine, not a deployment, which sets it explicitly.
    expect(queryTokensAllowed({} as NodeJS.ProcessEnv)).toBe(true);
  });
});
