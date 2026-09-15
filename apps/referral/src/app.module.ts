import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { typeOrmForRoot } from '@ore/db';
import { OreCoreModule, AuthGuard, PermissionGuard, AllExceptionsFilter } from '@ore/core';
import { HealthController } from './health.controller';
import { ReferralController } from './referral.controller';
import { ReferralService } from './referral.service';
import { ReferralCode, Referral } from './entities';
import { BaselineReferral1750000000000 } from './migrations/1750000000000-BaselineReferral';
import { Baseline1787380602000 } from './migrations/1787380602000-Baseline';
import { DropReferralMonthlyCount1789100000001 } from './migrations/1789100000001-DropReferralMonthlyCount';

@Module({
  imports: [
    OreCoreModule.forRoot('referral'),
    typeOrmForRoot({ schema: 'referral', entities: [ReferralCode, Referral], migrations: [BaselineReferral1750000000000, Baseline1787380602000, DropReferralMonthlyCount1789100000001] }),
    TypeOrmModule.forFeature([ReferralCode, Referral]),
  ],
  controllers: [ReferralController, HealthController],
  providers: [
    ReferralService,
    { provide: APP_GUARD, useClass: AuthGuard },
    // AuthGuard sets req.user, PermissionGuard decides allow/deny. Order matters.
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly referral: ReferralService) {}
  async onModuleInit(): Promise<void> {
    await this.referral.init();
  }
}
