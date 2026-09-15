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
export declare const INTERNAL_MAC_HEADER = "x-ore-internal-mac";
export declare const INTERNAL_TS_HEADER = "x-ore-internal-ts";
export declare const INTERNAL_SERVICE_HEADER = "x-ore-service";
export declare function computeInternalMac(key: string, method: string, pathWithQuery: string, body: unknown, service: string, ts: string): string;
export declare function verifyInternalMac(key: string, method: string, pathWithQuery: string, body: unknown, mac: string | undefined, ts: string | undefined, service: string | undefined): boolean;
//# sourceMappingURL=internal-auth.d.ts.map