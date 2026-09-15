/**
 * Compliance: holds, KYC review, fraud flags, and the access-log review.
 *
 * SCOPE NOTE
 * This is the whole of compliance for this system, deliberately. Consent gating, DSAR
 * handling, breach notification and retention policy were scoped out by the product owner;
 * the permission keys for them still exist in the matrix (`compliance.dsar.handle`,
 * `compliance.erasure.execute`, `compliance.breach.*`, `compliance.retention.configure`) but
 * nothing is built against them, so they grant nothing. Leaving the keys in place rather than
 * deleting them means the matrix still describes the intended shape without implying a
 * capability that does not exist.
 *
 * WHY THIS LIVES IN AUTH
 * A hold has to be enforceable at the moment a withdrawal or an order is attempted, and the
 * standing check those paths already make points at auth. Putting holds anywhere else would
 * mean a second cross-service hop on the hot path, and a second place to get the answer wrong.
 */

import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { JwtPayload } from '@ore/core';
import { ComplianceHold, HoldScope, HoldTargetType } from './entities/compliance-hold.entity';
import { KycReview, KycStatus } from './entities/kyc-review.entity';
import { FraudFlag, FraudFlagSeverity, FraudFlagStatus } from './entities/fraud-flag.entity';
import { AdminAction } from './entities/admin-action.entity';

const TARGET_TYPES: HoldTargetType[] = ['CUSTOMER', 'RIDER', 'VENDOR'];
const SCOPES: HoldScope[] = ['WITHDRAWAL', 'ORDER', 'ALL'];
const SEVERITIES: FraudFlagSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const FLAG_STATUSES: FraudFlagStatus[] = ['OPEN', 'INVESTIGATING', 'CONFIRMED', 'DISMISSED'];

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(
    @InjectRepository(ComplianceHold) private readonly holds: Repository<ComplianceHold>,
    @InjectRepository(KycReview) private readonly kyc: Repository<KycReview>,
    @InjectRepository(FraudFlag) private readonly flags: Repository<FraudFlag>,
    @InjectRepository(AdminAction) private readonly actions: Repository<AdminAction>,
  ) {}

  // ════════════════════════════════════════════════════════════════════
  // HOLDS
  // ════════════════════════════════════════════════════════════════════

  async placeHold(actor: JwtPayload, input: {
    targetType: string; targetId: string; scope?: string; reason: string; until?: string | null; fraudFlagId?: string | null;
  }): Promise<ComplianceHold> {
    const targetType = input.targetType as HoldTargetType;
    if (!TARGET_TYPES.includes(targetType)) throw new BadRequestException(`targetType must be one of ${TARGET_TYPES.join(', ')}`);
    const targetId = input.targetId?.trim();
    if (!targetId) throw new BadRequestException('targetId is required');
    const scope = (input.scope ?? 'ALL') as HoldScope;
    if (!SCOPES.includes(scope)) throw new BadRequestException(`scope must be one of ${SCOPES.join(', ')}`);
    const reason = input.reason?.trim();
    if (!reason || reason.length < 5) throw new BadRequestException('A hold needs a reason of at least 5 characters');

    let until: Date | null = null;
    if (input.until) {
      until = new Date(input.until);
      if (Number.isNaN(until.getTime())) throw new BadRequestException('until is not a valid date');
      if (until.getTime() < Date.now()) throw new BadRequestException('until is in the past');
    }

    // One active hold per scope per party. A second identical hold adds no restriction and
    // only makes "when does this end" ambiguous.
    const existing = await this.holds.findOne({ where: { targetType, targetId, scope, status: 'ACTIVE' } });
    if (existing) throw new ConflictException(`An active ${scope} hold already exists for this ${targetType.toLowerCase()}`);

    const hold = await this.holds.save(this.holds.create({
      targetType, targetId, scope, reason, until,
      status: 'ACTIVE',
      placedBy: actor.sub,
      fraudFlagId: input.fraudFlagId ?? null,
    }));
    this.logger.log(`Hold ${hold.id}: ${scope} on ${targetType} ${targetId} by ${actor.sub}`);
    return hold;
  }

  async liftHold(actor: JwtPayload, id: string, note?: string): Promise<ComplianceHold> {
    const hold = await this.holds.findOne({ where: { id } });
    if (!hold) throw new NotFoundException('Hold not found');
    if (hold.status !== 'ACTIVE') throw new ConflictException(`Hold is already ${hold.status.toLowerCase()}`);
    hold.status = 'LIFTED';
    hold.liftedBy = actor.sub;
    hold.liftedAt = new Date();
    hold.liftNote = note?.trim() || null;
    const saved = await this.holds.save(hold);
    this.logger.log(`Hold ${id} lifted by ${actor.sub}`);
    return saved;
  }

  listHolds(filter: { targetType?: string; targetId?: string; status?: string } = {}): Promise<ComplianceHold[]> {
    const where: Record<string, unknown> = {};
    if (filter.targetType) where.targetType = filter.targetType;
    if (filter.targetId) where.targetId = filter.targetId;
    where.status = filter.status ?? 'ACTIVE';
    return this.holds.find({ where, order: { createdAt: 'DESC' }, take: 200 });
  }

  /**
   * The holds that bite for one party.
   *
   * An expired hold is returned as EXPIRED rather than left ACTIVE, and self-clears: the same
   * reasoning as an expired suspension in `CustomerService.standing()`. One place decides, so a
   * hold that lapsed at midnight is not still refusing a withdrawal at 09:00 because some other
   * service cached the old answer.
   */
  async activeHoldsFor(targetType: HoldTargetType, targetId: string): Promise<ComplianceHold[]> {
    const rows = await this.holds.find({ where: { targetType, targetId, status: 'ACTIVE' } });
    const out: ComplianceHold[] = [];
    for (const h of rows) {
      if (h.until && h.until.getTime() < Date.now()) {
        h.status = 'EXPIRED';
        await this.holds.save(h);
        continue;
      }
      out.push(h);
    }
    return out;
  }

  /**
   * What a withdrawal attempt is told.
   *
   * Returns the narrowest true statement rather than a bare yes/no, because "you cannot
   * withdraw" with no reason is a support ticket, and the rider already knows they cannot
   * withdraw — they pressed the button.
   */
  async withdrawalBlockFor(targetType: HoldTargetType, targetId: string): Promise<{ blocked: boolean; reason: string | null; holdId: string | null }> {
    const rows = await this.activeHoldsFor(targetType, targetId);
    const hit = rows.find((h) => h.scope === 'WITHDRAWAL' || h.scope === 'ALL');
    if (!hit) return { blocked: false, reason: null, holdId: null };
    return { blocked: true, reason: hit.reason, holdId: hit.id };
  }

  // ════════════════════════════════════════════════════════════════════
  // KYC REVIEW
  // ════════════════════════════════════════════════════════════════════

  async submitKyc(userId: string, userType: string, input: {
    documents?: Array<{ type: string; key: string }>; idNumber?: string; fullName?: string;
  }): Promise<KycReview> {
    const documents = input.documents ?? [];
    if (!documents.length) throw new BadRequestException('At least one document is required');
    for (const d of documents) {
      if (!d?.type || !d?.key) throw new BadRequestException('Each document needs a type and a storage key');
    }
    // One open case per person. Two queues for the same identity is how the same documents get
    // decided twice, differently.
    const open = await this.kyc.findOne({ where: { userId, status: 'PENDING' } });
    if (open) throw new ConflictException('A review is already pending for this user');

    return this.kyc.save(this.kyc.create({
      userId,
      userType: (userType ?? 'CUSTOMER') as KycReview['userType'],
      status: 'PENDING',
      documentKeysJson: documents.map((d) => ({
        type: d.type as 'NATIONAL_ID',
        key: d.key,
        uploadedAt: new Date().toISOString(),
      })),
      idNumber: input.idNumber?.trim() || null,
      fullName: input.fullName?.trim() || null,
      submittedBy: userId,
      submittedAt: new Date(),
      provider: null, // manual until Smile ID is wired
    }));
  }

  async kycQueue(status: string = 'PENDING'): Promise<KycReview[]> {
    const where: Record<string, unknown> = status === 'ALL' ? {} : { status };
    return this.kyc.find({ where, order: { createdAt: 'ASC' }, take: 200 });
  }

  async getKyc(id: string): Promise<KycReview> {
    const row = await this.kyc.findOne({ where: { id } });
    if (!row) throw new NotFoundException('KYC review not found');
    return row;
  }

  /**
   * Decide a KYC case.
   *
   * `compliance.kyc.decide` is held by operations and compliance, and the caller must not be
   * the submitter. Approving KYC is what unlocks withdrawals for an account, so it is the
   * highest-leverage approval in the system and the one most worth a second pair of eyes.
   */
  async decideKyc(actor: JwtPayload, id: string, decision: string, note?: string): Promise<KycReview> {
    const row = await this.getKyc(id);
    if (row.status !== 'PENDING' && row.status !== 'NEEDS_INFO') {
      throw new ConflictException(`This review is already ${row.status}`);
    }
    const status = decision.toUpperCase() as KycStatus;
    if (!['APPROVED', 'REJECTED', 'NEEDS_INFO'].includes(status)) {
      throw new BadRequestException('Decision must be APPROVED, REJECTED or NEEDS_INFO');
    }
    if (status !== 'APPROVED') {
      const trimmed = note?.trim();
      if (!trimmed || trimmed.length < 5) {
        throw new BadRequestException(`A ${status} decision needs a note of at least 5 characters`);
      }
    }
    if (row.submittedBy === actor.sub) {
      throw new ConflictException('You cannot decide a review you submitted');
    }
    row.status = status;
    row.decidedBy = actor.sub;
    row.decidedAt = new Date();
    row.decisionNote = note?.trim() || null;
    this.logger.log(`KYC ${id} → ${status} by ${actor.sub}`);
    return this.kyc.save(row);
  }

  // ════════════════════════════════════════════════════════════════════
  // FRAUD FLAGS
  // ════════════════════════════════════════════════════════════════════

  async raiseFlag(actor: JwtPayload, input: {
    targetType: string; targetId: string; severity?: string; category: string;
    reason: string; evidence?: Record<string, unknown>;
  }): Promise<FraudFlag> {
    const targetType = input.targetType;
    if (!['CUSTOMER', 'RIDER', 'VENDOR', 'ORDER', 'PAYMENT'].includes(targetType)) {
      throw new BadRequestException('targetType must be CUSTOMER, RIDER, VENDOR, ORDER or PAYMENT');
    }
    const severity = (input.severity ?? 'MEDIUM') as FraudFlagSeverity;
    if (!SEVERITIES.includes(severity)) throw new BadRequestException(`severity must be one of ${SEVERITIES.join(', ')}`);
    const category = input.category?.trim().toUpperCase();
    if (!category || !/^[A-Z0-9_]{3,40}$/.test(category)) {
      throw new BadRequestException('category must be 3-40 chars of A-Z 0-9 _ (e.g. COD_MISMATCH)');
    }
    const reason = input.reason?.trim();
    if (!reason || reason.length < 5) throw new BadRequestException('A fraud flag needs a reason of at least 5 characters');

    return this.flags.save(this.flags.create({
      targetType: targetType as FraudFlag['targetType'],
      targetId: input.targetId,
      severity,
      category,
      reason,
      evidenceJson: input.evidence ?? null,
      status: 'OPEN',
      raisedBy: actor.sub,
    }));
  }

  listFlags(filter: { status?: string; targetType?: string; targetId?: string; severity?: string } = {}): Promise<FraudFlag[]> {
    const where: Record<string, unknown> = {};
    if (filter.status) where.status = filter.status;
    if (filter.targetType) where.targetType = filter.targetType;
    if (filter.targetId) where.targetId = filter.targetId;
    if (filter.severity) where.severity = filter.severity;
    return this.flags.find({ where, order: { createdAt: 'DESC' }, take: 200 });
  }

  async resolveFlag(actor: JwtPayload, id: string, status: string, note: string): Promise<FraudFlag> {
    const flag = await this.flags.findOne({ where: { id } });
    if (!flag) throw new NotFoundException('Fraud flag not found');
    const next = status.toUpperCase() as FraudFlagStatus;
    if (!FLAG_STATUSES.includes(next)) throw new BadRequestException(`status must be one of ${FLAG_STATUSES.join(', ')}`);
    if (flag.status === 'CONFIRMED' || flag.status === 'DISMISSED') {
      throw new ConflictException(`This flag is already ${flag.status.toLowerCase()} and cannot be re-decided`);
    }
    const trimmed = note?.trim();
    if ((next === 'CONFIRMED' || next === 'DISMISSED') && (!trimmed || trimmed.length < 5)) {
      throw new BadRequestException(`A ${next} resolution needs a note of at least 5 characters`);
    }
    flag.status = next;
    if (next === 'CONFIRMED' || next === 'DISMISSED') {
      flag.resolvedBy = actor.sub;
      flag.resolvedAt = new Date();
    }
    flag.resolutionNote = trimmed || null;
    this.logger.log(`Fraud flag ${id} → ${next} by ${actor.sub}`);
    return this.flags.save(flag);
  }

  async assignFlag(actor: JwtPayload, id: string): Promise<FraudFlag> {
    const flag = await this.flags.findOne({ where: { id } });
    if (!flag) throw new NotFoundException('Fraud flag not found');
    if (flag.status !== 'OPEN' && flag.status !== 'INVESTIGATING') {
      throw new ConflictException(`A ${flag.status.toLowerCase()} flag cannot be assigned`);
    }
    flag.assignedTo = actor.sub;
    flag.status = 'INVESTIGATING';
    return this.flags.save(flag);
  }

  // ════════════════════════════════════════════════════════════════════
  // ACCESS-LOG REVIEW
  // ════════════════════════════════════════════════════════════════════

  /**
   * Who looked at KYC material, and when.
   *
   * Reads the same `admin_action` table the permission guard writes, filtered to the
   * compliance document/KYC keys. There is deliberately no second log: an access log that is
   * not the enforcement log drifts from it, and then neither can be trusted.
   */
  async documentAccessLog(opts: { userId?: string; limit?: number } = {}): Promise<Array<{
    at: string; actorUserId: string | null; actorAdminRole: string | null;
    permission: string | null; decision: string; path: string | null; ip: string | null;
  }>> {
    const qb = this.actions.createQueryBuilder('a')
      .where('a.permission IN (:...perms)', {
        perms: ['compliance.document.read', 'compliance.kyc.read', 'compliance.kyc.decide'],
      })
      .orderBy('a.createdAt', 'DESC')
      .take(Math.min(500, Math.max(1, opts.limit ?? 100)));
    if (opts.userId) qb.andWhere('a.actorUserId = :uid', { uid: opts.userId });
    const rows = await qb.getMany();
    return rows.map((r) => ({
      at: r.createdAt.toISOString(),
      actorUserId: r.actorUserId,
      actorAdminRole: r.actorAdminRole,
      permission: r.permission,
      decision: r.decision,
      path: r.path,
      ip: r.ip,
    }));
  }
}
