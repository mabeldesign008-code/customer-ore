/**
 * A hold: a temporary, scoped stop on one kind of activity for one party.
 *
 * WHY A HOLD IS NOT A SUSPENSION
 * `user.status = SUSPENDED` stops everything and is visible to the customer as a dead account.
 * Most real situations are narrower: a rider whose COD cash does not reconcile should not
 * withdraw until it does, but there is no reason to stop them delivering. A hold carries a
 * `scope` so the smallest effective restriction can be applied, which matters because the
 * cost of over-restricting is a person who cannot earn.
 *
 * WHY IT IS ITS OWN TABLE RATHER THAN COLUMNS ON `user`
 * A hold is placed, lifted, and sometimes re-placed, and every one of those needs to be
 * attributable later. Columns on `user` would keep only the latest, and "who stopped this
 * rider from withdrawing, and why" would be unanswerable. It also covers riders and vendors,
 * which do not live in this table's `user` row shape at all.
 */
export type HoldTargetType = 'CUSTOMER' | 'RIDER' | 'VENDOR';
/**
 * What the hold stops.
 * `WITHDRAWAL` blocks payouts only. `ORDER` blocks new orders only. `ALL` blocks both.
 * Kept as a closed set: an open-ended scope string is how a hold ends up meaning nothing.
 */
export type HoldScope = 'WITHDRAWAL' | 'ORDER' | 'ALL';
export declare class ComplianceHold {
    id: string;
    targetType: HoldTargetType;
    /** The party's id: a user id for CUSTOMER, a rider id for RIDER, a vendor id for VENDOR. */
    targetId: string;
    scope: HoldScope;
    /** Mandatory. A hold with no reason is unauditable and, in a dispute, indefensible. */
    reason: string;
    status: 'ACTIVE' | 'LIFTED' | 'EXPIRED';
    /** Optional end date. Null means it stays until someone lifts it. */
    until: Date | null;
    placedBy: string | null;
    liftedBy: string | null;
    liftedAt: Date | null;
    liftNote: string | null;
    /** Set when the hold came from a fraud flag, so lifting one can be tied back to it. */
    fraudFlagId: string | null;
    createdAt: Date;
}
//# sourceMappingURL=compliance-hold.entity.d.ts.map