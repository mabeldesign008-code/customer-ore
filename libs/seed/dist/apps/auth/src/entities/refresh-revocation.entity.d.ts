/**
 * Server-side refresh-token revocation (audit F-SEC-13).
 *
 * Refresh tokens are stateless JWTs valid for 30 days. Logout used to only clear the
 * browser cookie, so a captured refresh token (stolen cookie, shared/stale device)
 * kept minting fresh access tokens for the whole 30-day window. Each refresh token now
 * carries a unique `jti`; revoking it records the jti here, and `refresh()` refuses any
 * revoked jti. Rows are pruned at 31 days (beyond the token's own 30-day expiry).
 */
export declare class RefreshRevocation {
    jti: string;
    sub: string;
    revokedAt: Date;
}
//# sourceMappingURL=refresh-revocation.entity.d.ts.map