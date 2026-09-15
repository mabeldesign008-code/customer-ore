import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { typeOrmForRoot } from '@ore/db';
import { OreCoreModule, AuthGuard, PermissionGuard, AllExceptionsFilter } from '@ore/core';
import { HealthController } from './health.controller';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsEvent } from './entities';
import { BaselineAnalytics1750000000000 } from './migrations/1750000000000-BaselineAnalytics';
import { Baseline1787380602000 } from './migrations/1787380602000-Baseline';

@Module({
  imports: [
    OreCoreModule.forRoot('analytics'),
    typeOrmForRoot({ schema: 'analytics', entities: [AnalyticsEvent], migrations: [BaselineAnalytics1750000000000, Baseline1787380602000] }),
    TypeOrmModule.forFeature([AnalyticsEvent]),
  ],
  controllers: [AnalyticsController, HealthController],
  providers: [
    AnalyticsService,
    { provide: APP_GUARD, useClass: AuthGuard },
    // AuthGuard sets req.user, PermissionGuard decides allow/deny. Order matters.
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
