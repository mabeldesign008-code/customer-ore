"use strict";
/** Zero-infra scheduler: setTimeout-backed. For light dev + tests. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InProcessScheduler = void 0;
class InProcessScheduler {
    runner;
    timers = new Map();
    handlers = new Map();
    intervals = [];
    /**
     * @param runner optional cross-replica wrapper for interval ticks. Omitted means "run every
     *   tick in this process", which is correct for a single process and for tests.
     */
    constructor(runner) {
        this.runner = runner;
    }
    async schedule(name, payload, delayMs, jobId) {
        this.clear(jobId);
        const t = setTimeout(() => {
            this.timers.delete(jobId);
            const h = this.handlers.get(name);
            if (h)
                void Promise.resolve(h(payload)).catch((e) => console.error(`[jobs] ${name} failed`, e));
        }, Math.max(0, delayMs));
        t.unref?.();
        this.timers.set(jobId, t);
    }
    async cancel(jobId) {
        this.clear(jobId);
    }
    clear(jobId) {
        const t = this.timers.get(jobId);
        if (t) {
            clearTimeout(t);
            this.timers.delete(jobId);
        }
    }
    onProcess(name, handler) {
        this.handlers.set(name, handler);
    }
    onInterval(name, intervalMs, handler) {
        const loop = async () => {
            try {
                const body = async () => { await handler(); };
                if (this.runner)
                    await this.runner(name, body);
                else
                    await body();
            }
            catch (e) {
                console.error(`[jobs] interval ${name} failed`, e);
            }
        };
        const id = setInterval(() => void loop(), intervalMs);
        id.unref?.();
        this.intervals.push(id);
    }
    async close() {
        for (const t of this.timers.values())
            clearTimeout(t);
        for (const i of this.intervals)
            clearInterval(i);
        this.timers.clear();
        this.intervals = [];
    }
}
exports.InProcessScheduler = InProcessScheduler;
//# sourceMappingURL=inprocess.scheduler.js.map