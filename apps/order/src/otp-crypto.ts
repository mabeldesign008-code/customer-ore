/**
 * Delivery-OTP encryption at rest.
 *
 * The delivery OTP is unlike auth's login OTP: the customer reads it aloud to the rider at the
 * door, so the server must be able to *reproduce* it, which rules out a one-way hash. It also
 * must not sit in the database as plaintext, since a database leak would otherwise let anyone
 * mark every in-flight order delivered. So: AES-256-GCM, and only this service holds the key.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

/**
 * Resolve the encryption key, or refuse to start.
 *
 * This used to end in `?? 'ore-otp-key'`. A literal fallback in an encryption path is worse than
 * no encryption, because it looks encrypted: with both env vars unset in production — a
 * misspelled key in a deployment manifest is enough — every delivery OTP in the database would be
 * sealed with a key printed in a source file, and nothing anywhere would say so. The ciphertext
 * would decrypt fine, tests would pass, and the column would look protected right up until
 * someone read the repo.
 *
 * Refusing to boot is the correct failure. An order service that will not start is a five-minute
 * incident with an obvious cause; silently-forgeable delivery confirmations are neither.
 */
export function resolveOtpKey(env: NodeJS.ProcessEnv = process.env): Buffer {
  const secret = env.OTP_ENC_KEY ?? env.JWT_SECRET;
  if (!secret || secret.trim().length === 0) {
    throw new Error(
      'OTP_ENC_KEY (or JWT_SECRET) must be set — refusing to start rather than encrypt delivery OTPs with a default key',
    );
  }
  // SHA-256 only to get a uniform 32 bytes from an arbitrary-length secret. It is not a KDF and
  // is not stretching anything: the input is already high-entropy config, not a password.
  return createHash('sha256').update(secret).digest();
}

/**
 * Cached because `encryptOtp`/`decryptOtp` sit on hot order paths and the key cannot change
 * without a restart anyway. Populated lazily so that importing this module does not throw —
 * the boot-time check belongs to the module's `onModuleInit`, where the error is legible.
 */
let cachedKey: Buffer | null = null;

export function otpKey(): Buffer {
  if (!cachedKey) cachedKey = resolveOtpKey();
  return cachedKey;
}

/** Test seam. Production never calls this. */
export function resetOtpKeyCache(): void {
  cachedKey = null;
}

export function encryptOtp(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', otpKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${enc.toString('base64')}`;
}

export function decryptOtp(payload: string): string {
  const [ivB64, tagB64, encB64] = payload.split('.');
  if (!ivB64 || !tagB64 || !encB64) throw new Error('Malformed OTP ciphertext');
  const decipher = createDecipheriv('aes-256-gcm', otpKey(), Buffer.from(ivB64, 'base64'));
  // GCM's auth tag is what makes this tamper-evident rather than merely unreadable. Without the
  // tag check, a corrupted or edited ciphertext would decrypt to plausible garbage; with it,
  // `final()` throws.
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(encB64, 'base64')), decipher.final()]).toString('utf8');
}
