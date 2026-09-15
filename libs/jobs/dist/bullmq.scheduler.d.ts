/** Distributed scheduler: BullMQ on Redis. Durable, retryable, production shape. */
import { Scheduler } from './scheduler';
export declare class BullMqScheduler implements Scheduler {
    private connection;
    private queues;
    private workers;
    private handlers;
    constructor(redisUrl: string);
    ready(): Promise<void>;
    private queue;
    schedule(name: string, payload: Record<string, unknown>, delayMs: number, jobId: string): Promise<void>;
    cancel(jobId: string): Promise<void>;
    onProcess(name: string, handler: (p: Record<string, unknown>) => Promise<void> | void): void;
    onInterval(name: string, intervalMs: number, handler: () => Promise<void> | void): void;
    close(): Promise<void>;
}
//# sourceMappingURL=bullmq.scheduler.d.ts.map