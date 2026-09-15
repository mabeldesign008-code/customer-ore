import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { typeOrmForRoot } from '@ore/db';
import { OreCoreModule, AuthGuard, PermissionGuard, AllExceptionsFilter } from '@ore/core';
import { HealthController } from './health.controller';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';
import { TrackingGateway } from './tracking.gateway';
import { TrackingAccessService } from './tracking.access';
import { RiderLocation } from './entities';
import { BaselineTracking1750000000000 } from './migrations/1750000000000-BaselineTracking';
import { Baseline1787380602000 } from './migrations/1787380602000-Baseline';

@Module({
  imports: [
    OreCoreModule.forRoot('tracking'),
    typeOrmForRoot({ schema: 'tracking', entities: [RiderLocation], migrations: [BaselineTracking1750000000000, Baseline1787380602000] }),
    TypeOrmModule.forFeature([RiderLocation]),
  ],
  controllers: [TrackingController, HealthController],
  providers: [
    TrackingService,
    TrackingAccessService,
    TrackingGateway,
    { provide: APP_GUARD, useClass: AuthGuard },
    // AuthGuard sets req.user, PermissionGuard decides allow/deny. Order matters.
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly gateway: TrackingGateway) {}
  async onModuleInit(): Promise<void> {
    this.gateway.init();
  }
}
