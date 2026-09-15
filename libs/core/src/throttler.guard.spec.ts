import { ExecutionContext } from '@nestjs/common';
import { INTERNAL_KEY_HEADER } from '@ore/config';
import { OreThrottlerGuard } from './throttler.guard';
import {
  INTERNAL_MAC_HEADER,
  INTERNAL_SERVICE_HEADER,
  INTERNAL_TS_HEADER,
  computeInternalMac,
} from './internal-auth';

/**
 * The rate-limit exemption for service-to-service traffic.
 *
 * It recognised only the legacy plaintext key, while `internalFetch` had already moved to
 * per-request MACs. That made turning `INTERNAL_LEGACY_KEY` off a platform-wide outage waiting
 * to happen: every internal call would stop being exempt at once, and since the services share
 * one egress IP they share one bucket, so the busiest service would 429 all the others. A
 * security cleanup would have looked like an infrastructure failure.
 */
describe('OreThrottlerGuard internal exemption', () => {
  const KEY = 'test-internal-key-0123456789';
  let guard: OreThrottlerGuard;
  let superCanActivate: jest.SpyInstance;

  const ctx = (headers: Record<string, string>, method = 'POST', url = '/internal/vendors/v1/prep-signals', body?: unknown): ExecutionContext =>
    ({ switchToHttp: () => ({ getRequest: () => ({ headers, method, url, body }) }) }) as unknown as ExecutionContext;

  const signed = (method: string, url: string, body?: unknown, service = 'dispatch') => {
    const ts = String(Date.now());
    return {
      [INTERNAL_MAC_HEADER]: computeInternalMac(KEY, method, url, body === undefined ? undefined : JSON.stringify(body), service, ts),
      [INTERNAL_TS_HEADER]: ts,
      [INTERNAL_SERVICE_HEADER]: service,
    };
  };

  beforeEach(() => {
    guard = new OreThrottlerGuard(
      { throttlers: [{ limit: 1, ttl: 60_000 }] } as never,
      {} as never,
      { getAllAndOverride: () => undefined } as never,
      { internalServiceKey: KEY } as never,
    );
    // The base ThrottlerGuard is what "not exempt" means; stub it so the test observes the
    // decision rather than the limiter's storage.
    superCanActivate = jest
      .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)) as { canActivate: () => Promise<boolean> }, 'canActivate')
      .mockResolvedValue(false);
  });

  afterEach(() => jest.restoreAllMocks());

  it('exempts a MAC-signed internal call', async () => {
    const url = '/internal/vendors/v1/prep-signals';
    const body = { a: 1 };

    await expect(guard.canActivate(ctx(signed('POST', url, body), 'POST', url, JSON.stringify(body)))).resolves.toBe(true);
    expect(superCanActivate).not.toHaveBeenCalled();
  });

  it('exempts a MAC-signed GET with no body', async () => {
    const url = '/internal/orders/o1/assignments';
    await expect(guard.canActivate(ctx(signed('GET', url), 'GET', url))).resolves.toBe(true);
  });

  it('still exempts the legacy plaintext key during the rolling deploy', async () => {
    await expect(guard.canActivate(ctx({ [INTERNAL_KEY_HEADER]: KEY }))).resolves.toBe(true);
  });

  it('throttles a forged MAC', async () => {
    const headers = signed('POST', '/internal/x');
    headers[INTERNAL_MAC_HEADER] = 'f'.repeat(64);

    await expect(guard.canActivate(ctx(headers))).resolves.toBe(false);
    expect(superCanActivate).toHaveBeenCalled();
  });

  it('throttles a MAC signed for a different path', async () => {
    // Otherwise one captured signature exempts every endpoint.
    const headers = signed('POST', '/internal/harmless');
    await expect(guard.canActivate(ctx(headers, 'POST', '/internal/payouts/release'))).resolves.toBe(false);
  });

  it('throttles a MAC whose timestamp is outside the skew window', async () => {
    const url = '/internal/x';
    const stale = String(Date.now() - 60 * 60_000);
    const headers = {
      [INTERNAL_MAC_HEADER]: computeInternalMac(KEY, 'POST', url, undefined, 'dispatch', stale),
      [INTERNAL_TS_HEADER]: stale,
      [INTERNAL_SERVICE_HEADER]: 'dispatch',
    };

    await expect(guard.canActivate(ctx(headers, 'POST', url))).resolves.toBe(false);
  });

  it('throttles a wrong plaintext key', async () => {
    await expect(guard.canActivate(ctx({ [INTERNAL_KEY_HEADER]: 'not-the-key' }))).resolves.toBe(false);
  });

  it('throttles ordinary public traffic', async () => {
    await expect(guard.canActivate(ctx({}))).resolves.toBe(false);
    expect(superCanActivate).toHaveBeenCalled();
  });
});
