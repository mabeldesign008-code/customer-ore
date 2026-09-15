"use strict";
/** Distributed tracing — AsyncLocalStorage trace context with W3C traceparent support.
 *  The gateway mints a request id + trace id per request; services propagate them
 *  through `x-request-id` and `traceparent` headers and log `[trace] {...}` spans. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.newTraceId = newTraceId;
exports.newSpanId = newSpanId;
exports.runWithTrace = runWithTrace;
exports.getTraceContext = getTraceContext;
exports.beginSpan = beginSpan;
exports.endSpan = endSpan;
exports.traceparent = traceparent;
exports.traceId = traceId;
exports.requestId = requestId;
exports.traceLog = traceLog;
const async_hooks_1 = require("async_hooks");
const crypto_1 = require("crypto");
const store = new async_hooks_1.AsyncLocalStorage();
function randHex(bytes) {
    let out = '';
    const buf = (0, crypto_1.randomUUID)().replace(/-/g, '');
    for (let i = 0; i < bytes; i += 1)
        out += buf[i % buf.length];
    return out;
}
function newTraceId() {
    return randHex(16); // 128-bit
}
function newSpanId() {
    return randHex(8); // 64-bit
}
/** Run `fn` inside a fresh (or continued) trace context. */
function runWithTrace(fn, incoming) {
    const parent = store.getStore();
    const ctx = {
        traceId: incoming?.traceId ?? newTraceId(),
        spanId: newSpanId(),
        requestId: incoming?.requestId ?? `req-${(0, crypto_1.randomUUID)().slice(0, 8)}`,
        parentSpanId: incoming?.parentSpanId ?? parent?.spanId,
        start: process.hrtime.bigint(),
        spans: [],
        current: [],
    };
    store.run(ctx, () => {
        try {
            fn();
        }
        catch {
            // trace context must not swallow the caller's error handling
        }
    });
    return ctx;
}
function getTraceContext() {
    return store.getStore();
}
function beginSpan(name, attrs) {
    const ctx = store.getStore();
    const span = { name, start: process.hrtime.bigint(), attrs };
    ctx?.spans.push(span);
    ctx?.current.push(span);
    return span;
}
function endSpan(span) {
    const ctx = store.getStore();
    if (ctx && ctx.current.length)
        ctx.current.pop();
    if (ctx)
        span.children = ctx.current;
}
/** W3C traceparent header: `00-<traceId>-<parentSpanId>-01`. */
function traceparent(ctx) {
    const c = ctx ?? store.getStore();
    if (!c)
        return '';
    return `00-${c.traceId}-${c.spanId}-01`;
}
function traceId() {
    return store.getStore()?.traceId ?? '';
}
function requestId() {
    return store.getStore()?.requestId ?? '';
}
/** JSON payload logged on every traceable span (used by the trace viewer). */
function traceLog() {
    const c = store.getStore();
    if (!c)
        return '';
    return JSON.stringify({
        traceId: c.traceId,
        spanId: c.spanId,
        requestId: c.requestId,
        parentSpanId: c.parentSpanId,
        spans: c.spans,
    });
}
//# sourceMappingURL=trace.js.map