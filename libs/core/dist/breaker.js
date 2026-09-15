"use strict";
/** Circuit breaker with jittered retry backoff for inter-service HTTP calls.
 *  One breaker per host: 5 consecutive failures → open for 10s, half-open probe
 *  releases a single request; success closes it, failure re-opens. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreaker = void 0;
exports.breakerFor = breakerFor;
exports.jitterDelayMs = jitterDelayMs;
class CircuitBreaker {
    failures = 0;
    openedAt = 0;
    halfOpen = false;
    threshold;
    openMs;
    constructor(threshold = 5, openMs = 10_000) {
        this.threshold = threshold;
        this.openMs = openMs;
    }
    get state() {
        if (this.openedAt === 0)
            return 'closed';
        if (Date.now() - this.openedAt >= this.openMs)
            return 'half-open';
        return 'open';
    }
    /** Returns true when the call may proceed (closed, or half-open probe slot). */
    allow() {
        const s = this.state;
        if (s === 'closed')
            return true;
        if (s === 'half-open' && !this.halfOpen) {
            this.halfOpen = true; // grant exactly one probe
            return true;
        }
        return false;
    }
    onSuccess() {
        this.failures = 0;
        this.openedAt = 0;
        this.halfOpen = false;
    }
    onFailure() {
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
    reset() {
        this.failures = 0;
        this.openedAt = 0;
        this.halfOpen = false;
    }
}
exports.CircuitBreaker = CircuitBreaker;
const breakers = new Map();
function breakerFor(host) {
    let b = breakers.get(host);
    if (!b) {
        b = new CircuitBreaker();
        breakers.set(host, b);
    }
    return b;
}
/** Full-jitter exponential backoff: [0, base * 2^attempt). */
function jitterDelayMs(baseMs, attempt, capMs = 8_000) {
    const max = Math.min(baseMs * 2 ** attempt, capMs);
    return Math.floor(Math.random() * max);
}
//# sourceMappingURL=breaker.js.map