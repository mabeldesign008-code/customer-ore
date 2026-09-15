import { BadRequestException, Inject, Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { createHash, randomBytes, randomInt, scrypt as scryptCb, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { EVENTS, Role } from '@ore/contracts';
import { ORE_BUS, ORE_ENV, ORE_NOTIFY, ORE_RATE_LIMIT, RateLimiter, signTokens, verifyRefreshToken } from '@ore/core';
import { AuthTokens, RequestOtpDto, VerifyOtpDto } from '@ore/contracts';
import { User } from './entities/user.entity';
import { OtpCode } from './entities/otp.entity';
import { IdCounter } from './entities/id-counter.entity';
import { RefreshRevocation } from './entities/refresh-revocation.entity';

import { OreEnv } from '@ore/config';
import { Bus } from '@ore/bus';
import { NotifyClient } from '@ore/notify';
import { verifyTotp } from './totp';
import { nextSequenceValue } from '@ore/db';

const scrypt = promisify(scryptCb);

@Injectable()
export class AuthService implements OnModuleInit {
  /** 5 sends per phone per 10 minutes. Each send costs real money and rings a real handset. */
  private static readonly OTP_LIMIT = 5;
  private static readonly OTP_WINDOW_MS = 10 * 60_000;

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(OtpCode) private readonly otps: Repository<OtpCode>,
    @InjectRepository(IdCounter) private readonly counters: Repository<IdCounter>,
    @InjectRepository(RefreshRevocation) private readonly revocations: Repository<RefreshRevocation>,
    @Inject(ORE_ENV) private readonly env: OreEnv,
    @Inject(ORE_BUS) private readonly bus: Bus,
    @Inject(ORE_NOTIFY) private readonly notify: NotifyClient,
    @Inject(ORE_RATE_LIMIT) private readonly rateLimiter: RateLimiter,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.bootstrapAdmin();
  }

  async requestOtp(dto: RequestOtpDto): Promise<{ sent: boolean; devCode?: string }> {
    const phone = normalizePhone(dto.phone);
    await this.assertOtpRate(phone);

    const code = randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + this.env.otpTtlMin * 60_000);
    await this.otps.save(this.otps.create({ phone, codeHash: this.hashOtp(code), expiresAt }));

    await this.notify.sendSms({ phone, text: `Ore: your verification code is ${code}. Valid for ${this.env.otpTtlMin} minutes.` });
    return { sent: true, ...(this.env.otpLog ? { devCode: code } : {}) };
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<AuthTokens> {
    const phone = normalizePhone(dto.phone);
    const otp = await this.otps.findOne({ where: { phone, consumed: false }, order: { createdAt: 'DESC', id: 'DESC' } });
    if (!otp) throw new BadRequestException('No active OTP for this phone — request a new one');
    if (otp.expiresAt < new Date()) throw new BadRequestException('OTP expired — request a new one');
    if (otp.attempts >= 5) throw new BadRequestException('Too many attempts — request a new OTP');

    if (otp.codeHash !== this.hashOtp(dto.code)) {
      otp.attempts += 1;
      await this.otps.save(otp);
      throw new UnauthorizedException('Incorrect code');
    }

    otp.consumed = true;
    await this.otps.save(otp);

    let user = await this.users.findOne({ where: { phone } });
    let isNewUser = false;
    let requestedRole = dto.targetRole || Role.CUSTOMER;

    if (user && !dto.targetRole) {
      // Login without an explicit targetRole must NOT silently demote an existing
      // rider/vendor/admin to customer. Keep the account's current role.
      requestedRole = user.role ?? Role.CUSTOMER;
    }
    if (user && user.role === Role.ADMIN) {
      requestedRole = Role.ADMIN;
    }

    if (!user) {
      isNewUser = true;
      const publicId = await this.nextCustomerId();
      user = await this.users.save(
        this.users.create({
          phone,
          role: requestedRole,
          roles: [requestedRole],
          verified: true,
          deviceToken: dto.deviceToken ?? null,
          deviceFingerprint: dto.deviceFingerprint ?? null,
          publicId,
        }),
      );
      await this.bus.publish(EVENTS.USER_REGISTERED, { userId: user.id, phone, role: user.role, publicId });
    } else {
      user.verified = true;
      if (dto.deviceToken) user.deviceToken = dto.deviceToken;
      if (dto.deviceFingerprint) user.deviceFingerprint = dto.deviceFingerprint;

      const userRoles = Array.isArray(user.roles) ? user.roles : [user.role];

      if (requestedRole === Role.VENDOR && userRoles.includes(Role.RIDER)) {
        throw new BadRequestException(
          'This verified phone number is already registered as a Rider. Rider and Vendor roles cannot be combined on the same account.',
        );
      }
      if (requestedRole === Role.RIDER && userRoles.includes(Role.VENDOR)) {
        throw new BadRequestException(
          'This verified phone number is already registered as a Vendor. Rider and Vendor roles cannot be combined on the same account.',
        );
      }

      if (!userRoles.includes(requestedRole)) {
        userRoles.push(requestedRole);
        user.roles = userRoles;
      }
      user.role = requestedRole;
      await this.users.save(user);
    }

    return this.issueTokens(user, isNewUser);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let sub: string;
    let jti: string | undefined;
    try {
      const decoded = verifyRefreshToken(this.env, refreshToken);
      sub = decoded.sub;
      jti = decoded.jti;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    // Revoked on logout (audit F-SEC-13): a captured token must not mint new access
    // tokens after the user signed out.
    if (jti && (await this.revocations.findOne({ where: { jti } }))) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }
    const user = await this.users.findOne({ where: { id: sub } });
    if (!user) throw new UnauthorizedException('Invalid or expired refresh token');
    return this.issueTokens(user, false);
  }

  /**
   * Revoke a refresh token (called on logout). Records its jti so the token can no
   * longer mint access tokens, even from a stolen cookie or a stale device. Idempotent.
   * The caller must be the token's owner (enforced by the controller via @CurrentUser).
   */
  async revokeSession(userId: string, refreshToken: string): Promise<{ ok: boolean }> {
    let sub: string;
    let jti: string | undefined;
    try {
      const decoded = verifyRefreshToken(this.env, refreshToken);
      sub = decoded.sub;
      jti = decoded.jti;
    } catch {
      // Not a valid token: nothing to revoke, but don't leak which jti exists.
      return { ok: true };
    }
    if (sub !== userId) {
      throw new UnauthorizedException('Cannot revoke another user session');
    }
    if (jti) {
      const existing = await this.revocations.findOne({ where: { jti } });
      if (!existing) {
        await this.revocations.save(this.revocations.create({ jti, sub }));
      }
    }
    await this.pruneRevocations();
    return { ok: true };
  }

  /** Drop revocation rows older than the 30-day refresh lifetime (+1d slack). */
  private async pruneRevocations(): Promise<void> {
    const cutoff = new Date(Date.now() - 31 * 86_400_000);
    const stale = await this.revocations.find({ where: { revokedAt: LessThan(cutoff) } });
    if (stale.length) await this.revocations.remove(stale);
  }

  async adminLogin(dto: { email: string; password: string; totpCode: string }): Promise<AuthTokens> {
    const user = await this.users.findOne({ where: { email: dto.email.toLowerCase(), role: Role.ADMIN } });
    if (!user || !user.passwordHash || !user.totpSecret) {
      throw new UnauthorizedException('Invalid admin credentials');
    }
    if (!(await verifyPassword(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid admin credentials');
    }
    if (!verifyTotp(user.totpSecret, dto.totpCode)) {
      throw new UnauthorizedException('Invalid admin credentials');
    }
    return this.issueTokens(user, false);
  }

  async updateProfile(userId: string, dto: { name?: string; email?: string | null }): Promise<{ id: string; phone: string; role: string; name: string | null; email: string | null; publicId: string | null }> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    if (dto.name !== undefined) user.name = dto.name.trim();
    if (dto.email !== undefined) user.email = dto.email ? dto.email.trim().toLowerCase() : null;
    const saved = await this.users.save(user);
    return {
      id: saved.id,
      phone: saved.phone,
      role: saved.role,
      name: saved.name,
      email: saved.email,
      publicId: saved.publicId,
    };
  }

  async userById(id: string): Promise<{ id: string; phone: string } | null> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) return null;
    return { id: user.id, phone: user.phone };
  }

  /**
   * Make sure the env-seeded admin has a provisioned `admin_user` row and the
   * `super_admin` role on the user record.
   *
   * This used to be left to `AdminService.onModuleInit`, which backfills any `role=admin`
   * user it finds. That backfill runs in a different init hook and, in practice, did not
   * cover the bootstrap admin — so the account you log in with had no admin_user row,
   * `adminRole` stayed null, and `ApprovalService.actorOrThrow()` refused to let it sign
   * anything ("Caller is not a provisioned admin"). The one account that is supposed to be
   * able to counter-sign a finance request could not counter-sign.
   *
   * Owning it here, on the same code path that creates the user, removes the ordering
   * dependency entirely.
   */
  private async bootstrapAdmin(): Promise<void> {
    const email = this.env.adminEmail.trim().toLowerCase();
    const password = this.env.adminPassword;
    const totpSecret = this.env.adminTotpSecret.trim();
    if (!email || !password || !totpSecret) return;
    const existing = await this.users.findOne({ where: { email, role: Role.ADMIN } });
    if (existing) {
      let dirty = false;
      // The env-seeded admin is the super admin. Setting it here (not only on the
      // admin_user row) is what puts `adminRole` in the JWT, because issueTokens
      // reads it off the user record.
      if (!existing.adminRole) existing.adminRole = 'super_admin';
      if (!existing.passwordHash) {
        existing.passwordHash = await hashPassword(password);
        dirty = true;
      }
      if (!existing.totpSecret) {
        existing.totpSecret = totpSecret;
        dirty = true;
      }
      if (dirty) await this.users.save(existing);
      return;
    }
    const created = await this.users.save(
      this.users.create({
        email,
        phone: '233000000000',
        role: Role.ADMIN,
        roles: [Role.ADMIN],
        // The env-seeded admin IS the super admin — set it here as well as on the
        // admin_user row. The update path above already did this, but the create path did
        // not, so on a fresh database the first login minted a JWT with adminRole=null and
        // PermissionGuard (which fails closed on a null role) locked the bootstrap admin
        // out of every admin-managing route. Same reason as the comment above: issueTokens
        // reads adminRole off the user record.
        adminRole: 'super_admin',
        verified: true,
        name: 'Ore Admin',
        publicId: 'ORA-ADMIN',
        passwordHash: await hashPassword(password),
        totpSecret,
      }),
    );
  }

  private async issueTokens(user: User, isNewUser: boolean): Promise<AuthTokens> {
    const userRoles = (Array.isArray(user.roles) ? user.roles : [user.role]) as Role[];
    const tokens = signTokens(this.env, {
      sub: user.id,
      role: user.role,
      roles: userRoles,
      adminRole: user.adminRole ?? null,
      phone: user.phone,
      name: user.name,
    });
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      isNewUser,
      activeRole: user.role,
      roles: userRoles,
      user: { id: user.id, phone: user.phone, role: user.role, roles: userRoles, name: user.name, publicId: user.publicId },
    };
  }

  private async nextCustomerId(): Promise<string> {
    const year = new Date().getFullYear();
    const key = `ORC-${year}`;
    const seq = await nextSequenceValue(this.counters, key);
    return `${key}-${String(seq).padStart(6, '0')}`;
  }

  /**
   * Cap OTP sends per phone number.
   *
   * Was an in-process `Map`, which made the limit 5-per-replica rather than 5: the more the
   * fleet scaled the weaker it got. It also grew without bound, so enumerating phone numbers
   * was a way to eat the heap. It now uses the shared limiter, which is Redis-backed wherever
   * REDIS_URL is configured.
   *
   * It also used to `return` immediately outside production, so the only environment where the
   * limit ran was the one where nobody could test it — the first real exercise of this code was
   * always a live incident. It now runs everywhere; `devBypassOtp` handles the case that
   * exemption was really for.
   */
  private async assertOtpRate(phone: string): Promise<void> {
    const decision = await this.rateLimiter.hit(
      `otp:${phone}`,
      AuthService.OTP_LIMIT,
      AuthService.OTP_WINDOW_MS,
    );
    if (!decision.allowed) {
      const waitMin = Math.max(1, Math.ceil((decision.resetAt.getTime() - Date.now()) / 60_000));
      throw new BadRequestException(`Too many OTP requests — try again in ${waitMin} minute(s)`);
    }
  }

  private hashOtp(code: string): string {
    return createHash('sha256').update(`${this.env.jwtSecret}:${code}`).digest('hex');
  }
}

function normalizePhone(phone: string): string {
  const p = phone.replace(/\s+/g, '');
  if (p.startsWith('0')) return `233${p.slice(1)}`;
  if (p.startsWith('+')) return p.slice(1);
  return p;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = (await scrypt(password, salt, 32)) as Buffer;
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split(':');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const hash = (await scrypt(password, Buffer.from(saltHex, 'hex'), 32)) as Buffer;
  const expected = Buffer.from(hashHex, 'hex');
  if (hash.length !== expected.length) return false;
  return timingSafeEqual(hash, expected);
}
