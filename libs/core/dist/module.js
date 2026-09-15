"use strict";
/** OreCoreModule — injects shared infra (bus, scheduler, notify, geocoder, paystack,
 *  env, metrics, flags, cache, telemetry) into every service with one import.
 *  In distributed+postgres mode the bus is wrapped in the transactional outbox so
 *  events are never lost between a DB commit and a NATS publish. */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var OreCoreModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OreCoreModule = exports.OreMetricsController = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const bus_1 = require("@ore/bus");
const jobs_1 = require("@ore/jobs");
const notify_1 = require("@ore/notify");
const maps_1 = require("@ore/maps");
const paystack_1 = require("@ore/paystack");
const ore_env_1 = require("./ore-env");
const outbox_1 = require("./outbox");
const leader_lock_1 = require("./leader-lock");
const consumer_dedupe_1 = require("./consumer-dedupe");
const rate_limiter_1 = require("./rate-limiter");
const guards_1 = require("./guards");
const flags_1 = require("./flags");
const metrics_1 = require("./metrics");
const telemetry_1 = require("./telemetry");
const cache_1 = require("./cache");
const permission_guard_1 = require("./permission.guard");
const logger_module_1 = require("./logger.module");
let OreMetricsController = class OreMetricsController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    // Prometheus scraping must not require a user JWT (ops/edge concern).
    index() {
        return this.svc.metrics();
    }
};
exports.OreMetricsController = OreMetricsController;
__decorate([
    (0, common_1.Get)('metrics'),
    (0, guards_1.Public)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OreMetricsController.prototype, "index", null);
exports.OreMetricsController = OreMetricsController = __decorate([
    (0, common_1.Controller)(),
    __param(0, (0, common_1.Inject)(ore_env_1.ORE_METRICS)),
    __metadata("design:paramtypes", [metrics_1.MetricsService])
], OreMetricsController);
let OreCoreModule = OreCoreModule_1 = class OreCoreModule {
    static forRoot(serviceName, env = process.env) {
        const ore = require('@ore/config').loadEnv(env);
        const distributed = ore.orchestration === 'distributed';
        const useOutbox = distributed && ore.dbType === 'postgres';
        const redisUrl = env.REDIS_URL;
        // Identity for internal MAC auth (F-SEC-1): internalFetch signs calls with the
        // calling service's name, and receivers may allowlist callers on it.
        if (!env.ORE_SERVICE_NAME)
            env.ORE_SERVICE_NAME = serviceName;
        /**
         * Throttler storage (audit S-11 / H-6).
         *
         * This used to be in-memory unless `USE_REDIS_THROTTLER=true`, and that variable was set
         * nowhere — so every limit was per-process while the gateway's own `@fastify/rate-limit`
         * layer *was* Redis-backed whenever REDIS_URL existed. Two layers disagreed, and behind
         * `run_cluster.js` or any multi-replica deploy the effective limit multiplied by the
         * instance count. That is worst on the unauthenticated Google-proxy endpoints
         * (`/tracking/geocode`, `/places/autocomplete`, `/places/details`, audit H-7): their 20/min
         * budget protects a paid Maps key, and per-process storage let a distributed caller spend
         * 20 × replicas per minute per IP against it.
         *
         * Redis is now the default whenever REDIS_URL is set. Set `USE_REDIS_THROTTLER=false` to
         * opt back into per-process storage for zero-infra local dev.
         */
        const throttlerModule = require('@nestjs/throttler').ThrottlerModule.forRootAsync({
            useFactory: () => {
                const options = {
                    throttlers: [{ ttl: 60000, limit: 100 }], // default: 100 reqs / min
                };
                const wantRedis = redisUrl && env.USE_REDIS_THROTTLER !== 'false';
                if (wantRedis) {
                    try {
                        const { ThrottlerStorageRedisService } = require('@nest-lab/throttler-storage-redis');
                        options.storage = new ThrottlerStorageRedisService(redisUrl);
                    }
                    catch (err) {
                        // Never silently fall back: a throttler that quietly becomes per-process is the
                        // exact bug this block exists to remove.
                        throw new Error(`REDIS_URL is set but @nest-lab/throttler-storage-redis failed to load, so rate limits ` +
                            `would silently become per-process (audit S-11). Install the package or set ` +
                            `USE_REDIS_THROTTLER=false to opt in deliberately: ${err.message}`);
                    }
                }
                return options;
            },
        });
        return {
            module: OreCoreModule_1,
            imports: [throttlerModule, logger_module_1.OreLoggerModule],
            controllers: [OreMetricsController],
            providers: [
                (0, ore_env_1.oreEnvProvider)(env),
                {
                    // OreThrottlerGuard (audit F-BUG-8): the stock guard keyed every request by
                    // source IP with one shared 100/min budget, and all inter-service traffic
                    // shares one host IP — so one busy service exhausted the bucket and 429'd its
                    // own dependencies. The Ore guard exempts requests carrying a VALID internal
                    // key; external traffic keeps the per-IP budget.
                    provide: require('@nestjs/core').APP_GUARD,
                    useClass: require('./throttler.guard').OreThrottlerGuard,
                },
                {
                    provide: ore_env_1.ORE_BUS,
                    inject: [{ token: typeorm_1.DataSource, optional: true }],
                    useFactory: async (ds) => {
                        const bus = await (0, bus_1.createBus)(serviceName, env);
                        if (useOutbox && ds) {
                            const outbox = new outbox_1.OutboxBus(bus, ds, serviceName);
                            outbox.start();
                            return outbox;
                        }
                        return bus;
                    },
                },
                {
                    provide: ore_env_1.ORE_SCHEDULER,
                    inject: [{ token: typeorm_1.DataSource, optional: true }],
                    // The in-process scheduler gives every replica its own setInterval, so without a
                    // cross-replica runner every replica fires every periodic job. Postgres advisory
                    // locks settle it; BullMQ deployments already coordinate through Redis and ignore it.
                    useFactory: async (ds) => (0, jobs_1.createScheduler)(env, ds ? (0, leader_lock_1.pgIntervalRunner)(ds) : undefined),
                },
                {
                    // Replaces the per-service `new Set<string>()` consumers used to dedupe with. That set
                    // died on restart, was not shared between replicas, and wiped itself wholesale at
                    // 10 000 entries — so the next redelivery of any of those events was reprocessed.
                    provide: ore_env_1.ORE_DEDUPE,
                    inject: [{ token: typeorm_1.DataSource, optional: true }, ore_env_1.ORE_BUS],
                    useFactory: (ds, bus) => {
                        const dedupe = (0, consumer_dedupe_1.createConsumerDedupe)(ds, serviceName);
                        // A handler that throws must give its claim back, or the redelivery is swallowed by
                        // the claim and the event is lost with no retry and no DLQ entry (audit F-BUS-1).
                        // Wired here because this is where the two halves meet; the bus applies it to every
                        // consumer without any of them knowing.
                        bus.setClaimReleaser?.((envelopeId) => dedupe.release(envelopeId));
                        return dedupe;
                    },
                },
                {
                    // Shared with the HTTP throttler's Redis instance when one is configured. Without it
                    // a limit of N per phone silently becomes N per replica.
                    provide: ore_env_1.ORE_RATE_LIMIT,
                    useFactory: () => (0, rate_limiter_1.createRateLimiter)(env.redisUrl),
                },
                {
                    // Every service gets a working audit sink, not just auth. A service can still
                    // override it (auth does, writing straight to its own table).
                    provide: permission_guard_1.PERMISSION_AUDIT_SINK,
                    useClass: permission_guard_1.RemotePermissionAuditSink,
                },
                { provide: ore_env_1.ORE_NOTIFY, useFactory: () => (0, notify_1.createNotifyClient)(env) },
                // Email is a separate client from push/SMS: different provider, different failure
                // mode (deliverability, not delivery), and it needs List-Unsubscribe headers.
                { provide: ore_env_1.ORE_EMAIL, useFactory: () => (0, notify_1.createEmailClient)(env) },
                { provide: ore_env_1.ORE_GEOCODER, useFactory: () => (0, maps_1.createGeocoder)(env) },
                { provide: ore_env_1.ORE_PAYSTACK, useFactory: () => new paystack_1.PaystackClient(env) },
                (0, metrics_1.metricsProvider)(env),
                (0, flags_1.flagsProvider)(env),
                (0, cache_1.cacheProvider)(env),
                telemetry_1.telemetryInterceptorProvider,
                {
                    // Wires the process-wide standing cache (owned by AuthGuard) to the bus, so an
                    // admin suspension invalidates it here instead of going stale for a TTL. Done as
                    // a provider rather than a lifecycle hook because the singleton lives at module
                    // scope in guards.ts, outside the Nest container.
                    provide: 'ORE_STANDING_WATCH',
                    useFactory: async (bus) => {
                        const { standing } = require('./guards');
                        await standing.watch(bus);
                        return true;
                    },
                    inject: [ore_env_1.ORE_BUS],
                },
            ],
            exports: [
                logger_module_1.OreLoggerModule,
                // Exported, not just provided: @Optional() injection resolves to the no-op default
                // when the token is merely out of scope, and it does so silently. Providing it without
                // exporting it is how a guard ends up enforcing permissions with no audit trail.
                permission_guard_1.PERMISSION_AUDIT_SINK,
                ore_env_1.ORE_ENV,
                ore_env_1.ORE_BUS,
                ore_env_1.ORE_SCHEDULER,
                ore_env_1.ORE_DEDUPE,
                ore_env_1.ORE_RATE_LIMIT,
                ore_env_1.ORE_NOTIFY,
                ore_env_1.ORE_EMAIL,
                ore_env_1.ORE_GEOCODER,
                ore_env_1.ORE_PAYSTACK,
                ore_env_1.ORE_METRICS,
                ore_env_1.ORE_FLAGS,
                ore_env_1.ORE_CACHE,
            ],
        };
    }
};
exports.OreCoreModule = OreCoreModule;
exports.OreCoreModule = OreCoreModule = OreCoreModule_1 = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({})
], OreCoreModule);
//# sourceMappingURL=module.js.map