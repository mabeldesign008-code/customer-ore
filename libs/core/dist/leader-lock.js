"use strict";
/**
 * Cross-replica coordination for periodic jobs, via Postgres advisory locks.
 *
 * `InProcessScheduler` gives every replica its own `setInterval`, so every replica runs every
 * periodic job on every tick. For a settlement sweep or a reconciliation run, that is not a
 * performance problem — it is a correctness one.
 *
 * Advisory locks rather than a lock table: they live in Postgres memory, cost no I/O and take no
 * row locks, and — the property that matters — they are released automatically. A replica that
 * is `kill -9`'d cannot leave a job wedged, which is exactly what a home-made lock table with a
 * "locked_until" column tends to get wrong.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.advisoryLockKey = advisoryLockKey;
exports.withAdvisoryLock = withAdvisoryLock;
exports.pgIntervalRunner = pgIntervalRunner;
const crypto_1 = require("crypto");
/**
 * Map a job name onto the 64-bit integer key advisory locks require.
 *
 * `hashtext()` would do this inside Postgres, but its output is not guaranteed stable across
 * major versions — during a rolling upgrade two replicas could derive different keys for the
 * same job and both run it, which is precisely the bug this prevents. A SHA-256 prefix computed
 * here is identical on every replica regardless of server version.
 */
function advisoryLockKey(name) {
    const digest = (0, crypto_1.createHash)('sha256').update(name).digest();
    // 63 bits, kept positive: the parameter is a signed 64-bit integer.
    return digest.readBigUInt64BE(0) & 0x7fffffffffffffffn;
}
/**
 * Run `fn` only if this replica can take the named lock.
 *
 * **Transaction-scoped** (`pg_try_advisory_xact_lock`), not session-scoped, for two reasons that
 * both bite in production:
 *
 * - TypeORM pools connections, and advisory locks belong to a *session*. A session-scoped
 *   `pg_advisory_lock` taken on one pooled connection and released on another does not unlock —
 *   it emits a warning and leaks the lock until that connection is recycled. Binding the lock to
 *   a transaction removes the question of which connection releases it.
 * - The release is automatic on commit *or* rollback, so a handler that throws — or a replica
 *   that dies mid-tick — frees the lock without any cleanup path having to run.
 *
 * `try` rather than a blocking acquire: a replica that loses skips this tick. Blocking would
 * queue every loser to run the job late, one after another, which is the duplication this
 * exists to stop.
 *
 * Returns `false` when another replica held the lock and `fn` was not run — a normal outcome.
 */
async function withAdvisoryLock(ds, name, fn) {
    // Non-Postgres deployments are single-process by construction; there is nothing to coordinate.
    if (ds.options.type !== 'postgres')
        return { ran: true, result: await fn() };
    const key = advisoryLockKey(name).toString();
    return ds.transaction(async (manager) => {
        const rows = (await manager.query('SELECT pg_try_advisory_xact_lock($1) AS locked', [key]));
        if (rows[0]?.locked !== true)
            return { ran: false };
        return { ran: true, result: await fn() };
    });
}
/**
 * An interval runner that lets exactly one replica execute each tick.
 *
 * Wired into `InProcessScheduler` so periodic jobs become cluster-safe without every caller
 * having to think about it.
 *
 * If the lock backend is unreachable the tick runs anyway. That is deliberate: a duplicated
 * sweep is recoverable, whereas a periodic job that silently stops firing across the entire
 * fleet because Postgres hiccupped is not something anyone would notice until it mattered.
 */
function pgIntervalRunner(ds) {
    return async (jobName, run) => {
        try {
            await withAdvisoryLock(ds, `interval:${jobName}`, run);
        }
        catch (err) {
            console.error(`[jobs] advisory lock unavailable for ${jobName}, running unguarded`, err);
            await run();
        }
    };
}
//# sourceMappingURL=leader-lock.js.map