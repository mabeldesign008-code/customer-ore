import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { AdminApproval } from './entities/admin-approval.entity';
import { AdminUser } from './entities/admin-user.entity';
import { AdminAction } from './entities/admin-action.entity';

/**
 * Maker-checker for dual-controlled money actions.
 *
 * The rule being enforced: **no single admin can initiate, approve and execute a
 * high-risk action end to end.** Holding `finance.withdrawal.approve` tells you a person
 * is allowed to sign; this service decides whether a *specific* request has been signed
 * by enough people, and crucially that none of them is the person who asked.
 *
 * Thresholds are the standard tiered model (one checker for routine, more as the amount
 * grows, a manager in the loop at the top):
 *   <  GHS 1,000      -> 1 checker
 *   1,000 - 10,000    -> 2 checkers, one must be super admin
 *   >  GHS 10,000     -> 3 checkers, one must be super admin
 * Structural actions (payout-account change, wallet adjust, ban, fee-policy change) are
 * always dual whatever the amount, because the damage is not proportional to the number.
 *
 * Every threshold is env-overridable so they can be tightened in production without a
 * deploy, and so a test can drive the multi-checker path with pocket-money amounts.
 */

export type ApprovalTier = { min: number; approvals: number; requiresSuper: boolean };

export interface ApprovalRequest {
  kind: string;
  permission: string;
  service: string;
  resourceType?: string | null;
  resourceId?: string | null;
  executionRef: string;
  amountPesewas?: number;
  currency?: string;
  payload?: Record<string, unknown> | null;
  reason?: string | null;
  /** Overrides the amount tier. Used for the "always dual" structural actions. */
  forceApprovals?: number;
  forceRequiresSuper?: boolean;
}

export interface ApprovalView {
  id: string;
  kind: string;
  permission: string;
  service: string;
  resourceType: string | null;
  resourceId: string | null;
  executionRef: string;
  amountPesewas: number;
  currency: string;
  reason: string | null;
  requiredApprovals: number;
  requiresSuperAdmin: boolean;
  approvals: { userId: string; adminRole: string | null; at: string; note?: string }[];
  status: string;
  expiresAt: Date;
  makerUserId: string;
  makerAdminRole: string | null;
  createdAt: Date;
  resultJson: Record<string, unknown> | null;
  failureReason: string | null;
}

/** Canonical JSON so {a:1,b:2} and {b:2,a:1} hash the same. */
function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).sort().map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`).join(',')}}`;
}

export function hashPayload(payload: Record<string, unknown> | null | undefined): string {
  return createHash('sha256').update(canonical(payload ?? {})).digest('hex');
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

@Injectable()
export class ApprovalService {
  private readonly logger = new Logger(ApprovalService.name);

  /** Pesewas. Defaults match the documented tiers: GHS 1,000 and GHS 10,000. */
  private readonly tier1Limit = envInt('APPROVAL_TIER1_LIMIT_PESEWAS', 100_000);
  private readonly tier2Limit = envInt('APPROVAL_TIER2_LIMIT_PESEWAS', 1_000_000);
  private readonly tier1Approvals = envInt('APPROVAL_TIER1_CHECKERS', 1);
  private readonly tier2Approvals = envInt('APPROVAL_TIER2_CHECKERS', 2);
  private readonly tier3Approvals = envInt('APPROVAL_TIER3_CHECKERS', 3);
  private readonly ttlMinutes = envInt('APPROVAL_TTL_MINUTES', 60);

  constructor(
    @InjectRepository(AdminApproval) private readonly approvals: Repository<AdminApproval>,
    @InjectRepository(AdminUser) private readonly admins: Repository<AdminUser>,
    @InjectRepository(AdminAction) private readonly actions: Repository<AdminAction>,
  ) {}

  /** The tier an amount falls into. Exported so tests and the UI can show the rule. */
  tiers(): { label: string; from: number; to: number | null; approvals: number; requiresSuper: boolean }[] {
    return [
      { label: 'routine', from: 0, to: this.tier1Limit, approvals: this.tier1Approvals, requiresSuper: false },
      { label: 'elevated', from: this.tier1Limit, to: this.tier2Limit, approvals: this.tier2Approvals, requiresSuper: true },
      { label: 'critical', from: this.tier2Limit, to: null, approvals: this.tier3Approvals, requiresSuper: true },
    ];
  }

  private requiredFor(amountPesewas: number): { approvals: number; requiresSuper: boolean } {
    if (amountPesewas >= this.tier2Limit) return { approvals: this.tier3Approvals, requiresSuper: true };
    if (amountPesewas >= this.tier1Limit) return { approvals: this.tier2Approvals, requiresSuper: true };
    return { approvals: this.tier1Approvals, requiresSuper: false };
  }

  private async actorOrThrow(userId: string): Promise<AdminUser> {
    const admin = await this.admins.findOne({ where: { userId } });
    if (!admin) throw new ForbiddenException('Caller is not a provisioned admin');
    if (admin.status !== 'ACTIVE') throw new ForbiddenException(`Admin account is ${admin.status.toLowerCase()}`);
    return admin;
  }

  /**
   * Maker submits. Fails on a duplicate `executionRef`, which is the first line of the
   * double-payment defence: the same request cannot be queued twice.
   */
  async submit(req: ApprovalRequest, makerUserId: string, makerAdminRole: string | null): Promise<ApprovalView> {
    if (!req.executionRef || req.executionRef.length < 8) {
      throw new BadRequestException('executionRef is required and must be at least 8 characters');
    }
    const existing = await this.approvals.findOne({ where: { executionRef: req.executionRef } });
    if (existing) {
      // Not an error to ask twice — but the answer must be the *first* request, so the
      // caller can never end up holding two approvals for one payout.
      return this.view(existing);
    }

    const amount = Math.max(0, Math.trunc(req.amountPesewas ?? 0));
    const tier = this.requiredFor(amount);
    const required = Math.max(req.forceApprovals ?? tier.approvals, tier.approvals);
    const requiresSuper = !!(req.forceRequiresSuper ?? tier.requiresSuper) || tier.requiresSuper;

    // Structural actions carry an amount of zero, so without this floor they would need
    // only one signature and the whole point of marking them dual would be lost.
    const requiredApprovals = Math.max(required, 1);

    const row = this.approvals.create({
      kind: req.kind,
      permission: req.permission,
      service: req.service,
      resourceType: req.resourceType ?? null,
      resourceId: req.resourceId ?? null,
      executionRef: req.executionRef,
      amountPesewas: amount,
      currency: req.currency ?? 'GHS',
      payloadJson: req.payload ?? null,
      payloadHash: hashPayload(req.payload),
      makerUserId,
      makerAdminRole,
      reason: req.reason ?? null,
      requiredApprovals,
      requiresSuperAdmin: requiresSuper,
      approvalsJson: [],
      status: 'PENDING',
      expiresAt: new Date(Date.now() + this.ttlMinutes * 60_000),
    });

    try {
      await this.approvals.save(row);
    } catch (err) {
      // Race: two makers submitted the same executionRef simultaneously. The unique
      // constraint already picked a winner — return it rather than a 500.
      const again = await this.approvals.findOne({ where: { executionRef: req.executionRef } });
      if (again) return this.view(again);
      throw err;
    }

    await this.audit({
      actorUserId: makerUserId,
      actorAdminRole: makerAdminRole,
      permission: req.permission,
      decision: 'allow',
      reason: `submitted for approval (${requiredApprovals} checker${requiredApprovals === 1 ? '' : 's'} required)`,
      service: req.service,
      resourceType: req.resourceType ?? null,
      resourceId: row.id,
      amountPesewas: amount,
      afterJson: { executionRef: req.executionRef, kind: req.kind },
    });

    return this.view(row);
  }

  /**
   * A checker signs. This is where "you cannot approve your own request" lives — at the
   * API level, not in the UI, so hiding the button cannot get around it.
   */
  async approve(approvalId: string, checkerUserId: string, note?: string | null): Promise<ApprovalView> {
    const row = await this.require(approvalId);
    await this.expireIfStale(row);
    if (row.status !== 'PENDING') throw new ConflictException(`Approval is ${row.status}`);

    if (row.makerUserId === checkerUserId) {
      throw new ForbiddenException('You cannot approve a request you submitted');
    }

    const checker = await this.actorOrThrow(checkerUserId);
    const existing = row.approvalsJson ?? [];
    if (existing.some((a) => a.userId === checkerUserId)) {
      throw new ConflictException('You have already signed this request');
    }
    // A super admin must be *among* the checkers — but only the final signature can be
    // refused on that basis. Checking it on every signature made a 2-checker request
    // impossible to complete whenever a non-super admin signed first, because their
    // signature was rejected and no progress could ever be made.
    const wouldComplete = existing.length + 1 >= row.requiredApprovals;
    const superAlreadySigned = existing.some((a) => a.adminRole === 'super_admin');
    if (row.requiresSuperAdmin && wouldComplete && !superAlreadySigned && checker.adminRole !== 'super_admin') {
      throw new ForbiddenException(
        `This needs a super admin among the ${row.requiredApprovals} checkers — ask one to sign`,
      );
    }

    const next = [...existing, { userId: checkerUserId, adminRole: checker.adminRole, at: new Date().toISOString(), note: note || undefined }];
    row.approvalsJson = next;

    const hasSuper = next.some((a) => a.adminRole === 'super_admin');
    if (next.length >= row.requiredApprovals && (!row.requiresSuperAdmin || hasSuper)) {
      row.status = 'APPROVED';
      row.decidedAt = new Date();
      row.decidedBy = checkerUserId;
    }
    await this.approvals.save(row);

    await this.audit({
      actorUserId: checkerUserId,
      actorAdminRole: checker.adminRole,
      permission: 'admin.approval.check',
      decision: 'allow',
      reason: `signed ${next.length}/${row.requiredApprovals} — now ${row.status}`,
      service: row.service,
      resourceType: row.resourceType,
      resourceId: row.id,
      amountPesewas: row.amountPesewas,
      beforeJson: { status: 'PENDING', signed: existing.length },
      afterJson: { status: row.status, signed: next.length },
    });

    return this.view(row);
  }

  async reject(approvalId: string, checkerUserId: string, reason: string): Promise<ApprovalView> {
    if (!reason || reason.trim().length < 3) throw new BadRequestException('A reason is required to reject');
    const row = await this.require(approvalId);
    if (row.status !== 'PENDING') throw new ConflictException(`Approval is ${row.status}`);
    const checker = await this.actorOrThrow(checkerUserId);
    if (row.makerUserId === checkerUserId) {
      throw new ForbiddenException('You cannot reject a request you submitted');
    }
    row.status = 'REJECTED';
    row.decidedAt = new Date();
    row.decidedBy = checkerUserId;
    row.failureReason = reason;
    await this.approvals.save(row);
    await this.audit({
      actorUserId: checkerUserId, actorAdminRole: checker.adminRole, permission: 'admin.approval.check',
      decision: 'allow', reason: `rejected — ${reason}`, service: row.service,
      resourceType: row.resourceType, resourceId: row.id, amountPesewas: row.amountPesewas,
      beforeJson: { status: 'PENDING' }, afterJson: { status: 'REJECTED' },
    });
    return this.view(row);
  }

  /** The maker pulls their own request back. Never anyone else. */
  async cancel(approvalId: string, userId: string): Promise<ApprovalView> {
    const row = await this.require(approvalId);
    if (row.makerUserId !== userId) throw new ForbiddenException('Only the maker can withdraw a request');
    if (row.status !== 'PENDING') throw new ConflictException(`Approval is ${row.status}`);
    row.status = 'CANCELLED';
    row.decidedAt = new Date();
    row.decidedBy = userId;
    await this.approvals.save(row);
    return this.view(row);
  }

  /**
   * Claim the right to execute. Only one caller can ever win this: the row moves to
   * EXECUTING under a conditional UPDATE, so a concurrent or replayed call finds it
   * already claimed and is refused. That is what stops a double payout after a crash.
   *
   * `payload` must match what was submitted — re-hashed here, so an edit between
   * approval and execution is impossible.
   */
  async beginExecution(
    executionRef: string,
    payload: Record<string, unknown> | null | undefined,
    executorUserId: string,
  ): Promise<{ approval: ApprovalView; executionToken: string }> {
    const row = await this.approvals.findOne({ where: { executionRef } });
    if (!row) throw new NotFoundException('No approval with that execution reference');
    await this.expireIfStale(row);

    if (row.status === 'EXECUTING') {
      throw new ConflictException('Already executing — confirm or roll back before retrying');
    }
    if (row.status === 'EXECUTED') {
      throw new ConflictException('Already executed');
    }
    if (row.status !== 'APPROVED') throw new ConflictException(`Approval is ${row.status}, not approved`);

    const submitted = hashPayload(row.payloadJson);
    if (hashPayload(payload) !== submitted) {
      await this.audit({
        actorUserId: executorUserId, actorAdminRole: null, permission: row.permission,
        decision: 'deny', reason: 'payload changed between approval and execution',
        service: row.service, resourceType: row.resourceType, resourceId: row.id,
        amountPesewas: row.amountPesewas,
        beforeJson: { payloadHash: submitted }, afterJson: { payloadHash: hashPayload(payload) },
      });
      throw new ForbiddenException('Payload no longer matches what was approved');
    }

    const claimed = await this.approvals
      .createQueryBuilder()
      .update(AdminApproval)
      .set({ status: 'EXECUTING', executedBy: executorUserId, executedAt: new Date() })
      .where('id = :id AND status = :status', { id: row.id, status: 'APPROVED' })
      .execute();

    if (!claimed.affected) {
      throw new ConflictException('Another executor claimed this approval first');
    }

    // The token is the executionRef itself: it is unique, already known to the caller and
    // doubles as the PSP idempotency key, so there is no second secret to keep in sync.
    return { approval: this.view({ ...row, status: 'EXECUTING' }), executionToken: row.executionRef };
  }

  /** Called by the executing service once the money has actually moved. */
  async completeExecution(executionRef: string, result: Record<string, unknown>): Promise<void> {
    const row = await this.approvals.findOne({ where: { executionRef } });
    if (!row) throw new NotFoundException('No approval with that execution reference');
    if (row.status === 'EXECUTED') return; // already recorded; make completion idempotent
    if (row.status !== 'EXECUTING') throw new ConflictException(`Approval is ${row.status}, not executing`);
    row.status = 'EXECUTED';
    row.resultJson = result;
    await this.approvals.save(row);
    await this.audit({
      actorUserId: row.executedBy, actorAdminRole: null, permission: row.permission,
      decision: 'allow', reason: `executed — ${row.kind}`, service: row.service,
      resourceType: row.resourceType, resourceId: row.id, amountPesewas: row.amountPesewas,
      afterJson: result,
    });
  }

  /**
   * Execution failed and is known to be safe to retry: the money did not move. This is a
   * human decision surfaced as an endpoint, not an automatic rewind, because a FAILED row
   * that was actually a success is a double payment.
   */
  async failExecution(executionRef: string, reason: string, safeToRetry: boolean): Promise<ApprovalView> {
    const row = await this.approvals.findOne({ where: { executionRef } });
    if (!row) throw new NotFoundException('No approval with that execution reference');
    if (row.status !== 'EXECUTING') throw new ConflictException(`Approval is ${row.status}, not executing`);
    row.status = safeToRetry ? 'FAILED' : 'EXECUTED';
    row.failureReason = reason;
    // If it is not safe to retry we must not leave it claimable; mark it done with the
    // failure recorded so a human reconciles it.
    row.resultJson = { failed: true, reason, safeToRetry };
    await this.approvals.save(row);
    await this.audit({
      actorUserId: row.executedBy, actorAdminRole: null, permission: row.permission,
      decision: 'deny', reason: `execution failed — ${reason}${safeToRetry ? ' (retryable)' : ' (NOT retryable, needs manual reconciliation)'}`,
      service: row.service, resourceType: row.resourceType, resourceId: row.id,
      amountPesewas: row.amountPesewas,
    });
    return this.view(row);
  }

  /** A FAILED approval can be re-approved from scratch only by writing a new one. */
  async retry(executionRef: string, userId: string): Promise<ApprovalView> {
    const row = await this.approvals.findOne({ where: { executionRef } });
    if (!row) throw new NotFoundException('No approval with that execution reference');
    if (row.status !== 'FAILED') throw new ConflictException(`Only a FAILED approval can be retried; this is ${row.status}`);
    await this.actorOrThrow(userId);
    row.status = 'PENDING';
    row.approvalsJson = [];
    row.executedBy = null;
    row.executedAt = null;
    row.failureReason = null;
    row.expiresAt = new Date(Date.now() + this.ttlMinutes * 60_000);
    await this.approvals.save(row);
    return this.view(row);
  }

  /**
   * Per-admin daily ceiling on a given action kind, in pesewas. Returns the amount still
   * available. Used by wallet adjustments, where a single admin's exposure is the risk.
   */
  async remainingDailyCap(userId: string, kind: string, capPesewas: number): Promise<number> {
    if (capPesewas <= 0) return Number.POSITIVE_INFINITY;
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    const rows = await this.approvals
      .createQueryBuilder('a')
      .where('a.makerUserId = :userId', { userId })
      .andWhere('a.kind = :kind', { kind })
      .andWhere('a.createdAt >= :since', { since })
      .andWhere('a.status NOT IN (:...excluded)', { excluded: ['REJECTED', 'CANCELLED', 'EXPIRED'] })
      .getMany();
    const used = rows.reduce((sum, r) => sum + r.amountPesewas, 0);
    return Math.max(0, capPesewas - used);
  }

  async queue(opts: { status?: string; limit?: number } = {}): Promise<ApprovalView[]> {
    const qb = this.approvals.createQueryBuilder('a').orderBy('a.createdAt', 'DESC').take(Math.min(opts.limit ?? 100, 500));
    if (opts.status) qb.andWhere('a.status = :status', { status: opts.status });
    return (await qb.getMany()).map((r) => this.view(r));
  }

  async get(approvalId: string): Promise<ApprovalView> {
    return this.view(await this.require(approvalId));
  }

  async byExecutionRef(executionRef: string): Promise<ApprovalView | null> {
    const row = await this.approvals.findOne({ where: { executionRef } });
    return row ? this.view(row) : null;
  }

  /** Sweep stale requests. Runs on the scheduler; also called opportunistically on read. */
  async expireStale(): Promise<number> {
    const res = await this.approvals
      .createQueryBuilder()
      .update(AdminApproval)
      .set({ status: 'EXPIRED' })
      .where('status = :pending AND expiresAt < :now', { pending: 'PENDING', now: new Date() })
      .execute();
    const n = res.affected ?? 0;
    if (n) this.logger.warn(`Expired ${n} stale approval request(s)`);
    return n;
  }

  private async expireIfStale(row: AdminApproval): Promise<void> {
    if (row.status === 'PENDING' && row.expiresAt.getTime() < Date.now()) {
      row.status = 'EXPIRED';
      await this.approvals.save(row);
    }
  }

  private async require(id: string): Promise<AdminApproval> {
    const row = await this.approvals.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Approval not found');
    return row;
  }

  private async audit(entry: {
    actorUserId: string | null;
    actorAdminRole: string | null;
    permission: string;
    decision: string;
    reason: string;
    service: string;
    resourceType: string | null;
    resourceId: string;
    amountPesewas: number;
    beforeJson?: Record<string, unknown> | null;
    afterJson?: Record<string, unknown> | null;
  }): Promise<void> {
    try {
      await this.actions.save(
        this.actions.create({
          ...entry,
          method: 'INTERNAL',
          path: `/auth/internal/approvals`,
          ip: null,
          degraded: false,
        }),
      );
    } catch (err) {
      // Auditing must never be the reason a money action fails.
      this.logger.error(`Could not write approval audit row: ${(err as Error).message}`);
    }
  }

  private view(row: AdminApproval): ApprovalView {
    return {
      id: row.id,
      kind: row.kind,
      permission: row.permission,
      service: row.service,
      resourceType: row.resourceType,
      resourceId: row.resourceId,
      executionRef: row.executionRef,
      amountPesewas: row.amountPesewas,
      currency: row.currency,
      reason: row.reason,
      requiredApprovals: row.requiredApprovals,
      requiresSuperAdmin: row.requiresSuperAdmin,
      approvals: row.approvalsJson ?? [],
      status: row.status,
      expiresAt: row.expiresAt,
      makerUserId: row.makerUserId,
      makerAdminRole: row.makerAdminRole,
      createdAt: row.createdAt,
      resultJson: row.resultJson,
      failureReason: row.failureReason,
    };
  }
}
