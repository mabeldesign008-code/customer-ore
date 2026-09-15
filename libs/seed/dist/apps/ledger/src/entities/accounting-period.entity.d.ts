/**
 * A closed accounting period.
 *
 * Once a month is closed, nothing may post into it — not a correction, not a "quick fix",
 * not a re-run of a settlement that was late. That is the whole point: a statement already
 * given to an accountant or filed with an authority must keep meaning the same thing. A
 * correction to a closed month is made **in the current month** as an adjusting entry that
 * names the period it corrects, so the history stays readable and the original still adds up.
 *
 * Unique on (year, month) so two admins racing to close the same month produce one row.
 */
export declare class AccountingPeriod {
    id: string;
    year: number;
    /** 1-12. */
    month: number;
    label: string;
    lockedBy: string | null;
    reason: string | null;
    /** Snapshot of the trial balance at lock time, so "what did we report?" is answerable
     *  forever even if the underlying rows are later disputed. */
    trialBalanceJson: Record<string, unknown>[] | null;
    netDebitPesewas: number;
    netCreditPesewas: number;
    /** True only if debits equalled credits at lock time. A period locked out of balance is
     *  still locked — you cannot un-report it — but it is flagged so it gets chased. */
    balanced: boolean;
    lockedAt: Date;
}
//# sourceMappingURL=accounting-period.entity.d.ts.map