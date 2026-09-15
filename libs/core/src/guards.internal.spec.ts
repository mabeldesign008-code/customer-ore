import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard, Internal } from './guards';
import { computeInternalMac, INTERNAL_MAC_HEADER, INTERNAL_SERVICE_HEADER, INTERNAL_TS_HEADER } from './internal-auth';
import { INTERNAL_KEY_HEADER } from '@ore/config';
import type { OreEnv } from '@ore/config';

/**
 * The MAC scheme exists so the shared internal key never crosses the wire. While the plaintext
 * fallback is accepted, that benefit is nil — the key is still sent on every internal call and
 * still honoured, so anything that captures one header gets what opens every internal API in the
 * cluster. The fallback is a rolling-deploy shim; it needs a way to be switched off, and a way
 * for an operator to know when that is safe.
 */
describe('AuthGuard — internal authentication', () => {
  const KEY = 'shared-internal-key';

  const env = (over: Partial<OreEnv> = {}): OreEnv =>
    ({
      internalServiceKey: KEY,
      internalCallerAllowlist: [],
      internalLegacyKeyAccepted: true,
      ...over,
    }) as OreEnv;

  const ctx = (headers: Record<string, string>, method = 'POST', url = '/internal/orders', body: unknown = { a: 1 }) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ headers, method, url, body }) }),
      getHandler: () => Internal,
      getClass: () => class {},
    }) as unknown as ExecutionContext;

  const reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;

  const macHeaders = (method = 'POST', url = '/internal/orders', body: unknown = { a: 1 }, service = 'order') => {
    const ts = String(Date.now());
    return {
      [INTERNAL_MAC_HEADER]: computeInternalMac(KEY, method, url, body, service, ts),
      [INTERNAL_TS_HEADER]: ts,
      [INTERNAL_SERVICE_HEADER]: service,
    };
  };

  beforeEach(() => {
    (reflector.getAllAndOverride as jest.Mock).mockReset();
    // isPublic → false, isInternal → true
    (reflector.getAllAndOverride as jest.Mock).mockReturnValueOnce(false).mockReturnValueOnce(true);
    (AuthGuard as never as { legacyWarned: Set<string> }).legacyWarned.clear();
    jest.spyOn((AuthGuard as never as { legacyLogger: { warn: jest.Mock } }).legacyLogger, 'warn')
      .mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('accepts a valid MAC', async () => {
    const guard = new AuthGuard(reflector, env());
    await expect(guard.canActivate(ctx(macHeaders()))).resolves.toBe(true);
  });

  it('accepts the legacy plaintext key while the shim is on', async () => {
    const guard = new AuthGuard(reflector, env());
    await expect(guard.canActivate(ctx({ [INTERNAL_KEY_HEADER]: KEY }))).resolves.toBe(true);
  });

  it('rejects the legacy plaintext key once the shim is off', async () => {
    const guard = new AuthGuard(reflector, env({ internalLegacyKeyAccepted: false }));
    await expect(guard.canActivate(ctx({ [INTERNAL_KEY_HEADER]: KEY }))).rejects.toThrow('Invalid internal service key');
  });

  it('still accepts a MAC when the shim is off — that is the whole point', async () => {
    const guard = new AuthGuard(reflector, env({ internalLegacyKeyAccepted: false }));
    await expect(guard.canActivate(ctx(macHeaders()))).resolves.toBe(true);
  });

  it('warns, naming the caller, when the legacy key is used', async () => {
    const warn = jest.spyOn((AuthGuard as never as { legacyLogger: { warn: jest.Mock } }).legacyLogger, 'warn');
    const guard = new AuthGuard(reflector, env());

    await guard.canActivate(ctx({ [INTERNAL_KEY_HEADER]: KEY, [INTERNAL_SERVICE_HEADER]: 'cart' }));

    // Without this signal there is no way to learn whether the shim is safe to turn off, so it
    // never gets turned off.
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('cart'));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('INTERNAL_LEGACY_KEY=off'));
  });

  it('warns once per caller, not once per request', async () => {
    const warn = jest.spyOn((AuthGuard as never as { legacyLogger: { warn: jest.Mock } }).legacyLogger, 'warn');
    const guard = new AuthGuard(reflector, env());
    const headers = { [INTERNAL_KEY_HEADER]: KEY, [INTERNAL_SERVICE_HEADER]: 'cart' };

    for (let i = 0; i < 3; i++) {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValueOnce(false).mockReturnValueOnce(true);
      await guard.canActivate(ctx(headers));
    }

    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('does not warn when the caller used a MAC', async () => {
    const warn = jest.spyOn((AuthGuard as never as { legacyLogger: { warn: jest.Mock } }).legacyLogger, 'warn');
    const guard = new AuthGuard(reflector, env());

    await guard.canActivate(ctx({ ...macHeaders(), [INTERNAL_KEY_HEADER]: KEY }));

    // The sender still ships the legacy key for compatibility. Warning on its mere presence
    // would fire for every already-migrated caller and drown the signal that matters.
    expect(warn).not.toHaveBeenCalled();
  });

  it('rejects a wrong key', async () => {
    const guard = new AuthGuard(reflector, env());
    await expect(guard.canActivate(ctx({ [INTERNAL_KEY_HEADER]: 'wrong' }))).rejects.toThrow('Invalid internal service key');
  });

  it('rejects a MAC computed over a different body', async () => {
    const guard = new AuthGuard(reflector, env({ internalLegacyKeyAccepted: false }));
    const headers = macHeaders('POST', '/internal/orders', { a: 1 });

    await expect(guard.canActivate(ctx(headers, 'POST', '/internal/orders', { a: 999 })))
      .rejects.toThrow('Invalid internal service key');
  });

  it('rejects a request with no internal credentials at all', async () => {
    const guard = new AuthGuard(reflector, env());
    await expect(guard.canActivate(ctx({}))).rejects.toThrow('Invalid internal service key');
  });

  it('enforces the caller allowlist on top of a valid MAC', async () => {
    const guard = new AuthGuard(reflector, env({ internalCallerAllowlist: ['ledger'] }));
    await expect(guard.canActivate(ctx(macHeaders('POST', '/internal/orders', { a: 1 }, 'order'))))
      .rejects.toThrow('Internal caller not allowed');
  });

  it('lets an allowlisted caller through', async () => {
    const guard = new AuthGuard(reflector, env({ internalCallerAllowlist: ['order'] }));
    await expect(guard.canActivate(ctx(macHeaders('POST', '/internal/orders', { a: 1 }, 'order')))).resolves.toBe(true);
  });
});
