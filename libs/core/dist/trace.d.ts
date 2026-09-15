/** Distributed tracing — AsyncLocalStorage trace context with W3C traceparent support.
 *  The gateway mints a request id + trace id per request; services propagate them
 *  through `x-request-id` and `traceparent` headers and log `[trace] {...}` spans. */
export interface TraceSpan {
    name: string;
    start: bigint;
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
export declare function newTraceId(): string;
export declare function newSpanId(): string;
/** Run `fn` inside a fresh (or continued) trace context. */
export declare function runWithTrace(fn: () => unknown, incoming?: {
    traceId?: string;
    parentSpanId?: string;
    requestId?: string;
}): TraceContext;
export declare function getTraceContext(): TraceContext | undefined;
export declare function beginSpan(name: string, attrs?: TraceSpan['attrs']): TraceSpan;
export declare function endSpan(span: TraceSpan): void;
/** W3C traceparent header: `00-<traceId>-<parentSpanId>-01`. */
export declare function traceparent(ctx?: TraceContext): string;
export declare function traceId(): string;
export declare function requestId(): string;
/** JSON payload logged on every traceable span (used by the trace viewer). */
export declare function traceLog(): string;
//# sourceMappingURL=trace.d.ts.map