/**
 * Throttler guard with an internal-traffic exemption (audit F-BUG-8).
 *
 * The stock @nestjs/throttler guard keys every request by source IP with a shared
 * 100 req/min budget. All inter-service HTTP originates from the same host in a
 * deployment, so the internal APIs of every service shared ONE bucket. Requests
 * carrying the valid internal service key are already authenticated by the shared
 * service-to-service guard and are exempt from this client rate limit.
 */
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModuleOptions, ThrottlerStorage } from '@nestjs/throttler';
import type { OreEnv } from '@ore/config';
export declare class OreThrottlerGuard extends ThrottlerGuard implements CanActivate {
    private readonly env;
    constructor(options: ThrottlerModuleOptions, storageService: ThrottlerStorage, reflector: Reflector, env: OreEnv);
    /**
     * Service-to-service traffic bypasses the rate limit.
     *
     * The exemption originally recognised only the legacy plaintext key. Once `internalFetch`
     * moved to per-request MACs (audit F-SEC-1) that was a countdown: the day `INTERNAL_LEGACY_KEY`
     * is finally turned off, every internal call stops being exempt and starts sharing one bucket
     * — and because services sit behind one egress IP, the first busy service would 429 all the
     * others. A security cleanup would have read as a platform-wide outage.
     *
     * Both credentials are accepted here for exactly as long as `AuthGuard` accepts both.
     */
    canActivate(context: ExecutionContext): Promise<boolean>;
}
//# sourceMappingURL=throttler.guard.d.ts.map