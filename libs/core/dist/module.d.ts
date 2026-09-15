/** OreCoreModule — injects shared infra (bus, scheduler, notify, geocoder, paystack,
 *  env, metrics, flags, cache, telemetry) into every service with one import.
 *  In distributed+postgres mode the bus is wrapped in the transactional outbox so
 *  events are never lost between a DB commit and a NATS publish. */
import { DynamicModule } from '@nestjs/common';
import { MetricsService } from './metrics';
export declare class OreMetricsController {
    private readonly svc;
    constructor(svc: MetricsService);
    index(): Promise<string>;
}
export declare class OreCoreModule {
    static forRoot(serviceName: string, env?: Record<string, string | undefined>): DynamicModule;
}
//# sourceMappingURL=module.d.ts.map