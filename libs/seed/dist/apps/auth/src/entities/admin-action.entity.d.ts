/**
 * The central admin audit log. APPEND-ONLY.
 *
 * Before this table existed there was no queryable record of who moved money, who
 * approved a withdrawal, or who force-transitioned an order — the services threaded an
 * `adminUserId` into ledger refs, and since there was only ever one shared admin account
 * even that was meaningless.
 *
 * There is deliberately no update path and no delete path anywhere in the codebase for
 * this table. Same treatment as `ledger_entry`, `support_escalation` and
 * `support_tool_audit`.
 */
export declare class AdminAction {
    id: string;
    actorUserId: string | null;
    /** The role the actor held at the time. Recorded, not joined — roles change. */
    actorAdminRole: string | null;
    permission: string | null;
    /** allow | deny */
    decision: string;
    reason: string | null;
    service: string | null;
    method: string | null;
    path: string | null;
    resourceType: string | null;
    resourceId: string | null;
    /** Set on money actions so "everything above GHS X today" is one indexed query. */
    amountPesewas: number | null;
    beforeJson: Record<string, unknown> | null;
    afterJson: Record<string, unknown> | null;
    /**
     * True when the permission decision fell back to the JWT because the auth service was
     * unreachable. Lets you reconstruct exactly which window ran degraded.
     */
    degraded: boolean;
    ip: string | null;
    userAgent: string | null;
    traceId: string | null;
    createdAt: Date;
}
//# sourceMappingURL=admin-action.entity.d.ts.map