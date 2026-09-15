/** RFC 6238 TOTP (SHA-1, 30s, 6 digits). No extra dependency. */

import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

function base32Decode(input: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = input.toUpperCase().replace(/=+$/g, '').replace(/\s+/g, '');
  let bits = '';
  for (const ch of clean) {
    const val = alphabet.indexOf(ch);
    if (val < 0) throw new Error('Invalid TOTP secret');
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3];
  return String(code % 1_000_000).padStart(6, '0');
}

export function verifyTotp(secretBase32: string, code: string, window = 1): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const secret = base32Decode(secretBase32);
  const now = Math.floor(Date.now() / 1000 / 30);
  const provided = Buffer.from(code);
  for (let w = -window; w <= window; w++) {
    const candidate = Buffer.from(hotp(secret, now + w));
    if (candidate.length === provided.length && timingSafeEqual(candidate, provided)) return true;
  }
  return false;
}

/* ─────────────────────── enrolment (Phase 1) ─────────────────────── */

const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** 20 random bytes → 32-character base32, the usual authenticator-app secret shape. */
export function generateTotpSecret(bytes = 20): string {
  const buf = randomBytes(bytes);
  let bits = '';
  for (const b of buf) bits += b.toString(2).padStart(8, '0');
  let out = '';
  for (let i = 0; i + 5 <= bits.length; i += 5) out += B32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}

/**
 * The otpauth:// URI an authenticator app scans. Never returns the secret to a client
 * that has not authenticated — the caller is the admin's own first-login session.
 */
export function totpOtpauthUrl(opts: { secret: string; account: string; issuer?: string; period?: number; digits?: number }): string {
  const issuer = opts.issuer ?? 'Ore';
  const label = `${issuer}:${opts.account}`;
  const params = new URLSearchParams({
    secret: opts.secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(opts.digits ?? 6),
    period: String(opts.period ?? 30),
  });
  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
}
