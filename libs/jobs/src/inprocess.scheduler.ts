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

export class InProcessScheduler implements Scheduler {
  private timers = new Map<string, NodeJS.Timeout>();
  private handlers = new Map<string, (p: Record<string, unknown>) => Promise<void> | void>();
  private intervals: NodeJS.Timeout[] = [];

  /**
   * @param runner optional cross-replica wrapper for interval ticks. Omitted means "run every
   *   tick in this process", which is correct for a single process and for tests.
   */
  constructor(private readonly runner?: IntervalRunner) {}

  async schedule(name: string, payload: Record<string, unknown>, delayMs: number, jobId: string): Promise<void> {
    this.clear(jobId);
    const t = setTimeout(() => {
      this.timers.delete(jobId);
      const h = this.handlers.get(name);
      if (h) void Promise.resolve(h(payload)).catch((e) => console.error(`[jobs] ${name} failed`, e));
    }, Math.max(0, delayMs));
    t.unref?.();
    this.timers.set(jobId, t);
  }

  async cancel(jobId: string): Promise<void> {
    this.clear(jobId);
  }

  private clear(jobId: string) {
    const t = this.timers.get(jobId);
    if (t) {
      clearTimeout(t);
      this.timers.delete(jobId);
    }
  }

  onProcess(name: string, handler: (p: Record<string, unknown>) => Promise<void> | void): void {
    this.handlers.set(name, handler);
  }

  onInterval(name: string, intervalMs: number, handler: () => Promise<void> | void): void {
    const loop = async () => {
      try {
        const body = async () => { await handler(); };
        if (this.runner) await this.runner(name, body);
        else await body();
      } catch (e) {
        console.error(`[jobs] interval ${name} failed`, e);
      }
    };
    const id = setInterval(() => void loop(), intervalMs);
    id.unref?.();
    this.intervals.push(id);
  }

  async close(): Promise<void> {
    for (const t of this.timers.values()) clearTimeout(t);
    for (const i of this.intervals) clearInterval(i);
    this.timers.clear();
    this.intervals = [];
  }
}
