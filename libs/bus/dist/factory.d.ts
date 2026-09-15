/** Build the bus from env: distributed → NATS, otherwise in-process. */
import { Bus } from './bus';
export declare function createBus(serviceName: string, env?: Record<string, string | undefined>): Promise<Bus>;
//# sourceMappingURL=factory.d.ts.map