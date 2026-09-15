/** Zero-infra scheduler: setTimeout-backed. For light dev + tests. */
import { Scheduler } from './scheduler';
/**
 * Wraps the execution of one interval tick.
 *
 * Every replica running this scheduler owns its own `setInterval`, so without coordination every
 * replica runs every periodic job on every tick — settlement sweeps, reconciliation, expiry
 * runs, all duplicated N ways.
 *
 * A *wrapper* rather than a boolean "may I run?" check, because the lock has to be held for the
 * duration of the work. A guard that returned true and let go would leave the tick unprotected
 * for exactly the interval it was meant to protect. Implementations may decline to call `run`.
 *
 * Injected rather than built in: the lock belongs to whatever coordination substrate the
 * deployment has. `libs/core` supplies a Postgres advisory-lock implementation.
 */
export type IntervalRunner = (jobName: string, run: () => Promise<void>) => Promise<void>;
export declare class InProcessScheduler implements Scheduler {
    private readonly runner?;
    private timers;
    private handlers;
    private intervals;
    /**
     * @param runner optional cross-replica wrapper for interval ticks. Omitted means "run every
     *   tick in this process", which is correct for a single process and for tests.
     */
    constructor(runner?: IntervalRunner | undefined);
    schedule(name: string, payload: Record<string, unknown>, delayMs: number, jobId: string): Promise<void>;
    cancel(jobId: string): Promise<void>;
    private clear;
    onProcess(name: string, handler: (p: Record<string, unknown>) => Promise<void> | void): void;
    onInterval(name: string, intervalMs: number, handler: () => Promise<void> | void): void;
    close(): Promise<void>;
}
//# sourceMappingURL=inprocess.scheduler.d.ts.map