/** Feature flags API — GET /flags (list) + PUT /flags/:name (set, super admin only). */

import { Body, Controller, ForbiddenException, Get, Inject, Param, Put, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser, Roles, RequirePermission } from '@ore/core';
import { ORE_FLAGS } from '@ore/core';
import { JwtPayload } from '@ore/core';
import { AdminRole, Role } from '@ore/contracts';
import { FlagsService } from '@ore/core';

@Controller('flags')
@UseGuards(AuthGuard)
@Roles(Role.ADMIN)
export class FlagsController {
  constructor(@Inject(ORE_FLAGS) private readonly flags: FlagsService) {}

  @Get()
  async list() {
    return { flags: await this.flags.all() };
  }

  /**
   * Feature flags flip live platform behaviour without a deploy, so writing them is a
   * super-admin action. `@Roles(Role.ADMIN)` alone meant any admin — support, finance,
   * operations — could change how the whole platform behaves.
   *
   * An `adminRole` of null is treated as super_admin: that is the env-seeded bootstrap
   * account before per-admin roles are provisioned (Phase 1). Once `admin_user` exists
   * this becomes a `@RequirePermission('platform.flag.set')` check like everything else.
   */
  @Put(':name')
  @RequirePermission('platform.flag.set')
  async set(
    @CurrentUser() user: JwtPayload,
    @Param('name') name: string,
    @Body() body: { value: string | boolean | number },
  ) {
    if (user.adminRole && user.adminRole !== AdminRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only a super admin can change feature flags');
    }
    if (body?.value === undefined) return { ok: false, error: 'body.value is required' };
    await this.flags.set(name, body.value);
    return { ok: true, flag: name, value: body.value };
  }
}
