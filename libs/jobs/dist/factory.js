"use strict";
/** Build scheduler from env. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createScheduler = createScheduler;
const config_1 = require("@ore/config");
const bullmq_scheduler_1 = require("./bullmq.scheduler");
const inprocess_scheduler_1 = require("./inprocess.scheduler");
/**
 * @param intervalRunner cross-replica coordination for the in-process scheduler's periodic jobs.
 *   BullMQ does not need it — repeatable jobs are Redis-coordinated, so exactly one worker picks
 *   up each tick already. The in-process scheduler has no such coordination, and passing nothing
 *   means every replica runs every interval job.
 */
async function createScheduler(env = process.env, intervalRunner) {
    const ore = (0, config_1.loadEnv)(env);
    if (ore.orchestration === 'distributed') {
        const s = new bullmq_scheduler_1.BullMqScheduler(ore.redisUrl);
        await s.ready();
        return s;
    }
    return new inprocess_scheduler_1.InProcessScheduler(intervalRunner);
}
//# sourceMappingURL=factory.js.map