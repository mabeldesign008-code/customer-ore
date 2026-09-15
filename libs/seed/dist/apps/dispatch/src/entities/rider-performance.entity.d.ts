import { PerformanceEngineConfig, PerformanceEngineResult } from '@ore/contracts';
export declare class RiderPerformanceConfig {
    id: string;
    name: string;
    version: number;
    reviewPeriod: string;
    active: boolean;
    configJson: PerformanceEngineConfig;
    createdBy: string;
    approvedBy: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
}
export declare class RiderPerformanceRecord {
    id: string;
    riderId: string;
    periodStart: Date;
    periodEnd: Date;
    configVersion: number;
    configId: string | null;
    reviewerId: string | null;
    overallScore: number | null;
    grade: string | null;
    status: string;
    trend: string;
    insufficientData: boolean;
    resultJson: PerformanceEngineResult;
    metricCategories: string[] | null;
    incidentTypes: string[] | null;
    actionCodes: string[] | null;
    outcome: string | null;
    recordType: 'REVIEW' | 'CORRECTION' | 'APPEAL' | 'REVERSAL';
    linkedRecordId: string | null;
    notes: string | null;
    createdAt: Date;
}
export declare class RiderPerformanceAudit {
    id: string;
    riderId: string | null;
    action: string;
    actorId: string;
    recordId: string | null;
    payloadJson: Record<string, unknown> | null;
    reason: string | null;
    createdAt: Date;
}
//# sourceMappingURL=rider-performance.entity.d.ts.map