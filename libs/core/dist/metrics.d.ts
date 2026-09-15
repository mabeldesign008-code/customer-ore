/** Prometheus metrics — one MetricsService per service, exposed at GET /metrics.
 *  Counters/histograms use the `ore_` prefix so every service is scrapable with the
 *  same set of series. */
export interface Metrics {
    metrics(): Promise<string>;
    http(status: string, route: string, durationMs: number): void;
    event(name: string): void;
    order(status: string): void;
    payment(status: string): void;
    offer(status: string): void;
}
export declare class MetricsService implements Metrics {
    private readonly registry;
    private readonly httpTotal;
    private readonly httpDuration;
    private readonly eventsTotal;
    private readonly ordersTotal;
    private readonly paymentsTotal;
    private readonly offersTotal;
    constructor(prefix: string);
    metrics(): Promise<string>;
    http(status: string, route: string, durationMs: number): void;
    event(name: string): void;
    order(status: string): void;
    payment(status: string): void;
    offer(status: string): void;
}
export declare const ORE_METRICS_TOKEN = "ORE_METRICS";
export declare function metricsProvider(env?: Record<string, string | undefined>): {
    provide: string;
    useFactory: () => MetricsService;
};
//# sourceMappingURL=metrics.d.ts.map