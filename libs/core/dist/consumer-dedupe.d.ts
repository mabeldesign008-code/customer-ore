/**
 * Durable, cross-replica dedupe for event consumers.
 *
 * Six services each kept `private readonly processed = new Set<string>()` and guarded their
 * handlers with it. That set has three problems, and the bus is at-least-once so all three are
 * reachable in normal operation:
 *
 * 1. **It dies with the process.** After a deploy or a crash, JetStream redelivers anything
 *    unacked and the fresh replica has no memory of having handled it.
 * 2. **It is per-replica.** Two replicas subscribed to the same subject each hold their own set,
 *    so an event fanned out to both is processed twice however well each one dedupes.
 * 3. **It grows without bound.** Nothing ever removes an entry, so it is a slow memory leak in
 *    every long-lived service.
 *
 * This replaces it with a row in a per-service table, keyed on the envelope id, with an
 * in-memory cache in front so the common "already seen, very recently" case still costs nothing.
 *
 * The durable claim is an INSERT, not a SELECT-then-INSERT: the primary key does the mutual
 * exclusion, so two replicas racing the same envelope resolve correctly at the database rather
 * than in a check-then-act window that both would pass.
 */
import { DataSource } from 'typeorm';
export interface ConsumerDedupe {
    /**
     * Claim an envelope for processing.
     *
     * Returns `true` exactly once per envelope id across every replica and every restart; `false`
     * means someone else has it. Callers should `return` on `false`.
     */
    take(envelopeId: string): Promise<boolean>;
    /**
     * Give a claim back after the handler failed.
     *
     * `take` commits its row immediately and outside the handler's transaction, so without this
     * a handler that threw kept the claim: the broker redelivered, `take` returned false, and the
     * handler returned *successfully* — the event was acked and silently dropped. Not retried,
     * not dead-lettered, no trace. Releasing the claim restores the at-least-once delivery the
     * handlers are written to expect (audit F-BUS-1).
     */
    release(envelopeId: string): Promise<void>;
    stop(): void;
}
/**
 * In-memory implementation for single-process and test use.
 *
 * Honest about what it is: it carries the same restart and multi-replica weaknesses as the sets
 * it replaces, which is fine when there is exactly one process and no durability expectation.
 * `createConsumerDedupe` picks this only when there is no Postgres DataSource to use.
 */
export declare class InMemoryConsumerDedupe implements ConsumerDedupe {
    private readonly seen;
    release(envelopeId: string): Promise<void>;
    take(envelopeId: string): Promise<boolean>;
    stop(): void;
}
/** Postgres-backed dedupe, safe across replicas and restarts. */
export declare class PgConsumerDedupe implements ConsumerDedupe {
    private readonly ds;
    private readonly schema;
    private readonly cache;
    private sweepTimer;
    private ready;
    constructor(ds: DataSource, schema: string);
    private table;
    private ensureTable;
    take(envelopeId: string): Promise<boolean>;
    release(envelopeId: string): Promise<void>;
    private remember;
    /** Begin periodic deletion of rows older than the retention window. */
    start(): void;
    sweep(): Promise<void>;
    stop(): void;
}
/**
 * Pick the right implementation for the deployment.
 *
 * Postgres gets the durable one; anything else (SQLite dev, tests) gets in-memory, which matches
 * the single-process assumption those environments already make.
 */
export declare function createConsumerDedupe(ds: DataSource | null, schema: string): ConsumerDedupe;
//# sourceMappingURL=consumer-dedupe.d.ts.map