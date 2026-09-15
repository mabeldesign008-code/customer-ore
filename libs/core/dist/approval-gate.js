"use strict";
/**
 * Client-side half of maker-checker.
 *
 * A `⚖` permission says "this role may sign". It does not say "this request has been
 * signed by someone who isn't you". Every dual-controlled money action has to go through
 * this gate, which talks to the auth service's approval table:
 *
 *   1. `requestDualControl()` — the maker submits. Returns the approval row.
 *   2. The maker's call stops there with HTTP 409 and the approval id. Nothing moves.
 *   3. Checkers sign through `POST /auth/admin/approvals/:id/approve`.
 *   4. Someone calls the action again with the SAME `executionRef`.
 *   5. `executeDualControl()` claims the row (APPROVED -> EXECUTING, one winner only),
 *      runs the work, then records EXECUTED or FAILED.
 *
 * `executionRef` is the whole idempotency story and must be deterministic: derived from
 * the business object, not random. If the caller generates a fresh one per request, a
 * retry becomes a second approval and the guarantee is gone. The helpers below are built
 * so that the natural way to call them is the safe way.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.executionRefFor = executionRefFor;
exports.defaultExecutionRef = defaultExecutionRef;
exports.requestDualControl = requestDualControl;
exports.findApproval = findApproval;
exports.executeDualControl = executeDualControl;
exports.requireDualControl = requireDualControl;
exports.remainingDailyCap = remainingDailyCap;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const http_1 = require("./http");
const config_1 = require("@ore/config");
/**
 * Builds the `executionRef`. Kept in one place so every service derives it the same way
 * and a retry of the same business action always lands on the same row.
 */
function executionRefFor(kind, resourceId, variant) {
    const safe = (s) => s.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `${safe(kind)}:${safe(resourceId)}${variant ? `:${safe(variant)}` : ''}`.slice(0, 180);
}
/**
 * The reference `requireDualControl` uses by default: action + object + a fingerprint of
 * the payload.
 *
 * Including the payload hash is what makes this correct for *repeatable* actions. Keying
 * on the object alone would let an action run exactly once ever — the second legitimate
 * wallet adjustment for the same rider, or the second fee change, would be refused as a
 * replay. Keying on the payload means an identical request is a replay and is refused,
 * while a genuinely different one is a new request that needs its own signatures.
 */
function defaultExecutionRef(req) {
    const hash = (0, crypto_1.createHash)('sha256')
        .update(JSON.stringify(req.payload ?? {}, Object.keys(req.payload ?? {}).sort()))
        .digest('hex')
        .slice(0, 16);
    return executionRefFor(req.kind, req.resourceId ?? req.makerUserId, hash);
}
async function postJson(path, body) {
    let res;
    try {
        res = await (0, http_1.internalFetch)(`${(0, config_1.serviceUrl)('auth')}${path}`, {
            method: 'POST',
            body: JSON.stringify(body ?? {}),
        });
    }
    catch (err) {
        // Money actions must fail closed. If we cannot reach the approval ledger we cannot
        // know whether this was authorised, so we refuse rather than proceed optimistically.
        throw new common_1.ServiceUnavailableException(`Approval service unreachable — refusing to act: ${err.message}`);
    }
    const text = await res.text();
    let json;
    try {
        json = JSON.parse(text);
    }
    catch {
        json = text;
    }
    return { ok: res.ok, status: res.status, json };
}
async function getJson(path) {
    let res;
    try {
        res = await (0, http_1.internalFetch)(`${(0, config_1.serviceUrl)('auth')}${path}`);
    }
    catch (err) {
        throw new common_1.ServiceUnavailableException(`Approval service unreachable: ${err.message}`);
    }
    const text = await res.text();
    let json;
    try {
        json = JSON.parse(text);
    }
    catch {
        json = text;
    }
    return { ok: res.ok, status: res.status, json };
}
function describe(row) {
    const signed = row.approvals?.length ?? 0;
    return `${signed}/${row.requiredApprovals} signature${row.requiredApprovals === 1 ? '' : 's'}${row.requiresSuperAdmin ? ' (super admin required)' : ''}`;
}
/**
 * Maker submits. If the approval is not yet executable this throws 409 carrying the
 * approval id and how many signatures are outstanding — that is the normal path, not an
 * error condition, and the UI is expected to render it as "waiting for approval".
 */
async function requestDualControl(req) {
    const created = await postJson('/auth/internal/approvals', req);
    if (!created.ok) {
        const msg = created.json?.message ?? `approval submit failed (${created.status})`;
        throw new common_1.ForbiddenException(msg);
    }
    return created.json;
}
/** Read an existing approval without creating one. Null if it does not exist. */
async function findApproval(executionRef) {
    const res = await getJson(`/auth/internal/approvals/by-ref/${encodeURIComponent(executionRef)}`);
    if (!res.ok)
        return null;
    return res.json ?? null;
}
/**
 * Claim and run. `work` executes exactly once per approval: the row is moved to EXECUTING
 * by a conditional UPDATE on the auth side, so a concurrent or replayed call is refused
 * before `work` is reached.
 *
 * If `work` throws, the failure is recorded and rethrown. `safeToRetry` decides whether a
 * human may re-open it — default false, because for a payout "I don't know if it went"
 * must not silently become "try again".
 */
async function executeDualControl(executionRef, executorUserId, payload, work, opts = {}) {
    const claim = await postJson(`/auth/internal/approvals/${encodeURIComponent(executionRef)}/execute`, {
        payload,
        executorUserId,
    });
    if (!claim.ok) {
        const body = claim.json;
        const message = typeof body === 'string' ? body : body?.message ?? 'execution refused';
        if (claim.status === 409)
            throw new common_1.ConflictException(message);
        if (claim.status === 404)
            throw new common_1.ConflictException(`No approval found for ${executionRef} — submit it first`);
        throw new common_1.ForbiddenException(message);
    }
    try {
        const result = await work();
        await postJson(`/auth/internal/approvals/${encodeURIComponent(executionRef)}/complete`, {
            result: result,
        });
        return result;
    }
    catch (err) {
        const reason = err.message || 'unknown error';
        await postJson(`/auth/internal/approvals/${encodeURIComponent(executionRef)}/fail`, {
            reason,
            safeToRetry: opts.safeToRetryOnFailure ?? false,
        }).catch(() => undefined);
        throw err;
    }
}
/**
 * The whole gate in one call, for actions that do not need a custom failure policy.
 *
 * Behaviour:
 *   - no approval yet            -> create one, throw 409 "waiting for N signatures"
 *   - approval not fully signed  -> throw 409 with the current count
 *   - approval EXECUTED          -> throw 409 "already executed" (this is the replay guard)
 *   - approval EXECUTING         -> throw 409 "already executing"
 *   - approval APPROVED          -> run `work` exactly once and record the outcome
 */
async function requireDualControl(req, executorUserId, work, opts = {}) {
    const executionRef = defaultExecutionRef(req);
    const existing = await findApproval(executionRef);
    if (!existing) {
        // The same derived ref must be used for the lookup AND the submit, or the row that
        // gets created cannot be found by the next call and the idempotency guarantee is gone.
        const row = await requestDualControl({
            ...req,
            resourceId: req.resourceId ?? null,
            executionRef,
        });
        throw new common_1.ConflictException(`Dual control: submitted as ${row.id}. ${describe(row)} Nothing has been executed. Re-call once it is approved.`);
    }
    if (existing.status === 'APPROVED') {
        return executeDualControl(executionRef, executorUserId, req.payload, work, opts);
    }
    if (existing.status === 'EXECUTED') {
        throw new common_1.ConflictException(`Already executed (${existing.executionRef}) — refusing to repeat it`);
    }
    if (existing.status === 'EXECUTING') {
        throw new common_1.ConflictException('Execution in progress — confirm or roll it back before retrying');
    }
    if (existing.status === 'FAILED') {
        throw new common_1.ConflictException(`Previous execution failed: ${existing.failureReason ?? 'unknown'}. Re-open it explicitly.`);
    }
    if (existing.status === 'REJECTED') {
        throw new common_1.ConflictException(`Rejected: ${existing.failureReason ?? 'no reason given'}`);
    }
    if (existing.status === 'EXPIRED') {
        throw new common_1.ConflictException('This request expired before it was approved. Submit a new one.');
    }
    if (existing.status === 'CANCELLED') {
        throw new common_1.ConflictException('The maker withdrew this request.');
    }
    // PENDING
    throw new common_1.ConflictException(`Dual control pending: ${describe(existing)}. Approval ${existing.id}.`);
}
/** Headroom left under a per-admin daily cap, in pesewas. Infinity when uncapped. */
async function remainingDailyCap(userId, kind, capPesewas) {
    if (capPesewas <= 0)
        return Number.POSITIVE_INFINITY;
    const res = await getJson(`/auth/internal/approvals/cap?userId=${encodeURIComponent(userId)}&kind=${encodeURIComponent(kind)}&capPesewas=${capPesewas}`);
    if (!res.ok)
        throw new common_1.ServiceUnavailableException('Could not read the daily cap');
    return typeof res.json === 'number' ? res.json : Number.POSITIVE_INFINITY;
}
//# sourceMappingURL=approval-gate.js.map