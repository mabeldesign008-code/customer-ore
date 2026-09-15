import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { typeOrmForRoot } from '@ore/db';
import { OreCoreModule, AuthGuard, PermissionGuard, AllExceptionsFilter, idempotencyProvider } from '@ore/core';
import { HealthController } from './health.controller';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { WebhookService } from './webhook.service';
import { RefundService } from './refund.service';
import { RefundApprovalService } from './refund-approval.service';
import { RefundApprovalController } from './refund-approval.controller';
import { CheckoutPayment, PaymentAllocation, WebhookEvent, Refund, RefundRequest, PaymentProcessorRecord } from './entities';
import { BaselinePayment1750000000000 } from './migrations/1750000000000-BaselinePayment';
import { AddWalletTopUp1760000000016 } from './migrations/1760000000016-AddWalletTopUp';
import { DropWalletTopUp1787702400000 } from './migrations/1787702400000-DropWalletTopUp';
import { AddRefundRequests1788200000000 } from './migrations/1788200000000-AddRefundRequests';
import { AddPaymentProcessorRecords1789500000001 } from './migrations/1789500000001-AddPaymentProcessorRecords';
import { AddWebhookRetryTracking1789800000000 } from './migrations/1789800000000-AddWebhookRetryTracking';
import { PaymentIdempotencyInterceptor } from './idempotency';

@Module({
  imports: [
    OreCoreModule.forRoot('payment'),
    typeOrmForRoot({
      schema: 'payment',
      entities: [CheckoutPayment, PaymentAllocation, WebhookEvent, Refund, RefundRequest, PaymentProcessorRecord],
      // AddWalletTopUp stays in the list so already-migrated databases still record it;
      // DropWalletTopUp (later timestamp) removes the table on both fresh and existing DBs.
      migrations: [BaselinePayment1750000000000, AddWalletTopUp1760000000016, DropWalletTopUp1787702400000, AddRefundRequests1788200000000, AddPaymentProcessorRecords1789500000001, AddWebhookRetryTracking1789800000000],
    }),
    TypeOrmModule.forFeature([CheckoutPayment, PaymentAllocation, WebhookEvent, Refund, RefundRequest, PaymentProcessorRecord]),
  ],
  controllers: [PaymentController, HealthController, RefundApprovalController],
  providers: [RefundApprovalService,
    PaymentService,
    WebhookService,
    RefundService,
    ...idempotencyProvider('payment'),
    { provide: APP_GUARD, useClass: AuthGuard },
    // AuthGuard sets req.user, PermissionGuard decides allow/deny. Order matters.
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly webhook: WebhookService) {}
  async onModuleInit(): Promise<void> {
    await this.webhook.startSweeper();
  }
}
