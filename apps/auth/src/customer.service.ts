/**
 * Customer domain for Operations.
 *
 * Before this there was no way to act on an abusive account at all: no status column, so
 * nothing to set; no suspension, so nothing to enforce; and no session revoke, so even a
 * password change left issued tokens live until they expired.
 *
 * The enforcement half lives in `@ore/core` (`StandingService` + `@RequireStanding()`), which
 * calls `GET /auth/internal/users/:id/standing`. This service is the write side and the
 * single source of truth for what that endpoint returns.
 */

import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { DeliveryAddressDto, EVENTS, Role, SavedAddressUpsertDto } from '@ore/contracts';
import type { Bus } from '@ore/bus';
import { ORE_BUS, executionRefFor, requireDualControl } from '@ore/core';
import type { JwtPayload } from '@ore/core';
import { User } from './entities/user.entity';
import { AdminAction } from './entities/admin-action.entity';
import { ComplianceService } from './compliance.service';
import { CustomerAddressAudit, CustomerSavedAddress } from './entities/customer-address.entity';

export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED';

export interface StandingDto {
  status: AccountStatus;
  suspendedUntil: string | null;
  suspensionReason: string | null;
  tokenEpoch: number;
  /**
   * Set when a compliance hold with scope ORDER or ALL is active for this user.
   *
   * Carried on the standing payload rather than checked separately so the three routes already
   * decorated with `@RequireStanding()` enforce it with no new hop — and so there is one answer
   * to "may this user transact", not two that can disagree.
   */
  orderBlocked: boolean;
  orderBlockReason: string | null;
  codTier: string;
  codAllowed: boolean;
  codLimitPesewas: number;
  codBlockReason: string | null;
}

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(AdminAction) private readonly actions: Repository<AdminAction>,
    @InjectRepository(CustomerSavedAddress) private readonly savedAddresses: Repository<CustomerSavedAddress>,
    @InjectRepository(CustomerAddressAudit) private readonly addressAudits: Repository<CustomerAddressAudit>,
    @Inject(ORE_BUS) private readonly bus: Bus,
    private readonly compliance: ComplianceService,
  ) {}

  /**
   * What the standing check reads.
   *
   * An expired suspension is returned as ACTIVE rather than left for the caller to
   * interpret: one place decides, so a customer whose suspension lapsed at midnight is not
   * still being refused at 09:00 because some other service cached the old answer.
   */
  async standing(userId: string): Promise<StandingDto> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    let status = (user.status || 'ACTIVE') as AccountStatus;
    if (status === 'SUSPENDED' && user.suspendedUntil && user.suspendedUntil.getTime() < Date.now()) {
      status = 'ACTIVE';
      // Persist the self-clear so the row stops lying about the account's standing.
      user.status = 'ACTIVE';
      user.suspendedUntil = null;
      await this.users.save(user);
    }
    // Only worth looking up when the account is otherwise usable: a banned user is already
    // refused, and this saves a query on the path that matters least.
    let orderBlocked = false;
    let orderBlockReason: string | null = null;
    if (status === 'ACTIVE') {
      const holds = await this.compliance.activeHoldsFor('CUSTOMER', userId);
      const hit = holds.find((h) => h.scope === 'ORDER' || h.scope === 'ALL');
      if (hit) {
        orderBlocked = true;
        orderBlockReason = hit.reason;
      }
    }
    const codTier = user.customerCodTier ?? 'NEW';
    const codAllowed = status === 'ACTIVE' && !orderBlocked && !user.customerCodBlocked;
    return {
      status,
      suspendedUntil: user.suspendedUntil ? user.suspendedUntil.toISOString() : null,
      suspensionReason: user.suspensionReason,
      tokenEpoch: user.tokenEpoch ?? 0,
      orderBlocked,
      orderBlockReason,
      codTier,
      codAllowed,
      codLimitPesewas: customerCodLimit(codTier),
      codBlockReason: user.customerCodBlocked ? user.customerCodBlockReason ?? 'COD disabled for this customer' : null,
    };
  }

  /** Search by phone, publicId or name. Cursor-paginated so a big book stays fast. */
  async list(opts: { q?: string; status?: string; city?: string; cursor?: string; limit?: number } = {}) {
    const take = Math.min(100, Math.max(1, opts.limit ?? 25));
    const qb = this.users
      .createQueryBuilder('u')
      .where('u.role = :role', { role: Role.CUSTOMER })
      .orderBy('u.createdAt', 'DESC')
      .addOrderBy('u.id', 'DESC')
      .take(take + 1);

    if (opts.status) qb.andWhere('u.status = :status', { status: opts.status });
    if (opts.city) qb.andWhere('u.city = :city', { city: opts.city });
    if (opts.q?.trim()) {
      const q = `%${opts.q.trim()}%`;
      qb.andWhere(
        new Brackets((w) => {
          w.where('u.phone LIKE :q', { q })
            .orWhere('u.publicId LIKE :q', { q })
            .orWhere('u.name LIKE :q', { q })
            .orWhere('u.email LIKE :q', { q });
        }),
      );
    }
    if (opts.cursor) {
      // Cursor is the createdAt of the last row seen; `id` breaks ties deterministically.
      qb.andWhere('u.createdAt < :cursor', { cursor: new Date(opts.cursor) });
    }

    const rows = await qb.getMany();
    const hasMore = rows.length > take;
    const page = rows.slice(0, take);
    return {
      customers: page.map((u) => this.toSummary(u)),
      nextCursor: hasMore && page.length ? page[page.length - 1].createdAt.toISOString() : null,
    };
  }

  async listSavedAddresses(customerId: string): Promise<CustomerSavedAddress[]> {
    await this.requireCustomer(customerId);
    return this.savedAddresses.find({ where: { customerId, active: true }, order: { isDefault: 'DESC', updatedAt: 'DESC' } });
  }

  async createSavedAddress(customerId: string, actor: JwtPayload, dto: SavedAddressUpsertDto): Promise<CustomerSavedAddress> {
    await this.requireCustomer(customerId);
    if (dto.isDefault) await this.savedAddresses.update({ customerId, active: true }, { isDefault: false });
    const row = await this.savedAddresses.save(this.savedAddresses.create({
      customerId,
      label: dto.label.trim(),
      addressJson: normalizedAddress(dto.address, dto.label),
      isDefault: !!dto.isDefault,
      active: true,
      createdBy: actor.sub,
      updatedBy: actor.sub,
    }));
    await this.addressAudit(customerId, row.id, 'CREATED', actor, null, row.addressJson, dto.reason ?? null);
    return row;
  }

  async updateSavedAddress(customerId: string, addressId: string, actor: JwtPayload, dto: SavedAddressUpsertDto): Promise<CustomerSavedAddress> {
    await this.requireCustomer(customerId);
    const row = await this.savedAddresses.findOne({ where: { id: addressId, customerId, active: true } });
    if (!row) throw new NotFoundException('Saved address not found');
    const before = row.addressJson;
    if (dto.isDefault) await this.savedAddresses.update({ customerId, active: true }, { isDefault: false });
    row.label = dto.label.trim();
    row.addressJson = normalizedAddress(dto.address, dto.label);
    row.isDefault = !!dto.isDefault || row.isDefault;
    row.updatedBy = actor.sub;
    const saved = await this.savedAddresses.save(row);
    await this.addressAudit(customerId, row.id, actor.role === Role.ADMIN ? 'SUPPORT_CORRECTION' : 'UPDATED', actor, before, saved.addressJson, dto.reason ?? null);
    return saved;
  }

  async deactivateSavedAddress(customerId: string, addressId: string, actor: JwtPayload, reason?: string): Promise<{ ok: true }> {
    await this.requireCustomer(customerId);
    const row = await this.savedAddresses.findOne({ where: { id: addressId, customerId, active: true } });
    if (!row) throw new NotFoundException('Saved address not found');
    const before = row.addressJson;
    row.active = false;
    row.isDefault = false;
    row.updatedBy = actor.sub;
    await this.savedAddresses.save(row);
    await this.addressAudit(customerId, row.id, 'DEACTIVATED', actor, before, null, reason ?? null);
    return { ok: true };
  }

  async savedAddressAudit(customerId: string): Promise<CustomerAddressAudit[]> {
    await this.requireCustomer(customerId);
    return this.addressAudits.find({ where: { customerId }, order: { createdAt: 'DESC' }, take: 100 });
  }

  /**
   * Internal, privacy-safe marketing audience — who may be contacted, and on what basis.
   *
   * Marketing lives in the notification service but *consent and city* live here, so this is
   * the read the segment builder makes. It returns ids and flags, never names, phones, or
   * emails: the notification service resolves contact details per recipient at send time from
   * the data it already has, and `marketing.pii.export` is `-` for every role.
   *
   * Suspended and banned accounts are excluded outright. A suspended customer receiving a
   * promotional SMS is both a support incident and an argument the platform loses.
   */
  async marketingAudience(opts: { role?: string; city?: string; consentedOnly?: boolean } = {}): Promise<Array<{
    userId: string;
    role: string;
    city: string | null;
    marketingConsent: boolean;
    createdAt: string;
  }>> {
    const role = opts.role ?? Role.CUSTOMER;
    const where: Record<string, unknown> = { role, status: 'ACTIVE' };
    if (opts.city) where.city = opts.city;
    if (opts.consentedOnly) where.marketingConsent = true;
    const rows = await this.users.find({ where });
    return rows.map((u) => ({
      userId: u.id,
      role: u.role,
      city: u.city,
      marketingConsent: !!u.marketingConsent,
      createdAt: u.createdAt.toISOString(),
    }));
  }

  private async requireCustomer(customerId: string): Promise<User> {
    const user = await this.users.findOne({ where: { id: customerId } });
    if (!user) throw new NotFoundException('Customer not found');
    if (user.role !== Role.CUSTOMER) throw new BadRequestException('Saved addresses are only for customer accounts');
    return user;
  }

  private async addressAudit(
    customerId: string,
    addressId: string | null,
    action: CustomerAddressAudit['action'],
    actor: JwtPayload,
    beforeJson: DeliveryAddressDto | null,
    afterJson: DeliveryAddressDto | null,
    reason: string | null,
  ): Promise<void> {
    await this.addressAudits.save(this.addressAudits.create({
      customerId, addressId, action, actorId: actor.sub, actorRole: actor.role, beforeJson, afterJson, reason,
    }));
  }

  private toSummary(u: User) {
    return {
      id: u.id,
      phone: u.phone,
      publicId: u.publicId,
      name: u.name,
      email: u.email,
      status: u.status || 'ACTIVE',
      suspendedUntil: u.suspendedUntil,
      suspensionReason: u.suspensionReason,
      city: u.city,
      marketingConsent: !!u.marketingConsent,
      customerCodTier: u.customerCodTier ?? 'NEW',
      customerCodBlocked: !!u.customerCodBlocked,
      customerCodBlockReason: u.customerCodBlockReason,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
    };
  }

  async profile(userId: string) {
    const u = await this.users.findOne({ where: { id: userId } });
    if (!u) throw new NotFoundException('User not found');
    return this.toSummary(u);
  }

  /**
   * Suspend, ban, or reinstate.
   *
   * `reason` is mandatory and audited. A suspension nobody can explain is worse than no
   * suspension: the customer cannot appeal it and the business cannot defend it.
   *
   * `tokenEpoch` is bumped so anything that checks it stops trusting old tokens. Note that
   * the standing check itself is what actually bites, and it does so within the cache TTL
   * (~15s) rather than at token expiry — that gap is the reason this exists.
   */
  async setStatus(
    actor: JwtPayload,
    userId: string,
    input: { status: AccountStatus; reason?: string; until?: string | null },
    meta?: { ip?: string | null; userAgent?: string | null },
  ) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === Role.ADMIN) {
      throw new BadRequestException('Admins are managed under Admins, not as customers');
    }
    if (!['ACTIVE', 'SUSPENDED', 'BANNED'].includes(input.status)) {
      throw new BadRequestException('status must be ACTIVE, SUSPENDED or BANNED');
    }
    if (input.status !== 'ACTIVE' && (!input.reason || input.reason.trim().length < 5)) {
      throw new BadRequestException('A reason of at least 5 characters is required to suspend or ban');
    }
    if (actor.sub === userId) {
      throw new BadRequestException('You cannot change your own account standing');
    }

    // `customer.ban` is a 'D' permission — dual-controlled, same class as a refund or a
    // payout. Closing someone's account permanently is not a one-person decision, so it
    // goes through the maker-checker gate: the first call creates the request and changes
    // nothing, and it only executes once a second admin has signed it.
    if (input.status === 'BANNED') {
      return requireDualControl(
        {
          kind: 'customer.ban',
          permission: 'customer.ban',
          service: 'auth',
          resourceType: 'user',
          resourceId: userId,
          reason: input.reason!.trim(),
          // Frozen fields only, so an edit between ask and approve cannot ban a different
          // account or under a different stated reason.
          payload: { userId, status: 'BANNED', reason: input.reason!.trim(), until: input.until ?? null },
          makerUserId: actor.sub,
          makerAdminRole: actor.adminRole ?? null,
        },
        actor.sub,
        () => this.applyStatus(actor, user, input, meta, 'customer.ban'),
      );
    }

    return this.applyStatus(actor, user, input, meta, 'customer.suspend');
  }

  /**
   * The write itself, split out so the ban path can run it inside the dual-control gate
   * and the suspend path can run it directly.
   *
   * `tokenEpoch` is bumped so anything that checks it stops trusting old tokens. Note that
   * the standing check itself is what actually bites, and it does so within the cache TTL
   * (~15s) rather than at token expiry — that gap is the reason this exists.
   */
  private async applyStatus(
    actor: JwtPayload,
    user: User,
    input: { status: AccountStatus; reason?: string; until?: string | null },
    meta: { ip?: string | null; userAgent?: string | null } | undefined,
    permission: 'customer.suspend' | 'customer.ban',
  ) {
    const before = user.status || 'ACTIVE';
    user.status = input.status;
    if (input.status === 'ACTIVE') {
      user.suspendedUntil = null;
      user.suspensionReason = null;
      user.suspendedBy = null;
    } else {
      user.suspensionReason = input.reason!.trim();
      user.suspendedBy = actor.sub;
      user.suspendedUntil = null;
      if (input.until) {
        const parsed = new Date(input.until);
        if (Number.isNaN(parsed.getTime())) throw new BadRequestException('until is not a valid date');
        user.suspendedUntil = parsed;
      }
    }
    // Bumping the epoch is what lets a future "revoke all sessions" work without a session
    // table: any check that compares the token's epoch to this one rejects the old tokens.
    user.tokenEpoch = (user.tokenEpoch ?? 0) + 1;
    await this.users.save(user);

    // Append-only audit. Note the columns that actually exist on AdminAction: there is no
    // `action` or `metaJson` column, and writing to them is silently dropped by TypeORM —
    // which is how this once produced a log full of rows with no action and no metadata.
    // The transition lives in before/after, the human reason in `reason`, the exercised
    // right in `permission`.
    try {
      await this.actions.save(
        this.actions.create({
          actorUserId: actor.sub,
          actorAdminRole: actor.adminRole ?? null,
          permission,
          decision: 'allow',
          reason: input.reason?.trim() ?? null,
          service: 'auth',
          method: 'POST',
          path: `/auth/admin/customers/${user.id}/status`,
          resourceType: 'user',
          resourceId: user.id,
          amountPesewas: null,
          beforeJson: { status: before },
          afterJson: { status: input.status, suspendedUntil: user.suspendedUntil ?? null },
          degraded: false,
          ip: meta?.ip ?? null,
          userAgent: meta?.userAgent ?? null,
        }),
      );
    } catch (err) {
      // Auditing must never be the reason a suspension fails — but it must not fail
      // quietly either, so it is logged loudly.
      this.logger.error(`Could not audit customer status change ${user.id}: ${(err as Error).message}`);
    }

    // Tell every service holding a cached standing answer to drop it. Without this the
    // change only propagates when their cache TTL expires, and a suspended customer keeps
    // ordering for the length of it. Published after the write, and never allowed to fail
    // the action: the TTL bounds the damage if the bus is down.
    try {
      await this.bus.publish(EVENTS.USER_STANDING_CHANGED, {
        userId: user.id,
        status: user.status,
        tokenEpoch: user.tokenEpoch ?? 0,
      });
    } catch (err) {
      this.logger.error(`Could not broadcast standing change for ${user.id}: ${(err as Error).message}`);
    }

    this.logger.warn(`customer ${user.id} ${before} -> ${input.status} by ${actor.sub}`);
    return this.toSummary(user);
  }

  /** Marketing consent is the customer's to give and withdraw; ops can only record it. */
  async setMarketingConsent(userId: string, consent: boolean) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    user.marketingConsent = consent;
    await this.users.save(user);
    return { id: user.id, marketingConsent: user.marketingConsent };
  }

  async setCustomerCodPolicy(actor: JwtPayload, userId: string, input: { tier?: 'NEW' | 'STANDARD' | 'TRUSTED' | 'PREMIUM'; blocked?: boolean; reason?: string }) {
    const user = await this.requireCustomer(userId);
    if (input.tier) user.customerCodTier = input.tier;
    if (typeof input.blocked === 'boolean') {
      user.customerCodBlocked = input.blocked;
      user.customerCodBlockReason = input.blocked ? input.reason?.trim() || 'COD disabled by support' : null;
    }
    await this.users.save(user);
    await this.actions.save(this.actions.create({
      actorUserId: actor.sub,
      actorAdminRole: actor.adminRole ?? null,
      permission: 'customer.cod.manage',
      decision: 'allow',
      reason: input.reason?.trim() || null,
      service: 'auth',
      method: 'POST',
      path: `/auth/admin/customers/${user.id}/cod-policy`,
      resourceType: 'user',
      resourceId: user.id,
      amountPesewas: null,
      beforeJson: null,
      afterJson: { tier: user.customerCodTier, blocked: user.customerCodBlocked },
      degraded: false,
      ip: null,
      userAgent: null,
      traceId: null,
    }));
    return {
      id: user.id,
      codTier: user.customerCodTier,
      codAllowed: !user.customerCodBlocked,
      codLimitPesewas: customerCodLimit(user.customerCodTier),
      codBlockReason: user.customerCodBlockReason,
    };
  }

  async setCity(userId: string, city: string | null) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    user.city = city?.trim() || null;
    await this.users.save(user);
    return { id: user.id, city: user.city };
  }

  /** Records a login so "last seen" is answerable. */
  async noteLogin(userId: string): Promise<void> {
    await this.users.update({ id: userId }, { lastLoginAt: new Date() }).catch(() => undefined);
  }
}

function customerCodLimit(tier: string): number {
  const envKey = `CUSTOMER_COD_TIER_${tier}_LIMIT_PESEWAS`;
  const defaults: Record<string, number> = { NEW: 20_000, STANDARD: 50_000, TRUSTED: 150_000, PREMIUM: 300_000 };
  const configured = Number(process.env[envKey]);
  return Number.isFinite(configured) && configured >= 0 ? configured : defaults[tier] ?? defaults.NEW;
}

function normalizedAddress(address: DeliveryAddressDto, label: string): DeliveryAddressDto {
  return {
    ...address,
    label: address.label?.trim() || label.trim(),
    source: address.source || 'CUSTOMER_SAVED',
    confirmationSource: address.confirmationSource ?? 'CUSTOMER_SAVED',
    confirmedAt: address.confirmedAt ?? new Date().toISOString(),
  };
}
