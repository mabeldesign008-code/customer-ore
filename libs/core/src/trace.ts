/** Distributed tracing — AsyncLocalStorage trace context with W3C traceparent support.
 *  The gateway mints a request id + trace id per request; services propagate them
 *  through `x-request-id` and `traceparent` headers and log `[trace] {...}` spans. */

import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

export interface TraceSpan {
  name: string;
  start: bigint; // hrtime.bigint()
  attrs?: Record<string, string | number | undefined>;
  children?: TraceSpan[];
}

export interface TraceContext {
  traceId: string;
  spanId: string;
  requestId: string;
  parentSpanId?: string;
  start: bigint;
  spans: TraceSpan[];
  current: TraceSpan[];
}

const store = new AsyncLocalStorage<TraceContext>();

function randHex(bytes: number): string {
  let out = '';
  const buf = randomUUID().replace(/-/g, '');
  for (let i = 0; i < bytes; i += 1) out += buf[i % buf.length];
  return out;
}

export function newTraceId(): string {
  return randHex(16); // 128-bit
}

export function newSpanId(): string {
  return randHex(8); // 64-bit
}

/** Run `fn` inside a fresh (or continued) trace context. */
export function runWithTrace(fn: () => unknown, incoming?: { traceId?: string; parentSpanId?: string; requestId?: string }): TraceContext {
  const parent = store.getStore();
  const ctx: TraceContext = {
    traceId: incoming?.traceId ?? newTraceId(),
    spanId: newSpanId(),
    requestId: incoming?.requestId ?? `req-${randomUUID().slice(0, 8)}`,
    parentSpanId: incoming?.parentSpanId ?? parent?.spanId,
    start: process.hrtime.bigint(),
    spans: [],
    current: [],
  };
  store.run(ctx, () => {
    try {
      fn();
    } catch {
      // trace context must not swallow the caller's error handling
    }
  });
  return ctx;
}

export function getTraceContext(): TraceContext | undefined {
  return store.getStore();
}

export function beginSpan(name: string, attrs?: TraceSpan['attrs']): TraceSpan {
  const ctx = store.getStore();
  const span: TraceSpan = { name, start: process.hrtime.bigint(), attrs };
  ctx?.spans.push(span);
  ctx?.current.push(span);
  return span;
}

export function endSpan(span: TraceSpan): void {
  const ctx = store.getStore();
  if (ctx && ctx.current.length) ctx.current.pop();
  if (ctx) span.children = ctx.current;
}

/** W3C traceparent header: `00-<traceId>-<parentSpanId>-01`. */
export function traceparent(ctx?: TraceContext): string {
  const c = ctx ?? store.getStore();
  if (!c) return '';
  return `00-${c.traceId}-${c.spanId}-01`;
}

export function traceId(): string {
  return store.getStore()?.traceId ?? '';
}

export function requestId(): string {
  return store.getStore()?.requestId ?? '';
}

/** JSON payload logged on every traceable span (used by the trace viewer). */
export function traceLog(): string {
  const c = store.getStore();
  if (!c) return '';
  return JSON.stringify({
    traceId: c.traceId,
    spanId: c.spanId,
    requestId: c.requestId,
    parentSpanId: c.parentSpanId,
    spans: c.spans,
  });
}
