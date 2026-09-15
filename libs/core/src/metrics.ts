/** Prometheus metrics — one MetricsService per service, exposed at GET /metrics.
 *  Counters/histograms use the `ore_` prefix so every service is scrapable with the
 *  same set of series. */

import { Injectable } from '@nestjs/common';
import {
  Counter,
  Histogram,
  collectDefaultMetrics,
  Registry,
  exponentialBuckets,
} from 'prom-client';

export interface Metrics {
  metrics(): Promise<string>;
  http(status: string, route: string, durationMs: number): void;
  event(name: string): void;
  order(status: string): void;
  payment(status: string): void;
  offer(status: string): void;
}

@Injectable()
export class MetricsService implements Metrics {
  private readonly registry = new Registry();
  private readonly httpTotal: Counter;
  private readonly httpDuration: Histogram;
  private readonly eventsTotal: Counter;
  private readonly ordersTotal: Counter;
  private readonly paymentsTotal: Counter;
  private readonly offersTotal: Counter;

  constructor(prefix: string) {
    this.registry.setDefaultLabels({ service: prefix });
    collectDefaultMetrics({ register: this.registry, prefix: 'ore_' });

    this.httpTotal = new Counter({
      name: 'ore_http_requests_total',
      help: 'HTTP requests processed',
      labelNames: ['route', 'status'] as const,
      registers: [this.registry],
    });
    this.httpDuration = new Histogram({
      name: 'ore_http_request_duration_seconds',
      help: 'HTTP request duration (seconds)',
      labelNames: ['route', 'status'] as const,
      buckets: exponentialBuckets(0.005, 2, 12),
      registers: [this.registry],
    });
    this.eventsTotal = new Counter({
      name: 'ore_events_total',
      help: 'Domain events published',
      labelNames: ['event'] as const,
      registers: [this.registry],
    });
    this.ordersTotal = new Counter({
      name: 'ore_orders_total',
      help: 'Orders by status',
      labelNames: ['status'] as const,
      registers: [this.registry],
    });
    this.paymentsTotal = new Counter({
      name: 'ore_payments_total',
      help: 'Payments by status',
      labelNames: ['status'] as const,
      registers: [this.registry],
    });
    this.offersTotal = new Counter({
      name: 'ore_offers_total',
      help: 'Dispatch offers by status',
      labelNames: ['status'] as const,
      registers: [this.registry],
    });
  }

  async metrics(): Promise<string> {
    return this.registry.metrics();
  }

  http(status: string, route: string, durationMs: number): void {
    this.httpTotal.inc({ route, status });
    this.httpDuration.observe({ route, status }, durationMs / 1000);
  }

  event(name: string): void {
    this.eventsTotal.inc({ event: name });
  }

  order(status: string): void {
    this.ordersTotal.inc({ status });
  }

  payment(status: string): void {
    this.paymentsTotal.inc({ status });
  }

  offer(status: string): void {
    this.offersTotal.inc({ status });
  }
}

export const ORE_METRICS_TOKEN = 'ORE_METRICS';

export function metricsProvider(env: Record<string, string | undefined> = process.env) {
  const service = (env.ORE_SERVICE ?? env.SERVICE_NAME ?? 'service').replace(/[^a-z0-9]/gi, '-');
  return {
    provide: ORE_METRICS_TOKEN,
    useFactory: () => new MetricsService(service),
  };
}
