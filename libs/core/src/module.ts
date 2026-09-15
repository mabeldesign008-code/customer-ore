/** OreCoreModule — injects shared infra (bus, scheduler, notify, geocoder, paystack,
 *  env, metrics, flags, cache, telemetry) into every service with one import.
 *  In distributed+postgres mode the bus is wrapped in the transactional outbox so
 *  events are never lost between a DB commit and a NATS publish. */

import { Controller, DynamicModule, Get, Global, Inject, Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Bus, createBus } from '@ore/bus';
import { createScheduler } from '@ore/jobs';
import { createNotifyClient, createEmailClient } from '@ore/notify';
import { createGeocoder } from '@ore/maps';
import { PaystackClient } from '@ore/paystack';
import {
  ORE_BUS,
  ORE_ENV,
  ORE_FLAGS,
  ORE_GEOCODER,
  ORE_CACHE,
  ORE_METRICS,
  ORE_NOTIFY,
  ORE_EMAIL,
  ORE_PAYSTACK,
  ORE_SCHEDULER,
  ORE_DEDUPE,
  ORE_RATE_LIMIT,
  oreEnvProvider,
} from './ore-env';
import { OutboxBus } from './outbox';
import { pgIntervalRunner } from './leader-lock';
import { createConsumerDedupe } from './consumer-dedupe';
import { createRateLimiter } from './rate-limiter';
import { Public } from './guards';
import { FlagsService, flagsProvider } from './flags';
import { MetricsService, metricsProvider } from './metrics';
import { telemetryInterceptorProvider } from './telemetry';
import { cacheProvider } from './cache';
import { PERMISSION_AUDIT_SINK, RemotePermissionAuditSink } from './permission.guard';
import { OreLoggerModule } from './logger.module';

@Controller()
export class OreMetricsController {
  constructor(@Inject(ORE_METRICS) private readonly svc: MetricsService) {}

  // Prometheus scraping must not require a user JWT (ops/edge concern).
  @Get('metrics')
  @Public()
  index(): Promise<string> {
    return this.svc.metrics();
  }
}

@Global()
@Module({})
export class OreCoreModule {
  static forRoot(serviceName: string, env: Record<string, string | undefined> = process.env): DynamicModule {
    const ore = require('@ore/config').loadEnv(env) as { orchestration: string; dbType: string };
    const distributed = ore.orchestration === 'distributed';
    const useOutbox = distributed && ore.dbType === 'postgres';
    const redisUrl = env.REDIS_URL;

    // Identity for internal MAC auth (F-SEC-1): internalFetch signs calls with the
    // calling service's name, and receivers may allowlist callers on it.
    if (!env.ORE_SERVICE_NAME) env.ORE_SERVICE_NAME = serviceName;

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
        const options: any = {
          throttlers: [{ ttl: 60000, limit: 100 }], // default: 100 reqs / min
        };
        const wantRedis = redisUrl && env.USE_REDIS_THROTTLER !== 'false';
        if (wantRedis) {
          try {
            const { ThrottlerStorageRedisService } = require('@nest-lab/throttler-storage-redis');
            options.storage = new ThrottlerStorageRedisService(redisUrl);
          } catch (err) {
            // Never silently fall back: a throttler that quietly becomes per-process is the
            // exact bug this block exists to remove.
            throw new Error(
              `REDIS_URL is set but @nest-lab/throttler-storage-redis failed to load, so rate limits ` +
                `would silently become per-process (audit S-11). Install the package or set ` +
                `USE_REDIS_THROTTLER=false to opt in deliberately: ${(err as Error).message}`,
            );
          }
        }
        return options;
      },
    });

    return {
      module: OreCoreModule,
      imports: [throttlerModule, OreLoggerModule],
      controllers: [OreMetricsController],
      providers: [
        oreEnvProvider(env),
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
          provide: ORE_BUS,
          inject: [{ token: DataSource, optional: true }],
          useFactory: async (ds: DataSource | null) => {
            const bus = await createBus(serviceName, env);
            if (useOutbox && ds) {
              const outbox = new OutboxBus(bus, ds, serviceName);
              outbox.start();
              return outbox;
            }
            return bus;
          },
        },
        {
          provide: ORE_SCHEDULER,
          inject: [{ token: DataSource, optional: true }],
          // The in-process scheduler gives every replica its own setInterval, so without a
          // cross-replica runner every replica fires every periodic job. Postgres advisory
          // locks settle it; BullMQ deployments already coordinate through Redis and ignore it.
          useFactory: async (ds: DataSource | null) =>
            createScheduler(env, ds ? pgIntervalRunner(ds) : undefined),
        },
        {
          // Replaces the per-service `new Set<string>()` consumers used to dedupe with. That set
          // died on restart, was not shared between replicas, and wiped itself wholesale at
          // 10 000 entries — so the next redelivery of any of those events was reprocessed.
          provide: ORE_DEDUPE,
          inject: [{ token: DataSource, optional: true }, ORE_BUS],
          useFactory: (ds: DataSource | null, bus: Bus) => {
            const dedupe = createConsumerDedupe(ds, serviceName);
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
          provide: ORE_RATE_LIMIT,
          useFactory: () => createRateLimiter(env.redisUrl),
        },
        {
          // Every service gets a working audit sink, not just auth. A service can still
          // override it (auth does, writing straight to its own table).
          provide: PERMISSION_AUDIT_SINK,
          useClass: RemotePermissionAuditSink,
        },
        { provide: ORE_NOTIFY, useFactory: () => createNotifyClient(env) },
        // Email is a separate client from push/SMS: different provider, different failure
        // mode (deliverability, not delivery), and it needs List-Unsubscribe headers.
        { provide: ORE_EMAIL, useFactory: () => createEmailClient(env) },
        { provide: ORE_GEOCODER, useFactory: () => createGeocoder(env) },
        { provide: ORE_PAYSTACK, useFactory: () => new PaystackClient(env) },
        metricsProvider(env),
        flagsProvider(env),
        cacheProvider(env),
        telemetryInterceptorProvider,
        {
          // Wires the process-wide standing cache (owned by AuthGuard) to the bus, so an
          // admin suspension invalidates it here instead of going stale for a TTL. Done as
          // a provider rather than a lifecycle hook because the singleton lives at module
          // scope in guards.ts, outside the Nest container.
          provide: 'ORE_STANDING_WATCH',
          useFactory: async (bus: unknown) => {
            const { standing } = require('./guards') as { standing: { watch: (b: unknown) => Promise<void> } };
            await standing.watch(bus);
            return true;
          },
          inject: [ORE_BUS],
        },
      ],
      exports: [
        OreLoggerModule,
        // Exported, not just provided: @Optional() injection resolves to the no-op default
        // when the token is merely out of scope, and it does so silently. Providing it without
        // exporting it is how a guard ends up enforcing permissions with no audit trail.
        PERMISSION_AUDIT_SINK,
        ORE_ENV,
        ORE_BUS,
        ORE_SCHEDULER,
        ORE_DEDUPE,
        ORE_RATE_LIMIT,
        ORE_NOTIFY,
        ORE_EMAIL,
        ORE_GEOCODER,
        ORE_PAYSTACK,
        ORE_METRICS,
        ORE_FLAGS,
        ORE_CACHE,
      ],
    };
  }
}
