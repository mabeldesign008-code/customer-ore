/** Telemetry interceptor — wraps every request in a trace context and records RED
 *  metrics (rate of requests, errors, duration) against the per-service registry.
 *  The gateway also mints the trace id; downstream services propagate via headers.
 *  The inner observable is subscribed *inside* the AsyncLocalStorage run so every
 *  handler continuation inherits the trace context (x-request-id / traceparent). */

import { APP_INTERCEPTOR } from '@nestjs/core';
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics';
import { ORE_METRICS } from './ore-env';
import { getTraceContext, newTraceId, runWithTrace, traceLog } from './trace';

@Injectable()
export class TelemetryInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const res = context.switchToHttp().getResponse<FastifyReply>();
    const route = (req.routeOptions?.url ?? req.raw?.url ?? '/').replace(/^\/api\/[^/]+\//, '/');
    const started = process.hrtime.bigint();

    const incomingTrace = req.headers['traceparent']?.toString();
    const incomingRid = req.headers['x-request-id']?.toString();
    const trace = incomingTrace?.startsWith('00-')
      ? { traceId: incomingTrace.slice(3, 35), parentSpanId: incomingTrace.slice(36, 52), requestId: incomingRid }
      : { requestId: incomingRid ?? `req-${newTraceId().slice(0, 8)}` };

    const pipeline = next.handle().pipe(
      tap({
        next: () => {
          const ms = Number(process.hrtime.bigint() - started) / 1e6;
          this.metrics.http(String(res.statusCode ?? 200), `${req.method} ${route}`, ms);
          const c = getTraceContext();
          if (c && !res.sent && typeof res.header === 'function') {
            void res.header('x-request-id', c.requestId);
          }
          const tl = traceLog();
          if (tl) console.log(`[trace] ${tl}`);
        },
        error: (err: Error) => {
          const ms = Number(process.hrtime.bigint() - started) / 1e6;
          this.metrics.http(String(res.statusCode ?? 500), `${req.method} ${route}`, ms);
          const tl = traceLog();
          if (tl) console.error(`[trace] ${tl} error=${err.message}`);
        },
      }),
    );

    // Subscribe inside the ALS run so the whole request pipeline shares the trace.
    return new Observable((sub) => {
      runWithTrace(() => {
        pipeline.subscribe(sub);
      }, trace);
    });
  }
}

export const telemetryInterceptorProvider = {
  provide: APP_INTERCEPTOR,
  inject: [ORE_METRICS],
  useFactory: (metrics: MetricsService) => new TelemetryInterceptor(metrics),
};
