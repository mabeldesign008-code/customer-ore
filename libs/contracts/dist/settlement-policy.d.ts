/** Pure doc §4 vendor-settlement rules — no DB access, unit-testable.
 *  Weekly cycle (Mon cutoff), min GHS 100, rolling reserve, negative-balance offset,
 *  daily payout cap GHS 10,000. Kept in @ore/contracts (shared, single source of truth). */
export interface SettlementPlanInput {
    grossPesewas: number;
    owedPesewas: number;
    reservePct: number;
    minPesewas: number;
}
export interface SettlementPlan {
    eligible: boolean;
    netPesewas: number;
    debtAppliedPesewas: number;
    reservePesewas: number;
    payoutPesewas: number;
}
/** Doc §4: pay debt first, hold rolling reserve, settle the rest; below min → roll over. */
export declare function vendorSettlementPlan(input: SettlementPlanInput): SettlementPlan;
/** Doc §4 daily cap (GHS 10,000) — a payout larger than the cap splits into per-day chunks. */
export declare function payoutChunks(payoutPesewas: number, dailyCapPesewas: number): number[];
/** Monday 00:00 UTC boundary — settlement cycle end (doc §4: Monday cutoff, Sunday close). */
export declare function mondayBoundary(at: Date): Date;
//# sourceMappingURL=settlement-policy.d.ts.map