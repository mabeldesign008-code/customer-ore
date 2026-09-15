"use strict";
/**
 * Configurable performance-score engine shared by Vendor and Rider domains.
 *
 * The extract requires repeatable formulas, admin-configurable metric/category
 * weights, minimum data thresholds, attribution/exclusion rules, grade bands,
 * trend rules and triggerable actions. Keep that policy out of service code:
 * services provide measured facts; this module applies the selected config and
 * returns an explainable 0-100 scorecard.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_RIDER_PERFORMANCE_CONFIG = exports.DEFAULT_VENDOR_PERFORMANCE_CONFIG = exports.DEFAULT_GRADE_BANDS = void 0;
exports.scorePerformance = scorePerformance;
exports.DEFAULT_GRADE_BANDS = [
    { grade: 'A', minScore: 90, maxScore: 100, status: 'EXCELLENT' },
    { grade: 'B', minScore: 80, maxScore: 89.99, status: 'GOOD' },
    { grade: 'C', minScore: 70, maxScore: 79.99, status: 'MONITOR' },
    { grade: 'D', minScore: 60, maxScore: 69.99, status: 'WARNING' },
    { grade: 'E', minScore: 50, maxScore: 59.99, status: 'PIP' },
    { grade: 'F', minScore: 0, maxScore: 49.99, status: 'RESTRICTED' },
];
exports.DEFAULT_VENDOR_PERFORMANCE_CONFIG = {
    subject: 'VENDOR',
    version: 1,
    reviewPeriod: 'MONTHLY',
    minimumTotalSampleSize: 5,
    metrics: [
        { code: 'acceptance_rate', label: 'Order acceptance rate', category: 'OPERATIONS', weight: 20, formula: 'RATE_GTE_TARGET', target: 0.95, minimumSampleSize: 5 },
        { code: 'prep_time_met_rate', label: 'Preparation time met', category: 'OPERATIONS', weight: 20, formula: 'RATE_GTE_TARGET', target: 0.9, minimumSampleSize: 5 },
        { code: 'cancellation_rate', label: 'Vendor-attributed cancellations', category: 'QUALITY', weight: 15, formula: 'RATE_LTE_TARGET', target: 0.03, minimumSampleSize: 5 },
        { code: 'customer_rating', label: 'Customer rating', category: 'CUSTOMER_EXPERIENCE', weight: 20, formula: 'AVERAGE_GTE_TARGET', target: 4.3, maxValue: 5, minimumSampleSize: 3 },
        { code: 'serious_incidents', label: 'Serious vendor-attributed incidents', category: 'COMPLIANCE', weight: 25, formula: 'COUNT_LTE_TARGET', target: 0, minimumSampleSize: 1 },
    ],
    gradeBands: exports.DEFAULT_GRADE_BANDS,
    categoryWeights: { OPERATIONS: 40, QUALITY: 15, CUSTOMER_EXPERIENCE: 20, COMPLIANCE: 25 },
    trendRules: { improvingDelta: 5, decliningDelta: -5, reviewPeriods: 2 },
    actionRules: [
        { code: 'vendor_warning', action: 'WARNING', whenStatusIn: ['WARNING'], requiresAudit: true },
        { code: 'vendor_pip', action: 'PIP', whenStatusIn: ['PIP'], requiresAudit: true, requiresApproval: true },
        { code: 'vendor_restrict', action: 'RESTRICTION', whenStatusIn: ['RESTRICTED'], restrictionCode: 'ORDER_VISIBILITY_REVIEW', requiresAudit: true, requiresApproval: true },
        { code: 'vendor_suspend_review', action: 'MANUAL_REVIEW', whenMetricBelow: { metricCode: 'serious_incidents', scoreBelow: 100 }, requiresAudit: true, requiresApproval: true },
    ],
    auditRequiredActions: ['WARNING', 'PIP', 'RESTRICTION', 'SUSPENSION', 'MANUAL_REVIEW'],
};
exports.DEFAULT_RIDER_PERFORMANCE_CONFIG = {
    subject: 'RIDER',
    version: 1,
    reviewPeriod: 'MONTHLY',
    minimumTotalSampleSize: 5,
    metrics: [
        { code: 'offer_acceptance_rate', label: 'Offer acceptance rate', category: 'OPERATIONS', weight: 20, formula: 'RATE_GTE_TARGET', target: 0.8, minimumSampleSize: 5 },
        { code: 'assignment_completion_rate', label: 'Assignment completion rate', category: 'OPERATIONS', weight: 25, formula: 'RATE_GTE_TARGET', target: 0.95, minimumSampleSize: 3 },
        { code: 'on_time_rate', label: 'On-time delivery rate', category: 'QUALITY', weight: 20, formula: 'RATE_GTE_TARGET', target: 0.9, minimumSampleSize: 3 },
        { code: 'customer_rating', label: 'Customer rating', category: 'CUSTOMER_EXPERIENCE', weight: 15, formula: 'AVERAGE_GTE_TARGET', target: 4.4, maxValue: 5, minimumSampleSize: 3 },
        { code: 'serious_incidents', label: 'Serious rider-attributed incidents', category: 'SAFETY', weight: 20, formula: 'COUNT_LTE_TARGET', target: 0, minimumSampleSize: 1 },
    ],
    gradeBands: exports.DEFAULT_GRADE_BANDS,
    categoryWeights: { OPERATIONS: 45, QUALITY: 20, CUSTOMER_EXPERIENCE: 15, SAFETY: 20 },
    trendRules: { improvingDelta: 5, decliningDelta: -5, reviewPeriods: 2 },
    actionRules: [
        { code: 'rider_warning', action: 'WARNING', whenStatusIn: ['WARNING'], requiresAudit: true },
        { code: 'rider_pip', action: 'PIP', whenStatusIn: ['PIP'], requiresAudit: true, requiresApproval: true },
        { code: 'rider_restrict', action: 'RESTRICTION', whenStatusIn: ['RESTRICTED'], restrictionCode: 'OFFER_ELIGIBILITY_REVIEW', requiresAudit: true, requiresApproval: true },
        { code: 'rider_serious_incident_review', action: 'MANUAL_REVIEW', whenMetricBelow: { metricCode: 'serious_incidents', scoreBelow: 100 }, requiresAudit: true, requiresApproval: true },
    ],
    auditRequiredActions: ['WARNING', 'PIP', 'RESTRICTION', 'SUSPENSION', 'MANUAL_REVIEW'],
};
function scorePerformance(input) {
    const config = normalizeConfig(input.config);
    const measurements = new Map(input.metrics.map((metric) => [metric.code, metric]));
    const metricScores = config.metrics.map((metric) => scoreMetric(config.subject, metric, measurements.get(metric.code)));
    const included = metricScores.filter((metric) => !metric.insufficientData && !metric.excluded && metric.score !== null);
    const totalSampleSize = metricScores.reduce((sum, metric) => sum + metric.sampleSize, 0);
    const insufficientData = included.length === 0 || totalSampleSize < (config.minimumTotalSampleSize ?? 0);
    const overallScore = insufficientData ? null : weightedAverage(included.map((metric) => ({ score: metric.score, weight: metric.weight })));
    const band = overallScore === null ? null : bandForScore(config.gradeBands, overallScore);
    const status = insufficientData ? 'INSUFFICIENT_DATA' : band?.status ?? 'MONITOR';
    const categoryScores = scoreCategories(config, metricScores);
    const trend = trendFor(overallScore, input.previousScores ?? [], config.trendRules);
    const triggeredActions = actionRulesFor(config, status, metricScores, overallScore);
    return {
        subject: config.subject,
        configVersion: config.version,
        reviewPeriod: config.reviewPeriod,
        overallScore,
        grade: band?.grade ?? null,
        status,
        trend,
        insufficientData,
        totalSampleSize,
        metricScores,
        categoryScores,
        triggeredActions,
    };
}
function normalizeConfig(config) {
    const enabled = config.metrics.filter((metric) => metric.enabled !== false);
    const weightTotal = enabled.reduce((sum, metric) => sum + Math.max(0, metric.weight), 0);
    const metrics = weightTotal > 0
        ? enabled.map((metric) => ({ ...metric, weight: Math.max(0, metric.weight) }))
        : enabled.map((metric) => ({ ...metric, weight: 1 }));
    return { ...config, metrics, gradeBands: config.gradeBands.length ? config.gradeBands : exports.DEFAULT_GRADE_BANDS };
}
function scoreMetric(subject, config, input) {
    const sampleSize = Math.max(0, Math.trunc(input?.sampleSize ?? input?.denominator ?? (input?.value === undefined ? 0 : 1)));
    const attribution = input?.attribution ?? null;
    const excludedByCode = !!input?.exclusionCode && (config.exclusionCodes ?? []).includes(input.exclusionCode);
    const impactWhenResponsibleOnly = config.attribution?.impactWhenResponsibleOnly ?? true;
    const defaultExcluded = subject === 'VENDOR'
        ? ['CUSTOMER', 'RIDER', 'PLATFORM', 'WEATHER', 'THIRD_PARTY']
        : ['CUSTOMER', 'VENDOR', 'PLATFORM', 'WEATHER', 'THIRD_PARTY'];
    const excludedCauses = new Set(config.attribution?.excludedCauses ?? defaultExcluded);
    const responsibleAttribution = attribution === 'RESPONSIBLE' || attribution === 'UNKNOWN' || (subject === 'VENDOR' && attribution === 'VENDOR') || (subject === 'RIDER' && attribution === 'RIDER');
    const excludedByAttribution = input
        ? input.attributed === false || (impactWhenResponsibleOnly && attribution !== null && !responsibleAttribution) || (attribution !== null && excludedCauses.has(attribution))
        : false;
    const excluded = excludedByCode || excludedByAttribution;
    const insufficientData = sampleSize < (config.minimumSampleSize ?? 0);
    const actual = actualValue(config, input);
    const score = !input || insufficientData || excluded ? null : rawScore(config, actual);
    return {
        code: config.code,
        label: config.label,
        category: config.category,
        weight: config.weight,
        formula: config.formula,
        target: config.target,
        actual,
        sampleSize,
        score,
        insufficientData,
        excluded,
        attribution,
        incidentType: input?.incidentType ?? null,
        reason: !input ? 'NO_MEASUREMENT' : insufficientData ? 'MINIMUM_SAMPLE_NOT_MET' : excluded ? 'ATTRIBUTED_OR_EXCLUDED_AWAY' : undefined,
    };
}
function actualValue(config, input) {
    if (!input)
        return null;
    if (config.formula.startsWith('RATE_')) {
        const denominator = input.denominator ?? input.sampleSize ?? 0;
        if (denominator <= 0)
            return null;
        return (input.numerator ?? 0) / denominator;
    }
    return input.value ?? null;
}
function rawScore(config, actual) {
    if (actual === null || Number.isNaN(actual))
        return null;
    let score;
    switch (config.formula) {
        case 'RATE_GTE_TARGET':
        case 'AVERAGE_GTE_TARGET': {
            if (config.target <= 0)
                score = actual > 0 ? 100 : 0;
            else
                score = (actual / config.target) * 100;
            break;
        }
        case 'RATE_LTE_TARGET':
        case 'AVERAGE_LTE_TARGET': {
            if (actual <= config.target)
                score = 100;
            else
                score = config.target <= 0 ? 0 : (config.target / actual) * 100;
            break;
        }
        case 'COUNT_LTE_TARGET': {
            if (actual <= config.target)
                score = 100;
            else
                score = config.target <= 0 ? 0 : (config.target / actual) * 100;
            break;
        }
        case 'MANUAL_0_100':
            score = actual;
            break;
    }
    return round2(Math.max(0, Math.min(100, score)));
}
function weightedAverage(values) {
    const totalWeight = values.reduce((sum, value) => sum + value.weight, 0);
    if (totalWeight <= 0)
        return 0;
    return round2(values.reduce((sum, value) => sum + value.score * value.weight, 0) / totalWeight);
}
function scoreCategories(config, metrics) {
    const categories = [...new Set(metrics.map((metric) => metric.category))];
    return categories.map((category) => {
        const categoryMetrics = metrics.filter((metric) => metric.category === category);
        const included = categoryMetrics.filter((metric) => !metric.insufficientData && !metric.excluded && metric.score !== null);
        const score = included.length ? weightedAverage(included.map((metric) => ({ score: metric.score, weight: metric.weight }))) : null;
        const configuredWeight = config.categoryWeights?.[category];
        return { category, score, weight: configuredWeight ?? categoryMetrics.reduce((sum, metric) => sum + metric.weight, 0), insufficientData: score === null };
    });
}
function bandForScore(bands, score) {
    return bands.find((band) => score >= band.minScore && score <= (band.maxScore ?? 100)) ?? null;
}
function trendFor(score, previousScores, rules) {
    if (score === null)
        return 'INSUFFICIENT_DATA';
    if (previousScores.length === 0)
        return 'NEW';
    const reviewCount = Math.max(1, Math.trunc(rules?.reviewPeriods ?? 2));
    const relevant = previousScores.filter((value) => Number.isFinite(value)).slice(-reviewCount);
    if (relevant.length === 0)
        return 'NEW';
    const previous = relevant.reduce((sum, value) => sum + value, 0) / relevant.length;
    const delta = round2(score - previous);
    if (delta >= (rules?.improvingDelta ?? 5))
        return 'IMPROVING';
    if (delta <= (rules?.decliningDelta ?? -5))
        return 'DECLINING';
    return 'STABLE';
}
function actionRulesFor(config, status, metrics, overallScore) {
    return (config.actionRules ?? []).flatMap((rule) => {
        if (rule.whenStatusIn?.includes(status))
            return [{ ...rule, reason: `status:${status}` }];
        if (rule.whenScoreBelow !== undefined && overallScore !== null && overallScore < rule.whenScoreBelow) {
            return [{ ...rule, reason: `overall_score:${overallScore}<${rule.whenScoreBelow}` }];
        }
        if (rule.whenMetricBelow) {
            const metric = metrics.find((candidate) => candidate.code === rule.whenMetricBelow.metricCode);
            if (metric?.score !== null && metric?.score !== undefined && metric.score < rule.whenMetricBelow.scoreBelow) {
                return [{ ...rule, reason: `metric:${metric.code}:${metric.score}<${rule.whenMetricBelow.scoreBelow}` }];
            }
        }
        return [];
    });
}
function round2(value) {
    return Math.round(value * 100) / 100;
}
//# sourceMappingURL=performance.js.map