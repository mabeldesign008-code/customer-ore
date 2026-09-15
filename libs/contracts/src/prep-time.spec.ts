import { DEFAULT_PREP_TIME_CONFIG, estimatePrepTime } from './prep-time';

/**
 * Dispatch times the whole handover off `prepTimeMin`, a static number the vendor set when they
 * built their menu. When it is wrong someone pays: too low and the rider waits at the counter
 * unpaid while their next order goes elsewhere; too high and the food sits under a lamp.
 */
describe('estimatePrepTime', () => {
  const healthy = { queueDepth: 0, lateRate: 0, sampleSize: 50 };

  describe('when nothing is wrong', () => {
    it('returns the vendor estimate untouched', () => {
      const r = estimatePrepTime(20, healthy);
      expect(r.estimatedPrepTimeMin).toBe(20);
      expect(r.queueMinutes).toBe(0);
      expect(r.stressMinutes).toBe(0);
    });

    it('does not penalise a kitchen running at its normal parallel load', () => {
      // A kitchen with four hobs is not slower because two of them are lit.
      const r = estimatePrepTime(20, { ...healthy, queueDepth: 3, parallelCapacity: 3 });
      expect(r.estimatedPrepTimeMin).toBe(20);
    });

    it('falls back cleanly when there are no signals at all', () => {
      expect(estimatePrepTime(20, null).estimatedPrepTimeMin).toBe(20);
      expect(estimatePrepTime(20, null).reason).toBe('no_signal');
      expect(estimatePrepTime(20, undefined).estimatedPrepTimeMin).toBe(20);
      expect(estimatePrepTime(20, {}).estimatedPrepTimeMin).toBe(20);
    });
  });

  describe('queue depth', () => {
    it('adds time only for the backlog beyond capacity', () => {
      const r = estimatePrepTime(20, { ...healthy, queueDepth: 7, parallelCapacity: 3 });
      // 4 orders deep × 1.5 min
      expect(r.queueMinutes).toBe(6);
      expect(r.estimatedPrepTimeMin).toBe(26);
    });

    it('scales with the backlog', () => {
      const light = estimatePrepTime(20, { ...healthy, queueDepth: 5, parallelCapacity: 3 });
      const heavy = estimatePrepTime(20, { ...healthy, queueDepth: 12, parallelCapacity: 3 });
      expect(heavy.estimatedPrepTimeMin).toBeGreaterThan(light.estimatedPrepTimeMin);
    });

    it('uses a sane default capacity when the vendor has not set one', () => {
      const r = estimatePrepTime(20, { ...healthy, queueDepth: 5 });
      expect(r.queueMinutes).toBe((5 - DEFAULT_PREP_TIME_CONFIG.defaultParallelCapacity) * 1.5);
    });

    it('applies queue pressure even with no lateness history', () => {
      // A brand-new vendor with ten orders on the pass is still ten orders behind.
      const r = estimatePrepTime(20, { queueDepth: 10, lateRate: 0, sampleSize: 0 });
      expect(r.estimatedPrepTimeMin).toBeGreaterThan(20);
    });
  });

  describe('recent lateness', () => {
    it('adds time proportional to the late rate', () => {
      const r = estimatePrepTime(20, { queueDepth: 0, lateRate: 0.5, sampleSize: 40 });
      expect(r.stressMinutes).toBe(5); // half of maxStressMinutes
      expect(r.estimatedPrepTimeMin).toBe(25);
    });

    it('ignores a late rate drawn from too few orders', () => {
      // Three late orders is a coincidence, not a trend. Acting on it is how a vendor gets
      // permanently penalised for one bad lunch service.
      const r = estimatePrepTime(20, { queueDepth: 0, lateRate: 1, sampleSize: 3 });
      expect(r.stressMinutes).toBe(0);
      expect(r.estimatedPrepTimeMin).toBe(20);
    });

    it('trusts the rate once the sample is big enough', () => {
      const r = estimatePrepTime(20, { queueDepth: 0, lateRate: 1, sampleSize: DEFAULT_PREP_TIME_CONFIG.minSampleSize });
      expect(r.stressMinutes).toBe(10);
    });

    it('clamps a nonsensical late rate', () => {
      expect(estimatePrepTime(20, { queueDepth: 0, lateRate: 5, sampleSize: 40 }).stressMinutes).toBe(10);
      expect(estimatePrepTime(20, { queueDepth: 0, lateRate: -1, sampleSize: 40 }).stressMinutes).toBe(0);
    });
  });

  describe('bounds', () => {
    it('never predicts a kitchen will be faster than it said', () => {
      // Being early is the expensive direction — the rider waits, and waiting riders are what
      // make a courier network unprofitable. Claiming faster needs far more confidence than two
      // coarse signals provide.
      for (const queueDepth of [0, 1, 5, 50]) {
        for (const lateRate of [0, 0.5, 1]) {
          const r = estimatePrepTime(20, { queueDepth, lateRate, sampleSize: 100 });
          expect(r.estimatedPrepTimeMin).toBeGreaterThanOrEqual(20);
        }
      }
    });

    it('caps the adjustment at a multiple of the base estimate', () => {
      const r = estimatePrepTime(10, { queueDepth: 500, lateRate: 1, sampleSize: 500 });
      expect(r.estimatedPrepTimeMin).toBe(20); // 10 × maxMultiplier
    });

    it('caps absolutely, so a runaway signal cannot park a rider for an hour', () => {
      const r = estimatePrepTime(80, { queueDepth: 500, lateRate: 1, sampleSize: 500 });
      expect(r.estimatedPrepTimeMin).toBeLessThanOrEqual(DEFAULT_PREP_TIME_CONFIG.maxPrepTimeMin);
    });

    it('always returns a whole number of minutes', () => {
      for (const q of [0, 1, 4, 7, 13]) {
        expect(Number.isInteger(estimatePrepTime(17, { queueDepth: q, lateRate: 0.37, sampleSize: 30 }).estimatedPrepTimeMin)).toBe(true);
      }
    });
  });

  describe('bad input', () => {
    it('survives non-finite signals rather than poisoning the schedule with NaN', () => {
      // A NaN here becomes a NaN delay in `scheduleT5`, and the dispatch never fires at all.
      const r = estimatePrepTime(20, { queueDepth: NaN, lateRate: Infinity, sampleSize: NaN });
      expect(Number.isFinite(r.estimatedPrepTimeMin)).toBe(true);
      expect(r.estimatedPrepTimeMin).toBe(20);
    });

    it('survives a non-finite or negative base estimate', () => {
      expect(estimatePrepTime(NaN, healthy).estimatedPrepTimeMin).toBe(0);
      expect(estimatePrepTime(-5, healthy).estimatedPrepTimeMin).toBe(0);
    });

    it('reports the base estimate alongside the adjusted one, for auditing', () => {
      const r = estimatePrepTime(20, { queueDepth: 8, lateRate: 0.4, sampleSize: 30 });
      expect(r.basePrepTimeMin).toBe(20);
      expect(r.estimatedPrepTimeMin).toBeGreaterThan(r.basePrepTimeMin);
    });
  });

  it('combines both signals', () => {
    const r = estimatePrepTime(30, { queueDepth: 6, lateRate: 0.5, sampleSize: 40, parallelCapacity: 2 });
    expect(r.queueMinutes).toBe(6); // 4 backlogged × 1.5
    expect(r.stressMinutes).toBe(5);
    expect(r.estimatedPrepTimeMin).toBe(41);
  });

  it('respects an overridden config', () => {
    const r = estimatePrepTime(20, { queueDepth: 10, lateRate: 0, sampleSize: 0 }, { minutesPerQueuedOrder: 3, defaultParallelCapacity: 0 });
    // Capacity is floored at 1 regardless of config: a kitchen that can cook nothing in parallel
    // is not a configuration, it is a typo, and it would make every queued order billable time.
    expect(r.queueMinutes).toBe(27); // (10 - 1) × 3
    expect(r.estimatedPrepTimeMin).toBe(40); // capped at 2× base
  });
});
