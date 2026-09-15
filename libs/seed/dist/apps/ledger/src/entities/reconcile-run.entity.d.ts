/** Daily reconciliation report (G28/G30). */
export declare class ReconcileRun {
    id: string;
    period: string;
    status: 'RUNNING' | 'MATCHED' | 'FLAGGED';
    reportJson: Record<string, unknown> | null;
    createdAt: Date;
}
//# sourceMappingURL=reconcile-run.entity.d.ts.map