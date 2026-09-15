import { INTERNAL_TRUST_HEADERS, isCacheablePath, isInternalPath, isMediaUploadPath } from './edge-guards';

/**
 * Regression tests for the two defects that together exposed the entire internal API
 * through the public gateway (audit F-SEC-21 and F-SEC-22).
 *
 * The exploit, verified live against the running stack before the fix:
 *
 *   curl -H 'x-ore-internal-key: <key>' \
 *        'http://gateway:4000/api/auth/%69nternal/approvals/cap'   -> 200
 *
 * `%69` is 'i'. The edge tested the raw URL for the substring '/internal', found none,
 * and proxied the request; the downstream Fastify router then decoded the path and
 * matched the internal handler. The forged trust header rode along untouched.
 */
describe('edge trust boundary', () => {
  describe('isInternalPath — percent-encoding must not bypass the block (F-SEC-21)', () => {
    it('blocks the plain internal path', () => {
      expect(isInternalPath('/api/auth/internal/approvals/cap')).toBe(true);
    });

    // These are the ones that got through before the fix.
    it.each([
      ['leading char encoded', '/api/auth/%69nternal/approvals/cap'],
      ['middle char encoded', '/api/auth/inter%6eal/approvals/cap'],
      ['uppercase escape', '/api/auth/%49nternal/approvals/cap'],
      ['whole segment encoded', '/api/auth/%69%6e%74%65%72%6e%61%6c/approvals/cap'],
      ['double-encoded', '/api/auth/%2569nternal/approvals/cap'],
      ['encoded separator', '/api/auth/x/..%2finternal/approvals/cap'],
      ['case variation', '/api/auth/INTERNAL/approvals/cap'],
      ['mixed case', '/api/auth/InTeRnAl/approvals/cap'],
      ['backslash separator', '\\api\\auth\\internal\\approvals\\cap'],
      ['deep in the path', '/api/payment/payments/internal/transfers'],
    ])('blocks %s', (_label, path) => {
      expect(isInternalPath(path)).toBe(true);
    });

    it('treats malformed percent-encoding as hostile rather than ignoring it', () => {
      // decodeURIComponent throws on these; we must not fall through to "allowed".
      expect(isInternalPath('/api/auth/%zz/internal')).toBe(true);
      expect(isInternalPath('/api/auth/%')).toBe(true);
    });

    it('allows ordinary public paths', () => {
      expect(isInternalPath('/api/catalog/vendors')).toBe(false);
      expect(isInternalPath('/api/auth/admin/approvals')).toBe(false);
      expect(isInternalPath('/api/order/orders/123')).toBe(false);
      expect(isInternalPath('/health')).toBe(false);
    });

    it('matches a path segment, not a substring, so legitimate names survive', () => {
      // The old substring test would have 404'd all of these. Segment matching is both
      // stricter against the attack and looser against real resources.
      expect(isInternalPath('/api/catalog/categories/internal-medicine')).toBe(false);
      expect(isInternalPath('/api/catalog/vendors/internal-affairs-canteen')).toBe(false);
      expect(isInternalPath('/api/order/orders/internally-routed')).toBe(false);
    });
  });

  describe('INTERNAL_TRUST_HEADERS — forged service identity is stripped (F-SEC-22)', () => {
    it('covers every header AuthGuard will accept as proof of being a peer service', () => {
      // If a new trust header is introduced downstream it must be added here too, or the
      // edge will forward it. Enumerated deliberately rather than derived, so that adding
      // one downstream breaks this test.
      expect([...INTERNAL_TRUST_HEADERS].sort()).toEqual([
        'x-ore-internal-key',
        'x-ore-internal-mac',
        'x-ore-internal-ts',
        'x-ore-service',
      ]);
    });

    it('strips a forged key from an inbound request', () => {
      const headers: Record<string, unknown> = {
        authorization: 'Bearer customer-token',
        'x-ore-internal-key': 'stolen-shared-secret',
        'x-ore-internal-mac': 'forged',
        'x-ore-internal-ts': '1757000000',
        'x-ore-service': 'payment',
        'content-type': 'application/json',
      };

      for (const h of INTERNAL_TRUST_HEADERS) delete headers[h];

      expect(headers).toEqual({
        authorization: 'Bearer customer-token',
        'content-type': 'application/json',
      });
    });
  });
});

describe('isCacheablePath', () => {
  it('caches only the three read-heavy catalog GETs', () => {
    expect(isCacheablePath('GET', '/api/catalog/vendors?lat=5&lng=-1')).toBe(true);
    expect(isCacheablePath('GET', '/api/catalog/search/items?q=jollof')).toBe(true);
    expect(isCacheablePath('GET', '/api/catalog/items/abc')).toBe(true);
  });

  it('never caches a write', () => {
    for (const m of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      expect(isCacheablePath(m, '/api/catalog/vendors')).toBe(false);
    }
  });

  it('never caches anything outside the catalog reads', () => {
    expect(isCacheablePath('GET', '/api/order/orders/me')).toBe(false);
    expect(isCacheablePath('GET', '/api/ledger/wallet/me')).toBe(false);
    expect(isCacheablePath('GET', '/health')).toBe(false);
  });

  it('ignores the query string when deciding, but the caller keys on the full URL', () => {
    // The hooks store and look up by req.url, so two different queries are two entries.
    expect(isCacheablePath('GET', '/api/catalog/vendors?lat=1')).toBe(true);
    expect(isCacheablePath('GET', '/api/catalog/vendors?lat=2')).toBe(true);
  });
});

describe('isMediaUploadPath (F-BUG-7 / F-BUG-11)', () => {
  it('grants the larger budget to every documented upload path', () => {
    const uploads = [
      '/api/catalog/vendors/abc/media',
      '/api/catalog/vendors/abc/media/logo',
      '/api/catalog/items/abc/media',
      '/api/catalog/vendors/abc/stories/media',
      '/api/onboarding/upload',
      '/api/onboarding/smile/document',
      '/api/order/orders/abc/prescription',
      '/api/order/orders/abc/laundry-condition/photos',
      '/api/order/orders/abc/errand/receipt',
      '/api/order/orders/abc/delivery-proof',
      '/api/order/orders/abc/delivery-signature',
    ];
    for (const p of uploads) expect([p, isMediaUploadPath(p)]).toEqual([p, true]);
  });

  it('does not grant it to ordinary routes', () => {
    const ordinary = [
      '/api/order/orders',
      '/api/catalog/vendors',
      '/api/cart/cart/items',
      '/api/payment/payments/checkout',
      '/api/catalog/multimedia-lounge',
    ];
    for (const p of ordinary) expect([p, isMediaUploadPath(p)]).toEqual([p, false]);
  });
});
