/**
 * Admin provisioning + the audit sink.
 *
 * WHY THIS EXISTS
 *   Until now the platform could only ever have ONE admin: `bootstrapAdmin()` seeded a
 *   row from ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_TOTP_SECRET, and there was no endpoint
 *   to create another. Two humans wanting finance and support access had to share one
 *   email, one password and one TOTP secret — which makes attribution impossible, so the
 *   audit requirement was unachievable, not merely unimplemented.
 *
 * ENROLMENT
 *   A created admin starts at PENDING_ENROLMENT with a `pendingTotpSecret`. Their first
 *   login presents the otpauth URI; they must produce a live code from it before a
 *   session is issued. The secret is never shown again and never leaves this service.
 *
 * AUDIT
 *   `AdminAction` is append-only. There is no update or delete path for it anywhere.
 */

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { ADMIN_ROLE_ORDER, AdminRoleKey, ALL_PERMISSIONS, Role, permissionsForRole } from '@ore/contracts';
import { JwtPayload } from '@ore/core';
import { isUniqueConstraintError } from './db-util';
import { AdminUser } from './entities/admin-user.entity';
import { AdminRoleGrant } from './entities/admin-role-grant.entity';
import { AdminAction } from './entities/admin-action.entity';
import { User } from './entities/user.entity';
import { generateTotpSecret, totpOtpauthUrl, verifyTotp } from './totp';
import { hashPassword } from './auth.service';

export interface AdminView {
  id: string;
  userId: string;
  adminRole: string;
  displayName: string | null;
  jobTitle: string | null;
  status: string;
  totpEnrolled: boolean;
  telegramLinked: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  permissionCount: number;
}

@Injectable()
export class AdminService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(AdminUser) private readonly admins: Repository<AdminUser>,
    @InjectRepository(AdminRoleGrant) private readonly grants: Repository<AdminRoleGrant>,
    @InjectRepository(AdminAction) private readonly actions: Repository<AdminAction>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  /**
   * Provision an `admin_user` row for every existing role='admin' user.
   *
   * This lives here and not only in the migration because `migrationsRun` is false
   * outside production (see libs/db/src/datasource.ts) — in dev the tables come from
   * `synchronize` and the migration's backfill INSERT would never run, which would
   * leave PermissionGuard denying every admin. Idempotent, so both paths are safe.
   */
  async onApplicationBootstrap(): Promise<void> {
    const admins = await this.users.find({ where: { role: Role.ADMIN } });
    let created = 0;
    for (const user of admins) {
      const existing = await this.admins.findOne({ where: { userId: user.id } });
      if (existing) {
        // Keep user.adminRole in step with the authoritative admin_user row. Never
        // default to super_admin here — that would silently promote every admin.
        if (user.adminRole !== existing.adminRole) {
          user.adminRole = existing.adminRole;
          await this.users.save(user);
        }
        continue;
      }
      // A role=admin user with no admin_user row is the env-seeded bootstrap admin,
      // which is the super admin. Writing it onto `user` (not only onto admin_user)
      // is what puts adminRole in the JWT, since issueTokens reads the user row.
      if (!user.adminRole) {
        user.adminRole = 'super_admin';
        await this.users.save(user);
      }
      try {
        await this.admins.save(
          this.admins.create({
            userId: user.id,
            // Anything predating per-admin roles is the env-seeded super admin.
            adminRole: user.adminRole || 'super_admin',
            displayName: user.name || user.email,
            status: 'ACTIVE',
            totpEnrolledAt: user.totpSecret ? new Date() : null,
          }),
        );
      } catch (err) {
        // Another boot path (AuthService.bootstrapAdmin) can provision the same row
        // concurrently on a fresh DB. Losing the insert race to an identical row is
        // not an error — reconcile and continue instead of crashing boot.
        if (!isUniqueConstraintError(err)) throw err;
        const winner = await this.admins.findOne({ where: { userId: user.id } });
        if (winner && user.adminRole !== winner.adminRole) {
          user.adminRole = winner.adminRole;
          await this.users.save(user);
        }
      }
      created += 1;
    }
    if (created) this.logger.log(`provisioned ${created} admin_user row(s) for existing admins`);
  }

  /* ─────────────────────── the guard's lookup ─────────────────────── */

  /**
   * Called by `PermissionGuard` (via `/auth/internal/admins/:userId`) on every admin
   * request, cached 15s client-side. Must stay cheap and must never throw.
   */
  async accessFor(userId: string): Promise<{
    found: boolean;
    adminRole: string | null;
    status: string;
    grants: string[];
    denials: string[];
  }> {
    const admin = await this.admins.findOne({ where: { userId } });
    if (!admin) {
      // No admin_user row. If `user` says this is an admin, honour its adminRole —
      // that is the bootstrap path before provisioning has run. Otherwise deny.
      const user = await this.users.findOne({ where: { id: userId } });
      if (user?.role === 'admin') {
        return { found: true, adminRole: user.adminRole ?? 'super_admin', status: 'ACTIVE', grants: [], denials: [] };
      }
      return { found: false, adminRole: null, status: 'NOT_PROVISIONED', grants: [], denials: [] };
    }
    const rows = await this.grants.find({ where: { adminUserId: admin.id } });
    return {
      found: true,
      adminRole: admin.adminRole,
      status: admin.status,
      grants: rows.filter((r) => r.mode === 'grant').map((r) => r.permission),
      denials: rows.filter((r) => r.mode === 'deny').map((r) => r.permission),
    };
  }

  /* ─────────────────────────── audit sink ─────────────────────────── */

  /** Wired into `PermissionGuard` as PERMISSION_AUDIT_SINK. Never throws. */
  async recordAction(entry: {
    actorUserId: string | null;
    actorAdminRole: string | null;
    permission: string | null;
    decision: 'allow' | 'deny';
    reason: string;
    service: string;
    method: string;
    path: string;
    ip: string | null;
    degraded: boolean;
    resourceType?: string | null;
    resourceId?: string | null;
    amountPesewas?: number | null;
    beforeJson?: Record<string, unknown> | null;
    afterJson?: Record<string, unknown> | null;
    userAgent?: string | null;
    traceId?: string | null;
  }): Promise<void> {
    try {
      await this.actions.save(
        this.actions.create({
          actorUserId: entry.actorUserId,
          actorAdminRole: entry.actorAdminRole,
          permission: entry.permission,
          decision: entry.decision,
          reason: entry.reason,
          service: entry.service,
          method: entry.method,
          path: entry.path,
          ip: entry.ip,
          degraded: entry.degraded,
          resourceType: entry.resourceType ?? null,
          resourceId: entry.resourceId ?? null,
          amountPesewas: entry.amountPesewas ?? null,
          beforeJson: entry.beforeJson ?? null,
          afterJson: entry.afterJson ?? null,
          userAgent: entry.userAgent ?? null,
          traceId: entry.traceId ?? null,
        }),
      );
    } catch (err) {
      // An audit write must never break the request it is describing.
      this.logger.error(`could not write admin_action: ${(err as Error).message}`);
    }
  }

  /**
   * Write an audit row posted by another service's guard.
   *
   * Fields are picked explicitly rather than spread from the body: this endpoint is reachable
   * by every service on the internal network, and an object spread would let a caller set a
   * column that was never meant to be writable. Unknown keys are dropped, not persisted.
   */
  async recordActionFromInternal(body: Record<string, unknown>): Promise<{ recorded: boolean }> {
    const str = (v: unknown, max = 500): string | null =>
      typeof v === 'string' && v.length ? v.slice(0, max) : null;
    const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
    await this.recordAction({
      actorUserId: str(body.actorUserId, 64),
      actorAdminRole: str(body.actorAdminRole, 32),
      permission: str(body.permission, 128),
      decision: body.decision === 'deny' ? 'deny' : 'allow',
      reason: str(body.reason) ?? 'posted by another service',
      service: str(body.service, 64) ?? 'unknown',
      method: str(body.method, 10) ?? 'POST',
      path: str(body.path, 300) ?? '',
      ip: str(body.ip, 64),
      degraded: body.degraded === true,
      resourceType: str(body.resourceType, 64),
      resourceId: str(body.resourceId, 64),
      amountPesewas: num(body.amountPesewas),
      userAgent: str(body.userAgent, 300),
      traceId: str(body.traceId, 64),
    });
    return { recorded: true };
  }

  async listActions(opts: {
    actorUserId?: string;
    permission?: string;
    decision?: string;
    resourceType?: string;
    limit?: number;
  }): Promise<AdminAction[]> {
    const where: Record<string, unknown> = {};
    if (opts.actorUserId) where.actorUserId = opts.actorUserId;
    if (opts.permission) where.permission = opts.permission;
    if (opts.decision) where.decision = opts.decision;
    if (opts.resourceType) where.resourceType = opts.resourceType;
    return this.actions.find({ where, order: { createdAt: 'DESC' }, take: Math.min(200, opts.limit ?? 50) });
  }

  /* ─────────────────────────── provisioning ─────────────────────────── */

  /**
   * The signed-in admin's own record plus their effective permission list.
   * The console drives its whole navigation off this, so it must agree with what
   * PermissionGuard will actually allow — same denials-beat-grants order as holds().
   */
  async self(userId: string): Promise<{
    admin: AdminView | null;
    adminRole: string | null;
    permissions: string[];
    status: string;
    mustEnrol: boolean;
  }> {
    const admin = await this.admins.findOne({ where: { userId } });
    if (!admin) {
      return { admin: null, adminRole: null, permissions: [], status: 'NOT_PROVISIONED', mustEnrol: false };
    }
    const overrides = await this.grants.find({ where: { adminUserId: admin.id } });
    const granted = overrides.filter((o) => o.mode === 'grant').map((o) => o.permission);
    const denied = new Set(overrides.filter((o) => o.mode === 'deny').map((o) => o.permission));
    const permissions = [...new Set([...permissionsForRole(admin.adminRole), ...granted])]
      .filter((p) => !denied.has(p))
      .sort();
    return {
      admin: await this.toView(admin),
      adminRole: admin.adminRole,
      // A non-ACTIVE admin holds nothing, whatever the matrix says. Mirror the guard.
      permissions: admin.status === 'ACTIVE' ? permissions : [],
      status: admin.status,
      mustEnrol: admin.status === 'PENDING_ENROLMENT',
    };
  }

  /**
   * Re-issue a TOTP secret for an admin who lost their authenticator.
   * Puts them back into PENDING_ENROLMENT so they cannot sign in until they scan
   * the new QR — the old secret stops working immediately.
   */
  async resetTotp(actor: JwtPayload, adminUserId: string): Promise<{ otpauthUrl: string }> {
    const admin = await this.require(adminUserId);
    if (admin.userId === actor.sub) {
      throw new BadRequestException('You cannot reset your own authenticator — ask another super admin');
    }
    const secret = generateTotpSecret();
    admin.pendingTotpSecret = secret;
    admin.enrolToken = randomBytes(24).toString('base64url');
    admin.enrolTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    admin.totpEnrolledAt = null;
    admin.status = 'PENDING_ENROLMENT';
    await this.admins.save(admin);
    // Kill the live secret so the old authenticator stops working at once.
    const user = await this.users.findOne({ where: { id: admin.userId } });
    if (user) {
      user.totpSecret = null;
      await this.users.save(user);
    }
    await this.recordAction({
      actorUserId: actor.sub,
      actorAdminRole: actor.adminRole ?? null,
      permission: 'admin.user.totp.reset',
      decision: 'allow',
      reason: 'authenticator reset — account returned to PENDING_ENROLMENT',
      service: 'auth',
      method: 'POST',
      path: `/auth/admin/admins/${adminUserId}/totp-reset`,
      ip: null,
      degraded: false,
      resourceType: 'admin_user',
      resourceId: admin.id,
      beforeJson: null,
      afterJson: { status: 'PENDING_ENROLMENT' },
    });
    const account = user?.email || user?.phone || admin.userId;
    return { otpauthUrl: totpOtpauthUrl({ secret, account, issuer: 'Ore Admin' }) };
  }

  async list(): Promise<AdminView[]> {
    const rows = await this.admins.find({ order: { createdAt: 'ASC' } });
    return Promise.all(rows.map((a) => this.toView(a)));
  }

  /**
   * Create an admin. Requires an existing `user` row (they sign up with their phone
   * first) — an admin is a person we already know, not a fresh account.
   */
  async create(
    actor: JwtPayload,
    input: { userId?: string; phone?: string; email?: string; adminRole: string; displayName?: string; jobTitle?: string; password: string },
  ): Promise<{ admin: AdminView; enrolment: { secret: string; otpauthUrl: string; enrolToken: string } }> {
    this.assertKnownRole(input.adminRole);

    const user = await this.findUser(input);
    if (!user) throw new NotFoundException('No user with that phone or email — they must register first');

    const existing = await this.admins.findOne({ where: { userId: user.id } });
    if (existing) throw new BadRequestException('That user is already an admin');

    const secret = generateTotpSecret();
    const enrolToken = randomBytes(24).toString('base64url');
    const admin = await this.admins.save(
      this.admins.create({
        userId: user.id,
        adminRole: input.adminRole,
        displayName: input.displayName?.trim() || user.name || user.email,
        jobTitle: input.jobTitle?.trim() || null,
        status: 'PENDING_ENROLMENT',
        pendingTotpSecret: secret,
        enrolToken,
        enrolTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        invitedBy: actor.sub,
        invitedAt: new Date(),
      }),
    );
    // Promote the underlying user record. adminLogin looks the user up with
    // `role: Role.ADMIN` and rejects anyone without a passwordHash, so all three
    // of these have to move together or the new admin can never sign in.
    user.role = Role.ADMIN;
    user.adminRole = input.adminRole;
    user.passwordHash = await hashPassword(input.password);
    if (input.email && !user.email) user.email = input.email.trim().toLowerCase();
    await this.users.save(user);

    await this.recordAction({
      actorUserId: actor.sub,
      actorAdminRole: actor.adminRole ?? null,
      permission: 'admin.user.create',
      decision: 'allow',
      reason: `created ${input.adminRole} admin for ${user.id}`,
      service: 'auth',
      method: 'POST',
      path: '/auth/admin/admins',
      ip: null,
      degraded: false,
      resourceType: 'admin_user',
      resourceId: admin.id,
    });

    const account = user.email || user.phone;
    return {
      admin: await this.toView(admin),
      enrolment: {
        secret,
        otpauthUrl: totpOtpauthUrl({ secret, account, issuer: 'Ore Admin' }),
        // Shown once. The invitee posts it to /auth/admin/enrol to finish setup.
        enrolToken,
      },
    };
  }

  async setStatus(actor: JwtPayload, adminUserId: string, status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED'): Promise<AdminView> {
    const admin = await this.require(adminUserId);
    if (admin.userId === actor.sub && status !== 'ACTIVE') {
      throw new BadRequestException('You cannot suspend or revoke your own account');
    }
    const before = admin.status;
    admin.status = status;
    await this.admins.save(admin);
    await this.recordAction({
      actorUserId: actor.sub,
      actorAdminRole: actor.adminRole ?? null,
      permission: 'admin.user.suspend',
      decision: 'allow',
      reason: `${before} → ${status}`,
      service: 'auth',
      method: 'POST',
      path: `/auth/admin/admins/${adminUserId}/status`,
      ip: null,
      degraded: false,
      resourceType: 'admin_user',
      resourceId: admin.id,
      beforeJson: { status: before },
      afterJson: { status },
    });
    return this.toView(admin);
  }

  async changeRole(actor: JwtPayload, adminUserId: string, adminRole: string): Promise<AdminView> {
    this.assertKnownRole(adminRole);
    const admin = await this.require(adminUserId);
    if (admin.userId === actor.sub) throw new BadRequestException('You cannot change your own role');
    const before = admin.adminRole;
    admin.adminRole = adminRole;
    await this.admins.save(admin);
    const user = await this.users.findOne({ where: { id: admin.userId } });
    if (user) {
      user.adminRole = adminRole;
      await this.users.save(user);
    }
    await this.recordAction({
      actorUserId: actor.sub,
      actorAdminRole: actor.adminRole ?? null,
      permission: 'admin.user.role.change',
      decision: 'allow',
      reason: `${before} → ${adminRole}`,
      service: 'auth',
      method: 'POST',
      path: `/auth/admin/admins/${adminUserId}/role`,
      ip: null,
      degraded: false,
      resourceType: 'admin_user',
      resourceId: admin.id,
      beforeJson: { adminRole: before },
      afterJson: { adminRole },
    });
    return this.toView(admin);
  }

  async setGrant(
    actor: JwtPayload,
    adminUserId: string,
    permission: string,
    mode: 'grant' | 'deny',
    reason?: string,
  ): Promise<AdminRoleGrant> {
    if (!ALL_PERMISSIONS.includes(permission as never)) {
      throw new BadRequestException(`Unknown permission "${permission}"`);
    }
    const admin = await this.require(adminUserId);
    const existing = await this.grants.findOne({ where: { adminUserId: admin.id, permission } });
    if (existing) {
      existing.mode = mode;
      existing.grantedBy = actor.sub;
      existing.reason = reason ?? null;
      return this.grants.save(existing);
    }
    return this.grants.save(
      this.grants.create({ adminUserId: admin.id, permission, mode, grantedBy: actor.sub, reason: reason ?? null }),
    );
  }

  async clearGrant(actor: JwtPayload, adminUserId: string, permission: string): Promise<void> {
    const admin = await this.require(adminUserId);
    await this.grants.delete({ adminUserId: admin.id, permission });
    this.logger.log(`${actor.sub} cleared ${permission} override on ${admin.id}`);
  }

  async overrides(adminUserId: string): Promise<AdminRoleGrant[]> {
    const admin = await this.require(adminUserId);
    return this.grants.find({ where: { adminUserId: admin.id }, order: { createdAt: 'DESC' } });
  }

  /** Start (or restart) TOTP enrolment for an admin who has not completed it. */
  async beginEnrolment(userId: string): Promise<{ otpauthUrl: string } | null> {
    const admin = await this.admins.findOne({ where: { userId } });
    if (!admin || admin.status !== 'PENDING_ENROLMENT') return null;
    if (!admin.pendingTotpSecret) admin.pendingTotpSecret = generateTotpSecret();
    await this.admins.save(admin);
    const user = await this.users.findOne({ where: { id: userId } });
    const account = user?.email || user?.phone || userId;
    return { otpauthUrl: totpOtpauthUrl({ secret: admin.pendingTotpSecret, account, issuer: 'Ore Admin' }) };
  }

  /**
   * Resolve a one-shot enrolment token to its admin. Returns null when the token is
   * unknown, already consumed, or expired — never throws, so a bad token is just a 401.
   */
  async userIdForEnrolToken(token: string): Promise<string | null> {
    if (!token) return null;
    const admin = await this.admins.findOne({ where: { enrolToken: token } });
    if (!admin || admin.status !== 'PENDING_ENROLMENT') return null;
    if (admin.enrolTokenExpiresAt && admin.enrolTokenExpiresAt.getTime() < Date.now()) return null;
    return admin.userId;
  }

  /** Verify the code from the enrolment QR and promote the secret to the live one. */
  async completeEnrolment(userId: string, code: string): Promise<boolean> {
    const admin = await this.admins.findOne({ where: { userId } });
    if (!admin || admin.status !== 'PENDING_ENROLMENT' || !admin.pendingTotpSecret) return false;
    if (!verifyTotp(admin.pendingTotpSecret, code)) return false;
    const user = await this.users.findOne({ where: { id: userId } });
    if (user) {
      user.totpSecret = admin.pendingTotpSecret;
      await this.users.save(user);
    }
    admin.pendingTotpSecret = null;
    admin.enrolToken = null;
    admin.enrolTokenExpiresAt = null;
    admin.totpEnrolledAt = new Date();
    admin.status = 'ACTIVE';
    await this.admins.save(admin);
    return true;
  }

  async noteLogin(userId: string, ip: string | null): Promise<void> {
    const admin = await this.admins.findOne({ where: { userId } });
    if (!admin) return;
    admin.lastLoginAt = new Date();
    admin.lastLoginIp = ip;
    await this.admins.save(admin);
  }

  /* ─────────────────────────── helpers ─────────────────────────── */

  private assertKnownRole(role: string): void {
    if (!ADMIN_ROLE_ORDER.includes(role as AdminRoleKey)) {
      throw new BadRequestException(`Unknown admin role. Expected one of: ${ADMIN_ROLE_ORDER.join(', ')}`);
    }
  }

  private async require(adminUserId: string): Promise<AdminUser> {
    const admin = await this.admins.findOne({ where: { id: adminUserId } });
    if (!admin) throw new NotFoundException('Admin not found');
    return admin;
  }

  private async findUser(input: { userId?: string; phone?: string; email?: string }): Promise<User | null> {
    if (input.userId) return this.users.findOne({ where: { id: input.userId } });
    if (input.email) return this.users.findOne({ where: { email: input.email.trim().toLowerCase() } });
    if (input.phone) {
      const phone = input.phone.replace(/\s+/g, '');
      const normalized = phone.startsWith('0') ? `233${phone.slice(1)}` : phone.replace(/^\+/, '');
      return this.users.findOne({ where: { phone: normalized } });
    }
    return null;
  }

  private async toView(a: AdminUser): Promise<AdminView> {
    const overrides = await this.grants.find({ where: { adminUserId: a.id } });
    const base = permissionsForRole(a.adminRole);
    const granted = overrides.filter((o) => o.mode === 'grant').map((o) => o.permission);
    const denied = new Set(overrides.filter((o) => o.mode === 'deny').map((o) => o.permission));
    const effective = new Set([...base, ...granted].filter((p) => !denied.has(p)));
    return {
      id: a.id,
      userId: a.userId,
      adminRole: a.adminRole,
      displayName: a.displayName,
      jobTitle: a.jobTitle,
      status: a.status,
      totpEnrolled: !!a.totpEnrolledAt,
      telegramLinked: !!a.telegramChatId,
      lastLoginAt: a.lastLoginAt,
      createdAt: a.createdAt,
      permissionCount: effective.size,
    };
  }
}

/** Roles that may create/suspend/re-role admins. */
export function canManageAdmins(role: string | null | undefined): boolean {
  return role === 'super_admin';
}

/**
 * Convenience for controllers that need to assert super-admin before a mutation.
 *
 * Fails closed: a missing `adminRole` is NOT treated as super. The Phase 1 backfill
 * writes `super_admin` onto the env-seeded admin, so a null here means provisioning has
 * not run — and granting super on that basis would be a way to become super by accident.
 */
export function assertSuperAdmin(user: JwtPayload): void {
  if (user.role !== 'admin') throw new ForbiddenException('Admins only');
  if (user.adminRole !== 'super_admin') {
    throw new ForbiddenException('Only a super admin can manage admin accounts');
  }
}

