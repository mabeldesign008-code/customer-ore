jest.setTimeout(60000);

import { Test } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TypeOrmSQLITETestingModule } from '@ore/testing';
import { AccountingService } from './accounting.service';
import {
  AccountingPeriod,
  AdjustmentRequest,
  ChartAccount,
  CodCash,
  CustomerCredit,
  LedgerEntry,
  RiderBalance,
  VendorBalance,
} from './entities';

describe('AccountingService chart seed', () => {
  const ENTITIES = [LedgerEntry, ChartAccount, AccountingPeriod, AdjustmentRequest, CustomerCredit, VendorBalance, RiderBalance, CodCash];
  let dataSource: DataSource;
  let service: AccountingService;
  let chart: Repository<ChartAccount>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [...TypeOrmSQLITETestingModule(ENTITIES)],
      providers: [AccountingService],
    }).compile();
    dataSource = module.get<DataSource>(getDataSourceToken());
    service = module.get(AccountingService);
    chart = module.get(getRepositoryToken(ChartAccount));
  });

  afterEach(async () => {
    await dataSource.destroy();
  });

  it('remaps old system default codes before inserting tax accounts', async () => {
    await chart.save([
      chart.create({ name: 'vendor_reserve', code: '2400', label: 'Vendor rolling reserve held', nature: 'LIABILITY', normalSide: 'CREDIT', mustNetToZero: false, note: null, updatedBy: null }),
      chart.create({ name: 'vendor_withdrawal_held', code: '2410', label: 'Vendor withdrawals in flight', nature: 'LIABILITY', normalSide: 'CREDIT', mustNetToZero: false, note: null, updatedBy: null }),
      chart.create({ name: 'errand_escrow', code: '2500', label: 'Errand budget held in escrow', nature: 'LIABILITY', normalSide: 'CREDIT', mustNetToZero: false, note: null, updatedBy: null }),
      chart.create({ name: 'platform_revenue', code: '4100', label: 'Revenue — commission and fees', nature: 'REVENUE', normalSide: 'CREDIT', mustNetToZero: false, note: null, updatedBy: null }),
    ]);

    await service.ensureChartSeeded();

    const rows = await chart.find({ order: { name: 'ASC' } });
    const byName = new Map(rows.map((row) => [row.name, row]));
    const codes = rows.map((row) => row.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(byName.get('vendor_reserve')?.code).toBe('2500');
    expect(byName.get('vendor_withdrawal_held')?.code).toBe('2510');
    expect(byName.get('errand_escrow')?.code).toBe('2520');
    expect(byName.get('platform_revenue')?.code).toBe('4000');
    expect(byName.get('vat_payable')?.code).toBe('2400');
    expect(byName.get('nhil_payable')?.code).toBe('2410');
    expect(byName.get('getfund_payable')?.code).toBe('2420');
    expect(byName.get('wht_payable')?.code).toBe('2430');
    expect(byName.get('customer_funds_held')?.mustNetToZero).toBe(false);
  });
});
