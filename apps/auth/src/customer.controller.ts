/**
 * Customer management for Operations.
 *
 * Admin routes:
 *   GET  /auth/admin/customers            customer.list           — search + cursor
 *   GET  /auth/admin/customers/:id        customer.profile.read
 *   POST /auth/admin/customers/:id/status customer.suspend|ban    — suspend / ban / reinstate
 *   POST /auth/admin/customers/:id/city   customer.profile.read
 *   POST /auth/admin/customers/:id/marketing-consent   customer.marketing_consent.set
 *
 * Internal (never reachable through the gateway):
 *   GET  /auth/internal/users/:id/standing   — what @RequireStanding() enforces against
 */
import { Body, Controller, ForbiddenException, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser, Internal, RequirePermission, Roles } from '@ore/core';
import type { JwtPayload } from '@ore/core';
import { Role, customerCodPolicySchema, savedAddressCorrectionSchema, savedAddressUpsertSchema } from '@ore/contracts';
import { z } from 'zod';
import { AdminService } from './admin.service';
import { CustomerService } from './customer.service';

const statusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']),
  reason: z.string().min(5).optional(),
  until: z.string().datetime().nullable().optional(),
});

@Controller('auth')
export class CustomerController {
  constructor(
    private readonly customers: CustomerService,
    private readonly admins: AdminService,
  ) {}

  @Get('customers/me/addresses')
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER)
  savedAddresses(@CurrentUser() user: JwtPayload) {
    return this.customers.listSavedAddresses(user.sub);
  }

  @Post('customers/me/addresses')
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER)
  createSavedAddress(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    return this.customers.createSavedAddress(user.sub, user, savedAddressUpsertSchema.parse(body));
  }

  @Post('customers/me/addresses/:addressId')
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER)
  updateSavedAddress(@CurrentUser() user: JwtPayload, @Param('addressId') addressId: string, @Body() body: unknown) {
    return this.customers.updateSavedAddress(user.sub, addressId, user, savedAddressUpsertSchema.parse(body));
  }

  @Post('customers/me/addresses/:addressId/delete')
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER)
  deleteSavedAddress(@CurrentUser() user: JwtPayload, @Param('addressId') addressId: string, @Body() body: { reason?: string }) {
    return this.customers.deactivateSavedAddress(user.sub, addressId, user, body?.reason);
  }

  @Get('admin/customers')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('customer.list')
  list(
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('city') city?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.customers.list({ q, status, city, cursor, limit: limit ? Number(limit) : undefined });
  }

  @Get('admin/customers/:id')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('customer.profile.read')
  profile(@Param('id') id: string) {
    return this.customers.profile(id);
  }

  /**
   * Suspend / ban / reinstate.
   *
   * Permission is chosen by the target state rather than declared statically, because
   * banning is dual-controlled and suspending is not — one route, two risk levels. The
   * guard has already checked the caller holds *some* customer-management right; the
   * service audit records which one was exercised.
   */
  @Post('admin/customers/:id/status')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('customer.suspend')
  async setStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: { ip?: string; headers?: Record<string, string | string[] | undefined> },
  ) {
    const dto = statusSchema.parse(body);
    // The decorator above is only the floor: it is the *least* privileged right that can
    // reach this route, and the guard accepts it if ANY declared permission is held. A ban
    // is a separate, dual-controlled right, so it is asserted here against the caller's
    // effective permissions — otherwise an operations admin holding only customer.suspend
    // could permanently close an account, which is exactly the escalation the matrix says
    // must not be possible.
    if (dto.status === 'BANNED') {
      const self = await this.admins.self(user.sub);
      if (!self.permissions.includes('customer.ban')) {
        throw new ForbiddenException('Missing permission: customer.ban');
      }
    }
    return this.customers.setStatus(user, id, dto, {
      ip: req?.ip ?? null,
      userAgent: (req?.headers?.['user-agent'] as string) ?? null,
    });
  }

  @Post('admin/customers/:id/city')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('customer.profile.read')
  city(@Param('id') id: string, @Body() body: { city?: string | null }) {
    return this.customers.setCity(id, body?.city ?? null);
  }

  @Post('admin/customers/:id/marketing-consent')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('customer.marketing_consent.set')
  consent(@Param('id') id: string, @Body() body: { consent?: boolean }) {
    return this.customers.setMarketingConsent(id, !!body?.consent);
  }

  @Post('admin/customers/:id/cod-policy')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('customer.cod.manage')
  codPolicy(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    return this.customers.setCustomerCodPolicy(user, id, customerCodPolicySchema.parse(body));
  }

  @Get('admin/customers/:id/addresses')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('customer.address.read')
  adminAddresses(@Param('id') id: string) {
    return this.customers.listSavedAddresses(id);
  }

  @Get('admin/customers/:id/addresses/audit')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('customer.address.read')
  adminAddressAudit(@Param('id') id: string) {
    return this.customers.savedAddressAudit(id);
  }

  @Post('admin/customers/:id/addresses/:addressId/correction')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('customer.address.correct')
  adminAddressCorrection(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Param('addressId') addressId: string, @Body() body: unknown) {
    return this.customers.updateSavedAddress(id, addressId, user, savedAddressCorrectionSchema.parse(body));
  }

  /** Marketing audience: ids + consent + city only. Internal only, never PII. */
  @Get('internal/marketing/audience')
  @Internal()
  marketingAudience(
    @Query('role') role?: string,
    @Query('city') city?: string,
    @Query('consentedOnly') consentedOnly?: string,
  ) {
    return this.customers.marketingAudience({
      role,
      city,
      consentedOnly: consentedOnly === 'true',
    });
  }

  /** What the standing guard enforces against. Internal only. */
  @Get('internal/users/:id/standing')
  @Internal()
  standing(@Param('id') id: string) {
    return this.customers.standing(id);
  }
}
