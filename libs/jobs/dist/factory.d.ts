/** Build scheduler from env. */
import { IntervalRunner } from './inprocess.scheduler';
import { Scheduler } from './scheduler';
/**
 * @param intervalRunner cross-replica coordination for the in-process scheduler's periodic jobs.
 *   BullMQ does not need it — repeatable jobs are Redis-coordinated, so exactly one worker picks
 *   up each tick already. The in-process scheduler has no such coordination, and passing nothing
 *   means every replica runs every interval job.
 */
export declare function createScheduler(env?: Record<string, string | undefined>, intervalRunner?: IntervalRunner): Promise<Scheduler>;
//# sourceMappingURL=factory.d.ts.map