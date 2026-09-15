/**
 * Admin account management + the internal lookup PermissionGuard depends on.
 *
 *   GET  /auth/internal/admins/:userId   @Internal()  — the guard's access lookup
 *   GET  /auth/admin/admins              super        — list
 *   POST /auth/admin/admins              super        — create (returns a one-time otpauth URL)
 *   POST /auth/admin/admins/:id/status   super        — ACTIVE | SUSPENDED | REVOKED
 *   POST /auth/admin/admins/:id/role     super        — change AdminRole
 *   GET  /auth/admin/admins/:id/overrides             — per-admin grants/denials
 *   POST /auth/admin/admins/:id/overrides             — add one
 *   DELETE /auth/admin/admins/:id/overrides/:perm     — remove one
 *   GET  /auth/admin/actions                            — audit log
 *   GET  /auth/admin/matrix                             — the shipped permission matrix
 *
 * These carry explicit super-admin assertions rather than @RequirePermission because
 * PermissionGuard itself depends on this service being reachable — tagging them would
 * make the guard's own bootstrap circular. They are the one place that is deliberate.
 */

import { Body, Controller, Delete, Get, Param, Post, Query, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser, Internal, Public, RequirePermission, Roles } from '@ore/core';
import { JwtPayload } from '@ore/core';
import { Role } from '@ore/contracts';
import { z } from 'zod';
import { AdminService, assertSuperAdmin } from './admin.service';
import { PERMISSION_MATRIX, ADMIN_ROLE_ORDER, permissionCensus } from '@ore/contracts';

const createSchema = z.object({
  userId: z.string().uuid().optional(),
  phone: z.string().min(8).max(20).optional(),
  email: z.string().email().optional(),
  adminRole: z.string().min(1),
  displayName: z.string().min(1).max(100).optional(),
  jobTitle: z.string().max(100).optional(),
  /** Initial console password. Required — admin login is email+password+TOTP, so an
   *  admin provisioned without one could never sign in. */
  password: z.string().min(10).max(128),
}).refine((v) => v.userId || v.phone || v.email, { message: 'Provide userId, phone or email' });

const statusSchema = z.object({ status: z.enum(['ACTIVE', 'SUSPENDED', 'REVOKED']) });
const roleSchema = z.object({ adminRole: z.string().min(1) });
const overrideSchema = z.object({
  permission: z.string().min(1),
  mode: z.enum(['grant', 'deny']).default('grant'),
  reason: z.string().max(500).optional(),
});

@Controller('auth')
export class AdminController {
  constructor(private readonly admins: AdminService) {}

  /** PermissionGuard calls this on every admin request (cached 15s). Must never throw. */
  @Get('internal/admins/:userId')
  @Internal()
  access(@Param('userId') userId: string) {
    return this.admins.accessFor(userId);
  }

  /**
   * Audit sink for every other service.
   *
   * Only the auth service owns the `admin_action` table, so a guard running inside
   * notification or ledger has nowhere to write. Before this endpoint existed the sink was a
   * no-op outside auth, which meant a marketing admin firing a 40,000-recipient SMS campaign
   * left no decision row at all — the route was enforced and the evidence was thrown away.
   * Internal-only, so it is not a way to forge an audit row from outside.
   */
  @Post('internal/admin-actions')
  @Internal()
  recordAction(@Body() body: Record<string, unknown>) {
    return this.admins.recordActionFromInternal(body);
  }

  /**
   * First-login TOTP enrolment. The caller must already hold a token for the account
   * being enrolled (password verified); the code proves they scanned the QR.
   * No permission required — a PENDING_ENROLMENT admin has none yet, by definition.
   */
  @Post('admin/enrol')
  @Public()
  async enrol(
    @CurrentUser() user: JwtPayload | undefined,
    @Body() body: { code?: string; enrolToken?: string },
  ) {
    // Public because a pending admin has no session yet — adminLogin refuses anyone
    // without a TOTP secret, and the secret only lands when enrolment completes.
    // Identity comes from the one-shot enrolToken, or from a bearer token if the
    // caller already has one. No permission is required: a PENDING_ENROLMENT admin
    // holds none by definition, and the only thing this route can do is enrol them.
    const userId = user?.sub ?? (await this.admins.userIdForEnrolToken(body?.enrolToken || ''));
    if (!userId) throw new UnauthorizedException('Invalid or expired enrolment token');
    if (!body?.code) {
      const started = await this.admins.beginEnrolment(userId);
      if (!started) return { status: 'NOT_PENDING' };
      return { status: 'PENDING', otpauthUrl: started.otpauthUrl };
    }
    const done = await this.admins.completeEnrolment(userId, body.code);
    return { status: done ? 'ENROLLED' : 'INVALID_CODE' };
  }

  @Get('admin/admins')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('admin.user.read')
  async list(@CurrentUser() user: JwtPayload) {
    assertSuperAdmin(user);
    return { admins: await this.admins.list() };
  }

  @Post('admin/admins')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('admin.user.create')
  async create(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    assertSuperAdmin(user);
    return this.admins.create(user, createSchema.parse(body));
  }

  @Post('admin/admins/:id/status')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('admin.user.suspend')
  async status(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    assertSuperAdmin(user);
    return this.admins.setStatus(user, id, statusSchema.parse(body).status);
  }

  @Post('admin/admins/:id/role')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('admin.user.role.change')
  async role(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    assertSuperAdmin(user);
    return this.admins.changeRole(user, id, roleSchema.parse(body).adminRole);
  }

  @Get('admin/admins/:id/overrides')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('admin.audit.read')
  async overrides(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    assertSuperAdmin(user);
    return { overrides: await this.admins.overrides(id) };
  }

  @Post('admin/admins/:id/overrides')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('admin.grant.manage')
  async addOverride(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    assertSuperAdmin(user);
    const dto = overrideSchema.parse(body);
    return this.admins.setGrant(user, id, dto.permission, dto.mode, dto.reason);
  }

  @Delete('admin/admins/:id/overrides/:permission')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('admin.grant.manage')
  async removeOverride(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('permission') permission: string,
  ) {
    assertSuperAdmin(user);
    await this.admins.clearGrant(user, id, permission);
    return { ok: true };
  }

  @Get('admin/actions')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('admin.audit.read')
  actions(
    @Query('actorUserId') actorUserId?: string,
    @Query('permission') permission?: string,
    @Query('decision') decision?: string,
    @Query('resourceType') resourceType?: string,
    @Query('limit') limit?: string,
  ) {
    return this.admins.listActions({
      actorUserId,
      permission,
      decision,
      resourceType,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /**
   * The signed-in admin's own role, status and effective permissions.
   * The console builds its entire navigation from this response.
   */
  @Get('admin/me')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  // Not optional: PermissionGuard fails closed on any admin-only route that declares
  // nothing, so an untagged /me would 403 for everyone. `admin.audit.read_own` is the one
  // key all eight roles hold ('RRRRRRRR') and describes exactly this — reading your own
  // access record.
  @RequirePermission('admin.audit.read_own')
  me(@CurrentUser() user: JwtPayload) {
    return this.admins.self(user.sub);
  }

  @Post('admin/admins/:id/totp-reset')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('admin.user.totp.reset')
  resetTotp(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    assertSuperAdmin(user);
    return this.admins.resetTotp(user, id);
  }

  /** Read-only render of the shipped matrix, so a non-engineer can see who can do what. */
  @Get('admin/matrix')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('admin.role.matrix.read')
  matrix() {
    return {
      roles: ADMIN_ROLE_ORDER,
      permissions: PERMISSION_MATRIX,
      census: permissionCensus(),
    };
  }
}
