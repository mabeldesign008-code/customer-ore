import { DEFAULT_RIDER_PERFORMANCE_CONFIG, DEFAULT_VENDOR_PERFORMANCE_CONFIG, scorePerformance } from './performance';

describe('configurable performance engine', () => {
  it('scores vendor metrics with weights, grade bands and actions', () => {
    const result = scorePerformance({
      config: DEFAULT_VENDOR_PERFORMANCE_CONFIG,
      metrics: [
        { code: 'acceptance_rate', numerator: 95, denominator: 100, sampleSize: 100, attribution: 'RESPONSIBLE' },
        { code: 'prep_time_met_rate', numerator: 80, denominator: 100, sampleSize: 100, attribution: 'RESPONSIBLE' },
        { code: 'cancellation_rate', numerator: 8, denominator: 100, sampleSize: 100, attribution: 'RESPONSIBLE' },
        { code: 'customer_rating', value: 4.1, sampleSize: 20, attribution: 'RESPONSIBLE' },
        { code: 'serious_incidents', value: 0, sampleSize: 1, attribution: 'RESPONSIBLE' },
      ],
      previousScores: [100],
    });

    expect(result.overallScore).not.toBeNull();
    expect(result.metricScores).toHaveLength(DEFAULT_VENDOR_PERFORMANCE_CONFIG.metrics.length);
    expect(result.status).not.toBe('INSUFFICIENT_DATA');
    expect(result.trend).toBe('DECLINING');
  });

  it('counts subject-specific attribution as responsible and excludes cross-party causes', () => {
    const vendor = scorePerformance({
      config: { ...DEFAULT_VENDOR_PERFORMANCE_CONFIG, minimumTotalSampleSize: 1 },
      metrics: [
        { code: 'acceptance_rate', numerator: 1, denominator: 1, sampleSize: 1, attribution: 'VENDOR' },
        { code: 'prep_time_met_rate', numerator: 1, denominator: 1, sampleSize: 1, attribution: 'VENDOR' },
        { code: 'cancellation_rate', numerator: 0, denominator: 1, sampleSize: 1, attribution: 'VENDOR' },
        { code: 'customer_rating', value: 5, sampleSize: 3, attribution: 'CUSTOMER' },
        { code: 'serious_incidents', value: 0, sampleSize: 1, attribution: 'VENDOR' },
      ],
    });
    const rating = vendor.metricScores.find((metric) => metric.code === 'customer_rating');
    expect(vendor.metricScores.find((metric) => metric.code === 'acceptance_rate')?.excluded).toBe(false);
    expect(rating?.excluded).toBe(true);

    const rider = scorePerformance({
      config: { ...DEFAULT_RIDER_PERFORMANCE_CONFIG, minimumTotalSampleSize: 1 },
      metrics: [
        { code: 'serious_incidents', value: 1, sampleSize: 1, attribution: 'RIDER' },
      ],
    });
    expect(rider.metricScores.find((metric) => metric.code === 'serious_incidents')?.excluded).toBe(false);
  });

  it('handles insufficient data and cause attribution before rider impact', () => {
    const result = scorePerformance({
      config: DEFAULT_RIDER_PERFORMANCE_CONFIG,
      metrics: [
        { code: 'offer_acceptance_rate', numerator: 1, denominator: 1, sampleSize: 1, attribution: 'RESPONSIBLE' },
        { code: 'assignment_completion_rate', numerator: 1, denominator: 1, sampleSize: 1, attribution: 'RESPONSIBLE' },
        { code: 'on_time_rate', numerator: 1, denominator: 1, sampleSize: 1, attribution: 'RESPONSIBLE' },
        { code: 'customer_rating', value: 5, sampleSize: 1, attribution: 'RESPONSIBLE' },
        { code: 'serious_incidents', value: 1, sampleSize: 1, attribution: 'PLATFORM' },
      ],
    });

    expect(result.status).toBe('INSUFFICIENT_DATA');
    expect(result.metricScores.find((metric) => metric.code === 'serious_incidents')?.excluded).toBe(true);
    expect(result.overallScore).toBeNull();
  });
});
