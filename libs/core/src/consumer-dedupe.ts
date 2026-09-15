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

const TABLE = 'ore_consumer_dedupe';

/** How many recent ids to keep in memory. Bounded, unlike the sets this replaces. */
const CACHE_LIMIT = 10_000;

/** How long a dedupe row is kept. Must comfortably exceed the bus's redelivery window. */
const RETENTION_MS = Number(process.env.CONSUMER_DEDUPE_RETENTION_MS ?? 7 * 24 * 3_600_000);

/** How often expired rows are swept. */
const SWEEP_INTERVAL_MS = Number(process.env.CONSUMER_DEDUPE_SWEEP_MS ?? 6 * 3_600_000);

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
export class InMemoryConsumerDedupe implements ConsumerDedupe {
  private readonly seen = new Set<string>();

  async release(envelopeId: string): Promise<void> {
    this.seen.delete(envelopeId);
  }

  async take(envelopeId: string): Promise<boolean> {
    if (this.seen.has(envelopeId)) return false;
    this.seen.add(envelopeId);
    // Bounded, unlike the raw sets this replaces: drop the oldest insertion when full.
    if (this.seen.size > CACHE_LIMIT) {
      const oldest = this.seen.values().next().value as string | undefined;
      if (oldest !== undefined) this.seen.delete(oldest);
    }
    return true;
  }

  stop(): void {
    this.seen.clear();
  }
}

/** Postgres-backed dedupe, safe across replicas and restarts. */
export class PgConsumerDedupe implements ConsumerDedupe {
  private readonly cache = new Set<string>();
  private sweepTimer: NodeJS.Timeout | null = null;
  private ready: Promise<void> | null = null;

  constructor(
    private readonly ds: DataSource,
    private readonly schema: string,
  ) {}

  private table(): string {
    return `"${this.schema}"."${TABLE}"`;
  }

  private async ensureTable(): Promise<void> {
    if (!this.ready) {
      this.ready = (async () => {
        await this.ds.query(`CREATE TABLE IF NOT EXISTS ${this.table()} (
          "envelopeId" text PRIMARY KEY,
          "createdAt" timestamptz NOT NULL DEFAULT now()
        )`);
        await this.ds.query(`CREATE INDEX IF NOT EXISTS idx_${TABLE}_created ON ${this.table()} ("createdAt")`);
      })();
    }
    return this.ready;
  }

  async take(envelopeId: string): Promise<boolean> {
    // Fast path: this replica has already handled it in the recent past.
    if (this.cache.has(envelopeId)) return false;

    await this.ensureTable();

    // The primary key decides the race, so two replicas hitting the same envelope at the same
    // instant cannot both win. `ON CONFLICT DO NOTHING` makes the loser a no-op rather than an
    // error to catch and interpret.
    const result = (await this.ds.query(
      `INSERT INTO ${this.table()} ("envelopeId") VALUES ($1)
       ON CONFLICT ("envelopeId") DO NOTHING
       RETURNING "envelopeId"`,
      [envelopeId],
    )) as unknown[];

    const inserted = Array.isArray(result) && result.length > 0;
    if (inserted) this.remember(envelopeId);
    return inserted;
  }

  async release(envelopeId: string): Promise<void> {
    this.cache.delete(envelopeId);
    try {
      await this.ds.query(`DELETE FROM ${this.table()} WHERE "envelopeId" = $1`, [envelopeId]);
    } catch (err) {
      // A failed release costs a lost redelivery, which is bad, but throwing here would replace
      // the handler's real error with this one and lose the reason it failed.
      console.warn(`[dedupe] release failed for ${envelopeId}`, err);
    }
  }

  private remember(envelopeId: string): void {
    this.cache.add(envelopeId);
    if (this.cache.size > CACHE_LIMIT) {
      const oldest = this.cache.values().next().value as string | undefined;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
  }

  /** Begin periodic deletion of rows older than the retention window. */
  start(): void {
    if (this.sweepTimer) return;
    this.sweepTimer = setInterval(() => void this.sweep(), SWEEP_INTERVAL_MS);
    this.sweepTimer.unref?.();
  }

  async sweep(): Promise<void> {
    try {
      await this.ensureTable();
      await this.ds.query(
        `DELETE FROM ${this.table()} WHERE "createdAt" < $1`,
        [new Date(Date.now() - RETENTION_MS)],
      );
    } catch (err) {
      // A failed sweep costs disk, never correctness — never let it take the service down.
      console.error('[dedupe] sweep failed', err);
    }
  }

  stop(): void {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
    this.cache.clear();
  }
}

/**
 * Pick the right implementation for the deployment.
 *
 * Postgres gets the durable one; anything else (SQLite dev, tests) gets in-memory, which matches
 * the single-process assumption those environments already make.
 */
export function createConsumerDedupe(ds: DataSource | null, schema: string): ConsumerDedupe {
  if (!ds || ds.options.type !== 'postgres') return new InMemoryConsumerDedupe();
  const dedupe = new PgConsumerDedupe(ds, schema);
  dedupe.start();
  return dedupe;
}
