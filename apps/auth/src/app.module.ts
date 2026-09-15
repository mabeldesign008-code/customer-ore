import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { typeOrmForRoot } from '@ore/db';
import { OreCoreModule, AuthGuard, PermissionGuard, PERMISSION_AUDIT_SINK, AllExceptionsFilter } from '@ore/core';
import { HealthController } from './health.controller';
import { AuthController } from './auth.controller';
import { AdminController } from './admin.controller';
import { AuthService } from './auth.service';
import { AdminService } from './admin.service';
import { ApprovalService } from './approval.service';
import { ApprovalController } from './approval.controller';
import { CustomerService } from './customer.service';
import { CustomerController } from './customer.controller';
import {
  User, OtpCode, IdCounter, AdminUser, AdminRoleGrant, AdminAction, AdminApproval,
  ComplianceHold, KycReview, FraudFlag, RefreshRevocation, CustomerAddressAudit, CustomerSavedAddress,
} from './entities';
import { ComplianceService } from './compliance.service';
import { ComplianceController } from './compliance.controller';
import { BaselineAuth1750000000000 } from './migrations/1750000000000-BaselineAuth';
import { Baseline1787380602000 } from './migrations/1787380602000-Baseline';
import { AddAdminRole1787900000000 } from './migrations/1787900000000-AddAdminRole';
import { AddAdminRbac1788000000000 } from './migrations/1788000000000-AddAdminRbac';
import { AddAdminApprovals1788100000000 } from './migrations/1788100000000-AddAdminApprovals';
import { AddAccountStanding1788500000000 } from './migrations/1788500000000-AddAccountStanding';
import { AddCompliance1788900000000 } from './migrations/1788900000000-AddCompliance';
import { AddCustomerSavedAddresses1789400000002 } from './migrations/1789400000002-AddCustomerSavedAddresses';

@Module({
  imports: [
    OreCoreModule.forRoot('auth'),
    typeOrmForRoot({
      schema: 'auth',
      // Compliance entities are in `entities` AND `migrations`: adding to forFeature alone
      // builds green and leaves the tables missing at runtime.
      entities: [User, OtpCode, IdCounter, AdminUser, AdminRoleGrant, AdminAction, AdminApproval, ComplianceHold, KycReview, FraudFlag, RefreshRevocation, CustomerAddressAudit, CustomerSavedAddress],
      // AddAdminRole was written but never registered here — the column only existed in
      // dev because `synchronize` is on outside production. Registering it now.
      migrations: [BaselineAuth1750000000000, Baseline1787380602000, AddAdminRole1787900000000, AddAdminRbac1788000000000, AddAdminApprovals1788100000000, AddAccountStanding1788500000000, AddCompliance1788900000000, AddCustomerSavedAddresses1789400000002],
    }),
    TypeOrmModule.forFeature([User, OtpCode, IdCounter, AdminUser, AdminRoleGrant, AdminAction, AdminApproval, ComplianceHold, KycReview, FraudFlag, RefreshRevocation, CustomerAddressAudit, CustomerSavedAddress]),
  ],
  controllers: [AuthController, AdminController, ApprovalController, CustomerController, ComplianceController, HealthController],
  providers: [ApprovalService,
    ComplianceService,
    CustomerService,
    AuthService,
    AdminService,
    { provide: APP_GUARD, useClass: AuthGuard },
    // Order matters: AuthGuard sets req.user, PermissionGuard reads it.
    { provide: APP_GUARD, useClass: PermissionGuard },
    // Auth owns the audit table, so it can write directly instead of over HTTP.
    {
      provide: PERMISSION_AUDIT_SINK,
      useFactory: (admins: AdminService) => ({ record: (e: never) => admins.recordAction(e) }),
      inject: [AdminService],
    },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
