/** Circuit breaker with jittered retry backoff for inter-service HTTP calls.
 *  One breaker per host: 5 consecutive failures → open for 10s, half-open probe
 *  releases a single request; success closes it, failure re-opens. */
export declare class CircuitBreaker {
    private failures;
    private openedAt;
    private halfOpen;
    private readonly threshold;
    private readonly openMs;
    constructor(threshold?: number, openMs?: number);
    get state(): 'closed' | 'open' | 'half-open';
    /** Returns true when the call may proceed (closed, or half-open probe slot). */
    allow(): boolean;
    onSuccess(): void;
    onFailure(): void;
    reset(): void;
}
export declare function breakerFor(host: string): CircuitBreaker;
/** Full-jitter exponential backoff: [0, base * 2^attempt). */
export declare function jitterDelayMs(baseMs: number, attempt: number, capMs?: number): number;
//# sourceMappingURL=breaker.d.ts.map