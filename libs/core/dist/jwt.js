"use strict";
/** JWT sign/verify — used by auth-service (sign) and every service (verify). */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signTokens = signTokens;
exports.verifyToken = verifyToken;
exports.verifyRefreshToken = verifyRefreshToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = require("crypto");
/**
 * The one algorithm this system signs and accepts.
 *
 * Pinned on *verify*, not just sign. `jsonwebtoken` otherwise trusts the `alg` header of the
 * token it is checking, which is attacker-controlled: a token forged with `alg: none` — or, when
 * the secret is a string, one signed with an asymmetric algorithm — can be made to validate. The
 * fix is to state the expected algorithm rather than let the token choose it.
 */
const ALGORITHMS = ['HS256'];
function signTokens(env, payload) {
    const base = { issuer: 'ore-delivery', algorithm: 'HS256' };
    const accessToken = jsonwebtoken_1.default.sign(payload, env.jwtSecret, {
        ...base,
        expiresIn: env.jwtExpiresIn,
    });
    // Each refresh token gets a unique jti so it can be individually revoked on logout
    // (F-SEC-13). The old stateless refresh token stayed valid 30 days after logout.
    const refreshToken = jsonwebtoken_1.default.sign({ sub: payload.sub, typ: 'refresh', jti: (0, crypto_1.randomUUID)() }, env.jwtSecret, { ...base, expiresIn: '30d' });
    return { accessToken, refreshToken };
}
function verifyToken(env, token) {
    const decoded = jsonwebtoken_1.default.verify(token, env.jwtSecret, { issuer: 'ore-delivery', algorithms: ALGORITHMS });
    if (decoded.typ === 'refresh') {
        throw new Error('Refresh token is not an access token');
    }
    return decoded;
}
function verifyRefreshToken(env, token) {
    const decoded = jsonwebtoken_1.default.verify(token, env.jwtSecret, { issuer: 'ore-delivery', algorithms: ALGORITHMS });
    if (!decoded.sub || decoded.typ !== 'refresh') {
        throw new Error('Invalid refresh token');
    }
    return { sub: decoded.sub, jti: decoded.jti };
}
//# sourceMappingURL=jwt.js.map