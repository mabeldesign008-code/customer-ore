/**
 * Accounting console API.
 *
 *   GET  /ledger/admin/accounting/trial-balance?from&to     ledger.trial_balance.read
 *   GET  /ledger/admin/accounting/general-ledger?account    ledger.journal.read
 *   GET  /ledger/admin/accounting/journal/:orderId          ledger.journal.read
 *   GET  /ledger/admin/accounting/chart                     ledger.trial_balance.read
 *   POST /ledger/admin/accounting/chart                     accounting.chart.manage
 *   GET  /ledger/admin/accounting/liabilities               ledger.trial_balance.read
 *   GET  /ledger/admin/accounting/export.csv                ledger.export
 *   GET  /ledger/admin/accounting/periods                   ledger.trial_balance.read
 *   POST /ledger/admin/accounting/periods/:year/:month/lock accounting.period.lock  (⚖ dual)
 *   GET  /ledger/admin/accounting/adjustments               ledger.journal.read
 *   POST /ledger/admin/accounting/adjustments               accounting.adjustment.propose
 *   POST /ledger/admin/accounting/adjustments/:id/{execute,reject,cancel}
 *
 * Note the split on adjustments: proposing is Accounting's, executing is Finance's under
 * maker-checker. Accounting can see everything and change nothing — that is deliberate, not
 * an oversight.
 */
import { Body, Controller, Get, Header, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser, RequirePermission, Roles } from '@ore/core';
import type { JwtPayload } from '@ore/core';
import { Role } from '@ore/contracts';
import { z } from 'zod';
import { AccountingService } from './accounting.service';
import { LedgerService } from './ledger.service';

const chartSchema = z.object({
  name: z.string().min(1).max(60),
  code: z.string().min(3).max(6),
  label: z.string().min(1).max(160),
  nature: z.enum(['ASSET', 'LIABILITY', 'REVENUE', 'EXPENSE', 'CONTROL']),
  normalSide: z.enum(['DEBIT', 'CREDIT']),
  mustNetToZero: z.boolean().optional(),
  note: z.string().max(500).nullable().optional(),
});

const adjustmentSchema = z.object({
  reason: z.string().min(10).max(1000),
  entries: z
    .array(
      z.object({
        account: z.string().min(1).max(60),
        debitPesewas: z.number().int().min(0).default(0),
        creditPesewas: z.number().int().min(0).default(0),
      }),
    )
    .min(2),
  reversesRef: z.string().max(180).nullable().optional(),
  orderId: z.string().uuid().nullable().optional(),
  correctsPeriod: z.string().regex(/^\d{4}-\d{2}$/).nullable().optional(),
});

/** Parse an ISO date or `YYYY-MM-DD`. Refuses anything ambiguous rather than guessing. */
function parseDate(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00.000Z`);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error(`'${value}' is not a date`);
  return d;
}

@Controller('ledger')
export class AccountingController {
  constructor(
    private readonly accounting: AccountingService,
    private readonly ledger: LedgerService,
  ) {}

  @Get('admin/accounting/trial-balance')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('ledger.trial_balance.read')
  async trialBalance(@Query('from') from?: string, @Query('to') to?: string) {
    const toD = parseDate(to, new Date());
    // Default window is the last 30 days: enough to be useful, bounded so a full-history
    // scan is a deliberate choice rather than what happens when someone forgets a param.
    const fromD = parseDate(from, new Date(toD.getTime() - 30 * 86_400_000));
    return this.accounting.trialBalance(fromD, toD);
  }

  @Get('admin/accounting/general-ledger')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('ledger.journal.read')
  async generalLedger(
    @Query('account') account: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    if (!account) return { error: 'account is required' };
    const toD = parseDate(to, new Date());
    const fromD = parseDate(from, new Date(toD.getTime() - 30 * 86_400_000));
    return this.accounting.generalLedger(account, fromD, toD, limit ? parseInt(limit, 10) : 500);
  }

  @Get('admin/accounting/journal/:orderId')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('ledger.journal.read')
  journal(@Param('orderId') orderId: string) {
    return this.accounting.journalForOrder(orderId);
  }

  @Get('admin/accounting/chart')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('ledger.trial_balance.read')
  chart() {
    return this.accounting.chartOfAccounts();
  }

  @Post('admin/accounting/chart')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('accounting.chart.manage')
  upsertChart(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    return this.accounting.upsertChart(user, chartSchema.parse(body));
  }

  @Get('admin/accounting/liabilities')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('ledger.trial_balance.read')
  liabilities() {
    return this.accounting.liabilitySchedules();
  }

  /**
   * Journal export. Streams as a CSV attachment rather than JSON so the download is the
   * artefact an accountant asked for, watermark included.
   */
  @Get('admin/accounting/export.csv')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('ledger.export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportCsv(
    @CurrentUser() user: JwtPayload,
    @Res() res: { header: (k: string, v: string) => void; send: (b: string) => void },
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const toD = parseDate(to, new Date());
    const fromD = parseDate(from, new Date(toD.getTime() - 30 * 86_400_000));
    const csv = await this.accounting.exportJournalCsv(fromD, toD, user);
    const stamp = `${fromD.toISOString().slice(0, 10)}_${toD.toISOString().slice(0, 10)}`;
    res.header('Content-Disposition', `attachment; filename="ore-journal-${stamp}.csv"`);
    res.send(csv);
  }

  @Get('admin/accounting/periods')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('ledger.trial_balance.read')
  periods() {
    return this.accounting.listPeriods();
  }

  @Post('admin/accounting/periods/:year/:month/lock')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('accounting.period.lock')
  lockPeriod(
    @CurrentUser() user: JwtPayload,
    @Param('year') year: string,
    @Param('month') month: string,
    @Body() body: { reason?: string },
  ) {
    return this.accounting.lockPeriod(user, parseInt(year, 10), parseInt(month, 10), body?.reason ?? '');
  }

  @Get('admin/accounting/adjustments')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('ledger.journal.read')
  adjustments(@Query('status') status?: string, @Query('limit') limit?: string) {
    return this.accounting.listAdjustments(status, limit ? parseInt(limit, 10) : 50);
  }

  @Post('admin/accounting/adjustments')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('accounting.adjustment.propose')
  propose(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    return this.accounting.proposeAdjustment(user, adjustmentSchema.parse(body));
  }

  /**
   * Execute a proposed adjustment. Gated on `finance.wallet.adjust` — the money permission —
   * not on an accounting one, because this is the step that actually posts.
   */
  @Post('admin/accounting/adjustments/:id/execute')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('finance.wallet.adjust')
  execute(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.accounting.executeAdjustment(user, id, (orderId, entries, ref) =>
      this.ledger.recordTransaction(orderId, entries, ref),
    );
  }

  @Post('admin/accounting/adjustments/:id/reject')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('finance.wallet.adjust')
  reject(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: { note?: string }) {
    return this.accounting.rejectAdjustment(user, id, body?.note ?? '');
  }

  @Post('admin/accounting/adjustments/:id/cancel')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @RequirePermission('accounting.adjustment.propose')
  cancel(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.accounting.cancelAdjustment(user, id);
  }
}
