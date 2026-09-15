/** Telemetry interceptor — wraps every request in a trace context and records RED
 *  metrics (rate of requests, errors, duration) against the per-service registry.
 *  The gateway also mints the trace id; downstream services propagate via headers.
 *  The inner observable is subscribed *inside* the AsyncLocalStorage run so every
 *  handler continuation inherits the trace context (x-request-id / traceparent). */
import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { MetricsService } from './metrics';
export declare class TelemetryInterceptor implements NestInterceptor {
    private readonly metrics;
    constructor(metrics: MetricsService);
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown>;
}
export declare const telemetryInterceptorProvider: {
    provide: string;
    inject: string[];
    useFactory: (metrics: MetricsService) => TelemetryInterceptor;
};
//# sourceMappingURL=telemetry.d.ts.map