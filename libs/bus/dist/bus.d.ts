/** Event bus interface. Two impls: InProcessBus (dev, zero infra) and NatsBus (distributed). */
import { EventEnvelope, EventName } from '@ore/contracts';
/**
 * Hands a consumer's dedupe claim back when its handler fails.
 *
 * Structural on purpose: `libs/bus` must not depend on `libs/core`, and the bus does not care
 * what a claim is — only that a failed handler must not keep one.
 */
export type ClaimReleaser = (envelopeId: string) => Promise<void>;
export interface Bus {
    /** Publish an event. Envelope id is generated if not provided. */
    publish<T>(name: EventName, payload: T, opts?: {
        envelopeId?: string;
    }): Promise<void>;
    /** Raw publish to an arbitrary subject (used by outbox relay + DLQ). */
    publishRaw?(subject: string, data: string | Uint8Array): Promise<void>;
    /** Subscribe. Handler MUST be idempotent on envelope.id. Returns unsubscribe fn. */
    subscribe<T>(name: EventName, handler: (env: EventEnvelope<T>) => Promise<void> | void): Promise<() => Promise<void>>;
    /**
     * Register the consumer-dedupe release hook.
     *
     * Handlers claim an envelope id before doing any work, and the claim is committed
     * immediately — outside whatever transaction the handler then opens. So when a handler throws,
     * the claim outlives it: the broker redelivers, the claim check returns "already taken", and
     * the handler returns successfully. The event is acked and gone, with no retry and no DLQ
     * entry (audit F-BUS-1). Releasing here, at the one place that sees every handler failure,
     * fixes it for every consumer at once instead of at 45 call sites.
     */
    setClaimReleaser?(release: ClaimReleaser): void;
    /** Flush in-flight (test/dev helper). */
    flush?(): Promise<void>;
    close(): Promise<void>;
}
export declare function makeEnvelope<T>(name: EventName, payload: T, zoneId?: string, envelopeId?: string): EventEnvelope<T>;
/**
 * Envelope signing (audit S-1).
 *
 * The bus was forgeable end to end: an anonymous NATS client published a hand-built
 * `payment.charge_succeeded` envelope and the ledger and order consumers received it, acted on
 * it and ACKed it. The only check was `take(env.id)` — a dedupe claim, not authentication. It
 * missed by a field name: the forger used `orderId` where the handlers read `checkoutId`.
 *
 * Broker credentials keep outsiders off NATS. This keeps a compromised or buggy *service* from
 * speaking for another one, which credentials cannot: every service shares one NATS account, so
 * any of them can publish any subject. The signature binds id + name + ts + zoneId + payload, so
 * an envelope cannot be altered in flight or replayed under a different event name.
 *
 * `sig` stays optional on the type because InProcessBus never leaves the process boundary, and
 * because a rolling deploy has a window where old publishers emit unsigned envelopes. NatsBus
 * rejects unsigned envelopes when it holds a key — see `subscribe`.
 */
export declare function canonicalPayload(payload: unknown): string;
export declare function signEnvelope(key: string, env: Omit<EventEnvelope<unknown>, 'sig'>): string;
/** Constant-time verification. Absent or mismatched signature both return false. */
export declare function verifyEnvelopeSignature(key: string, env: EventEnvelope<unknown>): boolean;
/** In-process bus — single Node process, memory events. Use for light dev + tests. */
export declare class InProcessBus implements Bus {
    private readonly emitter;
    private counter;
    private releaseClaim;
    setClaimReleaser(release: ClaimReleaser): void;
    publish<T>(name: EventName, payload: T, opts?: {
        envelopeId?: string;
    }): Promise<void>;
    subscribe<T>(name: EventName, handler: (env: EventEnvelope<T>) => Promise<void> | void): Promise<() => Promise<void>>;
    flush(): Promise<void>;
    close(): Promise<void>;
}
//# sourceMappingURL=bus.d.ts.map