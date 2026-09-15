import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { typeOrmForRoot } from '@ore/db';
import { BaselineLedger1750000000000 } from './migrations/1750000000000-BaselineLedger';
import { AddVendorWithdrawals1760000000001 } from './migrations/1760000000001-AddVendorWithdrawals';
import { AddCustomerLoyalty1760000000002 } from './migrations/1760000000002-AddCustomerLoyalty';
import { AddLedgerEntry1760000000003 } from './migrations/1760000000003-AddLedgerEntry';
import { EnforceLedgerImmutability1760000000004 } from './migrations/1760000000004-EnforceLedgerImmutability';
import { OreCoreModule, AuthGuard, PermissionGuard, AllExceptionsFilter } from '@ore/core';
import { HealthController } from './health.controller';
import { LedgerController } from './ledger.controller';
import { LedgerInternalController } from './internal.controller';
import { LedgerService } from './ledger.service';
import { ReconciliationService } from './reconciliation.service';
import { LedgerEntry, LedgerIdempotency, MoneyBreakdown, CodCash, RiderBalance, RiderWithdrawal, VendorEarning, VendorSettlement, VendorBalance, VendorWithdrawal, ReconcileRun, Dispute, Chargeback, CustomerCredit, CustomerCreditLog, CustomerLoyalty, ChartAccount, AccountingPeriod, AdjustmentRequest, TaxRule, TaxTransaction, WhtDecision, TaxLedger, TaxReviewCase } from './entities';
import { AccountingService } from './accounting.service';
import { TaxEngineService } from './tax-engine.service';
import { TaxController } from './tax.controller';
import { AccountingController } from './accounting.controller';
import { AddAccounting1788600000000 } from './migrations/1788600000000-AddAccounting';
import { RepairUnbalancedJournal1788950000000 } from './migrations/1788950000000-RepairUnbalancedJournal';
import { AddLedgerIdempotencyKey1789100000002 } from './migrations/1789100000002-AddLedgerIdempotencyKey';
import { AddTaxEngine1789500000000 } from './migrations/1789500000000-AddTaxEngine';
import { AlignAccountingChartForTax1789500000003 } from './migrations/1789500000003-AlignAccountingChartForTax';

@Module({
  imports: [
    OreCoreModule.forRoot('ledger'),
    ScheduleModule.forRoot(),
    typeOrmForRoot({ schema: 'ledger', entities: [LedgerEntry, LedgerIdempotency, MoneyBreakdown, CodCash, RiderBalance, RiderWithdrawal, VendorEarning, VendorSettlement, VendorBalance, VendorWithdrawal, ReconcileRun, Dispute, Chargeback, CustomerCredit, CustomerCreditLog, CustomerLoyalty, ChartAccount, AccountingPeriod, AdjustmentRequest, TaxRule, TaxTransaction, WhtDecision, TaxLedger, TaxReviewCase], migrations: [BaselineLedger1750000000000, AddVendorWithdrawals1760000000001, AddCustomerLoyalty1760000000002, AddLedgerEntry1760000000003, EnforceLedgerImmutability1760000000004, AddAccounting1788600000000, RepairUnbalancedJournal1788950000000, AddLedgerIdempotencyKey1789100000002, AddTaxEngine1789500000000, AlignAccountingChartForTax1789500000003] }),
    TypeOrmModule.forFeature([LedgerEntry, LedgerIdempotency, MoneyBreakdown, CodCash, RiderBalance, RiderWithdrawal, VendorEarning, VendorSettlement, VendorBalance, VendorWithdrawal, ReconcileRun, Dispute, Chargeback, CustomerCredit, CustomerCreditLog, CustomerLoyalty, ChartAccount, AccountingPeriod, AdjustmentRequest, TaxRule, TaxTransaction, WhtDecision, TaxLedger, TaxReviewCase]),
  ],
  controllers: [LedgerController, LedgerInternalController, AccountingController, TaxController, HealthController],
  providers: [
    LedgerService,
    ReconciliationService,
    AccountingService,
    TaxEngineService,
    { provide: APP_GUARD, useClass: AuthGuard },
    // AuthGuard sets req.user, PermissionGuard decides allow/deny. Order matters.
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements OnModuleInit {
  constructor(
    private readonly ledger: LedgerService,
    private readonly accounting: AccountingService,
    private readonly tax: TaxEngineService,
  ) {}
  async onModuleInit(): Promise<void> {
    await this.tax.ensureDefaultRulesSeeded();
    await this.ledger.init();
    // The chart of accounts is seeded at boot: an export run before anyone maps an
    // account would otherwise come back with blank codes and no nature.
    await this.accounting.ensureChartSeeded();
  }
}
