/**
 * The chart of accounts: our internal account names mapped to the codes an accountant uses.
 *
 * The ledger posts to names like `platform_revenue` and `pending_rider_payable`. Those are
 * implementation names — they say what the code did, not what the money is. An accountant
 * filing this needs `4100 Revenue — delivery commission`. Without this table the export is
 * a list of internal identifiers and the person reconciling it has to guess, which is how a
 * mis-mapped liability ends up on the wrong side of the balance sheet.
 *
 * `nature` matters more than it looks: it is what decides whether a balance is an asset, a
 * liability or income, and therefore which side of the trial balance it belongs on. Getting
 * it wrong does not change the numbers, it changes what they mean.
 */
export type AccountNature = 'ASSET' | 'LIABILITY' | 'REVENUE' | 'EXPENSE' | 'CONTROL';
export declare class ChartAccount {
    id: string;
    /** The internal ledger account name. This is the join key to `ledger_entry.account`. */
    name: string;
    /** The accountant's code, e.g. `4100`. Unique so a code cannot be reused across accounts. */
    code: string;
    /** Human label used on statements and exports. */
    label: string;
    nature: AccountNature;
    /**
     * Normal balance side. A liability increases on credit, an asset on debit. The trial
     * balance uses this to report a signed balance rather than forcing the reader to know
     * the convention.
     */
    normalSide: 'DEBIT' | 'CREDIT';
    /** Set for accounts whose balance must be zero at a period end (clearing/suspense). */
    mustNetToZero: boolean;
    /** Free-text note for the accountant. Why this mapping exists is worth writing down. */
    note: string | null;
    updatedBy: string | null;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=chart-account.entity.d.ts.map