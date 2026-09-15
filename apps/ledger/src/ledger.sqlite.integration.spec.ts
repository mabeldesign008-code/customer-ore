jest.setTimeout(30000);
/**
 * Ledger service — true SQLite integration tests.
 * Verifies double-entry invariants, idempotency keys, balance entity persistence,
 * and credit log uniqueness constraints against a real in-memory database.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TypeOrmSQLITETestingModule, clearTestDatabase } from '@ore/testing';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { CustomerCredit } from './entities/customer-credit.entity';
import { CustomerCreditLog } from './entities/customer-credit-log.entity';
import { RiderBalance } from './entities/rider-balance.entity';
import { VendorBalance } from './entities/vendor-balance.entity';

describe('Ledger SQLite Integration', () => {
  let module: TestingModule;
  let entryRepo: Repository<LedgerEntry>;
  let creditRepo: Repository<CustomerCredit>;
  let creditLogRepo: Repository<CustomerCreditLog>;
  let riderBalanceRepo: Repository<RiderBalance>;
  let vendorBalanceRepo: Repository<VendorBalance>;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ...TypeOrmSQLITETestingModule([
          LedgerEntry,
          CustomerCredit,
          CustomerCreditLog,
          RiderBalance,
          VendorBalance,
        ]),
      ],
    }).compile();

    entryRepo = module.get(getRepositoryToken(LedgerEntry));
    creditRepo = module.get(getRepositoryToken(CustomerCredit));
    creditLogRepo = module.get(getRepositoryToken(CustomerCreditLog));
    riderBalanceRepo = module.get(getRepositoryToken(RiderBalance));
    vendorBalanceRepo = module.get(getRepositoryToken(VendorBalance));
  });

  afterAll(async () => {
    await module.close();
  });

  afterEach(async () => {
    await clearTestDatabase(module);
  });

  // ── Double-entry invariant ────────────────────────────────────────

  describe('LedgerEntry — double-entry invariant', () => {
    it('persists a balanced set of entries for an order (sum of debits == sum of credits)', async () => {
      const orderId = 'order-dbl-1';
      const entries = [
        // Customer pays 5000
        { orderId, account: 'customer_cash', debitPesewas: 5000, creditPesewas: 0 },
        // Platform takes 500 fee
        { orderId, account: 'platform_fees', debitPesewas: 0, creditPesewas: 500 },
        // Vendor earns 4000
        { orderId, account: 'vendor_payable', debitPesewas: 0, creditPesewas: 4000 },
        // Rider earns 500
        { orderId, account: 'rider_payable', debitPesewas: 0, creditPesewas: 500 },
      ];

      await entryRepo.save(entries.map(e => entryRepo.create(e)));

      const saved = await entryRepo.find({ where: { orderId } });
      expect(saved).toHaveLength(4);

      const totalDebit = saved.reduce((s, e) => s + e.debitPesewas, 0);
      const totalCredit = saved.reduce((s, e) => s + e.creditPesewas, 0);
      expect(totalDebit).toBe(5000);
      expect(totalCredit).toBe(5000); // double-entry invariant
    });

    it('stores orderId-indexed entries for efficient lookup', async () => {
      await entryRepo.save([
        entryRepo.create({ orderId: 'order-A', account: 'customer_cash', debitPesewas: 3000, creditPesewas: 0 }),
        entryRepo.create({ orderId: 'order-A', account: 'vendor_payable', debitPesewas: 0, creditPesewas: 3000 }),
        entryRepo.create({ orderId: 'order-B', account: 'customer_cash', debitPesewas: 5000, creditPesewas: 0 }),
      ]);

      const orderAEntries = await entryRepo.find({ where: { orderId: 'order-A' } });
      expect(orderAEntries).toHaveLength(2);
    });

    it('allows orderId to be null for non-order credits (refunds, bonuses)', async () => {
      const entry = await entryRepo.save(
        entryRepo.create({
          orderId: null,
          account: 'refund',
          debitPesewas: 10000,
          creditPesewas: 0,
          ref: 'refund:ref-1',
        }),
      );
      expect(entry.orderId).toBeNull();
      expect(entry.ref).toBe('refund:ref-1');
    });

    it('stores JSON metadata on entries', async () => {
      const meta = { paystackRef: 'PS-12345', channel: 'mobile_money' };
      const entry = await entryRepo.save(
        entryRepo.create({
          orderId: 'order-meta',
          account: 'customer_cash',
          debitPesewas: 7500,
          creditPesewas: 0,
          metaJson: meta,
        }),
      );

      const found = await entryRepo.findOne({ where: { id: entry.id } });
      expect(found!.metaJson).toMatchObject({ paystackRef: 'PS-12345' });
    });
  });

  // ── CustomerCredit ────────────────────────────────────────────────

  describe('CustomerCredit entity', () => {
    it('creates a zero-balance credit record for a new customer', async () => {
      const credit = await creditRepo.save(
        creditRepo.create({ userId: 'cust-new', creditPesewas: 0, lifetimeCreditedPesewas: 0, lifetimeUsedPesewas: 0 }),
      );

      expect(credit.creditPesewas).toBe(0);
      expect(credit.lifetimeCreditedPesewas).toBe(0);
    });

    it('enforces one credit record per userId (unique constraint)', async () => {
      await creditRepo.save(creditRepo.create({ userId: 'cust-unique', creditPesewas: 0 }));
      await expect(
        creditRepo.save(creditRepo.create({ userId: 'cust-unique', creditPesewas: 1000 })),
      ).rejects.toThrow();
    });

    it('updates credit balance correctly', async () => {
      const credit = await creditRepo.save(
        creditRepo.create({ userId: 'cust-balance', creditPesewas: 0, lifetimeCreditedPesewas: 0 }),
      );

      // Credit 5000
      credit.creditPesewas += 5000;
      credit.lifetimeCreditedPesewas += 5000;
      await creditRepo.save(credit);

      // Credit another 3000
      credit.creditPesewas += 3000;
      credit.lifetimeCreditedPesewas += 3000;
      await creditRepo.save(credit);

      const updated = await creditRepo.findOne({ where: { userId: 'cust-balance' } });
      expect(updated!.creditPesewas).toBe(8000);
      expect(updated!.lifetimeCreditedPesewas).toBe(8000);
    });

    it('deducts credit correctly (spend)', async () => {
      const credit = await creditRepo.save(
        creditRepo.create({ userId: 'cust-spend', creditPesewas: 10000, lifetimeCreditedPesewas: 10000, lifetimeUsedPesewas: 0 }),
      );

      credit.creditPesewas -= 3000;
      credit.lifetimeUsedPesewas += 3000;
      await creditRepo.save(credit);

      const updated = await creditRepo.findOne({ where: { userId: 'cust-spend' } });
      expect(updated!.creditPesewas).toBe(7000);
      expect(updated!.lifetimeUsedPesewas).toBe(3000);
    });
  });

  // ── CustomerCreditLog idempotency ─────────────────────────────────

  describe('CustomerCreditLog — idempotency key', () => {
    it('enforces unique ref constraint (prevents double credit)', async () => {
      await creditLogRepo.save(
        creditLogRepo.create({
          userId: 'cust-idem',
          amountPesewas: 5000,
          ref: 'dispute:dispute-1',
          kind: 'dispute',
          reason: 'Order was incorrect',
        }),
      );

      // Second credit with same ref must be rejected
      await expect(
        creditLogRepo.save(
          creditLogRepo.create({
            userId: 'cust-idem',
            amountPesewas: 5000,
            ref: 'dispute:dispute-1',
            kind: 'dispute',
            reason: 'Order was incorrect',
          }),
        ),
      ).rejects.toThrow(); // UNIQUE constraint violation
    });

    it('allows the same user to receive multiple credits with different refs', async () => {
      await creditLogRepo.save([
        creditLogRepo.create({ userId: 'cust-multi', amountPesewas: 1000, ref: 'referral:ref-1', kind: 'referral', reason: 'Referral reward' }),
        creditLogRepo.create({ userId: 'cust-multi', amountPesewas: 2000, ref: 'dispute:dispute-2', kind: 'dispute', reason: 'Late delivery' }),
        creditLogRepo.create({ userId: 'cust-multi', amountPesewas: 500, ref: 'admin:bonus-1', kind: 'manual', reason: 'Loyalty bonus' }),
      ]);

      const logs = await creditLogRepo.find({ where: { userId: 'cust-multi' } });
      expect(logs).toHaveLength(3);
      const total = logs.reduce((s, l) => s + l.amountPesewas, 0);
      expect(total).toBe(3500);
    });

    it('stores expiry date for time-limited credits', async () => {
      const expiresAt = new Date(Date.now() + 14 * 24 * 3_600_000); // 14 days
      const log = await creditLogRepo.save(
        creditLogRepo.create({
          userId: 'cust-expiry',
          amountPesewas: 1000,
          ref: 'referral:ref-expiry',
          kind: 'referral',
          reason: 'Referral welcome credit',
          expiresAt,
        }),
      );

      const found = await creditLogRepo.findOne({ where: { id: log.id } });
      expect(found!.expiresAt).not.toBeNull();
      // Should be approximately 14 days from now
      const daysUntilExpiry = (found!.expiresAt!.getTime() - Date.now()) / (24 * 3_600_000);
      expect(daysUntilExpiry).toBeGreaterThan(13);
      expect(daysUntilExpiry).toBeLessThan(15);
    });
  });

  // ── RiderBalance entity ───────────────────────────────────────────

  describe('RiderBalance entity', () => {
    it('creates a zero-balance record for a new rider', async () => {
      const balance = await riderBalanceRepo.save(
        riderBalanceRepo.create({ riderId: 'rider-new', userId: 'user-r1' }),
      );

      expect(balance.pendingPesewas).toBe(0);
      expect(balance.clearedPesewas).toBe(0);
      expect(balance.lockedPesewas).toBe(0);
      expect(balance.cashOwedPesewas).toBe(0);
    });

    it('enforces unique riderId', async () => {
      await riderBalanceRepo.save(riderBalanceRepo.create({ riderId: 'rider-dup', userId: 'user-r2' }));
      await expect(
        riderBalanceRepo.save(riderBalanceRepo.create({ riderId: 'rider-dup', userId: 'user-r3' })),
      ).rejects.toThrow();
    });

    it('updates pending and cleared balances correctly', async () => {
      const balance = await riderBalanceRepo.save(
        riderBalanceRepo.create({ riderId: 'rider-earn', userId: 'user-r4' }),
      );

      // Rider completes a delivery — fee goes to pending
      balance.pendingPesewas += 800;
      balance.feesEarnedPesewas += 800;
      await riderBalanceRepo.save(balance);

      // Clearing window passes — pending becomes cleared
      balance.clearedPesewas += balance.pendingPesewas;
      balance.pendingPesewas = 0;
      await riderBalanceRepo.save(balance);

      const updated = await riderBalanceRepo.findOne({ where: { riderId: 'rider-earn' } });
      expect(updated!.clearedPesewas).toBe(800);
      expect(updated!.pendingPesewas).toBe(0);
      expect(updated!.feesEarnedPesewas).toBe(800);
    });

    it('tracks withdrawable balance: cleared minus locked', async () => {
      const balance = await riderBalanceRepo.save(
        riderBalanceRepo.create({
          riderId: 'rider-withdraw',
          userId: 'user-r5',
          clearedPesewas: 50000,
          lockedPesewas: 5000,
          cashOwedPesewas: 0,
        }),
      );

      // Withdrawable = cleared - locked - cashOwed
      const withdrawable = balance.clearedPesewas - balance.lockedPesewas - balance.cashOwedPesewas;
      expect(withdrawable).toBe(45000);
    });
  });

  // ── VendorBalance entity ──────────────────────────────────────────

  describe('VendorBalance entity', () => {
    it('creates and updates a vendor balance record', async () => {
      const balance = await vendorBalanceRepo.save(
        vendorBalanceRepo.create({ vendorId: 'vendor-new' }),
      );

      expect(balance.vendorId).toBe('vendor-new');

      // Vendor earns from a completed order
      balance.accruedPesewas = 4000;
      await vendorBalanceRepo.save(balance);

      const updated = await vendorBalanceRepo.findOne({ where: { vendorId: 'vendor-new' } });
      expect(updated!.accruedPesewas).toBe(4000);
    });
  });
});
