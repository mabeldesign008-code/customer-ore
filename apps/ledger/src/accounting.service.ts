import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThanOrEqual, Repository } from 'typeorm';
import { executionRefFor, requireDualControl } from '@ore/core';
import type { JwtPayload } from '@ore/core';
import { AccountingPeriod } from './entities/accounting-period.entity';
import { AdjustmentRequest } from './entities/adjustment-request.entity';
import { ChartAccount } from './entities/chart-account.entity';
import { CodCash } from './entities/cod-cash.entity';
import { CustomerCredit } from './entities/customer-credit.entity';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { RiderBalance } from './entities/rider-balance.entity';
import { VendorBalance } from './entities/vendor-balance.entity';

/**
 * Accounting: read the ledger the way an accountant reads it.
 *
 * The ledger already records every movement. What it could not answer was any of the
 * questions accounting actually asks — does the period balance, what do we owe and to whom,
 * what code does `platform_revenue` map to on the filed return, and is last month still the
 * number we reported. Those are this service.
 *
 * Two rules shape everything here:
 *
 * 1. **Nothing in this service writes to `ledger_entry`.** Accounting reads, reports and
 *    proposes. The only path that moves money is an executed adjustment, which is a Finance
 *    action under maker-checker — the person who spots the error is never the person who
 *    corrects it.
 *
 * 2. **A period that is closed stays closed.** Corrections go in the current period as
 *    reversing entries that name what they correct. That is what keeps a statement already
 *    given to someone else meaning the same thing next year.
 */

/** The accounts the ledger posts to, with the mapping an accountant needs.
 *  Seeded at boot so the chart can never be empty when the first statement is exported. */
export const DEFAULT_CHART: {
  name: string;
  code: string;
  label: string;
  nature: ChartAccount['nature'];
  normalSide: 'DEBIT' | 'CREDIT';
  mustNetToZero?: boolean;
  note: string;
}[] = [
  {
    name: 'customer_cash', code: '2100', label: 'Customer funds held (Paystack)',
    nature: 'LIABILITY', normalSide: 'CREDIT',
    note: 'Money customers paid that still sits in our Paystack account. A liability until the order settles.',
  },
  {
    name: 'customer_funds_held', code: '2105', label: 'Customer funds awaiting final allocation',
    nature: 'LIABILITY', normalSide: 'CREDIT',
    note: 'Controlled-split hold. Paystack capture lands here until order outcome, tax classification and settlement allocation are resolved.',
  },
  {
    name: 'customer_wallet_credit', code: '2110', label: 'Customer wallet credit',
    nature: 'LIABILITY', normalSide: 'CREDIT',
    note: 'Refund-destination balance. Customers can never top this up; it only ever comes from us.',
  },
  {
    name: 'vendor_payable', code: '2200', label: 'Vendor payable',
    nature: 'LIABILITY', normalSide: 'CREDIT',
    note: 'Owed to vendors, net of commission. Paid out through Paystack transfer on withdrawal.',
  },
  {
    name: 'rider_payable', code: '2300', label: 'Rider payable (cleared)',
    nature: 'LIABILITY', normalSide: 'CREDIT',
    note: 'Cleared rider earnings available to withdraw.',
  },
  {
    name: 'pending_rider_payable', code: '2310', label: 'Rider earnings pending clearance',
    nature: 'CONTROL', normalSide: 'CREDIT', mustNetToZero: true,
    note: 'Reservation made at charge time, released at delivery. Must net to zero across all orders.',
  },
  {
    name: 'rider_milestone', code: '2320', label: 'Rider milestone accrual',
    nature: 'LIABILITY', normalSide: 'CREDIT',
    note: 'Tier bonuses accrued but not yet paid.',
  },
  {
    name: 'rider_withdrawal_payout', code: '2330', label: 'Rider withdrawals in flight',
    nature: 'CONTROL', normalSide: 'DEBIT', mustNetToZero: true,
    note: 'Cleared when the Paystack transfer resolves. A permanent non-zero balance is a stuck payout.',
  },
  {
    name: 'cod_cash_receivable', code: '1200', label: 'COD cash in riders’ hands',
    nature: 'ASSET', normalSide: 'DEBIT',
    note: 'Cash collected on delivery that the rider has not yet remitted. This is real money we do not hold.',
  },
  {
    name: 'platform_revenue', code: '4000', label: 'Platform revenue — net of VAT/levies',
    nature: 'REVENUE', normalSide: 'CREDIT',
    note: 'Only Ore-owned consideration after tax extraction. Vendor product value, DP earnings and fleet settlements are pass-through, not revenue.',
  },
  {
    name: 'vat_payable', code: '2400', label: 'VAT payable',
    nature: 'LIABILITY', normalSide: 'CREDIT',
    note: 'VAT on Ore-owned taxable components only. Historical rows live in ORE_TAX_LEDGER.',
  },
  {
    name: 'nhil_payable', code: '2410', label: 'NHIL payable',
    nature: 'LIABILITY', normalSide: 'CREDIT',
    note: 'NHIL on Ore-owned taxable components only.',
  },
  {
    name: 'getfund_payable', code: '2420', label: 'GETFund payable',
    nature: 'LIABILITY', normalSide: 'CREDIT',
    note: 'GETFund levy on Ore-owned taxable components only.',
  },
  {
    name: 'wht_payable', code: '2430', label: 'Withholding tax payable',
    nature: 'LIABILITY', normalSide: 'CREDIT',
    note: 'Supplier WHT only where Ore is legally payer under a qualifying transaction. Paystack splits do not create WHT.',
  },
  {
    name: 'rent_wht_payable', code: '2440', label: 'Rent WHT payable',
    nature: 'LIABILITY', normalSide: 'CREDIT',
    note: 'Office-rent WHT workflow, separate from order/vendor/DP flows.',
  },
  {
    name: 'withholding_vat_payable', code: '2450', label: 'Withholding VAT payable',
    nature: 'LIABILITY', normalSide: 'CREDIT',
    note: 'Withholding VAT agent obligations; separate from ordinary WHT.',
  },
  {
    name: 'tax_credits_receivable', code: '1300', label: 'Tax credits receivable',
    nature: 'ASSET', normalSide: 'DEBIT',
    note: 'Certificates/credits receivable from withheld tax, not netted into revenue.',
  },
  {
    name: 'platform_fees', code: '4110', label: 'Revenue — legacy fees',
    nature: 'REVENUE', normalSide: 'CREDIT',
    note: 'Older split path. Kept so historical periods still reconcile.',
  },
  {
    name: 'platform_peak_pay', code: '5100', label: 'Peak-hour subsidy',
    nature: 'EXPENSE', normalSide: 'DEBIT',
    note: 'Platform-funded peak bonus. Money out of our pocket, so an expense, not a reduction of revenue.',
  },
  {
    name: 'delivery_partner_incentives', code: '5110', label: 'Delivery partner incentives / fulfilment shortfall',
    nature: 'EXPENSE', normalSide: 'DEBIT',
    note: 'Ore-funded delivery shortfalls and approved incentives. Never inflates delivery revenue.',
  },
  {
    name: 'vendor_bonus', code: '5200', label: 'Vendor loyalty bonus',
    nature: 'EXPENSE', normalSide: 'DEBIT',
    note: 'The GHS 200 bonus after N delivered orders.',
  },
  {
    name: 'withdrawal_fee', code: '4200', label: 'Withdrawal fee income',
    nature: 'REVENUE', normalSide: 'CREDIT',
    note: 'Second-and-later withdrawals in a day.',
  },
  {
    name: 'refund', code: '4900', label: 'Refunds issued',
    nature: 'REVENUE', normalSide: 'DEBIT',
    note: 'Contra-revenue. Debit side, because it reduces what we earned.',
  },
  {
    name: 'vendor_reserve', code: '2500', label: 'Vendor rolling reserve held',
    nature: 'LIABILITY', normalSide: 'CREDIT',
    note: 'The slice of vendor earnings held back each cycle. Releasing it moves it into a settlement payable.',
  },
  {
    name: 'vendor_withdrawal_held', code: '2510', label: 'Vendor withdrawals in flight',
    nature: 'LIABILITY', normalSide: 'CREDIT',
    note: 'Requested but not yet paid. Cleared when the payout lands or the attempt fails.',
  },
  {
    name: 'errand_escrow', code: '2520', label: 'Errand budget held in escrow',
    nature: 'LIABILITY', normalSide: 'CREDIT',
    note: 'Customer budget for an errand, held until the errand is delivered or aborted.',
  },
  {
    name: 'vendor_bonus_funding', code: '5210', label: 'Vendor bonus cost',
    nature: 'EXPENSE', normalSide: 'DEBIT',
    note: 'The cost of the GHS 200 loyalty bonus. The bonus is a liability we will pay out; this is what it costs us.',
  },
  {
    name: 'rider_milestone_funding', code: '5400', label: 'Rider milestone cost',
    nature: 'EXPENSE', normalSide: 'DEBIT',
    note: 'The cost of the GHS 100 / GHS 200 delivery milestones. Credited straight into a rider wallet, so it needs a cost against it.',
  },
  {
    name: 'customer_wallet_funding', code: '5300', label: 'Wallet credits granted',
    nature: 'EXPENSE', normalSide: 'DEBIT',
    note:
      'The cost of putting credit into a customer wallet when nothing else funded it — ' +
      'admin grants, loyalty redemption, failed-errand compensation. A wallet credit is a ' +
      'liability we will have to honour at checkout, so it always needs a debit somewhere.',
  },
  {
    name: 'ledger_repair_suspense', code: '9900', label: 'Suspense — unreconciled journal repairs',
    nature: 'CONTROL', normalSide: 'DEBIT', mustNetToZero: true,
    note:
      'Where a journal correction goes when the missing side cannot be identified. Deliberately ' +
      'left visible and flagged must-net-to-zero: an unexplained difference parked here shows up ' +
      'on the trial balance until an accountant reclassifies it, instead of being absorbed into ' +
      'revenue and becoming invisible. A non-zero balance in this account is an open question.',
  },
];

export interface TrialBalanceLine {
  account: string;
  code: string | null;
  label: string | null;
  nature: string | null;
  normalSide: 'DEBIT' | 'CREDIT' | null;
  debitPesewas: number;
  creditPesewas: number;
  /** Signed by normal side: positive means the account holds its normal balance. */
  balancePesewas: number;
  entries: number;
  unmapped: boolean;
}

@Injectable()
export class AccountingService {
  private readonly logger = new Logger(AccountingService.name);

  constructor(
    @InjectRepository(LedgerEntry) private readonly entries: Repository<LedgerEntry>,
    @InjectRepository(ChartAccount) private readonly chart: Repository<ChartAccount>,
    @InjectRepository(AccountingPeriod) private readonly periods: Repository<AccountingPeriod>,
    @InjectRepository(AdjustmentRequest) private readonly adjustments: Repository<AdjustmentRequest>,
    @InjectRepository(CustomerCredit) private readonly credits: Repository<CustomerCredit>,
    @InjectRepository(VendorBalance) private readonly vendorBalances: Repository<VendorBalance>,
    @InjectRepository(RiderBalance) private readonly riderBalances: Repository<RiderBalance>,
    @InjectRepository(CodCash) private readonly codCash: Repository<CodCash>,
  ) {}

  /* ────────────────────────── T6.1 trial balance ────────────────────────── */

  /**
   * Debits and credits by account for a period, plus whether they net to zero.
   *
   * `balanced: false` is the whole point of the endpoint. A double-entry ledger that does
   * not net to zero has a posting that only has one side, and that is either a bug or money
   * that left without a record. This reports it rather than hiding it inside a total.
   *
   * Accounts the ledger writes to but the chart does not know are still listed, flagged
   * `unmapped`, so a new account cannot silently fall out of the statement.
   */
  async trialBalance(from: Date, to: Date): Promise<{
    from: string;
    to: string;
    lines: TrialBalanceLine[];
    totalDebitPesewas: number;
    totalCreditPesewas: number;
    netPesewas: number;
    balanced: boolean;
    unmappedAccounts: string[];
  }> {
    const rows = await this.entries
      .createQueryBuilder('e')
      .select('e.account', 'account')
      .addSelect('SUM(e.debitPesewas)', 'debit')
      .addSelect('SUM(e.creditPesewas)', 'credit')
      .addSelect('COUNT(1)', 'entries')
      .where('e.createdAt >= :from AND e.createdAt <= :to', { from, to })
      .groupBy('e.account')
      .orderBy('e.account', 'ASC')
      .getRawMany<{ account: string; debit: string | number; credit: string | number; entries: string | number }>();

    const mapping = await this.chartMapping();

    const lines: TrialBalanceLine[] = rows.map((r) => {
      const debit = Number(r.debit ?? 0);
      const credit = Number(r.credit ?? 0);
      const map = mapping.get(r.account);
      const normalSide = map?.normalSide ?? 'DEBIT';
      return {
        account: r.account,
        code: map?.code ?? null,
        label: map?.label ?? null,
        nature: map?.nature ?? null,
        normalSide: map?.normalSide ?? null,
        debitPesewas: debit,
        creditPesewas: credit,
        // Signed by normal side so a liability shows positive when we owe money, not negative.
        balancePesewas: normalSide === 'CREDIT' ? credit - debit : debit - credit,
        entries: Number(r.entries ?? 0),
        unmapped: !map,
      };
    });

    const totalDebit = lines.reduce((s, l) => s + l.debitPesewas, 0);
    const totalCredit = lines.reduce((s, l) => s + l.creditPesewas, 0);

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      lines,
      totalDebitPesewas: totalDebit,
      totalCreditPesewas: totalCredit,
      netPesewas: totalDebit - totalCredit,
      balanced: totalDebit === totalCredit,
      unmappedAccounts: lines.filter((l) => l.unmapped).map((l) => l.account),
    };
  }

  /* ─────────────────────────── T6.2 general ledger ──────────────────────── */

  /** Every entry for one account, oldest first, with a running balance. */
  async generalLedger(
    account: string,
    from: Date,
    to: Date,
    limit = 500,
  ): Promise<{
    account: string;
    code: string | null;
    label: string | null;
    openingPesewas: number;
    lines: {
      id: string;
      at: string;
      orderId: string | null;
      ref: string | null;
      debitPesewas: number;
      creditPesewas: number;
      runningPesewas: number;
    }[];
    closingPesewas: number;
  }> {
    const mapping = await this.chartMapping();
    const map = mapping.get(account) ?? null;
    const normalSide = map?.normalSide ?? 'DEBIT';
    const sign = (d: number, c: number) => (normalSide === 'CREDIT' ? c - d : d - c);

    // Opening = everything before the window. Without it the running balance starts at
    // zero and the statement silently disagrees with the trial balance.
    const openingRows = await this.entries.find({ where: { account, createdAt: LessThanOrEqual(from) } });
    let opening = 0;
    for (const r of openingRows) opening += sign(r.debitPesewas || 0, r.creditPesewas || 0);

    const rows = await this.entries.find({
      where: { account, createdAt: Between(from, to) },
      order: { createdAt: 'ASC' },
      take: Math.min(5000, limit),
    });

    let running = opening;
    const lines = rows.map((r) => {
      running += sign(r.debitPesewas || 0, r.creditPesewas || 0);
      return {
        id: r.id,
        at: r.createdAt.toISOString(),
        orderId: r.orderId,
        ref: r.ref,
        debitPesewas: r.debitPesewas || 0,
        creditPesewas: r.creditPesewas || 0,
        runningPesewas: running,
      };
    });

    return {
      account,
      code: map?.code ?? null,
      label: map?.label ?? null,
      openingPesewas: opening,
      lines,
      closingPesewas: running,
    };
  }

  /** Every entry touching one order — the "explain this order to me" query. */
  async journalForOrder(orderId: string): Promise<{
    orderId: string;
    entries: { account: string; code: string | null; at: string; ref: string | null; debitPesewas: number; creditPesewas: number }[];
    totalDebitPesewas: number;
    totalCreditPesewas: number;
    balanced: boolean;
  }> {
    const mapping = await this.chartMapping();
    const rows = await this.entries.find({ where: { orderId }, order: { createdAt: 'ASC' } });
    if (!rows.length) throw new NotFoundException(`No ledger entries for order ${orderId}`);
    const entries = rows.map((r) => ({
      account: r.account,
      code: mapping.get(r.account)?.code ?? null,
      at: r.createdAt.toISOString(),
      ref: r.ref,
      debitPesewas: r.debitPesewas || 0,
      creditPesewas: r.creditPesewas || 0,
    }));
    const totalDebit = entries.reduce((s, e) => s + e.debitPesewas, 0);
    const totalCredit = entries.reduce((s, e) => s + e.creditPesewas, 0);
    return { orderId, entries, totalDebitPesewas: totalDebit, totalCreditPesewas: totalCredit, balanced: totalDebit === totalCredit };
  }

  /* ────────────────────────── T6.3 chart of accounts ────────────────────── */

  private async chartMapping(): Promise<Map<string, ChartAccount>> {
    const rows = await this.chart.find();
    return new Map(rows.map((r) => [r.name, r]));
  }

  async chartOfAccounts(): Promise<{
    accounts: ChartAccount[];
    unmapped: string[];
  }> {
    const accounts = await this.chart.find({ order: { code: 'ASC' } });
    const known = new Set(accounts.map((a) => a.name));
    // Any account the ledger has actually written to but the chart does not describe.
    const used = await this.entries
      .createQueryBuilder('e')
      .select('DISTINCT e.account', 'account')
      .getRawMany<{ account: string }>();
    return { accounts, unmapped: used.map((u) => u.account).filter((a) => !known.has(a)).sort() };
  }

  /**
   * Seed the default chart. Idempotent on `name` and still respects admin-maintained rows.
   *
   * System-seeded rows (`updatedBy IS NULL`) may be refreshed when the backend's default
   * chart changes. That matters for the tax rollout: old liability codes such as
   * `vendor_reserve=2400` have to move before `vat_payable=2400` can be inserted, or the
   * chart silently loses the tax account and Finance sees an unmapped tax liability.
   */
  async ensureChartSeeded(): Promise<void> {
    const remapFirst = ['errand_escrow', 'vendor_withdrawal_held', 'vendor_reserve', 'platform_revenue', 'customer_funds_held'];
    for (const name of remapFirst) {
      const row = DEFAULT_CHART.find((candidate) => candidate.name === name);
      const existing = row ? await this.chart.findOne({ where: { name } }) : null;
      if (row && existing) await this.refreshSystemDefaultChartRow(row, existing);
    }

    for (const row of DEFAULT_CHART) {
      const existing = await this.chart.findOne({ where: { name: row.name } });
      if (existing) {
        await this.refreshSystemDefaultChartRow(row, existing);
        continue;
      }
      try {
        await this.chart.save(
          this.chart.create({
            name: row.name,
            code: row.code,
            label: row.label,
            nature: row.nature,
            normalSide: row.normalSide,
            mustNetToZero: row.mustNetToZero ?? false,
            note: row.note,
          }),
        );
      } catch (err) {
        if (!/UNIQUE|duplicate key/i.test((err as Error).message)) throw err;
        this.logger.warn(`default chart account ${row.name} (${row.code}) could not be seeded because that code/name already exists`);
      }
    }
  }

  private async refreshSystemDefaultChartRow(row: (typeof DEFAULT_CHART)[number], existing: ChartAccount): Promise<void> {
    if (existing.updatedBy) return;
    const codeTaken = await this.chart.findOne({ where: { code: row.code } });
    if (codeTaken && codeTaken.name !== existing.name) {
      this.logger.warn(`default chart account ${row.name} wants code ${row.code}, but ${codeTaken.name} already uses it`);
      return;
    }
    existing.code = row.code;
    existing.label = row.label;
    existing.nature = row.nature;
    existing.normalSide = row.normalSide;
    existing.mustNetToZero = row.mustNetToZero ?? false;
    existing.note = row.note;
    await this.chart.save(existing);
  }

  async upsertChart(
    actor: JwtPayload,
    input: { name: string; code: string; label: string; nature: ChartAccount['nature']; normalSide: 'DEBIT' | 'CREDIT'; mustNetToZero?: boolean; note?: string | null },
  ): Promise<ChartAccount> {
    const name = input.name?.trim();
    if (!name) throw new BadRequestException('name is required');
    if (!/^[0-9]{3,6}$/.test(input.code?.trim() ?? '')) throw new BadRequestException('code must be 3-6 digits');
    if (!input.label?.trim()) throw new BadRequestException('label is required');

    const codeTaken = await this.chart.findOne({ where: { code: input.code.trim() } });
    const existing = await this.chart.findOne({ where: { name } });
    if (codeTaken && codeTaken.name !== name) {
      throw new ConflictException(`Code ${input.code} is already mapped to ${codeTaken.name}`);
    }

    const row = existing ?? this.chart.create({ name });
    row.code = input.code.trim();
    row.label = input.label.trim();
    row.nature = input.nature;
    row.normalSide = input.normalSide;
    row.mustNetToZero = input.mustNetToZero ?? false;
    row.note = input.note?.trim() || null;
    row.updatedBy = actor.sub;
    const saved = await this.chart.save(row);
    this.logger.log(`chart mapping ${name} -> ${saved.code} (${saved.nature}) by ${actor.sub}`);
    return saved;
  }

  /* ──────────────────────────── T6.4 export ─────────────────────────────── */

  /**
   * Journal export as CSV.
   *
   * Watermarked in a trailing comment row with who exported it and when, because a CSV
   * leaves the system and gets forwarded — six months later the question "where did this
   * come from?" must be answerable from the file itself.
   */
  async exportJournalCsv(from: Date, to: Date, exportedBy: JwtPayload): Promise<string> {
    const mapping = await this.chartMapping();
    const rows = await this.entries.find({
      where: { createdAt: Between(from, to) },
      order: { createdAt: 'ASC' },
      take: 20000,
    });
    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const head = 'date,account,code,label,nature,order_id,ref,debit_pesewas,credit_pesewas';
    const body = rows.map((r) => {
      const map = mapping.get(r.account);
      return [
        r.createdAt.toISOString(),
        esc(r.account),
        esc(map?.code ?? ''),
        esc(map?.label ?? ''),
        esc(map?.nature ?? ''),
        esc(r.orderId ?? ''),
        esc(r.ref ?? ''),
        r.debitPesewas || 0,
        r.creditPesewas || 0,
      ].join(',');
    });
    const totalD = rows.reduce((s, r) => s + (r.debitPesewas || 0), 0);
    const totalC = rows.reduce((s, r) => s + (r.creditPesewas || 0), 0);
    return [
      head,
      ...body,
      `# period,${from.toISOString()},${to.toISOString()}`,
      `# totals,debit=${totalD},credit=${totalC},balanced=${totalD === totalC}`,
      `# exported_by,${esc(exportedBy.sub)},${esc(exportedBy.adminRole ?? '')},${new Date().toISOString()}`,
      `# rows,${rows.length}`,
    ].join('\n');
  }

  /* ──────────────────────── T6.5 liability schedules ────────────────────── */

  /**
   * What we owe, and what we are holding that is not ours.
   *
   * Each schedule is read from the operational table (the source of truth for who is owed
   * what) *and* from the ledger, and the two are shown side by side. When they disagree
   * that is the finding — the operational table says one thing and the money says another.
   */
  async liabilitySchedules(): Promise<{
    asOf: string;
    schedules: {
      name: string;
      code: string | null;
      operationalPesewas: number;
      ledgerPesewas: number;
      agrees: boolean;
      parties: number;
      note: string;
    }[];
    totalLiabilityPesewas: number;
  }> {
    const ledgerNet = async (account: string): Promise<number> => {
      const raw = await this.entries
        .createQueryBuilder('e')
        .select('SUM(e.creditPesewas)', 'credit')
        .addSelect('SUM(e.debitPesewas)', 'debit')
        .where('e.account = :account', { account })
        .getRawOne<{ credit: string | number | null; debit: string | number | null }>();
      return Number(raw?.credit ?? 0) - Number(raw?.debit ?? 0);
    };

    // Customer wallet credit: the refund-destination balance. `creditPesewas` is the live
    // balance; the lifetime columns are history, not what we owe today.
    const creditRows = await this.credits.find();
    const customerCreditOp = creditRows.reduce((s, c) => s + (c.creditPesewas ?? 0), 0);

    // Vendor: everything accrued and not yet paid out, plus the bonus pot, less the reserve
    // we are holding back and less anything they already owe us (instant reversals on fault).
    const vendorRows = await this.vendorBalances.find();
    const vendorOutstanding = (v: VendorBalance) =>
      (v.accruedPesewas ?? 0) + (v.bonusPesewas ?? 0) - (v.paidOutPesewas ?? 0) - (v.reservePesewas ?? 0) - (v.owedPesewas ?? 0);
    const vendorOp = vendorRows.reduce((s, v) => s + vendorOutstanding(v), 0);

    const riderRows = await this.riderBalances.find();
    const riderOp = riderRows.reduce((s, r) => s + (r.clearedPesewas ?? 0) + (r.pendingPesewas ?? 0), 0);

    // COD: cash a rider holds and has not remitted. EXPECTED (not yet collected) and
    // COLLECTED (collected, not transferred) are both still out there; FLAGGED is a dispute
    // and is deliberately excluded — it is not a clean liability until it is resolved.
    const codRows = await this.codCash.find();
    const codOpen = (c: CodCash) => c.status === 'EXPECTED' || c.status === 'COLLECTED';
    const codOutstanding = codRows.filter(codOpen).reduce((s, c) => s + (c.amountPesewas ?? 0), 0);

    const mk = (
      name: string,
      code: string | null,
      operationalPesewas: number,
      ledgerPesewas: number,
      parties: number,
      note: string,
    ) => ({ name, code, operationalPesewas, ledgerPesewas, agrees: operationalPesewas === ledgerPesewas, parties, note });

    const schedules = [
      mk('Customer funds awaiting final allocation', '2105', await ledgerNet('customer_funds_held'), await ledgerNet('customer_funds_held'),
        0,
        'Captured Paystack funds still waiting for order outcome, tax classification, and final settlement release.'),
      mk('Customer wallet credit', '2110', customerCreditOp, await ledgerNet('customer_wallet_credit'),
        creditRows.filter((c) => (c.creditPesewas ?? 0) > 0).length,
        'Owed back to customers on request. Never topped up by the customer.'),
      mk('Vendor payable', '2200', vendorOp, await ledgerNet('vendor_payable'),
        vendorRows.filter((v) => vendorOutstanding(v) > 0).length,
        'Accrued + bonus - paid out - reserve held - owed to us. Paid by Paystack transfer on withdrawal.'),
      mk('Rider payable', '2300', riderOp, (await ledgerNet('rider_payable')) + (await ledgerNet('pending_rider_payable')),
        riderRows.filter((r) => (r.clearedPesewas ?? 0) + (r.pendingPesewas ?? 0) > 0).length,
        'Cleared plus pending rider earnings.'),
      mk('COD cash in riders’ hands', '1200', codOutstanding, await ledgerNet('cod_cash_receivable'),
        codRows.filter(codOpen).length,
        'Cash a rider holds and has not remitted (EXPECTED + COLLECTED). Real money we do not hold.'),
    ];

    return {
      asOf: new Date().toISOString(),
      schedules,
      totalLiabilityPesewas: schedules.reduce((s, x) => s + x.ledgerPesewas, 0),
    };
  }

  /* ─────────────────────── T6.6 period lock ─────────────────────────────── */

  private periodLabel(d: Date): string {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  /** Is the period containing `when` closed? Used by the posting path to refuse back-dating. */
  async isLocked(when: Date): Promise<AccountingPeriod | null> {
    const year = when.getUTCFullYear();
    const month = when.getUTCMonth() + 1;
    return this.periods.findOne({ where: { year, month } });
  }

  /**
   * Refuse a posting dated inside a closed period.
   *
   * Called from the write path, not from the UI: the rule has to hold for whatever writes to
   * the ledger, including a scheduled job and a replayed event, or it is not a rule.
   * `LedgerService` has its own copy of this check (`assertPeriodOpen`) rather than calling
   * this method, because accounting depends on the ledger to post and the ledger cannot
   * depend back on accounting.
   */
  async assertNotLocked(when: Date): Promise<void> {
    const locked = await this.isLocked(when);
    if (!locked) return;
    throw new ConflictException(
      `Accounting period ${locked.label} is closed (locked ${locked.lockedAt.toISOString()}). ` +
        `Post the correction in the current period as an adjusting entry instead.`,
    );
  }

  async listPeriods(): Promise<AccountingPeriod[]> {
    return this.periods.find({ order: { year: 'DESC', month: 'DESC' } });
  }

  /**
   * Close a period. Dual-controlled: `accounting.period.lock` is a `D` permission, because
   * closing a month is what makes its numbers official, and one person deciding that is how
   * a bad month becomes an unauditable one.
   *
   * The trial balance is snapshotted into the row, so "what did we report for August?" stays
   * answerable even if entries are disputed later.
   */
  async lockPeriod(
    actor: JwtPayload,
    year: number,
    month: number,
    reason: string,
  ): Promise<AccountingPeriod | { conflict: string }> {
    if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new BadRequestException('year looks wrong');
    if (!Number.isInteger(month) || month < 1 || month > 12) throw new BadRequestException('month must be 1-12');
    if (!reason || reason.trim().length < 5) throw new BadRequestException('A reason of at least 5 characters is required');

    const label = `${year}-${String(month).padStart(2, '0')}`;
    const existing = await this.periods.findOne({ where: { year, month } });
    if (existing) {
      throw new ConflictException(`${label} is already closed (locked ${existing.lockedAt.toISOString()})`);
    }

    // Closing a *future* or the *current* month would immediately refuse live traffic.
    const now = new Date();
    const lastMoment = Date.UTC(year, month, 0, 23, 59, 59, 999); // day 0 of next month = last day of this one
    if (lastMoment > now.getTime()) {
      throw new BadRequestException(`${label} has not ended yet — you can only close a finished period`);
    }

    const from = new Date(Date.UTC(year, month - 1, 1));
    const to = new Date(lastMoment);

    return requireDualControl(
      {
        kind: 'accounting.period.lock',
        permission: 'accounting.period.lock',
        service: 'ledger',
        resourceType: 'accounting_period',
        resourceId: label,
        reason: reason.trim(),
        payload: { year, month, label, reason: reason.trim() },
        makerUserId: actor.sub,
        makerAdminRole: actor.adminRole ?? null,
        // A period close is structural: it always needs a second signature, whatever the
        // amount, and it always needs a super admin in the chain.
        forceApprovals: 2,
        forceRequiresSuper: true,
      },
      actor.sub,
      async () => {
        const tb = await this.trialBalance(from, to);
        const row = await this.periods.save(
          this.periods.create({
            year,
            month,
            label,
            lockedBy: actor.sub,
            reason: reason.trim(),
            trialBalanceJson: tb.lines as unknown as Record<string, unknown>[],
            netDebitPesewas: tb.totalDebitPesewas,
            netCreditPesewas: tb.totalCreditPesewas,
            balanced: tb.balanced,
          }),
        );
        if (!tb.balanced) {
          // Still locked — you cannot un-report a month — but loud, because it means the
          // month we just made official does not add up.
          this.logger.error(`PERIOD ${label} CLOSED OUT OF BALANCE: DR ${tb.totalDebitPesewas} vs CR ${tb.totalCreditPesewas}`);
        }
        this.logger.log(`accounting period ${label} closed by ${actor.sub}`);
        return row;
      },
    );
  }

  /* ─────────────────── T6.7 adjustment request workflow ─────────────────── */

  async nextAdjustmentRef(): Promise<string> {
    const count = await this.adjustments.count();
    return `ADJ-${String(count + 1).padStart(5, '0')}`;
  }

  /**
   * Accounting proposes a correction. Nothing is posted.
   *
   * The legs must balance at proposal time — refusing an unbalanced proposal here is much
   * cheaper than discovering it when Finance tries to execute it.
   */
  async proposeAdjustment(
    actor: JwtPayload,
    input: {
      reason: string;
      entries: { account: string; debitPesewas: number; creditPesewas: number }[];
      reversesRef?: string | null;
      orderId?: string | null;
      correctsPeriod?: string | null;
    },
  ): Promise<AdjustmentRequest> {
    if (!input.reason || input.reason.trim().length < 10) {
      throw new BadRequestException('A reason of at least 10 characters is required — an unexplained adjustment is indistinguishable from theft');
    }
    if (!Array.isArray(input.entries) || input.entries.length < 2) {
      throw new BadRequestException('At least two legs are required — this is a double-entry ledger');
    }
    for (const e of input.entries) {
      if (!e.account) throw new BadRequestException('Every leg needs an account');
      if (!Number.isInteger(e.debitPesewas) || !Number.isInteger(e.creditPesewas)) {
        throw new BadRequestException('Amounts must be whole pesewas');
      }
      if (e.debitPesewas < 0 || e.creditPesewas < 0) throw new BadRequestException('Amounts cannot be negative');
      if (e.debitPesewas > 0 && e.creditPesewas > 0) throw new BadRequestException('A leg is either a debit or a credit, not both');
      if (e.debitPesewas === 0 && e.creditPesewas === 0) throw new BadRequestException('A leg with no amount does nothing');
    }
    const totalDebit = input.entries.reduce((s, e) => s + e.debitPesewas, 0);
    const totalCredit = input.entries.reduce((s, e) => s + e.creditPesewas, 0);
    if (totalDebit !== totalCredit) {
      throw new BadRequestException(`Unbalanced: debits ${totalDebit} != credits ${totalCredit}`);
    }
    if (totalDebit === 0) throw new BadRequestException('An adjustment of zero changes nothing');

    const row = await this.adjustments.save(
      this.adjustments.create({
        ref: await this.nextAdjustmentRef(),
        status: 'PROPOSED',
        proposedBy: actor.sub,
        reason: input.reason.trim(),
        reversesRef: input.reversesRef?.trim() || null,
        orderId: input.orderId?.trim() || null,
        entriesJson: input.entries,
        amountPesewas: totalDebit,
        correctsPeriod: input.correctsPeriod?.trim() || null,
      }),
    );
    this.logger.warn(`adjustment ${row.ref} proposed by ${actor.sub}: ${row.reason}`);
    return row;
  }

  async listAdjustments(status?: string, limit = 50): Promise<AdjustmentRequest[]> {
    const where = status ? { status: status.toUpperCase() as AdjustmentRequest['status'] } : {};
    return this.adjustments.find({ where, order: { createdAt: 'DESC' }, take: Math.min(200, limit) });
  }

  async oneAdjustment(id: string): Promise<AdjustmentRequest> {
    const row = await this.adjustments.findOne({ where: [{ id }, { ref: id }] });
    if (!row) throw new NotFoundException(`No adjustment ${id}`);
    return row;
  }

  async rejectAdjustment(actor: JwtPayload, id: string, note: string): Promise<AdjustmentRequest> {
    const row = await this.oneAdjustment(id);
    if (row.status !== 'PROPOSED') throw new ConflictException(`Only a PROPOSED adjustment can be rejected (this is ${row.status})`);
    if (row.proposedBy === actor.sub) throw new BadRequestException('You cannot reject your own proposal');
    row.status = 'REJECTED';
    row.decidedBy = actor.sub;
    row.decidedAt = new Date();
    row.executionNote = note?.trim() || 'rejected';
    return this.adjustments.save(row);
  }

  async cancelAdjustment(actor: JwtPayload, id: string): Promise<AdjustmentRequest> {
    const row = await this.oneAdjustment(id);
    if (row.status !== 'PROPOSED') throw new ConflictException(`Only a PROPOSED adjustment can be cancelled (this is ${row.status})`);
    if (row.proposedBy !== actor.sub) throw new BadRequestException('Only the proposer can withdraw it');
    row.status = 'CANCELLED';
    row.decidedBy = actor.sub;
    row.decidedAt = new Date();
    return this.adjustments.save(row);
  }

  /**
   * Finance executes a proposed adjustment.
   *
   * Dual-controlled, and the proposer cannot be the executor — `requireDualControl` refuses
   * a self-signature. The legs posted are exactly the ones proposed: the row is the frozen
   * payload, so an edit between proposal and execution changes the idempotency key and the
   * gate refuses rather than posting something nobody approved.
   */
  async executeAdjustment(
    actor: JwtPayload,
    id: string,
    post: (
      orderId: string | null,
      entries: { account: string; debitPesewas: number; creditPesewas: number }[],
      ref: string,
    ) => Promise<void>,
  ): Promise<AdjustmentRequest> {
    const row = await this.oneAdjustment(id);
    if (row.status === 'EXECUTED') throw new ConflictException(`${row.ref} was already executed — refusing to post it twice`);
    if (row.status !== 'PROPOSED') throw new ConflictException(`Only a PROPOSED adjustment can be executed (this is ${row.status})`);
    if (row.proposedBy === actor.sub) {
      throw new BadRequestException('The proposer cannot execute their own adjustment — that is the whole point of the split');
    }

    const executionRef = executionRefFor('adjustment.execute', row.id, `${row.amountPesewas}`);

    return requireDualControl(
      {
        kind: 'adjustment.execute',
        permission: 'finance.wallet.adjust',
        service: 'ledger',
        resourceType: 'adjustment_request',
        resourceId: row.id,
        amountPesewas: row.amountPesewas,
        reason: row.reason,
        executionRef,
        payload: {
          adjustmentId: row.id,
          entries: row.entriesJson,
          orderId: row.orderId,
          reversesRef: row.reversesRef,
          amountPesewas: row.amountPesewas,
        },
        makerUserId: actor.sub,
        makerAdminRole: actor.adminRole ?? null,
      },
      actor.sub,
      async () => {
        // A correction posts NOW. The period it corrects is recorded on the row, not used as
        // the posting date — back-dating into a closed period is exactly what T6.6 forbids.
        await this.assertNotLocked(new Date());
        const ref = `adjustment:${row.ref}`;
        await post(row.orderId, row.entriesJson, ref);
        row.status = 'EXECUTED';
        row.decidedBy = row.decidedBy ?? actor.sub;
        row.decidedAt = row.decidedAt ?? new Date();
        row.executedAt = new Date();
        row.executionRef = executionRef;
        row.executionNote = `posted as ${ref}`;
        const saved = await this.adjustments.save(row);
        this.logger.warn(`adjustment ${row.ref} executed by ${actor.sub} as ${ref}`);
        return saved;
      },
    );
  }

  /* ─────────────────────────── seeding ──────────────────────────────────── */

  async onModuleInit(): Promise<void> {
    await this.ensureChartSeeded();
  }
}
