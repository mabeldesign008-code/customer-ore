/**
 * Throttler guard with an internal-traffic exemption (audit F-BUG-8).
 *
 * The stock @nestjs/throttler guard keys every request by source IP with a shared
 * 100 req/min budget. All inter-service HTTP originates from the same host in a
 * deployment, so the internal APIs of every service shared ONE bucket. Requests
 * carrying the valid internal service key are already authenticated by the shared
 * service-to-service guard and are exempt from this client rate limit.
 */

import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  getOptionsToken,
  getStorageToken,
  ThrottlerGuard,
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { timingSafeEqual } from 'crypto';
import { INTERNAL_MAC_HEADER, INTERNAL_SERVICE_HEADER, INTERNAL_TS_HEADER, verifyInternalMac } from './internal-auth';
import { INTERNAL_KEY_HEADER } from '@ore/config';
import { ORE_ENV } from './ore-env';
import type { OreEnv } from '@ore/config';

function keyMatches(provided: string, expected: string): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

@Injectable()
export class OreThrottlerGuard extends ThrottlerGuard implements CanActivate {
  constructor(
    @Inject(getOptionsToken()) options: ThrottlerModuleOptions,
    @Inject(getStorageToken()) storageService: ThrottlerStorage,
    reflector: Reflector,
    @Inject(ORE_ENV) private readonly env: OreEnv,
  ) {
    super(options, storageService, reflector);
  }

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
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    const mac = req.headers?.[INTERNAL_MAC_HEADER] as string | undefined;
    if (
      mac &&
      verifyInternalMac(
        this.env.internalServiceKey,
        req.method ?? 'GET',
        req.url ?? '',
        (req as { body?: unknown }).body,
        mac,
        req.headers?.[INTERNAL_TS_HEADER] as string | undefined,
        req.headers?.[INTERNAL_SERVICE_HEADER] as string | undefined,
      )
    ) {
      return true;
    }

    const provided = req.headers?.[INTERNAL_KEY_HEADER] as string | undefined;
    if (typeof provided === 'string' && keyMatches(provided, this.env.internalServiceKey)) {
      return true;
    }
    return super.canActivate(context);
  }
}
