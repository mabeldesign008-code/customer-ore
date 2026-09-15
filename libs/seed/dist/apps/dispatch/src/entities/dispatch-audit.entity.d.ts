/** Dispatch audit log — doc §15: every pool, wave, score, accept, decline, timeout,
 *  radius expansion, assignment lock, and admin override is recorded. */
export declare class DispatchAudit {
    id: string;
    orderId: string;
    riderId: string | null;
    eventType: string;
    detailJson: Record<string, unknown> | null;
    createdAt: Date;
}
//# sourceMappingURL=dispatch-audit.entity.d.ts.map