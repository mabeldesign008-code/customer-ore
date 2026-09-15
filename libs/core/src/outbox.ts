/** Transactional Outbox — events are written to a per-service `ore_outbox` table in
 *  the SAME transaction as the business data, then a relay publishes them to the
 *  message bus at-least-once. If a message exhausts its delivery attempts it is
 *  marked failed and copied to the DLQ subject for replay/analysis.
 *
 *  Enabled in distributed + postgres mode by OreCoreModule; sqlite/dev keeps the
 *  plain bus. */

import { randomUUID } from 'crypto';
import { DataSource, EntityManager } from 'typeorm';
import { getEntityManagerByDataSourceName, getTransactionalContext } from 'typeorm-transactional/dist/common';
import { Bus, ClaimReleaser } from '@ore/bus';
import { EventEnvelope, EventName } from '@ore/contracts';

/**
 * The EntityManager the current code runs under — the ambient typeorm-transactional
 * transaction when there is one, else the raw DataSource. This is what makes the outbox
 * actually transactional (audit F-ARCH-1): enqueue() previously always hit
 * `this.ds.query()`, a NEW connection outside the caller's `@Transaction()`, so a crash
 * between the business commit and the outbox insert lost the event (or left business
 * state without one). Routing through the ambient manager makes the outbox row commit
 * or roll back with the business data.
 */
function ambientExecutor(ds: DataSource): DataSource | EntityManager {
  try {
    const manager = getEntityManagerByDataSourceName(getTransactionalContext(), 'default');
    return manager ?? ds;
  } catch {
    return ds;
  }
}

const OUTBOX_TABLE = 'ore_outbox';
const MAX_ATTEMPTS = 10;
const RELAY_INTERVAL_MS = 1_500;
const BATCH_SIZE = 100;
/**
 * How long a row may sit in `claiming` before another relay may take it.
 *
 * Sized against the 1.5 s relay interval: long enough that an ordinarily slow publish is never
 * stolen mid-flight, short enough that a relay killed mid-batch has its work picked up within a
 * minute rather than stranding events. Overridable because the right value depends on the bus's
 * publish timeout, which is deployment-specific.
 */
const CLAIM_TIMEOUT_MS = Number(process.env.OUTBOX_CLAIM_TIMEOUT_MS ?? 60_000);
// Kept outside `ore.evt.>` — NATS JetStream rejects overlapping stream subjects.
const DLQ_SUBJECT_PREFIX = 'ore.dlq';

export interface OutboxRow {
  id: string;
  envelopeId: string;
  eventName: string;
  payload: unknown;
  status: 'pending' | 'claiming' | 'sent' | 'failed';
  attempts: number;
  error?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function tableName(schema: string): string {
  return `"${schema}"."${OUTBOX_TABLE}"`;
}

/** Creates the outbox table for a service schema. */
export async function ensureOutboxTable(ds: DataSource, schema: string): Promise<void> {
  const has = await ds.query(
    `SELECT to_regclass('${schema}.${OUTBOX_TABLE}') AS t`,
  );
  if (has[0]?.t) {
    // The table predates the exclusive-claim fix. Add the column it needs rather than leaving
    // `claim()` to fail on every existing deployment — this runs on every boot, so it has to be
    // idempotent and cheap.
    await ds.query(`ALTER TABLE ${tableName(schema)} ADD COLUMN IF NOT EXISTS "claimedAt" timestamptz`);
    await ds.query(`CREATE INDEX IF NOT EXISTS idx_${OUTBOX_TABLE}_claim ON ${tableName(schema)} (status, "claimedAt")`);
    return;
  }
  await ds.query(`CREATE TABLE ${tableName(schema)} (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "envelopeId" text NOT NULL,
    "eventName" text NOT NULL,
    payload jsonb NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    attempts integer NOT NULL DEFAULT 0,
    error text,
    "claimedAt" timestamptz,
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now()
  )`);
  await ds.query(`CREATE INDEX IF NOT EXISTS idx_${OUTBOX_TABLE}_status ON ${tableName(schema)} (status, "createdAt")`);
  await ds.query(`CREATE INDEX IF NOT EXISTS idx_${OUTBOX_TABLE}_claim ON ${tableName(schema)} (status, "claimedAt")`);
}

export class OutboxStore {
  constructor(
    private readonly ds: DataSource,
    private readonly schema: string,
  ) {}

  async enqueue(name: EventName, payload: unknown, envelopeId: string): Promise<void> {
    await ambientExecutor(this.ds).query(
      `INSERT INTO ${tableName(this.schema)} ("envelopeId", "eventName", payload, status, attempts)
       VALUES ($1, $2, $3::jsonb, 'pending', 0)`,
      [envelopeId, name, JSON.stringify(payload)],
    );
  }

  /**
   * Reserve a batch of pending events for this relay instance, exclusively.
   *
   * This used to set `updatedAt` and nothing else. The row stayed `pending`, so every relay
   * instance selected the same batch and published the same events — the outbox promised
   * at-least-once and quietly delivered N-times-once, where N is the replica count. The comment
   * claimed concurrent relays "re-check status"; nothing did.
   *
   * Two mechanisms make the claim exclusive:
   *
   * - `FOR UPDATE SKIP LOCKED` on the inner select. Concurrent relays skip rows another
   *   transaction holds instead of blocking on them, so they take disjoint batches and neither
   *   waits. This is why the subquery cannot be a plain `IN (SELECT ...)`.
   * - The status moves to `claiming`, so a relay that reads the table between the claim and the
   *   publish does not see the row as available.
   *
   * Rows stuck in `claiming` are reclaimed after `CLAIM_TIMEOUT_MS`. Without that, a relay that
   * dies mid-publish would strand its batch forever — the failure mode this exists to prevent is
   * *lost* events, and stranded-in-claiming is exactly that. The window errs short deliberately:
   * the bus is already at-least-once and consumers dedupe, so a rare double-publish is a
   * tolerated cost while a lost event is not.
   */
  async claim(limit = BATCH_SIZE): Promise<OutboxRow[]> {
    const staleBefore = new Date(Date.now() - CLAIM_TIMEOUT_MS);
    const rows = (await this.ds.query(
      `UPDATE ${tableName(this.schema)} SET status = 'claiming', "claimedAt" = now(), "updatedAt" = now()
       WHERE id IN (
         SELECT id FROM ${tableName(this.schema)}
         WHERE attempts < $2
           AND (status = 'pending' OR (status = 'claiming' AND "claimedAt" < $3))
         ORDER BY "createdAt" ASC LIMIT $1
         FOR UPDATE SKIP LOCKED
       ) RETURNING id, "envelopeId" AS "envelopeId", "eventName" AS "eventName",
         payload, status, attempts, error, "createdAt" AS "createdAt", "updatedAt" AS "updatedAt"`,
      [limit, MAX_ATTEMPTS, staleBefore],
    )) as OutboxRow[];
    // TypeORM UPDATE … RETURNING returns [[rows], affected] for pg driver.
    return Array.isArray(rows) && Array.isArray(rows[0]) ? (rows[0] as OutboxRow[]) : (rows as OutboxRow[]);
  }

  async markSent(id: string): Promise<void> {
    await this.ds.query(
      `UPDATE ${tableName(this.schema)} SET status = 'sent', attempts = attempts + 1, "claimedAt" = NULL, "updatedAt" = now() WHERE id = $1`,
      [id],
    );
  }

  /**
   * Release a failed claim back to `pending` so the next cycle retries it, or bury it at
   * `failed` once it has exhausted its attempts.
   *
   * The reset to `pending` is the part that matters now that `claim()` sets `claiming`: without
   * it a single transient publish error would leave the row claimed until the reclaim window
   * expired, turning a 1.5-second retry into a minute-long stall.
   */
  async markFailure(id: string, error: string): Promise<void> {
    await this.ds.query(
      `UPDATE ${tableName(this.schema)} SET attempts = attempts + 1, error = $2, "updatedAt" = now(),
         "claimedAt" = NULL,
         status = CASE WHEN attempts + 1 >= $3 THEN 'failed' ELSE 'pending' END
       WHERE id = $1`,
      [id, error.slice(0, 500), MAX_ATTEMPTS],
    );
  }
}

/** Bus wrapper: publish() enqueues to the outbox; subscribe() delegates to the
 *  real bus; a relay drains pending rows to the bus at-least-once. */
export class OutboxBus implements Bus {
  private readonly store: OutboxStore;
  private timer: NodeJS.Timeout | null = null;
  private readonly dlq: Bus;

  constructor(
    private readonly inner: Bus,
    private readonly ds: DataSource,
    private readonly schema: string,
  ) {
    this.store = new OutboxStore(ds, schema);
    // DLQ traffic goes straight through the underlying bus (outbox is for origin
    // events only; poison copies are already persisted in the NATS DLQ stream).
    this.dlq = inner;
  }

  /** Forward to the real bus — the outbox only wraps the publish side, never delivery. */
  setClaimReleaser(release: ClaimReleaser): void {
    this.inner.setClaimReleaser?.(release);
  }

  start(): void {
    void ensureOutboxTable(this.ds, this.schema);
    if (!this.timer) {
      this.timer = setInterval(() => void this.relay(), RELAY_INTERVAL_MS);
      this.timer.unref?.();
    }
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async publish<T>(name: EventName, payload: T, opts?: { envelopeId?: string }): Promise<void> {
    await this.store.enqueue(name, payload, opts?.envelopeId ?? `${name}:${randomUUID()}`);
  }

  subscribe<T>(name: EventName, handler: (env: EventEnvelope<T>) => Promise<void> | void): Promise<() => Promise<void>> {
    return this.inner.subscribe(name, handler);
  }

  async flush(): Promise<void> {
    await this.relay();
    await this.inner.flush?.();
  }

  private async relay(): Promise<void> {
    try {
      const rows = await this.store.claim();
      for (const row of rows) {
        try {
          await this.inner.publish(row.eventName as EventName, row.payload, { envelopeId: row.envelopeId });
          await this.store.markSent(row.id);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          await this.store.markFailure(row.id, msg);
          const attempts = row.attempts + 1;
          if (attempts >= MAX_ATTEMPTS) {
            await this.dlq
              .publishRaw?.(
                `${DLQ_SUBJECT_PREFIX}.${row.eventName}`,
                JSON.stringify({ envelopeId: row.envelopeId, eventName: row.eventName, payload: row.payload, error: msg, ts: new Date().toISOString() }),
              )
              .catch(() => undefined);
            console.error(`[outbox] event ${row.eventName} (${row.envelopeId}) exhausted retries -> DLQ`);
          }
        }
      }
    } catch (err) {
      console.error('[outbox] relay cycle failed', err);
    }
  }

  async close(): Promise<void> {
    this.stop();
    await this.inner.close();
  }
}
