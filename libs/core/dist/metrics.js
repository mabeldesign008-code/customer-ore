"use strict";
/** Prometheus metrics — one MetricsService per service, exposed at GET /metrics.
 *  Counters/histograms use the `ore_` prefix so every service is scrapable with the
 *  same set of series. */
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
exports.ORE_METRICS_TOKEN = exports.MetricsService = void 0;
exports.metricsProvider = metricsProvider;
const common_1 = require("@nestjs/common");
const prom_client_1 = require("prom-client");
let MetricsService = class MetricsService {
    registry = new prom_client_1.Registry();
    httpTotal;
    httpDuration;
    eventsTotal;
    ordersTotal;
    paymentsTotal;
    offersTotal;
    constructor(prefix) {
        this.registry.setDefaultLabels({ service: prefix });
        (0, prom_client_1.collectDefaultMetrics)({ register: this.registry, prefix: 'ore_' });
        this.httpTotal = new prom_client_1.Counter({
            name: 'ore_http_requests_total',
            help: 'HTTP requests processed',
            labelNames: ['route', 'status'],
            registers: [this.registry],
        });
        this.httpDuration = new prom_client_1.Histogram({
            name: 'ore_http_request_duration_seconds',
            help: 'HTTP request duration (seconds)',
            labelNames: ['route', 'status'],
            buckets: (0, prom_client_1.exponentialBuckets)(0.005, 2, 12),
            registers: [this.registry],
        });
        this.eventsTotal = new prom_client_1.Counter({
            name: 'ore_events_total',
            help: 'Domain events published',
            labelNames: ['event'],
            registers: [this.registry],
        });
        this.ordersTotal = new prom_client_1.Counter({
            name: 'ore_orders_total',
            help: 'Orders by status',
            labelNames: ['status'],
            registers: [this.registry],
        });
        this.paymentsTotal = new prom_client_1.Counter({
            name: 'ore_payments_total',
            help: 'Payments by status',
            labelNames: ['status'],
            registers: [this.registry],
        });
        this.offersTotal = new prom_client_1.Counter({
            name: 'ore_offers_total',
            help: 'Dispatch offers by status',
            labelNames: ['status'],
            registers: [this.registry],
        });
    }
    async metrics() {
        return this.registry.metrics();
    }
    http(status, route, durationMs) {
        this.httpTotal.inc({ route, status });
        this.httpDuration.observe({ route, status }, durationMs / 1000);
    }
    event(name) {
        this.eventsTotal.inc({ event: name });
    }
    order(status) {
        this.ordersTotal.inc({ status });
    }
    payment(status) {
        this.paymentsTotal.inc({ status });
    }
    offer(status) {
        this.offersTotal.inc({ status });
    }
};
exports.MetricsService = MetricsService;
exports.MetricsService = MetricsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [String])
], MetricsService);
exports.ORE_METRICS_TOKEN = 'ORE_METRICS';
function metricsProvider(env = process.env) {
    const service = (env.ORE_SERVICE ?? env.SERVICE_NAME ?? 'service').replace(/[^a-z0-9]/gi, '-');
    return {
        provide: exports.ORE_METRICS_TOKEN,
        useFactory: () => new MetricsService(service),
    };
}
//# sourceMappingURL=metrics.js.map