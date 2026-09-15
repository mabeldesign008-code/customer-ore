/** Build scheduler from env. */

import { loadEnv } from '@ore/config';
import { BullMqScheduler } from './bullmq.scheduler';
import { InProcessScheduler, IntervalRunner } from './inprocess.scheduler';
import { Scheduler } from './scheduler';

/**
 * @param intervalRunner cross-replica coordination for the in-process scheduler's periodic jobs.
 *   BullMQ does not need it — repeatable jobs are Redis-coordinated, so exactly one worker picks
 *   up each tick already. The in-process scheduler has no such coordination, and passing nothing
 *   means every replica runs every interval job.
 */
export async function createScheduler(
  env: Record<string, string | undefined> = process.env,
  intervalRunner?: IntervalRunner,
): Promise<Scheduler> {
  const ore = loadEnv(env);
  if (ore.orchestration === 'distributed') {
    const s = new BullMqScheduler(ore.redisUrl);
    await s.ready();
    return s;
  }
  return new InProcessScheduler(intervalRunner);
}
