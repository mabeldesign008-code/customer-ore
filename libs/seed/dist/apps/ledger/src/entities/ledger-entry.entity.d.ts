/** Double-entry-ish ledger line: every order creates account debits/credits (G28). */
export declare class LedgerEntry {
    id: string;
    orderId: string | null;
    account: string;
    debitPesewas: number;
    creditPesewas: number;
    ref: string | null;
    /**
     * Replay guard for money movements (audit P0): the deterministic business key of the
     * batch this row belongs to (`delivered:<orderId>`, `charge:<orderId>`, …). NOT unique
     * here — every leg of one batch shares the key; uniqueness lives in ledger_idempotency
     * (one row per batch), which is what makes at-least-once event delivery unable to
     * double-post, even across restarts.
     */
    idempotencyKey: string | null;
    metaJson: Record<string, unknown> | null;
    createdAt: Date;
}
//# sourceMappingURL=ledger-entry.entity.d.ts.map