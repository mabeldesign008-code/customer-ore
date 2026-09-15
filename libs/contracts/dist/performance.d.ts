/**
 * Configurable performance-score engine shared by Vendor and Rider domains.
 *
 * The extract requires repeatable formulas, admin-configurable metric/category
 * weights, minimum data thresholds, attribution/exclusion rules, grade bands,
 * trend rules and triggerable actions. Keep that policy out of service code:
 * services provide measured facts; this module applies the selected config and
 * returns an explainable 0-100 scorecard.
 */
export type PerformanceSubject = 'VENDOR' | 'RIDER';
export type PerformanceReviewPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'CUSTOM';
export type PerformanceMetricCategory = 'OPERATIONS' | 'CUSTOMER_EXPERIENCE' | 'COMPLIANCE' | 'QUALITY' | 'FINANCIAL' | 'SAFETY';
export type PerformanceMetricFormula = 'RATE_GTE_TARGET' | 'RATE_LTE_TARGET' | 'AVERAGE_GTE_TARGET' | 'AVERAGE_LTE_TARGET' | 'COUNT_LTE_TARGET' | 'MANUAL_0_100';
export type PerformanceStatus = 'EXCELLENT' | 'GOOD' | 'MONITOR' | 'WARNING' | 'PIP' | 'RESTRICTED' | 'SUSPENDED' | 'INSUFFICIENT_DATA';
export type PerformanceTrendStatus = 'IMPROVING' | 'STABLE' | 'DECLINING' | 'NEW' | 'INSUFFICIENT_DATA';
export type PerformanceAttribution = 'RESPONSIBLE' | 'CUSTOMER' | 'VENDOR' | 'RIDER' | 'PLATFORM' | 'WEATHER' | 'THIRD_PARTY' | 'UNKNOWN';
export interface PerformanceMetricConfig {
    code: string;
    label: string;
    category: PerformanceMetricCategory;
    weight: number;
    formula: PerformanceMetricFormula;
    target: number;
    minimumSampleSize?: number;
    enabled?: boolean;
    /**
     * For average formulas where target is on a non-100 scale, e.g. customer
     * rating target 4.5 on a 5-star scale.
     */
    maxValue?: number;
    /** Exclude metric events carrying any of these exclusion reason codes. */
    exclusionCodes?: string[];
    /** Only responsible/unknown causes count unless the config explicitly opts out. */
    attribution?: {
        impactWhenResponsibleOnly?: boolean;
        excludedCauses?: PerformanceAttribution[];
    };
}
export interface PerformanceGradeBand {
    grade: string;
    minScore: number;
    maxScore?: number;
    status: PerformanceStatus;
}
export interface PerformanceActionRule {
    code: string;
    action: 'NO_ACTION' | 'WARNING' | 'PIP' | 'RESTRICTION' | 'SUSPENSION' | 'AUDIT_REVIEW' | 'MANUAL_REVIEW';
    whenStatusIn?: PerformanceStatus[];
    whenScoreBelow?: number;
    whenMetricBelow?: {
        metricCode: string;
        scoreBelow: number;
    };
    requiresAudit?: boolean;
    requiresApproval?: boolean;
    restrictionCode?: string;
    durationDays?: number;
}
export interface PerformanceTrendRule {
    improvingDelta?: number;
    decliningDelta?: number;
    reviewPeriods?: number;
}
export interface PerformanceEngineConfig {
    subject: PerformanceSubject;
    version: number;
    reviewPeriod: PerformanceReviewPeriod;
    minimumTotalSampleSize?: number;
    metrics: PerformanceMetricConfig[];
    gradeBands: PerformanceGradeBand[];
    categoryWeights?: Partial<Record<PerformanceMetricCategory, number>>;
    trendRules?: PerformanceTrendRule;
    actionRules?: PerformanceActionRule[];
    auditRequiredActions?: string[];
}
export interface PerformanceMetricInput {
    code: string;
    /** numerator/denominator for RATE_* formulas. */
    numerator?: number;
    denominator?: number;
    /** measured average/count/manual score value, depending on formula. */
    value?: number;
    sampleSize?: number;
    category?: PerformanceMetricCategory;
    /** If false, the event has been adjudicated away from this subject. */
    attributed?: boolean;
    attribution?: PerformanceAttribution;
    exclusionCode?: string | null;
    incidentType?: string | null;
    notes?: string;
}
export interface PerformanceMetricScore {
    code: string;
    label: string;
    category: PerformanceMetricCategory;
    weight: number;
    formula: PerformanceMetricFormula;
    target: number;
    actual: number | null;
    sampleSize: number;
    score: number | null;
    insufficientData: boolean;
    excluded: boolean;
    attribution: PerformanceAttribution | null;
    incidentType?: string | null;
    reason?: string;
}
export interface PerformanceEngineResult {
    subject: PerformanceSubject;
    configVersion: number;
    reviewPeriod: PerformanceReviewPeriod;
    overallScore: number | null;
    grade: string | null;
    status: PerformanceStatus;
    trend: PerformanceTrendStatus;
    insufficientData: boolean;
    totalSampleSize: number;
    metricScores: PerformanceMetricScore[];
    categoryScores: Array<{
        category: PerformanceMetricCategory;
        score: number | null;
        weight: number;
        insufficientData: boolean;
    }>;
    triggeredActions: Array<PerformanceActionRule & {
        reason: string;
    }>;
}
export declare const DEFAULT_GRADE_BANDS: PerformanceGradeBand[];
export declare const DEFAULT_VENDOR_PERFORMANCE_CONFIG: PerformanceEngineConfig;
export declare const DEFAULT_RIDER_PERFORMANCE_CONFIG: PerformanceEngineConfig;
export declare function scorePerformance(input: {
    config: PerformanceEngineConfig;
    metrics: PerformanceMetricInput[];
    previousScores?: number[];
}): PerformanceEngineResult;
//# sourceMappingURL=performance.d.ts.map