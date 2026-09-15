/** Inter-service HTTP. Always sends the internal key, propagates trace context,
 *  wraps each host in a circuit breaker, and retries idempotent-safe failures
 *  (5xx / 429 / network errors) with full-jitter backoff.
 *
 *  Retries apply ONLY to idempotent methods (GET/HEAD/OPTIONS/PUT). POST and PATCH
 *  are never retried: once a retryable status or a timeout is observed the upstream
 *  may have already processed the request, and re-sending double-executes money and
 *  state (order create, refund raise, transfers) — audit F-BUG-1. Callers needing
 *  at-least-once semantics go through the outbox/idempotency layers. */

import { INTERNAL_KEY_HEADER, loadEnv, serviceUrl } from '@ore/config';
import { breakerFor, jitterDelayMs } from './breaker';
import { requestId, traceparent } from './trace';
import {
  INTERNAL_MAC_HEADER,
  INTERNAL_SERVICE_HEADER,
  INTERNAL_TS_HEADER,
  computeInternalMac,
} from './internal-auth';

const FETCH_TIMEOUT_MS = 8_000;
const MAX_RETRIES = 3;

export { serviceUrl, INTERNAL_KEY_HEADER };

/** Fetch that retries transient failures. POST bodies are NOT retried on retryable
 *  statuses when the upstream may have already processed the request — callers
 *  that need at-least-once semantics go through the outbox/idempotency layers. */
export async function internalFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const env = loadEnv();
  const headers = new Headers(init.headers);
  headers.set(INTERNAL_KEY_HEADER, env.internalServiceKey);
  const rid = requestId();
  if (rid) headers.set('x-request-id', rid);
  const tp = traceparent();
  if (tp) headers.set('traceparent', tp);
  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  // MAC-based auth (audit F-SEC-1): the shared key never crosses the wire — only a
  // per-request HMAC over method/path/body/identity/time does. The legacy plaintext
  // key above is still sent so mixed-version rolling deploys keep authenticating.
  try {
    const u = new URL(url);
    const pathWithQuery = u.pathname + u.search;
    const service = process.env.ORE_SERVICE_NAME ?? 'unknown';
    const ts = String(Date.now());
    headers.set(INTERNAL_SERVICE_HEADER, service);
    headers.set(INTERNAL_TS_HEADER, ts);
    headers.set(INTERNAL_MAC_HEADER, computeInternalMac(env.internalServiceKey, (init.method ?? 'GET').toUpperCase(), pathWithQuery, init.body, service, ts));
  } catch {
    // relative url / no env key — the legacy header alone still authenticates
  }

  let host = 'unknown';
  try {
    host = new URL(url).host;
  } catch {
    // relative urls — keep 'unknown'
  }
  const breaker = breakerFor(host);

  // Idempotency gate on retries: only methods whose repeat is guaranteed safe may be
  // retried. POST/PATCH are excluded even though the old comment claimed they were —
  // the loop below retried every method on 5xx/429, so a POST that the upstream had
  // already processed (but whose response timed out) was re-sent and double-executed
  // (audit F-BUG-1).
  const method = (init.method ?? 'GET').toUpperCase();
  const retrySafe = method === 'GET' || method === 'HEAD' || method === 'OPTIONS' || method === 'PUT';

  const attempt = async (signal: AbortSignal): Promise<Response> => {
    const res = await fetch(url, { ...init, headers, signal });
    if (res.status >= 500 || res.status === 429) throw new HttpRetryable(res.status, url);
    return res;
  };

  let lastErr: unknown = null;
  for (let i = 0; i <= MAX_RETRIES; i += 1) {
    if (!breaker.allow()) {
      throw new Error(`circuit open for ${host}`);
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    if (init.signal) {
      if (init.signal.aborted) ctrl.abort();
      else init.signal.addEventListener('abort', () => ctrl.abort(), { once: true });
    }
    try {
      const res = await attempt(ctrl.signal);
      breaker.onSuccess();
      return res;
    } catch (err) {
      lastErr = err;
      breaker.onFailure();
      const retryable =
        (err instanceof HttpRetryable ||
        (err instanceof Error && (err.name === 'AbortError' || /fetch failed|ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i.test(err.message)))) &&
        retrySafe;
      if (i < MAX_RETRIES && retryable) {
        await new Promise((r) => setTimeout(r, jitterDelayMs(200, i)));
        continue;
      }
      if (err instanceof HttpRetryable) return new Response(JSON.stringify({ message: err.message }), {
        status: err.status,
        headers: { 'content-type': 'application/json' },
      });
      throw err instanceof Error ? err : new Error(String(err));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('internalFetch failed');
}

class HttpRetryable extends Error {
  constructor(
    readonly status: number,
    url: string,
  ) {
    super(`upstream ${status} for ${url}`);
  }
}
