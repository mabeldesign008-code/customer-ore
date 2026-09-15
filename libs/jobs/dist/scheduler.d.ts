/** Job scheduler abstraction: delayed/recurring jobs.
 *  Impls: InProcessScheduler (dev, zero infra) and BullMqScheduler (distributed). */
export interface DelayedJob {
    name: string;
    payload: Record<string, unknown>;
    runAt: Date;
    jobId: string;
}
export interface Scheduler {
    /** Schedule a one-shot delayed job. Same jobId → replaces (idempotent scheduling). */
    schedule(name: string, payload: Record<string, unknown>, delayMs: number, jobId: string): Promise<void>;
    /** Cancel a scheduled job by id (no-op if absent). */
    cancel(jobId: string): Promise<void>;
    /** Register a processor for a job name. */
    onProcess(name: string, handler: (payload: Record<string, unknown>) => Promise<void> | void): void;
    /** Recurring job (cron-ish). intervalMs between end of run and next run. */
    onInterval(name: string, intervalMs: number, handler: () => Promise<void> | void): void;
    close(): Promise<void>;
}
//# sourceMappingURL=scheduler.d.ts.map