/** Inter-service HTTP. Always sends the internal key, propagates trace context,
 *  wraps each host in a circuit breaker, and retries idempotent-safe failures
 *  (5xx / 429 / network errors) with full-jitter backoff.
 *
 *  Retries apply ONLY to idempotent methods (GET/HEAD/OPTIONS/PUT). POST and PATCH
 *  are never retried: once a retryable status or a timeout is observed the upstream
 *  may have already processed the request, and re-sending double-executes money and
 *  state (order create, refund raise, transfers) — audit F-BUG-1. Callers needing
 *  at-least-once semantics go through the outbox/idempotency layers. */
import { INTERNAL_KEY_HEADER, serviceUrl } from '@ore/config';
export { serviceUrl, INTERNAL_KEY_HEADER };
/** Fetch that retries transient failures. POST bodies are NOT retried on retryable
 *  statuses when the upstream may have already processed the request — callers
 *  that need at-least-once semantics go through the outbox/idempotency layers. */
export declare function internalFetch(url: string, init?: RequestInit): Promise<Response>;
//# sourceMappingURL=http.d.ts.map