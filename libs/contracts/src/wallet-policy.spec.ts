/** Doc §5 wallet rules — pure unit tests. */
import {
  codEscalationStep,
  codLimitDecision,
  codLimitPesewas,
  codTierFor,
  nextCodTier,
  withdrawablePesewas,
  withdrawalPlan,
  WithdrawalPlan,
} from './wallet-policy';
import { RiderCodStatus, RiderCodTier } from './enums';

const cfg = { newLimitPesewas: 100000, experiencedLimitPesewas: 300000, seniorLimitPesewas: 500000, experiencedDeliveries: 50, seniorDeliveries: 200 };

describe('wallet-policy', () => {
  it('tiers by completed deliveries and never demotes', () => {
    expect(codTierFor(0, cfg)).toBe(RiderCodTier.NEW);
    expect(codTierFor(49, cfg)).toBe(RiderCodTier.NEW);
    expect(codTierFor(50, cfg)).toBe(RiderCodTier.EXPERIENCED);
    expect(codTierFor(200, cfg)).toBe(RiderCodTier.SENIOR);
    expect(nextCodTier(RiderCodTier.NEW, 10, cfg)).toBeNull();
    expect(nextCodTier(RiderCodTier.NEW, 60, cfg)).toBe(RiderCodTier.EXPERIENCED);
    expect(nextCodTier(RiderCodTier.EXPERIENCED, 250, cfg)).toBe(RiderCodTier.SENIOR);
    expect(nextCodTier(RiderCodTier.SENIOR, 0, cfg)).toBeNull(); // no demotion
  });

  it('maps tier → limit (GHS 1,000 / 3,000 / 5,000)', () => {
    expect(codLimitPesewas(RiderCodTier.NEW, cfg)).toBe(100000);
    expect(codLimitPesewas(RiderCodTier.EXPERIENCED, cfg)).toBe(300000);
    expect(codLimitPesewas(RiderCodTier.SENIOR, cfg)).toBe(500000);
  });

  it('blocks at 90% of limit, unblocks below 70% (hysteresis)', () => {
    const d = (outstanding: number, currentlyBlocked = false) =>
      codLimitDecision({ outstandingPesewas: outstanding, tierLimitPesewas: 100000, triggerPct: 90, unblockPct: 70, currentlyBlocked });
    expect(d(89_999).shouldBlock).toBe(false);
    expect(d(90_000).shouldBlock).toBe(true);
    expect(d(100_000).shouldBlock).toBe(true);
    // not currently blocked → no unblock event
    expect(d(50_000).shouldUnblock).toBe(false);
    // blocked → unblocks only below 70,000
    expect(d(70_000, true).shouldUnblock).toBe(false);
    expect(d(69_999, true).shouldUnblock).toBe(true);
    expect(d(95_000, true).shouldUnblock).toBe(false);
  });

  it('escalates COD debt: 24h warn → 48h suspend → 72h investigate → >72h terminate', () => {
    const t = { warningH: 24, suspendH: 48, investigateH: 72, terminateH: 72 };
    expect(codEscalationStep(10, t)).toBe(RiderCodStatus.CLEAR);
    expect(codEscalationStep(24, t)).toBe(RiderCodStatus.WARNING);
    expect(codEscalationStep(47.9, t)).toBe(RiderCodStatus.WARNING);
    expect(codEscalationStep(48, t)).toBe(RiderCodStatus.SUSPENDED);
    expect(codEscalationStep(72, t)).toBe(RiderCodStatus.INVESTIGATION);
    expect(codEscalationStep(72.1, t)).toBe(RiderCodStatus.TERMINATED);
  });

  it('withdrawable = cleared − COD − locked, never negative', () => {
    expect(withdrawablePesewas(1000, 400, 0)).toBe(600);
    expect(withdrawablePesewas(1000, 400, 100)).toBe(500);
    expect(withdrawablePesewas(300, 400, 0)).toBe(0); // under water → 0
    expect(withdrawablePesewas(0, 0, 0)).toBe(0);
  });

  const base = {
    clearedPesewas: 100_000,
    cashOwedPesewas: 0,
    lockedPesewas: 0,
    today: '2026-08-10',
    withdrawalDay: null,
    withdrawnTodayPesewas: 0,
    withdrawalsTodayCount: 0,
    freePerDay: 1,
    feePesewas: 200,
    minPesewas: 5_000,
    dailyCapPesewas: 200_000,
  };

  it('withdrawal: min GHS 50 enforced', () => {
    const p = withdrawalPlan({ ...base, amountPesewas: 4_999 }) as WithdrawalPlan;
    expect(p).toMatchObject({ ok: false, reason: 'below_min' });
  });

  it('withdrawal: first of the day is free, second costs GHS 2', () => {
    const first = withdrawalPlan({ ...base, amountPesewas: 5_000 }) as WithdrawalPlan & { ok: true };
    expect(first.ok).toBe(true);
    expect(first.feePesewas).toBe(0);

    const second = withdrawalPlan({
      ...base,
      amountPesewas: 5_000,
      withdrawalDay: '2026-08-10',
      withdrawnTodayPesewas: 5_000,
      withdrawalsTodayCount: 1,
    }) as WithdrawalPlan & { ok: true };
    expect(second.ok).toBe(true);
    expect(second.feePesewas).toBe(200);
  });

  it('withdrawal: daily cap GHS 2,000', () => {
    const p = withdrawalPlan({
      ...base,
      amountPesewas: 200_000,
      withdrawalDay: '2026-08-10',
      withdrawnTodayPesewas: 100,
      withdrawalsTodayCount: 1,
    }) as WithdrawalPlan;
    expect(p).toMatchObject({ ok: false, reason: 'exceeds_cap' });
  });

  it('withdrawal: new day resets window and free count', () => {
    const p = withdrawalPlan({
      ...base,
      amountPesewas: 5_000,
      withdrawalDay: '2026-08-09', // yesterday
      withdrawnTodayPesewas: 190_000,
      withdrawalsTodayCount: 5,
    }) as WithdrawalPlan & { ok: true };
    expect(p.ok).toBe(true);
    expect(p.feePesewas).toBe(0);
    expect(p.withdrawnTodayPesewas).toBe(5_000);
    expect(p.withdrawalsTodayCount).toBe(1);
  });

  it('withdrawal: insufficient when cleared − COD − locked < amount + fee', () => {
    const p = withdrawalPlan({ ...base, clearedPesewas: 4_999, amountPesewas: 5_000 }) as WithdrawalPlan;
    expect(p).toMatchObject({ ok: false, reason: 'insufficient' });
    // exact balance is allowed (withdrawable = need)
    const exact = withdrawalPlan({ ...base, clearedPesewas: 5_000, amountPesewas: 5_000 }) as WithdrawalPlan & { ok: true };
    expect(exact.ok).toBe(true);
    // COD liability reduces the available base (amount stays ≥ min so 'insufficient' is the reason)
    const p2 = withdrawalPlan({
      ...base,
      clearedPesewas: 5_000,
      cashOwedPesewas: 2_000,
      amountPesewas: 5_000,
    }) as WithdrawalPlan;
    expect(p2).toMatchObject({ ok: false, reason: 'insufficient' });
    const p3 = withdrawalPlan({ ...base, clearedPesewas: 5_200, amountPesewas: 5_000, withdrawalDay: '2026-08-10', withdrawalsTodayCount: 1, withdrawnTodayPesewas: 0 }) as WithdrawalPlan & { ok: true };
    expect(p3.ok).toBe(true); // 5,200 covers 5,000 + 200 fee
    expect(p3.feePesewas).toBe(200);
  });
});
