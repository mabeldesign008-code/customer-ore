/** Build the bus from env: distributed → NATS, otherwise in-process. */

import { loadEnv } from '@ore/config';
import { Bus, InProcessBus } from './bus';
import { NatsBus } from './nats.bus';

export async function createBus(serviceName: string, env: Record<string, string | undefined> = process.env): Promise<Bus> {
  const ore = loadEnv(env);
  if (ore.orchestration === 'distributed') {
    const bus = new NatsBus(ore.natsUrl, serviceName, { user: ore.natsUser, pass: ore.natsPass }, ore.busSigningKey);
    await bus.connect();
    return bus;
  }
  return new InProcessBus();
}
