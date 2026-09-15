import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { typeOrmForRoot } from '@ore/db';
import { BaselineOrder1750000000000 } from './migrations/1750000000000-BaselineOrder';
import { AddDeliveryProofColumns1760000000002 } from './migrations/1760000000002-AddDeliveryProofColumns';
import { AddSelectedOptionsToOrderItems1760000000006 } from './migrations/1760000000006-AddSelectedOptionsToOrderItems';
import { AddOrderIssues1760000000007 } from './migrations/1760000000007-AddOrderIssues';
import { AddMarketFulfillmentToOrders1760000000008 } from './migrations/1760000000008-AddMarketFulfillmentToOrders';
import { AddLaundryLifecycle1760000000009 } from './migrations/1760000000009-AddLaundryLifecycle';
import { AddOrderPromotions1760000000010 } from './migrations/1760000000010-AddOrderPromotions';
import { AddOrderIssueResolution1760000000011 } from './migrations/1760000000011-AddOrderIssueResolution';
import { AddOrderPickupSnapshot1760000000012 } from './migrations/1760000000012-AddOrderPickupSnapshot';
import { AddOrderItemUnit1760000000013 } from './migrations/1760000000013-AddOrderItemUnit';
import { AddParcelLifecycle1760000000014 } from './migrations/1760000000014-AddParcelLifecycle';
import { AddOrderTip1760000000015 } from './migrations/1760000000015-AddOrderTip';
import { AddOrderPeakPay1760000000016 } from './migrations/1760000000016-AddOrderPeakPay';
import { AddOrderDropAndSchedule1760000000017 } from './migrations/1760000000017-AddOrderDropAndSchedule';
import { AddOrderGiftToken1760000000018 } from './migrations/1760000000018-AddOrderGiftToken';
import { EncryptOrderOtp1789100000000 } from './migrations/1789100000000-EncryptOrderOtp';
import { AddPreparationExtensionAudit1789200000000 } from './migrations/1789200000000-AddPreparationExtensionAudit';
import { AddOrderLocationAudit1789400000000 } from './migrations/1789400000000-AddOrderLocationAudit';
import { CommissionPctToBps1789900000000 } from './migrations/1789900000000-CommissionPctToBps';
import { createStorageDriver } from '@ore/storage';
import { OreCoreModule, AuthGuard, PermissionGuard, AllExceptionsFilter, ORE_STORAGE } from '@ore/core';
import { HealthController } from './health.controller';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderConsumers } from './order.consumers';
import { Order, OrderItem, OrderEvent, OrderSequence, OrderIssue, OrderAddressAudit } from './entities';

@Module({
  imports: [
    OreCoreModule.forRoot('order'),
    typeOrmForRoot({
      schema: 'order',
      entities: [Order, OrderItem, OrderEvent, OrderSequence, OrderIssue, OrderAddressAudit],
      migrations: [BaselineOrder1750000000000, AddDeliveryProofColumns1760000000002, AddSelectedOptionsToOrderItems1760000000006, AddOrderIssues1760000000007, AddMarketFulfillmentToOrders1760000000008, AddLaundryLifecycle1760000000009, AddOrderPromotions1760000000010, AddOrderIssueResolution1760000000011, AddOrderPickupSnapshot1760000000012, AddOrderItemUnit1760000000013, AddParcelLifecycle1760000000014, AddOrderTip1760000000015, AddOrderPeakPay1760000000016, AddOrderDropAndSchedule1760000000017, AddOrderGiftToken1760000000018, EncryptOrderOtp1789100000000, AddPreparationExtensionAudit1789200000000, AddOrderLocationAudit1789400000000, CommissionPctToBps1789900000000],
    }),
    TypeOrmModule.forFeature([Order, OrderItem, OrderEvent, OrderSequence, OrderIssue, OrderAddressAudit]),
  ],
  controllers: [OrderController, HealthController],
  providers: [
    OrderService,
    { provide: ORE_STORAGE, useFactory: () => createStorageDriver(process.env) },
    OrderConsumers,
    { provide: APP_GUARD, useClass: AuthGuard },
    // AuthGuard sets req.user, PermissionGuard decides allow/deny. Order matters.
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly consumers: OrderConsumers) {}
  async onModuleInit(): Promise<void> {
    await this.consumers.init();
  }
}
