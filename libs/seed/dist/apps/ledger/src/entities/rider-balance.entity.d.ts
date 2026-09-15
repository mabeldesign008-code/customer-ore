/** Rider wallet — doc §5: Pending / Available (cleared) / Locked / Cash Liability.
 *  available payout = cleared − COD cash owed − locked (penalties/holds), never negative. */
export declare class RiderBalance {
    id: string;
    riderId: string;
    userId: string | null;
    pendingPesewas: number;
    clearedPesewas: number;
    lockedPesewas: number;
    cashOwedPesewas: number;
    feesEarnedPesewas: number;
    remittedPesewas: number;
    clearsAt: Date | null;
    withdrawalDay: string | null;
    withdrawnTodayPesewas: number;
    withdrawalsTodayCount: number;
    version: number;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=rider-balance.entity.d.ts.map