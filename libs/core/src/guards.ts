/** AuthGuard (JWT) + Roles + Public + Internal — one pattern across all services. */

import { CanActivate, Logger, ExecutionContext, Inject, Injectable, SetMetadata, UnauthorizedException, ForbiddenException, createParamDecorator } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@ore/contracts';
import { INTERNAL_KEY_HEADER } from '@ore/config';
import { timingSafeEqual } from 'crypto';
import { ORE_ENV } from './ore-env';
import { OreEnv } from '@ore/config';
import {
  INTERNAL_MAC_HEADER,
  INTERNAL_SERVICE_HEADER,
  INTERNAL_TS_HEADER,
  verifyInternalMac,
} from './internal-auth';
import { JwtPayload, verifyToken } from './jwt';
import { STANDING_KEY, StandingService } from './standing';

/**
 * Module-scope singleton. AuthGuard is instantiated by every service via APP_GUARD and
 * takes only Reflector + ORE_ENV, so injecting StandingService through the constructor
 * would mean touching eleven modules for one optional check. The cache is per-process,
 * which is what we want: each service decides for itself. OreCoreModule subscribes this
 * instance to `user.standing_changed` so a status change drops the entry everywhere at
 * once rather than waiting for the TTL.
 */
export const standing = new StandingService();

export const ROLES_KEY = 'ore_roles';
export const IS_PUBLIC_KEY = 'ore_is_public';
export const IS_INTERNAL_KEY = 'ore_is_internal';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
/** No token. Health, OTP, signed webhooks. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
/** Service-to-service only. Never routed through the gateway. */
export const Internal = () => SetMetadata(IS_INTERNAL_KEY, true);

function keysEqual(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

@Injectable()
export class AuthGuard implements CanActivate {
  private static readonly legacyLogger = new Logger('InternalAuth');
  /** One warning per caller service, not per request — enough to see who, not enough to drown the log. */
  private static readonly legacyWarned = new Set<string>();

  private static warnLegacyKey(service: string, url: string): void {
    if (AuthGuard.legacyWarned.has(service)) return;
    AuthGuard.legacyWarned.add(service);
    AuthGuard.legacyLogger.warn(
      `[deprecated] '${service}' authenticated with the plaintext internal key (first seen on ${url}). ` +
        'It should send x-ore-internal-mac. Set INTERNAL_LEGACY_KEY=off once no service does this.',
    );
  }

  constructor(
    private readonly reflector: Reflector,
    @Inject(ORE_ENV) private readonly env: OreEnv,
  ) {}
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;

    const isInternal = this.reflector.getAllAndOverride<boolean>(IS_INTERNAL_KEY, [ctx.getHandler(), ctx.getClass()]);
    const req = ctx.switchToHttp().getRequest();
    if (isInternal) {
      const key = req.headers?.[INTERNAL_KEY_HEADER] as string | undefined;
      const mac = req.headers?.[INTERNAL_MAC_HEADER] as string | undefined;
      // Prefer the MAC (key never travels over the wire — audit F-SEC-1); fall back to
      // the legacy plaintext key for mixed-version rolling deploys.
      const macOk = !!mac && verifyInternalMac(
        this.env.internalServiceKey,
        req.method ?? 'GET',
        req.url ?? '',
        (req as { body?: unknown }).body,
        mac,
        req.headers?.[INTERNAL_TS_HEADER] as string | undefined,
        req.headers?.[INTERNAL_SERVICE_HEADER] as string | undefined,
      );
      const keyOk =
        this.env.internalLegacyKeyAccepted && !!key && keysEqual(key, this.env.internalServiceKey);
      if (!macOk && !keyOk) {
        throw new UnauthorizedException('Invalid internal service key');
      }
      if (keyOk && !macOk) {
        // Deliberately noisy, and deliberately not rate-limited away to nothing. The whole point
        // of the MAC scheme is that the shared key never travels; every line here is a caller
        // still putting it on the wire. Without this signal there is no way to know whether the
        // fallback is safe to switch off, so it never gets switched off.
        AuthGuard.warnLegacyKey(
          (req.headers?.[INTERNAL_SERVICE_HEADER] as string | undefined) ?? 'unknown',
          req.url ?? '',
        );
      }
      // Optional per-service caller allowlist (INTERNAL_CALLERS=order,ledger,…):
      // even within the cluster, a service can restrict WHICH services may reach its
      // internal API.
      const allowlist = this.env.internalCallerAllowlist;
      if (allowlist.length) {
        // The x-ore-service header is only authenticated by the MAC — on the legacy
        // plaintext-key path it is attacker-chosen, so an attacker holding the key could
        // name any allowed service (audit S-3). A service that bothered to set an allowlist
        // is asking "who is calling?"; the legacy path cannot answer that, so it fails closed.
        if (!macOk) {
          throw new UnauthorizedException('Internal caller allowlist requires MAC authentication (legacy key does not prove service identity)');
        }
        const service = req.headers?.[INTERNAL_SERVICE_HEADER] as string | undefined;
        if (!service || !allowlist.includes(service)) {
          throw new UnauthorizedException('Internal caller not allowed');
        }
      }
      return true;
    }

    const auth = req.headers?.['authorization'] as string | undefined;
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException('Missing bearer token');
    try {
      req.user = verifyToken(this.env, auth.slice(7));
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    // Opt-in account-standing check (suspended/banned). Only on routes that create work or
    // move money, so a status lookup is not on the path of every read.
    const requireStanding = this.reflector.getAllAndOverride<boolean>(STANDING_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (requireStanding && req.user?.sub) {
      await standing.assert(req.user.sub);
    }

    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (roles?.length) {
      const userRoles = Array.isArray(req.user.roles) ? req.user.roles : [req.user.role];
      const hasMatch = roles.some((r) => userRoles.includes(r) || req.user.role === r);
      if (!hasMatch) {
        throw new ForbiddenException(`Requires role: ${roles.join('|')}`);
      }
    }
    return true;
  }
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): JwtPayload => {
  return ctx.switchToHttp().getRequest().user as JwtPayload;
});
