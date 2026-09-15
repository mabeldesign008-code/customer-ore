import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { typeOrmForRoot } from '@ore/db';
import { BaselineNotification1750000000000 } from './migrations/1750000000000-BaselineNotification';
import { AddDeviceTokenTable1760000000001 } from './migrations/1760000000001-AddDeviceTokenTable';
import { MarketingCampaigns1790000000000 } from './migrations/1790000000000-MarketingCampaigns';
import { OreCoreModule, AuthGuard, PermissionGuard, AllExceptionsFilter } from '@ore/core';
import { HealthController } from './health.controller';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { CampaignService } from './campaign.service';
import { CampaignController } from './campaign.controller';
import { DeviceToken, NotificationFeed, Campaign, NotificationTemplate } from './entities';

@Module({
  imports: [
    OreCoreModule.forRoot('notification'),
    typeOrmForRoot({
      schema: 'notification',
      entities: [NotificationFeed, DeviceToken, Campaign, NotificationTemplate],
      migrations: [BaselineNotification1750000000000, AddDeviceTokenTable1760000000001, MarketingCampaigns1790000000000],
    }),
    TypeOrmModule.forFeature([NotificationFeed, DeviceToken, Campaign, NotificationTemplate]),
  ],
  controllers: [NotificationController, CampaignController, HealthController],
  providers: [
    NotificationService,
    CampaignService,
    { provide: APP_GUARD, useClass: AuthGuard },
    // AuthGuard sets req.user, PermissionGuard decides allow/deny. Order matters.
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements OnModuleInit {
  constructor(
    private readonly notifications: NotificationService,
    private readonly campaigns: CampaignService
  ) {}

  async onModuleInit(): Promise<void> {
    await this.notifications.init();
    await this.campaigns.init();
  }
}
