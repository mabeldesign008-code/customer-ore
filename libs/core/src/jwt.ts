/** JWT sign/verify — used by auth-service (sign) and every service (verify). */

import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken';
import { randomUUID } from 'crypto';
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

/**
 * The one algorithm this system signs and accepts.
 *
 * Pinned on *verify*, not just sign. `jsonwebtoken` otherwise trusts the `alg` header of the
 * token it is checking, which is attacker-controlled: a token forged with `alg: none` — or, when
 * the secret is a string, one signed with an asymmetric algorithm — can be made to validate. The
 * fix is to state the expected algorithm rather than let the token choose it.
 */
const ALGORITHMS: NonNullable<VerifyOptions['algorithms']> = ['HS256'];

export function signTokens(env: OreEnv, payload: JwtPayload): { accessToken: string; refreshToken: string } {
  const base: SignOptions = { issuer: 'ore-delivery', algorithm: 'HS256' };
  const accessToken = jwt.sign(payload, env.jwtSecret, {
    ...base,
    expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'],
  });
  // Each refresh token gets a unique jti so it can be individually revoked on logout
  // (F-SEC-13). The old stateless refresh token stayed valid 30 days after logout.
  const refreshToken = jwt.sign({ sub: payload.sub, typ: 'refresh', jti: randomUUID() }, env.jwtSecret, { ...base, expiresIn: '30d' });
  return { accessToken, refreshToken };
}

export function verifyToken(env: OreEnv, token: string): JwtPayload {
  const decoded = jwt.verify(token, env.jwtSecret, { issuer: 'ore-delivery', algorithms: ALGORITHMS }) as JwtPayload & { typ?: string };
  if (decoded.typ === 'refresh') {
    throw new Error('Refresh token is not an access token');
  }
  return decoded;
}

export function verifyRefreshToken(env: OreEnv, token: string): { sub: string; jti?: string } {
  const decoded = jwt.verify(token, env.jwtSecret, { issuer: 'ore-delivery', algorithms: ALGORITHMS }) as { sub?: string; typ?: string; jti?: string };
  if (!decoded.sub || decoded.typ !== 'refresh') {
    throw new Error('Invalid refresh token');
  }
  return { sub: decoded.sub, jti: decoded.jti };
}
