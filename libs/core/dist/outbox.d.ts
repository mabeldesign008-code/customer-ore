/** Transactional Outbox — events are written to a per-service `ore_outbox` table in
 *  the SAME transaction as the business data, then a relay publishes them to the
 *  message bus at-least-once. If a message exhausts its delivery attempts it is
 *  marked failed and copied to the DLQ subject for replay/analysis.
 *
 *  Enabled in distributed + postgres mode by OreCoreModule; sqlite/dev keeps the
 *  plain bus. */
import { DataSource } from 'typeorm';
import { Bus, ClaimReleaser } from '@ore/bus';
import { EventEnvelope, EventName } from '@ore/contracts';
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
/** Creates the outbox table for a service schema. */
export declare function ensureOutboxTable(ds: DataSource, schema: string): Promise<void>;
export declare class OutboxStore {
    private readonly ds;
    private readonly schema;
    constructor(ds: DataSource, schema: string);
    enqueue(name: EventName, payload: unknown, envelopeId: string): Promise<void>;
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
    claim(limit?: number): Promise<OutboxRow[]>;
    markSent(id: string): Promise<void>;
    /**
     * Release a failed claim back to `pending` so the next cycle retries it, or bury it at
     * `failed` once it has exhausted its attempts.
     *
     * The reset to `pending` is the part that matters now that `claim()` sets `claiming`: without
     * it a single transient publish error would leave the row claimed until the reclaim window
     * expired, turning a 1.5-second retry into a minute-long stall.
     */
    markFailure(id: string, error: string): Promise<void>;
}
/** Bus wrapper: publish() enqueues to the outbox; subscribe() delegates to the
 *  real bus; a relay drains pending rows to the bus at-least-once. */
export declare class OutboxBus implements Bus {
    private readonly inner;
    private readonly ds;
    private readonly schema;
    private readonly store;
    private timer;
    private readonly dlq;
    constructor(inner: Bus, ds: DataSource, schema: string);
    /** Forward to the real bus — the outbox only wraps the publish side, never delivery. */
    setClaimReleaser(release: ClaimReleaser): void;
    start(): void;
    stop(): void;
    publish<T>(name: EventName, payload: T, opts?: {
        envelopeId?: string;
    }): Promise<void>;
    subscribe<T>(name: EventName, handler: (env: EventEnvelope<T>) => Promise<void> | void): Promise<() => Promise<void>>;
    flush(): Promise<void>;
    private relay;
    close(): Promise<void>;
}
//# sourceMappingURL=outbox.d.ts.map