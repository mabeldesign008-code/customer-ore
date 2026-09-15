"use strict";
/** Inter-service HTTP. Always sends the internal key, propagates trace context,
 *  wraps each host in a circuit breaker, and retries idempotent-safe failures
 *  (5xx / 429 / network errors) with full-jitter backoff.
 *
 *  Retries apply ONLY to idempotent methods (GET/HEAD/OPTIONS/PUT). POST and PATCH
 *  are never retried: once a retryable status or a timeout is observed the upstream
 *  may have already processed the request, and re-sending double-executes money and
 *  state (order create, refund raise, transfers) — audit F-BUG-1. Callers needing
 *  at-least-once semantics go through the outbox/idempotency layers. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.INTERNAL_KEY_HEADER = exports.serviceUrl = void 0;
exports.internalFetch = internalFetch;
const config_1 = require("@ore/config");
Object.defineProperty(exports, "INTERNAL_KEY_HEADER", { enumerable: true, get: function () { return config_1.INTERNAL_KEY_HEADER; } });
Object.defineProperty(exports, "serviceUrl", { enumerable: true, get: function () { return config_1.serviceUrl; } });
const breaker_1 = require("./breaker");
const trace_1 = require("./trace");
const internal_auth_1 = require("./internal-auth");
const FETCH_TIMEOUT_MS = 8_000;
const MAX_RETRIES = 3;
/** Fetch that retries transient failures. POST bodies are NOT retried on retryable
 *  statuses when the upstream may have already processed the request — callers
 *  that need at-least-once semantics go through the outbox/idempotency layers. */
async function internalFetch(url, init = {}) {
    const env = (0, config_1.loadEnv)();
    const headers = new Headers(init.headers);
    headers.set(config_1.INTERNAL_KEY_HEADER, env.internalServiceKey);
    const rid = (0, trace_1.requestId)();
    if (rid)
        headers.set('x-request-id', rid);
    const tp = (0, trace_1.traceparent)();
    if (tp)
        headers.set('traceparent', tp);
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
        headers.set(internal_auth_1.INTERNAL_SERVICE_HEADER, service);
        headers.set(internal_auth_1.INTERNAL_TS_HEADER, ts);
        headers.set(internal_auth_1.INTERNAL_MAC_HEADER, (0, internal_auth_1.computeInternalMac)(env.internalServiceKey, (init.method ?? 'GET').toUpperCase(), pathWithQuery, init.body, service, ts));
    }
    catch {
        // relative url / no env key — the legacy header alone still authenticates
    }
    let host = 'unknown';
    try {
        host = new URL(url).host;
    }
    catch {
        // relative urls — keep 'unknown'
    }
    const breaker = (0, breaker_1.breakerFor)(host);
    // Idempotency gate on retries: only methods whose repeat is guaranteed safe may be
    // retried. POST/PATCH are excluded even though the old comment claimed they were —
    // the loop below retried every method on 5xx/429, so a POST that the upstream had
    // already processed (but whose response timed out) was re-sent and double-executed
    // (audit F-BUG-1).
    const method = (init.method ?? 'GET').toUpperCase();
    const retrySafe = method === 'GET' || method === 'HEAD' || method === 'OPTIONS' || method === 'PUT';
    const attempt = async (signal) => {
        const res = await fetch(url, { ...init, headers, signal });
        if (res.status >= 500 || res.status === 429)
            throw new HttpRetryable(res.status, url);
        return res;
    };
    let lastErr = null;
    for (let i = 0; i <= MAX_RETRIES; i += 1) {
        if (!breaker.allow()) {
            throw new Error(`circuit open for ${host}`);
        }
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
        if (init.signal) {
            if (init.signal.aborted)
                ctrl.abort();
            else
                init.signal.addEventListener('abort', () => ctrl.abort(), { once: true });
        }
        try {
            const res = await attempt(ctrl.signal);
            breaker.onSuccess();
            return res;
        }
        catch (err) {
            lastErr = err;
            breaker.onFailure();
            const retryable = (err instanceof HttpRetryable ||
                (err instanceof Error && (err.name === 'AbortError' || /fetch failed|ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i.test(err.message)))) &&
                retrySafe;
            if (i < MAX_RETRIES && retryable) {
                await new Promise((r) => setTimeout(r, (0, breaker_1.jitterDelayMs)(200, i)));
                continue;
            }
            if (err instanceof HttpRetryable)
                return new Response(JSON.stringify({ message: err.message }), {
                    status: err.status,
                    headers: { 'content-type': 'application/json' },
                });
            throw err instanceof Error ? err : new Error(String(err));
        }
        finally {
            clearTimeout(timer);
        }
    }
    throw lastErr instanceof Error ? lastErr : new Error('internalFetch failed');
}
class HttpRetryable extends Error {
    status;
    constructor(status, url) {
        super(`upstream ${status} for ${url}`);
        this.status = status;
    }
}
//# sourceMappingURL=http.js.map