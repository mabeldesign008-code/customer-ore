/** AuthGuard (JWT) + Roles + Public + Internal — one pattern across all services. */
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@ore/contracts';
import { OreEnv } from '@ore/config';
import { StandingService } from './standing';
/**
 * Module-scope singleton. AuthGuard is instantiated by every service via APP_GUARD and
 * takes only Reflector + ORE_ENV, so injecting StandingService through the constructor
 * would mean touching eleven modules for one optional check. The cache is per-process,
 * which is what we want: each service decides for itself. OreCoreModule subscribes this
 * instance to `user.standing_changed` so a status change drops the entry everywhere at
 * once rather than waiting for the TTL.
 */
export declare const standing: StandingService;
export declare const ROLES_KEY = "ore_roles";
export declare const IS_PUBLIC_KEY = "ore_is_public";
export declare const IS_INTERNAL_KEY = "ore_is_internal";
export declare const Roles: (...roles: Role[]) => import("@nestjs/common").CustomDecorator<string>;
/** No token. Health, OTP, signed webhooks. */
export declare const Public: () => import("@nestjs/common").CustomDecorator<string>;
/** Service-to-service only. Never routed through the gateway. */
export declare const Internal: () => import("@nestjs/common").CustomDecorator<string>;
export declare class AuthGuard implements CanActivate {
    private readonly reflector;
    private readonly env;
    private static readonly legacyLogger;
    /** One warning per caller service, not per request — enough to see who, not enough to drown the log. */
    private static readonly legacyWarned;
    private static warnLegacyKey;
    constructor(reflector: Reflector, env: OreEnv);
    canActivate(ctx: ExecutionContext): Promise<boolean>;
}
export declare const CurrentUser: (...dataOrPipes: unknown[]) => ParameterDecorator;
//# sourceMappingURL=guards.d.ts.map