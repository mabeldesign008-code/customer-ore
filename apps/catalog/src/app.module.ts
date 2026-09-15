import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { typeOrmForRoot } from '@ore/db';
import { BaselineCatalog1750000000000 } from './migrations/1750000000000-BaselineCatalog';
import { AddVerticalCatalogFields1760000000004 } from './migrations/1760000000004-AddVerticalCatalogFields';
import { AddVendorPreparationSettings1760000000009 } from './migrations/1760000000009-AddVendorPreparationSettings';
import { AddVendorPromotions1760000000010 } from './migrations/1760000000010-AddVendorPromotions';
import { AddStockReservations1760000000011 } from './migrations/1760000000011-AddStockReservations';
import { AddVendorHolidayHours1760000000012 } from './migrations/1760000000012-AddVendorHolidayHours';
import { AddVendorMedia1760000000013 } from './migrations/1760000000013-AddVendorMedia';
import { AddVendorReviews1760000000014 } from './migrations/1760000000014-AddVendorReviews';
import { AddPromotionBudgets1760000000015 } from './migrations/1760000000015-AddPromotionBudgets';
import { AddVendorLocations1760000000016 } from './migrations/1760000000016-AddVendorLocations';
import { AddVendorStaff1760000000017 } from './migrations/1760000000017-AddVendorStaff';
import { AddVendorPosConnections1760000000018 } from './migrations/1760000000018-AddVendorPosConnections';
import { AddFavouritesVouchers1760000000019 } from './migrations/1760000000019-AddFavouritesVouchers';
import { AddVendorPerformanceEngine1760000000020 } from './migrations/1760000000020-AddVendorPerformanceEngine';
import { AddVendorTaxProfile1789500000004 } from './migrations/1789500000004-AddVendorTaxProfile';
import { createStorageDriver } from '@ore/storage';
import { OreCoreModule, AuthGuard, PermissionGuard, AllExceptionsFilter, ORE_STORAGE } from '@ore/core';
import { HealthController } from './health.controller';
import { CatalogController } from './catalog.controller';
import { InternalController } from './internal.controller';
import { CatalogService } from './catalog.service';
import { CatalogConsumers } from './catalog.consumers';
import { VendorPerformanceService } from './vendor-performance.service';
import { Vendor, MenuItem, VendorStory, VendorPromotion, StockReservation, VendorReview, PromotionRedemption, VendorLocation, VendorStaff, VendorPosConnection, VendorSlaViolation, VendorPenalty, CustomerFavourite, CustomerVoucher, VendorPerformanceAudit, VendorPerformanceConfig, VendorPerformanceRecord } from './entities';

@Module({
  imports: [
    OreCoreModule.forRoot('catalog'),
    typeOrmForRoot({
      schema: 'catalog',
      entities: [Vendor, MenuItem, VendorStory, VendorPromotion, StockReservation, VendorReview, PromotionRedemption, VendorLocation, VendorStaff, VendorPosConnection, VendorSlaViolation, VendorPenalty, CustomerFavourite, CustomerVoucher, VendorPerformanceAudit, VendorPerformanceConfig, VendorPerformanceRecord],
      migrations: [BaselineCatalog1750000000000, AddVerticalCatalogFields1760000000004, AddVendorPreparationSettings1760000000009, AddVendorPromotions1760000000010, AddStockReservations1760000000011, AddVendorHolidayHours1760000000012, AddVendorMedia1760000000013, AddVendorReviews1760000000014, AddPromotionBudgets1760000000015, AddVendorLocations1760000000016, AddVendorStaff1760000000017, AddVendorPosConnections1760000000018, AddFavouritesVouchers1760000000019, AddVendorPerformanceEngine1760000000020, AddVendorTaxProfile1789500000004],
    }),
    TypeOrmModule.forFeature([Vendor, MenuItem, VendorStory, VendorPromotion, StockReservation, VendorReview, PromotionRedemption, VendorLocation, VendorStaff, VendorPosConnection, VendorSlaViolation, VendorPenalty, CustomerFavourite, CustomerVoucher, VendorPerformanceAudit, VendorPerformanceConfig, VendorPerformanceRecord]),
  ],
  controllers: [CatalogController, InternalController, HealthController],
  providers: [
    CatalogService,
    CatalogConsumers,
    VendorPerformanceService,
    { provide: ORE_STORAGE, useFactory: () => createStorageDriver(process.env) },
    { provide: APP_GUARD, useClass: AuthGuard },
    // AuthGuard sets req.user, PermissionGuard decides allow/deny. Order matters.
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly consumers: CatalogConsumers) {}
  async onModuleInit(): Promise<void> {
    await this.consumers.init();
  }}
