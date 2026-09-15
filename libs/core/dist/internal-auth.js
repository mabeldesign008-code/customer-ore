"use strict";
/**
 * Internal request authentication (audit F-SEC-1 hardening).
 *
 * The original scheme sent the shared INTERNAL_SERVICE_KEY itself on every internal
 * call: any capture (sidecar, proxy log, crash dump) of that header leaked the one key
 * that opens every internal API in the cluster. The scheme here is MAC-based, like a
 * minimal SigV4:
 *
 *   x-ore-internal-mac = HMAC-SHA256(key, METHOD \n path?query \n sha256(canonical body) \n service \n ts)
 *
 * The key stays on both hosts and never crosses the wire; the MAC binds method, path,
 * body, the caller's service identity and a timestamp (±5 min replay window). The
 * receiver verifies the MAC; during rollout it ALSO accepts the legacy plaintext key,
 * and the sender STILL sends the legacy key, so mixed-version rolling deploys work.
 *
 * On top of identity, a service may set INTERNAL_CALLERS=order,ledger,… to restrict
 * which services may reach its internal API — per-pair allowlisting that a bare shared
 * key cannot express.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.INTERNAL_SERVICE_HEADER = exports.INTERNAL_TS_HEADER = exports.INTERNAL_MAC_HEADER = void 0;
exports.computeInternalMac = computeInternalMac;
exports.verifyInternalMac = verifyInternalMac;
const crypto_1 = require("crypto");
exports.INTERNAL_MAC_HEADER = 'x-ore-internal-mac';
exports.INTERNAL_TS_HEADER = 'x-ore-internal-ts';
exports.INTERNAL_SERVICE_HEADER = 'x-ore-service';
const MAX_SKEW_MS = 5 * 60_000;
/** Canonical form: sort object keys recursively so both sides hash identical bytes. */
function canonicalJson(value) {
    let v = value;
    if (typeof v === 'string') {
        try {
            v = JSON.parse(v);
        }
        catch {
            // not JSON — hash the raw string as-is (both sides do the same)
        }
    }
    return JSON.stringify(sortKeys(v === undefined ? null : v));
}
function sortKeys(v) {
    if (Array.isArray(v))
        return v.map(sortKeys);
    if (v && typeof v === 'object') {
        const out = {};
        for (const k of Object.keys(v).sort()) {
            out[k] = sortKeys(v[k]);
        }
        return out;
    }
    return v;
}
function computeInternalMac(key, method, pathWithQuery, body, service, ts) {
    const bodyHash = (0, crypto_1.createHash)('sha256').update(canonicalJson(body)).digest('hex');
    return (0, crypto_1.createHmac)('sha256', key)
        .update([method.toUpperCase(), pathWithQuery, bodyHash, service, ts].join('\n'))
        .digest('hex');
}
function verifyInternalMac(key, method, pathWithQuery, body, mac, ts, service) {
    if (!mac || !ts || !service)
        return false;
    if (!/^\d{10,14}$/.test(ts) || Math.abs(Date.now() - Number(ts)) > MAX_SKEW_MS)
        return false;
    const expected = computeInternalMac(key, method, pathWithQuery, body, service, ts);
    const a = Buffer.from(expected);
    const b = Buffer.from(mac);
    return a.length === b.length && (0, crypto_1.timingSafeEqual)(a, b);
}
//# sourceMappingURL=internal-auth.js.map