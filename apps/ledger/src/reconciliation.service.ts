import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReconcileRun } from './entities/reconcile-run.entity';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { internalFetch, serviceUrl } from '@ore/core';

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    @InjectRepository(ReconcileRun) private readonly reconcileRuns: Repository<ReconcileRun>,
    @InjectRepository(LedgerEntry) private readonly ledgerEntries: Repository<LedgerEntry>,
  ) {}

  /**
   * Daily cron job at 2 AM
   * Reconciles the previous day's transactions
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleDailyReconciliation() {
    this.logger.log('Starting daily reconciliation job');
    // Get yesterday's date formatted as YYYY-MM-DD
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    await this.runReconciliation(dateStr);
  }

  async runReconciliation(dateStr: string) {
    this.logger.log(`Running reconciliation for date: ${dateStr}`);
    
    // Create run record
    let run = await this.reconcileRuns.save(
      this.reconcileRuns.create({
        period: dateStr,
        status: 'RUNNING',
      })
    );

    try {
      // 1. Fetch internal ledger payment totals for customer_cash (which represents successful payments)
      // We look at the total debits to customer_cash for the day.
      const start = new Date(`${dateStr}T00:00:00.000Z`);
      const end = new Date(`${dateStr}T23:59:59.999Z`);
      
      const ledgerResult = await this.ledgerEntries
        .createQueryBuilder('entry')
        .select('SUM(entry.debitPesewas)', 'total')
        .where('entry.account = :account', { account: 'customer_cash' })
        .andWhere('entry.createdAt BETWEEN :start AND :end', { start, end })
        .getRawOne();
        
      const internalTotal = Number(ledgerResult?.total || 0);

      // 2. Fetch Paystack settlement report from Payment Service
      const res = await internalFetch(`${serviceUrl('payment')}/internal/payments/settlements/report?date=${dateStr}`);
      
      if (!res.ok) {
        throw new Error(`Failed to fetch settlement report from payment service: ${res.statusText}`);
      }

      const report = await res.json() as { settledAmountPesewas: number };
      const externalTotal = report.settledAmountPesewas;

      // 3. Match and compare amounts
      const diff = Math.abs(internalTotal - externalTotal);
      const isMatched = diff === 0;

      // Update run status
      run.status = isMatched ? 'MATCHED' : 'FLAGGED';
      run.reportJson = {
        internalTotalPesewas: internalTotal,
        externalTotalPesewas: externalTotal,
        discrepancyPesewas: diff,
      };
      
      await this.reconcileRuns.save(run);

      // 4. Alert if flagged
      if (!isMatched) {
        this.logger.warn(`Reconciliation flagged for ${dateStr}. Internal: ${internalTotal}, External: ${externalTotal}`);
        // In a real app we might publish an event that a notifier service picks up for Slack/Email alerts.
        // E.g. await this.bus.publish('SYSTEM_ALERT', { type: 'RECONCILIATION_FAILED', ... });
      } else {
        this.logger.log(`Reconciliation matched for ${dateStr}. Total: ${internalTotal} Pesewas.`);
      }

    } catch (error) {
      this.logger.error(`Error during reconciliation for ${dateStr}`, error);
      run.status = 'FLAGGED';
      run.reportJson = { error: (error as Error).message };
      await this.reconcileRuns.save(run);
    }
  }
}
