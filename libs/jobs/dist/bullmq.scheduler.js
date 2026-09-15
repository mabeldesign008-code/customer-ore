"use strict";
/** Distributed scheduler: BullMQ on Redis. Durable, retryable, production shape. */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BullMqScheduler = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
class BullMqScheduler {
    connection;
    queues = new Map();
    workers = [];
    handlers = new Map();
    constructor(redisUrl) {
        this.connection = new ioredis_1.default(redisUrl, { maxRetriesPerRequest: null });
    }
    async ready() {
        await this.connection.ping();
    }
    queue(name) {
        let q = this.queues.get(name);
        if (!q) {
            q = new bullmq_1.Queue(name, { connection: this.connection });
            this.queues.set(name, q);
        }
        return q;
    }
    async schedule(name, payload, delayMs, jobId) {
        await this.queue(name).add(name, payload, { jobId, delay: Math.max(0, delayMs), removeOnComplete: 1000, removeOnFail: 5000 });
    }
    async cancel(jobId) {
        for (const q of this.queues.values()) {
            const job = await q.getJob(jobId);
            if (job) {
                await job.remove();
                return;
            }
        }
    }
    onProcess(name, handler) {
        this.handlers.set(name, handler);
        const worker = new bullmq_1.Worker(name, async (job) => {
            const h = this.handlers.get(name);
            if (h)
                await h(job.data);
        }, { connection: this.connection });
        worker.on('failed', (job, err) => console.error(`[jobs] ${name} job ${job?.id} failed`, err));
        this.workers.push(worker);
    }
    onInterval(name, intervalMs, handler) {
        const q = this.queue(name);
        const id = `interval-${name}`;
        // bullmq v5+ scheduling API: repeatable jobs via upsertJobScheduler
        void q.upsertJobScheduler(id, { every: intervalMs }, { name, data: {} }).catch((err) => console.error(`[jobs] upsertJobScheduler ${name} failed`, err));
        this.onProcess(name, handler);
    }
    async close() {
        for (const w of this.workers)
            await w.close();
        for (const q of this.queues.values())
            await q.close();
        await this.connection.quit();
    }
}
exports.BullMqScheduler = BullMqScheduler;
//# sourceMappingURL=bullmq.scheduler.js.map