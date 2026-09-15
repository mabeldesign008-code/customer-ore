/** Circuit breaker with jittered retry backoff for inter-service HTTP calls.
 *  One breaker per host: 5 consecutive failures → open for 10s, half-open probe
 *  releases a single request; success closes it, failure re-opens. */

export class CircuitBreaker {
  private failures = 0;
  private openedAt = 0;
  private halfOpen = false;
  private readonly threshold: number;
  private readonly openMs: number;

  constructor(threshold = 5, openMs = 10_000) {
    this.threshold = threshold;
    this.openMs = openMs;
  }

  get state(): 'closed' | 'open' | 'half-open' {
    if (this.openedAt === 0) return 'closed';
    if (Date.now() - this.openedAt >= this.openMs) return 'half-open';
    return 'open';
  }

  /** Returns true when the call may proceed (closed, or half-open probe slot). */
  allow(): boolean {
    const s = this.state;
    if (s === 'closed') return true;
    if (s === 'half-open' && !this.halfOpen) {
      this.halfOpen = true; // grant exactly one probe
      return true;
    }
    return false;
  }

  onSuccess(): void {
    this.failures = 0;
    this.openedAt = 0;
    this.halfOpen = false;
  }

  onFailure(): void {
    if (this.halfOpen) {
      this.halfOpen = false;
      this.openedAt = Date.now(); // probe failed → re-open
      return;
    }
    this.failures += 1;
    if (this.failures >= this.threshold) {
      this.openedAt = Date.now();
    }
  }

  reset(): void {
    this.failures = 0;
    this.openedAt = 0;
    this.halfOpen = false;
  }
}

const breakers = new Map<string, CircuitBreaker>();

export function breakerFor(host: string): CircuitBreaker {
  let b = breakers.get(host);
  if (!b) {
    b = new CircuitBreaker();
    breakers.set(host, b);
  }
  return b;
}

/** Full-jitter exponential backoff: [0, base * 2^attempt). */
export function jitterDelayMs(baseMs: number, attempt: number, capMs = 8_000): number {
  const max = Math.min(baseMs * 2 ** attempt, capMs);
  return Math.floor(Math.random() * max);
}
