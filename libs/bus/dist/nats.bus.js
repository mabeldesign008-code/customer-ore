"use strict";
/** NATS JetStream bus — durable streams, at-least-once delivery, replayable. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NatsBus = void 0;
const nats_1 = require("nats");
const bus_1 = require("./bus");
const SUBJECT_PREFIX = 'ore.evt';
// Must NOT be under `ore.evt.>` — JetStream rejects overlapping stream subjects
// (error 10065 "subjects overlap with an existing stream"). The DLQ lives in its
// own top-level namespace so ORE_EVENTS_DLQ can exist alongside ORE_EVENTS.
const DLQ_PREFIX = 'ore.dlq';
const MAX_DELIVER = 10;
class NatsBus {
    url;
    serviceName;
    creds;
    signingKey;
    releaseClaim = null;
    nc = null;
    js = null;
    sc = (0, nats_1.StringCodec)();
    consumers = new Map();
    constructor(url, serviceName, creds = {}, 
    /**
     * Envelope signing key (audit S-1). When set, every published envelope is HMAC-signed and
     * every received envelope is verified before its handler runs; anything unsigned or
     * mismatched is dead-lettered with reason `bad-signature` and ACKed, so a forged event can
     * never reach business logic and never redelivers forever.
     */
    signingKey = '') {
        this.url = url;
        this.serviceName = serviceName;
        this.creds = creds;
        this.signingKey = signingKey;
    }
    async connect() {
        const user = this.creds.user ?? process.env.NATS_USER;
        const pass = this.creds.pass ?? process.env.NATS_PASS;
        // A credential-less broker is how the audit's anonymous publisher got in. Refuse to
        // connect without credentials in production rather than silently joining an open bus.
        if (!user || !pass) {
            const nodeEnv = process.env.NODE_ENV ?? 'development';
            if (nodeEnv === 'production') {
                throw new Error('NATS_USER/NATS_PASS are required in production — refusing to join an unauthenticated bus (audit S-1)');
            }
            console.warn(`[nats] ${this.serviceName}: no NATS_USER/NATS_PASS — connecting without credentials (dev only)`);
        }
        const authOpts = user && pass ? { user, pass } : {};
        this.nc = await (0, nats_1.connect)({ servers: this.url, maxReconnectAttempts: -1, ...authOpts });
        this.js = this.nc.jetstream();
        await this.ensureStream();
    }
    async ensureStream() {
        const cfg = {
            name: 'ORE_EVENTS',
            subjects: [`${SUBJECT_PREFIX}.>`],
            retention: nats_1.RetentionPolicy.Limits,
            max_age: 7 * 24 * 3600 * 1e9, // 7 days (nanos)
            storage: nats_1.StorageType.File,
        };
        try {
            const jsm = await this.nc.jetstreamManager();
            await jsm.streams.add(cfg);
        }
        catch {
            // stream exists already
        }
        await this.ensureDlqStream();
    }
    /** DLQ stream — events that exhausted retries land here for replay/analysis. */
    async ensureDlqStream() {
        const cfg = {
            name: 'ORE_EVENTS_DLQ',
            subjects: [`${DLQ_PREFIX}.>`],
            retention: nats_1.RetentionPolicy.Limits,
            max_age: 30 * 24 * 3600 * 1e9, // 30 days (nanos)
            storage: nats_1.StorageType.File,
        };
        const jsm = await this.nc.jetstreamManager();
        try {
            await jsm.streams.add(cfg);
        }
        catch (err) {
            // Already exists (or raced) — converge its config in case the subject
            // namespace changed between versions. Never swallow silently: a real
            // failure (e.g. subject overlap) must surface in the logs.
            const existing = await jsm.streams.info(cfg.name).catch(() => null);
            if (existing) {
                await jsm.streams.update(cfg.name, cfg).catch((uerr) => {
                    console.warn(`[nats] DLQ stream exists; config update skipped: ${uerr.message}`);
                });
            }
            else {
                console.error('[nats] failed to ensure DLQ stream:', err);
            }
        }
    }
    async publish(name, payload, opts) {
        if (!this.js)
            throw new Error('NatsBus not connected');
        const env = (0, bus_1.makeEnvelope)(name, payload, 'cape-coast', opts?.envelopeId);
        // Sign before serialising (audit S-1): consumers reject anything unsigned or tampered.
        // The key is always set in practice — loadEnv falls back to INTERNAL_SERVICE_KEY — so a
        // missing key here means a hand-built bus in a test, and only then may we publish bare.
        if (this.signingKey)
            env.sig = (0, bus_1.signEnvelope)(this.signingKey, env);
        await this.js.publish(`${SUBJECT_PREFIX}.${name}`, this.sc.encode(JSON.stringify(env)));
    }
    /** Raw publish to an arbitrary subject (used by the outbox relay + DLQ). */
    async publishRaw(subject, data) {
        if (!this.js)
            throw new Error('NatsBus not connected');
        const body = typeof data === 'string' ? this.sc.encode(data) : data;
        await this.js.publish(subject, body);
    }
    /** Land a poison event (retries exhausted) into the DLQ stream. */
    async publishDlq(name, data, error) {
        try {
            const raw = this.sc.decode(data);
            await this.publishRaw(`${DLQ_PREFIX}.${name}`, JSON.stringify({ event: name, error, raw, ts: new Date().toISOString() }));
        }
        catch (err) {
            console.error('[nats] DLQ publish failed', err);
        }
    }
    setClaimReleaser(release) {
        this.releaseClaim = release;
    }
    async subscribe(name, handler) {
        if (!this.js)
            throw new Error('NatsBus not connected');
        const durable = `svc-${this.serviceName}-${name.replace(/[^a-z0-9]/gi, '-')}`;
        const opts = (0, nats_1.consumerOpts)();
        opts.deliverTo((0, nats_1.createInbox)()); // push consumer
        opts.ackExplicit();
        opts.durable(durable);
        opts.maxDeliver(MAX_DELIVER);
        opts.ackWait(30_000_000_000);
        opts.deliverNew();
        const sub = await this.subscribeWithRetry(name, durable, opts);
        const loop = (async () => {
            for await (const m of sub) {
                let envelopeId = null;
                try {
                    const env = JSON.parse(this.sc.decode(m.data));
                    envelopeId = env.id;
                    // Verify provenance BEFORE any handler or dedupe claim runs (audit S-1). A forged
                    // envelope must never reach business logic — and must not be nacked either, since a
                    // signature can never become valid on redelivery: straight to the DLQ as evidence.
                    if (this.signingKey && !(0, bus_1.verifyEnvelopeSignature)(this.signingKey, env)) {
                        console.error(`[nats] REJECTED envelope ${env.id ?? '(no id)'} on ${name}: missing/invalid signature — dead-lettered as bad-signature`);
                        await this.publishDlq(name, m.data, 'bad-signature');
                        m.ack();
                        continue;
                    }
                    await handler(env);
                    m.ack();
                }
                catch (err) {
                    // Hand the dedupe claim back before naking. The handler took it before doing any
                    // work and committed it outside its own transaction, so without this the redelivery
                    // below finds the envelope already claimed, returns without doing anything, and acks
                    // — the event is lost silently rather than retried or dead-lettered (audit F-BUS-1).
                    if (envelopeId)
                        await this.releaseClaim?.(envelopeId).catch(() => undefined);
                    const delivery = m.info?.deliveryCount ?? 1;
                    console.error(`[nats] consumer ${durable} failed for ${name} (delivery ${delivery}/${MAX_DELIVER})`, err);
                    if (delivery >= MAX_DELIVER) {
                        // Poison event — land in the DLQ stream instead of naking forever.
                        await this.publishDlq(name, m.data, String(err instanceof Error ? err.message : err));
                        m.ack();
                    }
                    else {
                        m.nak();
                    }
                }
            }
        })();
        const stop = async () => {
            await sub.destroy();
        };
        this.consumers.set(durable, stop);
        void loop;
        return stop;
    }
    /**
     * Durable consumers persist server-side; a stale durable whose deliver subject
     * belongs to a dead connection silently swallows new events. On bind conflict,
     * delete the stale durable and recreate it so this instance actually receives.
     */
    async subscribeWithRetry(name, durable, opts) {
        try {
            return await this.js.subscribe(`${SUBJECT_PREFIX}.${name}`, opts);
        }
        catch (err) {
            console.warn(`[nats] consumer ${durable} bind failed (${String(err)}); recreating`);
            try {
                const jsm = await this.nc.jetstreamManager();
                await jsm.consumers.delete('ORE_EVENTS', durable);
            }
            catch {
                // already gone
            }
            return this.js.subscribe(`${SUBJECT_PREFIX}.${name}`, opts);
        }
    }
    async close() {
        for (const stop of this.consumers.values())
            await stop();
        if (this.nc)
            await this.nc.drain();
    }
}
exports.NatsBus = NatsBus;
//# sourceMappingURL=nats.bus.js.map