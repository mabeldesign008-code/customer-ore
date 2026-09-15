#!/usr/bin/env node
/**
 * s3 — the gateway, driven.
 *
 * The gateway is the only process exposed to the internet. Everything else in this system
 * is reachable only through it, which makes it the one component whose bugs are directly
 * an attacker's tools. It had 45 unit tests and had never served a live request.
 *
 * This drives the real edge against the real stack and asserts the properties the edge is
 * actually responsible for: that internal routes cannot be reached, that a client cannot
 * forge service identity, that throttling throttles, that the cache does not corrupt what
 * it serves, and that errors come back in the platform's envelope.
 *
 * Findings this pins down (all fixed, all reproduced here before the fix):
 *   F-SEC-21  percent-encoding bypassed the /internal block
 *   F-SEC-22  client-supplied x-ore-internal-key was forwarded to services
 *   F-SEC-24  cache hits short-circuited before the rate limiter, so they were unmetered
 *   F-BUG-8   exceeding the rate limit answered 500, not 429
 *   F-BUG-9   the edge cache served the string "[object Object]" on every hit
 *
 * Usage: node tools/e2e/s3-gateway.cjs
 */
const { execSync } = require('node:child_process');
const { PORTS, INTERNAL_KEY, sleep, check, summarise, say } = require('./lib.cjs');

const G = `http://127.0.0.1:${PORTS.gateway}`;
const CATALOG = `http://127.0.0.1:${PORTS.catalog}`;
const AUTH = `http://127.0.0.1:${PORTS.auth}`;

/** Cape Coast — the seeded delivery zone. Accra coordinates are rejected as out of zone. */
const ZONE = 'lat=5.1053&lng=-1.2466';

/** A distinct query per call keeps us off the edge cache when we do not want it. */
let nonce = Date.now() % 100000;
const freshVendorUrl = () => `${G}/api/catalog/vendors?${ZONE}${(nonce += 1) && ''}&n=${nonce}`;

/**
 * Raw fetch that never throws on a non-2xx and never normalises the path.
 * `--path-as-is` semantics matter here: the whole point is to send deliberately
 * malformed paths that a well-behaved client library would clean up.
 *
 * Transport errors are retried once. When an upstream resets the connection mid-response
 * the edge has no choice but to drop the socket, and Node's pooled keep-alive connection
 * then surfaces that reset on the *next* request over the same socket. A real client
 * retries; so does this, rather than reporting a false failure for the request after a
 * deliberate outage probe.
 */
async function raw(url, { method = 'GET', headers = {}, body } = {}) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      const res = await fetch(url, { method, headers, body });
      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch { json = undefined; }
      return { status: res.status, headers: res.headers, text, json };
    } catch (err) {
      if (attempt >= 1) throw err;
      await sleep(50);
    }
  }
}

/** The rate limiter is per-IP and shared across this whole file; reset between sections. */
function resetRateLimit() {
  try {
    execSync(
      `redis-cli --scan --pattern 'fastify-rate-limit*' | xargs -r redis-cli del`,
      { stdio: 'ignore', shell: '/bin/bash' },
    );
  } catch { /* redis-cli absent: the throttle section will report it */ }
}

async function main() {
  // ── 1. Internal routes are not reachable through the edge (F-SEC-21) ──────────────
  say('internal routes are unreachable from the edge');

  // A real internal route, to be sure we are testing the block and not a typo:
  // it answers 401 when called directly without the key, and 200 with it.
  const directNoKey = await raw(`${AUTH}/auth/internal/approvals/cap`);
  const directWithKey = await raw(`${AUTH}/auth/internal/approvals/cap`, {
    headers: { 'x-ore-internal-key': INTERNAL_KEY },
  });
  check('internal route exists and is key-protected (direct, no key -> 401)', directNoKey.status === 401, `got ${directNoKey.status}`);
  check('internal route answers to a valid key (direct -> 200)', directWithKey.status === 200, `got ${directWithKey.status}`);

  // Every one of these reached the internal handler before the fix. The two encoded
  // variants returned 200 when combined with the key below.
  const bypasses = [
    ['plain', '/api/auth/internal/approvals/cap'],
    ['first char encoded', '/api/auth/%69nternal/approvals/cap'],
    ['inner char encoded', '/api/auth/inter%6eal/approvals/cap'],
    ['uppercase escape', '/api/auth/%49nternal/approvals/cap'],
    ['whole word encoded', '/api/auth/%69%6e%74%65%72%6e%61%6c/approvals/cap'],
    ['double encoded', '/api/auth/%2569nternal/approvals/cap'],
    ['uppercase', '/api/auth/INTERNAL/approvals/cap'],
    ['mixed case', '/api/auth/InTeRnAl/approvals/cap'],
    ['encoded separator', '/api/auth/x/..%2finternal/approvals/cap'],
    ['double slash', '/api/auth//internal/approvals/cap'],
    ['order service', '/api/order/%69nternal/orders'],
    ['payment transfers', '/api/payment/%69nternal/payments/transfers'],
  ];

  for (const [label, path] of bypasses) {
    // Send the internal key too — this is the full attack, not half of it.
    const r = await raw(`${G}${path}`, { headers: { 'x-ore-internal-key': INTERNAL_KEY } });
    // 404 is the intended answer. 400 is acceptable for paths Fastify itself rejects as
    // malformed; what must never happen is 200/401/403, all of which prove the request
    // reached a service.
    const blocked = r.status === 404 || r.status === 400;
    check(`edge blocks ${label}`, blocked, `${path} -> ${r.status}`);
  }

  // ── 2. Client-forged service identity is stripped (F-SEC-22) ─────────────────────
  say('forged service-trust headers are stripped at the edge');

  // A public route that echoes nothing, so we assert on the effect rather than an echo:
  // if the edge forwarded the key, the internal route would have answered. Covered above.
  // Here we assert the headers cannot be used to elevate on a *public* route either.
  const forged = await raw(`${freshVendorUrl()}`, {
    headers: {
      'x-ore-internal-key': INTERNAL_KEY,
      'x-ore-internal-mac': 'forged',
      'x-ore-internal-ts': String(Math.floor(Date.now() / 1000)),
      'x-ore-service': 'payment',
    },
  });
  check('a public route still works with forged headers present', forged.status === 200, `got ${forged.status}`);

  // ── 3. Correlation IDs are minted at the edge ────────────────────────────────────
  say('correlation identifiers');
  const corr = await raw(`${G}/flags`);
  check('edge mints x-request-id', /^req-[0-9a-f]{12}$/.test(corr.headers.get('x-request-id') ?? ''), corr.headers.get('x-request-id') ?? 'absent');
  check('edge mints a W3C traceparent', /^00-[0-9a-f]{16,32}-[0-9a-f]{8,16}-01$/.test(corr.headers.get('traceparent') ?? ''), corr.headers.get('traceparent') ?? 'absent');

  const supplied = await raw(`${G}/flags`, { headers: { 'x-request-id': 'req-clientsupplied' } });
  check('a client-supplied x-request-id is echoed, not overwritten', supplied.headers.get('x-request-id') === 'req-clientsupplied', supplied.headers.get('x-request-id') ?? 'absent');

  // ── 4. Edge cache serves what it stored (F-BUG-9) ────────────────────────────────
  say('edge cache integrity');
  const cacheUrl = `${G}/api/catalog/vendors?${ZONE}&cache=${Date.now()}`;
  const first = await raw(cacheUrl);
  const second = await raw(cacheUrl);
  const third = await raw(cacheUrl);

  check('first request is a cache MISS', first.headers.get('x-cache-status') === 'MISS', first.headers.get('x-cache-status') ?? 'absent');
  check('second request is a cache HIT', second.headers.get('x-cache-status') === 'HIT', second.headers.get('x-cache-status') ?? 'absent');
  check('cached body is valid JSON, not "[object Object]"', second.json !== undefined && second.text !== '[object Object]', second.text.slice(0, 40));
  check('cached body is byte-identical to the origin response', second.text === first.text, `${first.text.length} vs ${second.text.length} bytes`);
  check('a third read is still intact', third.text === first.text, `${third.text.length} bytes`);
  check('cached response keeps a JSON content-type', (second.headers.get('content-type') ?? '').includes('application/json'), second.headers.get('content-type') ?? 'absent');
  check('Expires is a real date, not a stringified object', !(first.headers.get('expires') ?? '').includes('[object'), first.headers.get('expires') ?? 'absent');

  // ── 5. Throttling (F-BUG-8, F-SEC-24) ────────────────────────────────────────────
  say('rate limiting');
  resetRateLimit();

  // 5a. Cache hits must be counted. Warm one URL, then read it repeatedly and confirm
  //     the limiter is still advancing — before the fix the counter never moved.
  const meterUrl = `${G}/api/catalog/vendors?${ZONE}&meter=${Date.now()}`;
  await raw(meterUrl); // warm the cache (MISS)
  const hitA = await raw(meterUrl);
  const hitB = await raw(meterUrl);
  const remA = Number(hitA.headers.get('x-ratelimit-remaining'));
  const remB = Number(hitB.headers.get('x-ratelimit-remaining'));
  check('cache hits are served from cache', hitA.headers.get('x-cache-status') === 'HIT' && hitB.headers.get('x-cache-status') === 'HIT', `${hitA.headers.get('x-cache-status')}/${hitB.headers.get('x-cache-status')}`);
  check('cache hits still carry rate-limit headers', Number.isFinite(remA) && Number.isFinite(remB), `${remA}/${remB}`);
  check('cache hits decrement the rate-limit budget', remB === remA - 1, `remaining went ${remA} -> ${remB}`);

  // 5b. Exceeding the limit must answer 429 with the platform envelope.
  resetRateLimit();
  const limit = Number(hitA.headers.get('x-ratelimit-limit')) || 120;
  const burstUrl = `${G}/api/catalog/vendors?${ZONE}&burst=${Date.now()}`;
  const codes = {};
  for (let i = 0; i < limit + 10; i += 1) {
    const r = await raw(burstUrl);
    codes[r.status] = (codes[r.status] ?? 0) + 1;
  }
  check('requests under the limit succeed', (codes[200] ?? 0) === limit, `200s=${codes[200]} (limit ${limit})`);
  check('requests over the limit are throttled', (codes[429] ?? 0) > 0, `429s=${codes[429]}`);
  check('throttling never answers 500', (codes[500] ?? 0) === 0, `500s=${codes[500] ?? 0}`);

  const throttled = await raw(burstUrl);
  check('throttled response is 429', throttled.status === 429, `got ${throttled.status}`);
  check('throttled response uses the platform envelope', throttled.json?.error?.code === 'RATE_LIMIT_EXCEEDED', JSON.stringify(throttled.json).slice(0, 90));
  check('throttled response carries Retry-After', Number(throttled.headers.get('retry-after')) > 0, throttled.headers.get('retry-after') ?? 'absent');

  // ── 6. Error envelope is the same shape on Nest and proxied routes ───────────────
  say('error envelope consistency');
  resetRateLimit();
  const notFound = await raw(`${G}/nope`);
  check('unknown route -> platform envelope', notFound.status === 404 && notFound.json?.error?.code === 'NOT_FOUND', `${notFound.status} ${notFound.text.slice(0, 60)}`);

  const internal404 = await raw(`${G}/api/auth/internal/approvals/cap`);
  check('blocked internal route -> platform envelope', internal404.status === 404 && internal404.json?.error?.code === 'NOT_FOUND', internal404.text.slice(0, 60));

  // ── 7. Security headers and CORS ─────────────────────────────────────────────────
  say('security headers');
  const sec = await raw(`${G}/health`);
  check('X-Content-Type-Options: nosniff', sec.headers.get('x-content-type-options') === 'nosniff', sec.headers.get('x-content-type-options') ?? 'absent');
  check('X-Frame-Options: DENY', (sec.headers.get('x-frame-options') ?? '').toUpperCase() === 'DENY', sec.headers.get('x-frame-options') ?? 'absent');
  check('Referrer-Policy: no-referrer', sec.headers.get('referrer-policy') === 'no-referrer', sec.headers.get('referrer-policy') ?? 'absent');
  check('X-Powered-By is hidden', !sec.headers.get('x-powered-by'), sec.headers.get('x-powered-by') ?? 'absent');
  check('HSTS is set in production', (sec.headers.get('strict-transport-security') ?? '').includes('max-age=31536000'), sec.headers.get('strict-transport-security') ?? 'absent');

  // ── 8. The proxy actually proxies ────────────────────────────────────────────────
  say('proxying');
  resetRateLimit();
  const viaEdge = await raw(`${G}/api/catalog/vendors?${ZONE}&direct=${Date.now()}`);
  const direct = await raw(`${CATALOG}/vendors?${ZONE}`);
  check('a public catalog read succeeds through the edge', viaEdge.status === 200, `got ${viaEdge.status}`);
  check('the edge returns the same vendor count as the service', (viaEdge.json?.vendors?.length ?? -1) === (direct.json?.vendors?.length ?? -2), `${viaEdge.json?.vendors?.length} vs ${direct.json?.vendors?.length}`);
  check('query strings survive the proxy hop', (viaEdge.json?.vendors?.length ?? 0) > 0, 'zone filter applied');

  const unauth = await raw(`${G}/api/order/orders/me`);
  check('an authenticated route rejects an anonymous caller through the edge', unauth.status === 401, `got ${unauth.status}`);

  // ── 9. Body size limits (F-BUG-7 regression) ─────────────────────────────────────
  say('request body limits');
  const big = await raw(`${G}/api/order/orders`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'content-length': '2000000' },
    body: 'x'.repeat(2_000_000),
  });
  check('a 2 MB body on a normal route is rejected with 413', big.status === 413, `got ${big.status}`);
  check('413 uses the platform envelope', big.json?.error?.code === 'PAYLOAD_TOO_LARGE', big.text.slice(0, 70));

  // Media upload routes get a 50 MB budget, so a 2 MB body must NOT be rejected at the
  // edge. Use a service that is actually running, so a 413 can only come from the edge.
  // 401 proves it got past both body limits and reached the service's auth guard. Before
  // F-BUG-11 this was 413: the edge allowed it, then Fastify's own 1 MB bodyLimit —
  // which nobody had raised — rejected it anyway, so the exemption was decorative.
  for (const bytes of [2_000_000, 5_000_000]) {
    const media = await raw(`${G}/api/catalog/vendors/00000000-0000-0000-0000-000000000000/media/logo`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ blob: 'x'.repeat(bytes) }),
    });
    check(`a ${bytes / 1_000_000} MB upload reaches the service, not a 413`, media.status === 401, `got ${media.status}`);
  }

  // ── 10. An upstream outage must not take the edge down (F-BUG-10) ────────────────
  say('resilience to upstream outages');

  // These services are deliberately not booted by boot-stack.sh, so every request to
  // them fails at the transport layer — exactly the condition that used to be fatal.
  // Before the fix the *first* POST here killed the gateway process outright.
  const health0 = await raw(`${G}/health`);
  check('gateway is healthy before the outage probe', health0.status === 200, `got ${health0.status}`);

  const outageCodes = {};
  let leaked = 0;
  for (let i = 0; i < 8; i += 1) {
    const r = await raw(`${G}/api/notifications/anything`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ probe: i }),
    });
    outageCodes[r.status] = (outageCodes[r.status] ?? 0) + 1;
    if (r.json?.error?.code !== 'SERVICE_UNAVAILABLE') leaked += 1;
  }
  check('a POST to a dead upstream answers 503', (outageCodes[503] ?? 0) === 8, JSON.stringify(outageCodes));
  check('every outage response uses the platform envelope', leaked === 0, `${leaked} of 8 leaked a raw error`);

  const health1 = await raw(`${G}/health`);
  check('the gateway survived the outage', health1.status === 200, `got ${health1.status}`);

  const stillWorks = await raw(`${G}/api/catalog/vendors?${ZONE}&after=${Date.now()}`);
  check('healthy services are unaffected by another service being down', stillWorks.status === 200, `got ${stillWorks.status}`);

  // A large body to a dead upstream is the exact shape that crashed it.
  const bigToDead = await raw(`${G}/api/onboarding/upload`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ blob: 'x'.repeat(2_000_000) }),
  });
  check('a 2 MB POST to a dead upstream does not crash the edge', bigToDead.status === 503, `got ${bigToDead.status}`);
  const health2 = await raw(`${G}/health`);
  check('the gateway is still up afterwards', health2.status === 200, `got ${health2.status}`);

  await sleep(50);
  summarise('s3 — gateway');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
