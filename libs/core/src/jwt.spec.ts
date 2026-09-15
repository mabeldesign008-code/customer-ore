import jwt from 'jsonwebtoken';
import { signTokens, verifyToken, verifyRefreshToken } from './jwt';
import { Role } from '@ore/contracts';
import { OreEnv } from '@ore/config';

const env = { jwtSecret: 'test-secret-value', jwtExpiresIn: '15m' } as OreEnv;
const payload = { sub: 'user-1', role: Role.CUSTOMER, phone: '233501234567' };

describe('JWT algorithm pinning', () => {
  it('signs and round-trips an access token', () => {
    const { accessToken } = signTokens(env, payload);
    expect(verifyToken(env, accessToken)).toMatchObject(payload);
  });

  it('signs with HS256', () => {
    const { accessToken } = signTokens(env, payload);
    expect(jwt.decode(accessToken, { complete: true })!.header.alg).toBe('HS256');
  });

  it('rejects an unsigned token claiming alg: none', () => {
    // The classic forgery: strip the signature and tell the verifier there isn't one. Without an
    // explicit `algorithms` list, jsonwebtoken decides what to check by reading the token's own
    // header — a field the attacker writes.
    const forged = [
      Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url'),
      Buffer.from(JSON.stringify({ ...payload, iss: 'ore-delivery' })).toString('base64url'),
      '',
    ].join('.');

    expect(() => verifyToken(env, forged)).toThrow();
  });

  it('rejects a token signed with a different HMAC algorithm', () => {
    const hs512 = jwt.sign(payload, env.jwtSecret, { issuer: 'ore-delivery', algorithm: 'HS512' });
    expect(() => verifyToken(env, hs512)).toThrow(/invalid algorithm/i);
  });

  it('rejects a refresh token where an access token is required', () => {
    const { refreshToken } = signTokens(env, payload);
    expect(() => verifyToken(env, refreshToken)).toThrow('Refresh token is not an access token');
  });

  it('rejects an access token where a refresh token is required', () => {
    const { accessToken } = signTokens(env, payload);
    expect(() => verifyRefreshToken(env, accessToken)).toThrow('Invalid refresh token');
  });

  it('pins the algorithm on the refresh path too', () => {
    const hs512 = jwt.sign({ sub: 'user-1', typ: 'refresh' }, env.jwtSecret, {
      issuer: 'ore-delivery',
      algorithm: 'HS512',
    });
    expect(() => verifyRefreshToken(env, hs512)).toThrow(/invalid algorithm/i);
  });

  it('still rejects the wrong issuer and the wrong secret', () => {
    const wrongIssuer = jwt.sign(payload, env.jwtSecret, { issuer: 'somebody-else', algorithm: 'HS256' });
    expect(() => verifyToken(env, wrongIssuer)).toThrow();

    const wrongSecret = jwt.sign(payload, 'not-the-secret', { issuer: 'ore-delivery', algorithm: 'HS256' });
    expect(() => verifyToken(env, wrongSecret)).toThrow();
  });

  it('gives each refresh token a distinct jti so logout can revoke one session', () => {
    const a = verifyRefreshToken(env, signTokens(env, payload).refreshToken);
    const b = verifyRefreshToken(env, signTokens(env, payload).refreshToken);
    expect(a.jti).toBeTruthy();
    expect(a.jti).not.toBe(b.jti);
  });
});
