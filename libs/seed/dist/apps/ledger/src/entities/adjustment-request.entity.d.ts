/**
 * A proposed ledger adjustment, waiting for Finance to execute it.
 *
 * Accounting can see everything and is the role that notices a balance is wrong, but it must
 * not be able to move money — `accounting.adjustment.propose` is a `W` while the actual
 * write is a Finance action. That separation is the point: the person who spots the error is
 * not the person who corrects it, so a correction is always a second pair of eyes.
 *
 * An adjustment is a *reversing entry*, never an edit. The ledger is append-only; correcting
 * a mistake means posting the opposite of it in the current period and saying which entry it
 * reverses. `reversesRef` makes that link explicit and is what stops the same mistake being
 * "corrected" twice.
 */
export type AdjustmentStatus = 'PROPOSED' | 'APPROVED' | 'EXECUTED' | 'REJECTED' | 'CANCELLED';
export declare class AdjustmentRequest {
    id: string;
    /** Short human reference, e.g. `ADJ-00001`. */
    ref: string | null;
    status: AdjustmentStatus;
    proposedBy: string | null;
    decidedBy: string | null;
    /** Why. Mandatory and audited — an unexplained adjustment is indistinguishable from theft. */
    reason: string;
    /** The entry this reverses, if it reverses one. */
    reversesRef: string | null;
    orderId: string | null;
    /** The balanced legs to post, frozen at proposal time. */
    entriesJson: {
        account: string;
        debitPesewas: number;
        creditPesewas: number;
    }[];
    amountPesewas: number;
    /** The period the mistake belongs to. Posting still happens now; this records where it
     *  came from so the current month's statement can explain the entry. */
    correctsPeriod: string | null;
    /** Dual-control idempotency key. Unique, so a replay after a crash cannot post twice. */
    executionRef: string | null;
    executionNote: string | null;
    createdAt: Date;
    decidedAt: Date | null;
    executedAt: Date | null;
}
//# sourceMappingURL=adjustment-request.entity.d.ts.map