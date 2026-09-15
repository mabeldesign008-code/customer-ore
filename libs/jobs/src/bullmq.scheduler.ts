/** Distributed scheduler: BullMQ on Redis. Durable, retryable, production shape. */

import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { Scheduler } from './scheduler';

export class BullMqScheduler implements Scheduler {
  private connection: IORedis;
  private queues = new Map<string, Queue>();
  private workers: Worker[] = [];
  private handlers = new Map<string, (p: Record<string, unknown>) => Promise<void> | void>();

  constructor(redisUrl: string) {
    this.connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  }

  async ready(): Promise<void> {
    await this.connection.ping();
  }

  private queue(name: string): Queue {
    let q = this.queues.get(name);
    if (!q) {
      q = new Queue(name, { connection: this.connection });
      this.queues.set(name, q);
    }
    return q;
  }

  async schedule(name: string, payload: Record<string, unknown>, delayMs: number, jobId: string): Promise<void> {
    await this.queue(name).add(
      name,
      payload,
      { jobId, delay: Math.max(0, delayMs), removeOnComplete: 1000, removeOnFail: 5000 },
    );
  }

  async cancel(jobId: string): Promise<void> {
    for (const q of this.queues.values()) {
      const job = await q.getJob(jobId);
      if (job) {
        await job.remove();
        return;
      }
    }
  }

  onProcess(name: string, handler: (p: Record<string, unknown>) => Promise<void> | void): void {
    this.handlers.set(name, handler);
    const worker = new Worker(
      name,
      async (job) => {
        const h = this.handlers.get(name);
        if (h) await h(job.data as Record<string, unknown>);
      },
      { connection: this.connection },
    );
    worker.on('failed', (job, err) => console.error(`[jobs] ${name} job ${job?.id} failed`, err));
    this.workers.push(worker);
  }

  onInterval(name: string, intervalMs: number, handler: () => Promise<void> | void): void {
    const q = this.queue(name);
    const id = `interval-${name}`;
    // bullmq v5+ scheduling API: repeatable jobs via upsertJobScheduler
    void q.upsertJobScheduler(
      id,
      { every: intervalMs },
      { name, data: {} },
    ).catch((err) => console.error(`[jobs] upsertJobScheduler ${name} failed`, err));
    this.onProcess(name, handler);
  }

  async close(): Promise<void> {
    for (const w of this.workers) await w.close();
    for (const q of this.queues.values()) await q.close();
    await this.connection.quit();
  }
}
