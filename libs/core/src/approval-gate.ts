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

import { ConflictException, ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'crypto';
import { internalFetch } from './http';
import { serviceUrl } from '@ore/config';

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
  approvals: { userId: string; adminRole: string | null; at: string }[];
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
export function executionRefFor(kind: string, resourceId: string, variant?: string): string {
  const safe = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, '_');
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
export function defaultExecutionRef(req: {
  kind: string;
  resourceId?: string | null;
  makerUserId: string;
  payload?: Record<string, unknown> | null;
}): string {
  const hash = createHash('sha256')
    .update(JSON.stringify(req.payload ?? {}, Object.keys(req.payload ?? {}).sort()))
    .digest('hex')
    .slice(0, 16);
  return executionRefFor(req.kind, req.resourceId ?? req.makerUserId, hash);
}

async function postJson(path: string, body: unknown): Promise<{ ok: boolean; status: number; json: unknown }> {
  let res: Response;
  try {
    res = await internalFetch(`${serviceUrl('auth')}${path}`, {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    });
  } catch (err) {
    // Money actions must fail closed. If we cannot reach the approval ledger we cannot
    // know whether this was authorised, so we refuse rather than proceed optimistically.
    throw new ServiceUnavailableException(
      `Approval service unreachable — refusing to act: ${(err as Error).message}`,
    );
  }
  const text = await res.text();
  let json: unknown;
  try { json = JSON.parse(text); } catch { json = text; }
  return { ok: res.ok, status: res.status, json };
}

async function getJson(path: string): Promise<{ ok: boolean; status: number; json: unknown }> {
  let res: Response;
  try {
    res = await internalFetch(`${serviceUrl('auth')}${path}`);
  } catch (err) {
    throw new ServiceUnavailableException(`Approval service unreachable: ${(err as Error).message}`);
  }
  const text = await res.text();
  let json: unknown;
  try { json = JSON.parse(text); } catch { json = text; }
  return { ok: res.ok, status: res.status, json };
}

function describe(row: ApprovalRow): string {
  const signed = row.approvals?.length ?? 0;
  return `${signed}/${row.requiredApprovals} signature${row.requiredApprovals === 1 ? '' : 's'}${
    row.requiresSuperAdmin ? ' (super admin required)' : ''
  }`;
}

/**
 * Maker submits. If the approval is not yet executable this throws 409 carrying the
 * approval id and how many signatures are outstanding — that is the normal path, not an
 * error condition, and the UI is expected to render it as "waiting for approval".
 */
export async function requestDualControl(req: DualControlRequest): Promise<ApprovalRow> {
  const created = await postJson('/auth/internal/approvals', req);
  if (!created.ok) {
    const msg = (created.json as { message?: string })?.message ?? `approval submit failed (${created.status})`;
    throw new ForbiddenException(msg);
  }
  return created.json as ApprovalRow;
}

/** Read an existing approval without creating one. Null if it does not exist. */
export async function findApproval(executionRef: string): Promise<ApprovalRow | null> {
  const res = await getJson(`/auth/internal/approvals/by-ref/${encodeURIComponent(executionRef)}`);
  if (!res.ok) return null;
  return (res.json as ApprovalRow) ?? null;
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
export async function executeDualControl<T>(
  executionRef: string,
  executorUserId: string,
  payload: Record<string, unknown> | null | undefined,
  work: () => Promise<T>,
  opts: { safeToRetryOnFailure?: boolean } = {},
): Promise<T> {
  const claim = await postJson(`/auth/internal/approvals/${encodeURIComponent(executionRef)}/execute`, {
    payload,
    executorUserId,
  });

  if (!claim.ok) {
    const body = claim.json as { message?: string } | string;
    const message = typeof body === 'string' ? body : body?.message ?? 'execution refused';
    if (claim.status === 409) throw new ConflictException(message);
    if (claim.status === 404) throw new ConflictException(`No approval found for ${executionRef} — submit it first`);
    throw new ForbiddenException(message);
  }

  try {
    const result = await work();
    await postJson(`/auth/internal/approvals/${encodeURIComponent(executionRef)}/complete`, {
      result: result as unknown as Record<string, unknown>,
    });
    return result;
  } catch (err) {
    const reason = (err as Error).message || 'unknown error';
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
export async function requireDualControl<T>(
  req: DualControlRequest,
  executorUserId: string,
  work: () => Promise<T>,
  opts: { safeToRetryOnFailure?: boolean } = {},
): Promise<T> {
  const executionRef = defaultExecutionRef(req);
  const existing = await findApproval(executionRef);

  if (!existing) {
    // The same derived ref must be used for the lookup AND the submit, or the row that
    // gets created cannot be found by the next call and the idempotency guarantee is gone.
    const row = await requestDualControl({
      ...req,
      resourceId: req.resourceId ?? null,
      executionRef,
    } as DualControlRequest);
    throw new ConflictException(
      `Dual control: submitted as ${row.id}. ${describe(row)} Nothing has been executed. Re-call once it is approved.`,
    );
  }

  if (existing.status === 'APPROVED') {
    return executeDualControl(executionRef, executorUserId, req.payload, work, opts);
  }

  if (existing.status === 'EXECUTED') {
    throw new ConflictException(`Already executed (${existing.executionRef}) — refusing to repeat it`);
  }
  if (existing.status === 'EXECUTING') {
    throw new ConflictException('Execution in progress — confirm or roll it back before retrying');
  }
  if (existing.status === 'FAILED') {
    throw new ConflictException(`Previous execution failed: ${existing.failureReason ?? 'unknown'}. Re-open it explicitly.`);
  }
  if (existing.status === 'REJECTED') {
    throw new ConflictException(`Rejected: ${existing.failureReason ?? 'no reason given'}`);
  }
  if (existing.status === 'EXPIRED') {
    throw new ConflictException('This request expired before it was approved. Submit a new one.');
  }
  if (existing.status === 'CANCELLED') {
    throw new ConflictException('The maker withdrew this request.');
  }

  // PENDING
  throw new ConflictException(`Dual control pending: ${describe(existing)}. Approval ${existing.id}.`);
}

/** Headroom left under a per-admin daily cap, in pesewas. Infinity when uncapped. */
export async function remainingDailyCap(userId: string, kind: string, capPesewas: number): Promise<number> {
  if (capPesewas <= 0) return Number.POSITIVE_INFINITY;
  const res = await getJson(
    `/auth/internal/approvals/cap?userId=${encodeURIComponent(userId)}&kind=${encodeURIComponent(kind)}&capPesewas=${capPesewas}`,
  );
  if (!res.ok) throw new ServiceUnavailableException('Could not read the daily cap');
  return typeof res.json === 'number' ? res.json : Number.POSITIVE_INFINITY;
}
