"use strict";
/** Telemetry interceptor — wraps every request in a trace context and records RED
 *  metrics (rate of requests, errors, duration) against the per-service registry.
 *  The gateway also mints the trace id; downstream services propagate via headers.
 *  The inner observable is subscribed *inside* the AsyncLocalStorage run so every
 *  handler continuation inherits the trace context (x-request-id / traceparent). */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.telemetryInterceptorProvider = exports.TelemetryInterceptor = void 0;
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const metrics_1 = require("./metrics");
const ore_env_1 = require("./ore-env");
const trace_1 = require("./trace");
let TelemetryInterceptor = class TelemetryInterceptor {
    metrics;
    constructor(metrics) {
        this.metrics = metrics;
    }
    intercept(context, next) {
        const req = context.switchToHttp().getRequest();
        const res = context.switchToHttp().getResponse();
        const route = (req.routeOptions?.url ?? req.raw?.url ?? '/').replace(/^\/api\/[^/]+\//, '/');
        const started = process.hrtime.bigint();
        const incomingTrace = req.headers['traceparent']?.toString();
        const incomingRid = req.headers['x-request-id']?.toString();
        const trace = incomingTrace?.startsWith('00-')
            ? { traceId: incomingTrace.slice(3, 35), parentSpanId: incomingTrace.slice(36, 52), requestId: incomingRid }
            : { requestId: incomingRid ?? `req-${(0, trace_1.newTraceId)().slice(0, 8)}` };
        const pipeline = next.handle().pipe((0, operators_1.tap)({
            next: () => {
                const ms = Number(process.hrtime.bigint() - started) / 1e6;
                this.metrics.http(String(res.statusCode ?? 200), `${req.method} ${route}`, ms);
                const c = (0, trace_1.getTraceContext)();
                if (c && !res.sent && typeof res.header === 'function') {
                    void res.header('x-request-id', c.requestId);
                }
                const tl = (0, trace_1.traceLog)();
                if (tl)
                    console.log(`[trace] ${tl}`);
            },
            error: (err) => {
                const ms = Number(process.hrtime.bigint() - started) / 1e6;
                this.metrics.http(String(res.statusCode ?? 500), `${req.method} ${route}`, ms);
                const tl = (0, trace_1.traceLog)();
                if (tl)
                    console.error(`[trace] ${tl} error=${err.message}`);
            },
        }));
        // Subscribe inside the ALS run so the whole request pipeline shares the trace.
        return new rxjs_1.Observable((sub) => {
            (0, trace_1.runWithTrace)(() => {
                pipeline.subscribe(sub);
            }, trace);
        });
    }
};
exports.TelemetryInterceptor = TelemetryInterceptor;
exports.TelemetryInterceptor = TelemetryInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [metrics_1.MetricsService])
], TelemetryInterceptor);
exports.telemetryInterceptorProvider = {
    provide: core_1.APP_INTERCEPTOR,
    inject: [ore_env_1.ORE_METRICS],
    useFactory: (metrics) => new TelemetryInterceptor(metrics),
};
//# sourceMappingURL=telemetry.js.map