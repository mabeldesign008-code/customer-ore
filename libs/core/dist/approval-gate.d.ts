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
export interface DualControlRequest {
    /** Stable business key, e.g. `withdrawal.approve:<withdrawalId>`. Becomes the PSP ref. */
    kind: string;
    permission: string;
    service: string;
    resourceType?: string | null;
    resourceId?: string | null;
    amountPesewas?: number;
    currency?: string;
    payload?: Record<string, unknown> | null;
    reason?: string | null;
    /**
     * Deterministic idempotency key. `requireDualControl` derives it for you; only set it
     * explicitly if you are calling `requestDualControl` directly.
     */
    executionRef?: string;
    /** Structural actions that must stay dual even at zero amount. */
    forceApprovals?: number;
    forceRequiresSuper?: boolean;
    makerUserId: string;
    makerAdminRole?: string | null;
}
export interface ApprovalRow {
    id: string;
    kind: string;
    permission: string;
    executionRef: string;
    amountPesewas: number;
    requiredApprovals: number;
    requiresSuperAdmin: boolean;
    approvals: {
        userId: string;
        adminRole: string | null;
        at: string;
    }[];
    status: string;
    expiresAt: string;
    makerUserId: string;
    failureReason: string | null;
    resultJson: Record<string, unknown> | null;
}
/**
 * Builds the `executionRef`. Kept in one place so every service derives it the same way
 * and a retry of the same business action always lands on the same row.
 */
export declare function executionRefFor(kind: string, resourceId: string, variant?: string): string;
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
export declare function defaultExecutionRef(req: {
    kind: string;
    resourceId?: string | null;
    makerUserId: string;
    payload?: Record<string, unknown> | null;
}): string;
/**
 * Maker submits. If the approval is not yet executable this throws 409 carrying the
 * approval id and how many signatures are outstanding — that is the normal path, not an
 * error condition, and the UI is expected to render it as "waiting for approval".
 */
export declare function requestDualControl(req: DualControlRequest): Promise<ApprovalRow>;
/** Read an existing approval without creating one. Null if it does not exist. */
export declare function findApproval(executionRef: string): Promise<ApprovalRow | null>;
/**
 * Claim and run. `work` executes exactly once per approval: the row is moved to EXECUTING
 * by a conditional UPDATE on the auth side, so a concurrent or replayed call is refused
 * before `work` is reached.
 *
 * If `work` throws, the failure is recorded and rethrown. `safeToRetry` decides whether a
 * human may re-open it — default false, because for a payout "I don't know if it went"
 * must not silently become "try again".
 */
export declare function executeDualControl<T>(executionRef: string, executorUserId: string, payload: Record<string, unknown> | null | undefined, work: () => Promise<T>, opts?: {
    safeToRetryOnFailure?: boolean;
}): Promise<T>;
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
export declare function requireDualControl<T>(req: DualControlRequest, executorUserId: string, work: () => Promise<T>, opts?: {
    safeToRetryOnFailure?: boolean;
}): Promise<T>;
/** Headroom left under a per-admin daily cap, in pesewas. Infinity when uncapped. */
export declare function remainingDailyCap(userId: string, kind: string, capPesewas: number): Promise<number>;
//# sourceMappingURL=approval-gate.d.ts.map