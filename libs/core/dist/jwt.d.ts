/** JWT sign/verify — used by auth-service (sign) and every service (verify). */
import { Role } from '@ore/contracts';
import { OreEnv } from '@ore/config';
export interface JwtPayload {
    sub: string;
    role: Role;
    roles?: Role[];
    /**
     * Which kind of admin this is (AdminRole). Present only for role=ADMIN.
     * Support routing depends on it: the same ADMIN role covers support, finance,
     * operations and compliance, and they see different queues.
     */
    adminRole?: string | null;
    phone: string;
    name?: string | null;
}
export declare function signTokens(env: OreEnv, payload: JwtPayload): {
    accessToken: string;
    refreshToken: string;
};
export declare function verifyToken(env: OreEnv, token: string): JwtPayload;
export declare function verifyRefreshToken(env: OreEnv, token: string): {
    sub: string;
    jti?: string;
};
//# sourceMappingURL=jwt.d.ts.map