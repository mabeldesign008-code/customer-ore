/** NATS JetStream bus — durable streams, at-least-once delivery, replayable. */
import { EventEnvelope, EventName } from '@ore/contracts';
import { Bus, ClaimReleaser } from './bus';
export declare class NatsBus implements Bus {
    private readonly url;
    private readonly serviceName;
    private readonly creds;
    /**
     * Envelope signing key (audit S-1). When set, every published envelope is HMAC-signed and
     * every received envelope is verified before its handler runs; anything unsigned or
     * mismatched is dead-lettered with reason `bad-signature` and ACKed, so a forged event can
     * never reach business logic and never redelivers forever.
     */
    private readonly signingKey;
    private releaseClaim;
    private nc;
    private js;
    private readonly sc;
    private readonly consumers;
    constructor(url: string, serviceName: string, creds?: {
        user?: string;
        pass?: string;
    }, 
    /**
     * Envelope signing key (audit S-1). When set, every published envelope is HMAC-signed and
     * every received envelope is verified before its handler runs; anything unsigned or
     * mismatched is dead-lettered with reason `bad-signature` and ACKed, so a forged event can
     * never reach business logic and never redelivers forever.
     */
    signingKey?: string);
    connect(): Promise<void>;
    private ensureStream;
    /** DLQ stream — events that exhausted retries land here for replay/analysis. */
    private ensureDlqStream;
    publish<T>(name: EventName, payload: T, opts?: {
        envelopeId?: string;
    }): Promise<void>;
    /** Raw publish to an arbitrary subject (used by the outbox relay + DLQ). */
    publishRaw(subject: string, data: string | Uint8Array): Promise<void>;
    /** Land a poison event (retries exhausted) into the DLQ stream. */
    private publishDlq;
    setClaimReleaser(release: ClaimReleaser): void;
    subscribe<T>(name: EventName, handler: (env: EventEnvelope<T>) => Promise<void> | void): Promise<() => Promise<void>>;
    /**
     * Durable consumers persist server-side; a stale durable whose deliver subject
     * belongs to a dead connection silently swallows new events. On bind conflict,
     * delete the stale durable and recreate it so this instance actually receives.
     */
    private subscribeWithRetry;
    close(): Promise<void>;
}
//# sourceMappingURL=nats.bus.d.ts.map