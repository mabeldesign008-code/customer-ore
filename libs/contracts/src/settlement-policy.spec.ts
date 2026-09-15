/** Doc §4 vendor settlement rules — pure unit tests. */
import { mondayBoundary, payoutChunks, vendorSettlementPlan } from './settlement-policy';

describe('vendor settlement policy (doc §4)', () => {
  it('pays debt first, holds rolling reserve, settles the rest', () => {
    const plan = vendorSettlementPlan({ grossPesewas: 100_000, owedPesewas: 10_000, reservePct: 10, minPesewas: 10_000 });
    expect(plan).toEqual({ eligible: true, netPesewas: 90_000, debtAppliedPesewas: 10_000, reservePesewas: 9_000, payoutPesewas: 81_000 });
  });

  it('below min GHS 100 → ineligible, rolls over (no payout, no reserve)', () => {
    const plan = vendorSettlementPlan({ grossPesewas: 9_000, owedPesewas: 0, reservePct: 10, minPesewas: 10_000 });
    expect(plan).toMatchObject({ eligible: false, netPesewas: 9_000, payoutPesewas: 0, reservePesewas: 0 });
  });

  it('exactly min is eligible', () => {
    const plan = vendorSettlementPlan({ grossPesewas: 10_000, owedPesewas: 0, reservePct: 10, minPesewas: 10_000 });
    expect(plan.eligible).toBe(true);
    expect(plan.payoutPesewas).toBe(9_000);
  });

  it('debt can swallow the whole cycle (negative balance persists)', () => {
    const plan = vendorSettlementPlan({ grossPesewas: 5_000, owedPesewas: 9_000, reservePct: 10, minPesewas: 10_000 });
    expect(plan).toMatchObject({ eligible: false, debtAppliedPesewas: 5_000, netPesewas: 0 });
  });

  it('daily cap GHS 10,000 splits large payouts into per-day chunks', () => {
    expect(payoutChunks(81_000, 100_000)).toEqual([81_000]);
    expect(payoutChunks(250_000, 100_000)).toEqual([100_000, 100_000, 50_000]);
    expect(payoutChunks(0, 100_000)).toEqual([]);
  });

  it('monday boundary gives the settlement cycle window (Mon cutoff)', () => {
    // 2026-08-10 is a Monday — a settlement run that day covers the week ending Sunday 08-09
    expect(mondayBoundary(new Date('2026-08-10T15:30:00Z')).toISOString()).toBe('2026-08-10T00:00:00.000Z');
    // Sunday 2026-08-09 belongs to the week that started Mon 08-03
    expect(mondayBoundary(new Date('2026-08-09T23:59:00Z')).toISOString()).toBe('2026-08-03T00:00:00.000Z');
    // Wednesday mid-week → its Monday
    expect(mondayBoundary(new Date('2026-08-12T10:00:00Z')).toISOString()).toBe('2026-08-10T00:00:00.000Z');
  });
});
