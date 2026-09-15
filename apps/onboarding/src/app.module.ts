import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { typeOrmForRoot } from '@ore/db';
import { BaselineOnboarding1750000000000 } from './migrations/1750000000000-BaselineOnboarding';
import { AddSmileVerificationTables1760000000000 } from './migrations/1760000000000-AddSmileVerificationTables';
import { createStorageDriver } from '@ore/storage';
import { PaystackClient } from '@ore/paystack';
import { OreCoreModule, AuthGuard, PermissionGuard, AllExceptionsFilter, ORE_STORAGE } from '@ore/core';
import { HealthController } from './health.controller';
import { OnboardingController, MediaController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { SmileIdService } from './smile-id.service';
import { SmileDocumentVerificationService } from './smile-document-verification.service';
import { SmileVerificationWebhookService } from './smile-verification-webhook.service';
import {
  Application,
  Document,
  IdCounter,
  AuditLog,
  SmileVerificationJob,
  SmileVerificationWebhookEvent,
} from './entities';

@Module({
  imports: [
    OreCoreModule.forRoot('onboarding'),
    typeOrmForRoot({
      schema: 'onboarding',
      entities: [Application, Document, IdCounter, AuditLog, SmileVerificationJob, SmileVerificationWebhookEvent],
      migrations: [BaselineOnboarding1750000000000, AddSmileVerificationTables1760000000000],
    }),
    TypeOrmModule.forFeature([
      Application,
      Document,
      IdCounter,
      AuditLog,
      SmileVerificationJob,
      SmileVerificationWebhookEvent,
    ]),
  ],
  controllers: [OnboardingController, MediaController, HealthController],
  providers: [
    OnboardingService,
    SmileIdService,
    SmileDocumentVerificationService,
    SmileVerificationWebhookService,
    { provide: PaystackClient, useFactory: () => new PaystackClient(process.env) },
    { provide: ORE_STORAGE, useFactory: () => createStorageDriver(process.env) },
    { provide: APP_GUARD, useClass: AuthGuard },
    // AuthGuard sets req.user, PermissionGuard decides allow/deny. Order matters.
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
