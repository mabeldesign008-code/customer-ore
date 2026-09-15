/**
 * A fraud flag: a suspicion, recorded.
 *
 * WHY A FLAG IS NOT AN ACTION
 * A flag changes nothing by itself — it does not suspend, does not hold, does not refund. It is
 * the observation, and the actions are separate, dual-controlled decisions that reference it.
 * Conflating them is how a suspicion becomes a punishment with no decision recorded anywhere,
 * which is both unfair to the user and indefensible for the platform.
 *
 * WHY IT CARRIES THE EVIDENCE
 * `evidenceJson` holds the observable facts (order ids, amounts, timings) rather than a
 * narrative. Six months later, the person reviewing whether the flag was justified needs the
 * data, not the mood of whoever raised it.
 */
export type FraudFlagStatus = 'OPEN' | 'INVESTIGATING' | 'CONFIRMED' | 'DISMISSED';
export type FraudFlagSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export declare class FraudFlag {
    id: string;
    targetType: 'CUSTOMER' | 'RIDER' | 'VENDOR' | 'ORDER' | 'PAYMENT';
    targetId: string;
    severity: FraudFlagSeverity;
    /** Short machine-ish label so flags can be grouped: COD_MISMATCH, STOLEN_CARD, MULTI_ACCOUNT… */
    category: string;
    reason: string;
    evidenceJson: Record<string, unknown> | null;
    status: FraudFlagStatus;
    /** 'MANUAL' for a person, or the name of the rule/service that raised it. */
    raisedBy: string;
    assignedTo: string | null;
    resolvedBy: string | null;
    resolvedAt: Date | null;
    /** Required on CONFIRMED and DISMISSED: a conclusion with no reasoning cannot be reviewed. */
    resolutionNote: string | null;
    /** The hold placed because of this flag, if one was. Lifting the flag should surface it. */
    holdId: string | null;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=fraud-flag.entity.d.ts.map