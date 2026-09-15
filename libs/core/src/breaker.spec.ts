import { CircuitBreaker, breakerFor, jitterDelayMs } from './breaker';

/**
 * One breaker per host. Its job is to stop a service hammering a dependency that is already
 * down — retries against a failing upstream are the mechanism by which one service's outage
 * becomes everyone's outage.
 */
describe('CircuitBreaker', () => {
  it('starts closed and allows traffic', () => {
    const b = new CircuitBreaker();
    expect(b.state).toBe('closed');
    expect(b.allow()).toBe(true);
  });

  it('stays closed below the failure threshold', () => {
    const b = new CircuitBreaker(5, 10_000);
    for (let i = 0; i < 4; i++) b.onFailure();
    expect(b.state).toBe('closed');
    expect(b.allow()).toBe(true);
  });

  it('opens on the threshold failure', () => {
    const b = new CircuitBreaker(5, 10_000);
    for (let i = 0; i < 5; i++) b.onFailure();
    expect(b.state).toBe('open');
    expect(b.allow()).toBe(false);
  });

  it('counts consecutive failures, so a success resets the run', () => {
    // Otherwise a host failing 1% of the time trips the breaker eventually, purely from
    // accumulation, and takes down a dependency that was working fine.
    const b = new CircuitBreaker(5, 10_000);
    for (let i = 0; i < 4; i++) b.onFailure();
    b.onSuccess();
    for (let i = 0; i < 4; i++) b.onFailure();
    expect(b.state).toBe('closed');
  });

  describe('recovery', () => {
    afterEach(() => jest.useRealTimers());

    it('goes half-open once the window elapses', () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-04T12:00:00Z'));
      const b = new CircuitBreaker(1, 10_000);
      b.onFailure();
      expect(b.state).toBe('open');

      jest.setSystemTime(new Date('2026-09-04T12:00:10Z'));
      expect(b.state).toBe('half-open');
    });

    it('releases exactly one probe while half-open', () => {
      // More than one and a recovering upstream gets a thundering herd the moment it comes back,
      // which knocks it over again.
      jest.useFakeTimers().setSystemTime(new Date('2026-09-04T12:00:00Z'));
      const b = new CircuitBreaker(1, 10_000);
      b.onFailure();
      jest.setSystemTime(new Date('2026-09-04T12:00:10Z'));

      expect(b.allow()).toBe(true);
      expect(b.allow()).toBe(false);
      expect(b.allow()).toBe(false);
    });

    it('closes when the probe succeeds', () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-04T12:00:00Z'));
      const b = new CircuitBreaker(1, 10_000);
      b.onFailure();
      jest.setSystemTime(new Date('2026-09-04T12:00:10Z'));
      b.allow();
      b.onSuccess();

      expect(b.state).toBe('closed');
      expect(b.allow()).toBe(true);
    });

    it('re-opens for a full window when the probe fails', () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-04T12:00:00Z'));
      const b = new CircuitBreaker(1, 10_000);
      b.onFailure();
      jest.setSystemTime(new Date('2026-09-04T12:00:10Z'));
      b.allow();
      b.onFailure();

      expect(b.state).toBe('open');
      jest.setSystemTime(new Date('2026-09-04T12:00:19Z'));
      expect(b.state).toBe('open');
      jest.setSystemTime(new Date('2026-09-04T12:00:20Z'));
      expect(b.state).toBe('half-open');
    });

    it('does not let a failed probe count toward the threshold twice', () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-04T12:00:00Z'));
      const b = new CircuitBreaker(5, 10_000);
      for (let i = 0; i < 5; i++) b.onFailure();
      jest.setSystemTime(new Date('2026-09-04T12:00:10Z'));
      b.allow();
      b.onFailure();

      // Straight back to open, and the next window is measured from the probe, not from the
      // original trip.
      expect(b.state).toBe('open');
    });
  });

  it('resets to a clean state', () => {
    const b = new CircuitBreaker(1, 10_000);
    b.onFailure();
    b.reset();
    expect(b.state).toBe('closed');
    expect(b.allow()).toBe(true);
  });
});

describe('breakerFor', () => {
  it('gives the same breaker for the same host', () => {
    expect(breakerFor('order:4103')).toBe(breakerFor('order:4103'));
  });

  it('isolates hosts from each other', () => {
    // A shared breaker would mean the catalog service going down also cuts off the ledger,
    // which is the opposite of what a bulkhead is for.
    const a = breakerFor('catalog-isolation-test');
    const b = breakerFor('ledger-isolation-test');
    expect(a).not.toBe(b);

    for (let i = 0; i < 10; i++) a.onFailure();
    expect(a.allow()).toBe(false);
    expect(b.allow()).toBe(true);

    a.reset();
  });
});

describe('jitterDelayMs', () => {
  it('grows exponentially with the attempt number', () => {
    const maxFor = (attempt: number) => {
      let seen = 0;
      for (let i = 0; i < 500; i++) seen = Math.max(seen, jitterDelayMs(200, attempt));
      return seen;
    };
    expect(maxFor(3)).toBeGreaterThan(maxFor(0));
  });

  it('stays within [0, base * 2^attempt)', () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      for (let i = 0; i < 200; i++) {
        const d = jitterDelayMs(200, attempt);
        expect(d).toBeGreaterThanOrEqual(0);
        expect(d).toBeLessThan(200 * 2 ** attempt);
      }
    }
  });

  it('is capped, so a long outage does not produce an hour-long sleep', () => {
    for (let i = 0; i < 200; i++) {
      expect(jitterDelayMs(200, 30, 8_000)).toBeLessThan(8_000);
    }
  });

  it('is full-jitter, not fixed backoff', () => {
    // Fixed backoff re-synchronises every caller onto the same retry instant, so a recovering
    // upstream is hit by the whole fleet at once.
    const samples = new Set(Array.from({ length: 100 }, () => jitterDelayMs(200, 4)));
    expect(samples.size).toBeGreaterThan(10);
  });

  it('can return zero, so at least some callers retry immediately', () => {
    const samples = Array.from({ length: 500 }, () => jitterDelayMs(1, 0));
    expect(Math.min(...samples)).toBe(0);
  });
});
