import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ReferralService } from './referral.service';
import { AuthGuard, CurrentUser, Roles, RequirePermission } from '@ore/core';
import { JwtPayload } from '@ore/core';
import { Role, referralBlockSchema, referralClaimSchema } from '@ore/contracts';

@Controller('referral')
export class ReferralController {
  constructor(private readonly referral: ReferralService) {}

  @Get('me')
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER)
  me(@CurrentUser() user: JwtPayload) {
    return this.referral.stats(user.sub);
  }

  @Get('mine')
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER)
  mine(@CurrentUser() user: JwtPayload) {
    return this.referral.listMine(user.sub);
  }

  @Post('claim')
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER)
  claim(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    const dto = referralClaimSchema.parse(body);
    return this.referral.claim(dto.code, dto.phone, user.sub);
  }

  @Get('admin/referrals')
  @RequirePermission('marketing.referral.manage')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  all() {
    return this.referral.listAll();
  }

  @Post('admin/referrals/:id/block')
  @RequirePermission('marketing.referral.manage')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  block(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    const dto = referralBlockSchema.parse(body);
    return this.referral.block(user.sub, id, dto.reason);
  }
}
