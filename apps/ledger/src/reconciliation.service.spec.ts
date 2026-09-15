import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReconciliationService } from './reconciliation.service';
import { ReconcileRun } from './entities/reconcile-run.entity';
import { LedgerEntry } from './entities/ledger-entry.entity';

// Mock internalFetch and serviceUrl from @ore/core
jest.mock('@ore/core', () => ({
  internalFetch: jest.fn(),
  serviceUrl: jest.fn().mockReturnValue('http://payment-service'),
}));

import { internalFetch } from '@ore/core';

function createMockRepo<T>() {
  const repo = {
    create: jest.fn((data: any) => data),
    save: jest.fn((data: any) => Promise.resolve({ ...data, id: 'run-uuid-1' })),
    createQueryBuilder: jest.fn(),
  };
  return repo;
}

describe('ReconciliationService', () => {
  let service: ReconciliationService;
  let reconcileRuns: ReturnType<typeof createMockRepo>;
  let ledgerEntries: ReturnType<typeof createMockRepo>;

  beforeEach(async () => {
    reconcileRuns = createMockRepo();
    ledgerEntries = createMockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReconciliationService,
        { provide: getRepositoryToken(ReconcileRun), useValue: reconcileRuns },
        { provide: getRepositoryToken(LedgerEntry), useValue: ledgerEntries },
      ],
    }).compile();

    service = module.get<ReconciliationService>(ReconciliationService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('runReconciliation', () => {
    const date = '2026-08-22';
    const mockQueryBuilder = (total: number) => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ total: String(total) }),
    });

    it('should save status MATCHED when amounts agree', async () => {
      ledgerEntries.createQueryBuilder.mockReturnValue(mockQueryBuilder(5000));
      (internalFetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ settledAmountPesewas: 5000 }),
      });

      await service.runReconciliation(date);

      expect(reconcileRuns.save).toHaveBeenCalledTimes(2);
      const lastCall = (reconcileRuns.save as jest.Mock).mock.calls[1][0];
      expect(lastCall.status).toBe('MATCHED');
      expect(lastCall.reportJson).toMatchObject({
        internalTotalPesewas: 5000,
        externalTotalPesewas: 5000,
        discrepancyPesewas: 0,
      });
    });

    it('should save status FLAGGED when amounts differ', async () => {
      ledgerEntries.createQueryBuilder.mockReturnValue(mockQueryBuilder(5000));
      (internalFetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ settledAmountPesewas: 4500 }),
      });

      await service.runReconciliation(date);

      expect(reconcileRuns.save).toHaveBeenCalledTimes(2);
      const lastCall = (reconcileRuns.save as jest.Mock).mock.calls[1][0];
      expect(lastCall.status).toBe('FLAGGED');
      expect(lastCall.reportJson).toMatchObject({
        internalTotalPesewas: 5000,
        externalTotalPesewas: 4500,
        discrepancyPesewas: 500,
      });
    });

    it('should save status FLAGGED on payment service error', async () => {
      ledgerEntries.createQueryBuilder.mockReturnValue(mockQueryBuilder(5000));
      (internalFetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
      });

      await service.runReconciliation(date);

      const lastCall = (reconcileRuns.save as jest.Mock).mock.calls.at(-1)[0];
      expect(lastCall.status).toBe('FLAGGED');
      expect(lastCall.reportJson).toHaveProperty('error');
    });

    it('should save status FLAGGED on network error', async () => {
      ledgerEntries.createQueryBuilder.mockReturnValue(mockQueryBuilder(5000));
      (internalFetch as jest.Mock).mockRejectedValue(new Error('Network failure'));

      await service.runReconciliation(date);

      const lastCall = (reconcileRuns.save as jest.Mock).mock.calls.at(-1)[0];
      expect(lastCall.status).toBe('FLAGGED');
      expect(lastCall.reportJson).toMatchObject({ error: 'Network failure' });
    });
  });
});
