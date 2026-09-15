import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { typeOrmForRoot } from '@ore/db';
import { BaselineDispatch1750000000000 } from './migrations/1750000000000-BaselineDispatch';
import { AddRiderLicensePlate1760000000003 } from './migrations/1760000000003-AddRiderLicensePlate';
import { AddRiderPause1760000000004 } from './migrations/1760000000004-AddRiderPause';
import { AddRiderIncidents1760000000005 } from './migrations/1760000000005-AddRiderIncidents';
import { AddRiderSession1760000000006 } from './migrations/1760000000006-AddRiderSession';
import { AddRiderBlocks1760000000007 } from './migrations/1760000000007-AddRiderBlocks';
import { AddDispatchMatchingAuditFields1789200000001 } from './migrations/1789200000001-AddDispatchMatchingAuditFields';
import { AddRiderIdentifierStructure1789300000000 } from './migrations/1789300000000-AddRiderIdentifierStructure';
import { AddRiderPerformanceEngine1789400000001 } from './migrations/1789400000001-AddRiderPerformanceEngine';
import { AddDeliveryPartnerTaxProfiles1789500000002 } from './migrations/1789500000002-AddDeliveryPartnerTaxProfiles';
import { AddAssignmentEarnings1789600000000 } from './migrations/1789600000000-AddAssignmentEarnings';
import { AddDispatchPoolIndexes1789700000000 } from './migrations/1789700000000-AddDispatchPoolIndexes';
import { AddDispatchMatchingSignals1790000000000 } from './migrations/1790000000000-AddDispatchMatchingSignals';
import { OreCoreModule, AuthGuard, PermissionGuard, AllExceptionsFilter } from '@ore/core';
import { HealthController } from './health.controller';
import { DispatchController } from './dispatch.controller';
import { InternalController } from './internal.controller';
import { DispatchService } from './dispatch.service';
import { DispatchConsumers } from './dispatch.consumers';
import { Rider, Offer, Assignment, DispatchAudit, OfferExclusion, Batch, RiderIncident, RiderBlock, RiderIdentifierSequence, RiderIdentifierAudit, RiderPerformanceAudit, RiderPerformanceConfig, RiderPerformanceRecord, DeliveryPartnerProfile, FleetPartner } from './entities';

@Module({
  imports: [
    OreCoreModule.forRoot('dispatch'),
    typeOrmForRoot({
      schema: 'dispatch',
      entities: [Rider, Offer, Assignment, DispatchAudit, OfferExclusion, Batch, RiderIncident, RiderBlock, RiderIdentifierSequence, RiderIdentifierAudit, RiderPerformanceAudit, RiderPerformanceConfig, RiderPerformanceRecord, DeliveryPartnerProfile, FleetPartner],
      migrations: [BaselineDispatch1750000000000, AddRiderLicensePlate1760000000003, AddRiderPause1760000000004, AddRiderIncidents1760000000005, AddRiderSession1760000000006, AddRiderBlocks1760000000007, AddDispatchMatchingAuditFields1789200000001, AddRiderIdentifierStructure1789300000000, AddRiderPerformanceEngine1789400000001, AddDeliveryPartnerTaxProfiles1789500000002, AddAssignmentEarnings1789600000000, AddDispatchPoolIndexes1789700000000, AddDispatchMatchingSignals1790000000000],
    }),
    TypeOrmModule.forFeature([Rider, Offer, Assignment, DispatchAudit, OfferExclusion, Batch, RiderIncident, RiderBlock, RiderIdentifierAudit, RiderPerformanceAudit, RiderPerformanceConfig, RiderPerformanceRecord, DeliveryPartnerProfile, FleetPartner]),
  ],
  controllers: [DispatchController, InternalController, HealthController],
  providers: [
    DispatchService,
    DispatchConsumers,
    { provide: APP_GUARD, useClass: AuthGuard },
    // AuthGuard sets req.user, PermissionGuard decides allow/deny. Order matters.
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly consumers: DispatchConsumers) {}
  async onModuleInit(): Promise<void> {
    await this.consumers.init();
  }
}
