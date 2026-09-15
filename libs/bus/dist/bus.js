"use strict";
/** Event bus interface. Two impls: InProcessBus (dev, zero infra) and NatsBus (distributed). */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InProcessBus = void 0;
exports.makeEnvelope = makeEnvelope;
exports.canonicalPayload = canonicalPayload;
exports.signEnvelope = signEnvelope;
exports.verifyEnvelopeSignature = verifyEnvelopeSignature;
const crypto_1 = require("crypto");
const events_1 = require("events");
function makeEnvelope(name, payload, zoneId = 'cape-coast', envelopeId) {
    const id = envelopeId ?? `${name}:${crypto.randomUUID()}`;
    return { id, name, ts: new Date().toISOString(), zoneId, payload };
}
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
function canonicalPayload(payload) {
    const sort = (v) => {
        if (Array.isArray(v))
            return v.map(sort);
        if (v && typeof v === 'object') {
            const out = {};
            for (const k of Object.keys(v).sort())
                out[k] = sort(v[k]);
            return out;
        }
        return v;
    };
    return JSON.stringify(sort(payload === undefined ? null : payload));
}
function signEnvelope(key, env) {
    const canonical = [env.id, env.name, env.ts, env.zoneId, canonicalPayload(env.payload)].join('\n');
    return (0, crypto_1.createHmac)('sha256', key).update(canonical).digest('base64url');
}
/** Constant-time verification. Absent or mismatched signature both return false. */
function verifyEnvelopeSignature(key, env) {
    if (!env.sig)
        return false;
    const expected = signEnvelope(key, env);
    const a = Buffer.from(expected);
    const b = Buffer.from(env.sig);
    return a.length === b.length && (0, crypto_1.timingSafeEqual)(a, b);
}
/** In-process bus — single Node process, memory events. Use for light dev + tests. */
class InProcessBus {
    emitter = new events_1.EventEmitter();
    counter = 0;
    releaseClaim = null;
    setClaimReleaser(release) {
        this.releaseClaim = release;
    }
    async publish(name, payload, opts) {
        const env = makeEnvelope(name, payload, 'cape-coast', opts?.envelopeId);
        this.emitter.emit(name, env);
    }
    async subscribe(name, handler) {
        const wrapped = async (env) => {
            try {
                await handler(env);
            }
            catch (err) {
                // No redelivery in-process, but the claim must still go back: otherwise a later
                // republish of the same envelope id is swallowed by a claim for work that never happened.
                await this.releaseClaim?.(env.id).catch(() => undefined);
                console.error(`[bus] handler failed for ${name}`, err);
            }
        };
        this.emitter.on(name, wrapped);
        return async () => {
            this.emitter.off(name, wrapped);
        };
    }
    async flush() {
        await new Promise((r) => setImmediate(r));
    }
    async close() {
        this.emitter.removeAllListeners();
    }
}
exports.InProcessBus = InProcessBus;
//# sourceMappingURL=bus.js.map