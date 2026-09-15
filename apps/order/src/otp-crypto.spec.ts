import { decryptOtp, encryptOtp, resolveOtpKey, resetOtpKeyCache } from './otp-crypto';

describe('delivery OTP encryption at rest', () => {
  const ORIGINAL = { ...process.env };

  beforeEach(() => {
    resetOtpKeyCache();
    process.env.OTP_ENC_KEY = 'a-real-configured-otp-key';
  });

  afterEach(() => {
    process.env = { ...ORIGINAL };
    resetOtpKeyCache();
  });

  describe('resolveOtpKey', () => {
    it('prefers OTP_ENC_KEY', () => {
      const key = resolveOtpKey({ OTP_ENC_KEY: 'dedicated', JWT_SECRET: 'shared' } as NodeJS.ProcessEnv);
      expect(key).toEqual(resolveOtpKey({ OTP_ENC_KEY: 'dedicated' } as NodeJS.ProcessEnv));
    });

    it('falls back to JWT_SECRET, which every service already carries', () => {
      expect(() => resolveOtpKey({ JWT_SECRET: 'shared' } as NodeJS.ProcessEnv)).not.toThrow();
    });

    it('always returns 32 bytes, whatever the secret length', () => {
      for (const secret of ['x', 'y'.repeat(1000)]) {
        expect(resolveOtpKey({ OTP_ENC_KEY: secret } as NodeJS.ProcessEnv)).toHaveLength(32);
      }
    });

    it('refuses to start when neither variable is set', () => {
      // This used to end in `?? 'ore-otp-key'`. A literal fallback in an encryption path is
      // worse than no encryption, because it looks encrypted: with both variables unset — one
      // misspelled key in a deployment manifest — every delivery OTP in the database would be
      // sealed with a key printed in a source file, and nothing would say so. Ciphertext would
      // decrypt fine and the column would look protected right up until someone read the repo.
      expect(() => resolveOtpKey({} as NodeJS.ProcessEnv)).toThrow(/refusing to start/);
    });

    it('refuses a blank secret, not just a missing one', () => {
      expect(() => resolveOtpKey({ OTP_ENC_KEY: '   ' } as NodeJS.ProcessEnv)).toThrow(/refusing to start/);
      expect(() => resolveOtpKey({ OTP_ENC_KEY: '', JWT_SECRET: '' } as NodeJS.ProcessEnv)).toThrow(/refusing to start/);
    });

    it('derives different keys from different secrets', () => {
      expect(resolveOtpKey({ OTP_ENC_KEY: 'a' } as NodeJS.ProcessEnv))
        .not.toEqual(resolveOtpKey({ OTP_ENC_KEY: 'b' } as NodeJS.ProcessEnv));
    });
  });

  describe('round trip', () => {
    it('recovers the plaintext, because the rider must hear the real code', () => {
      expect(decryptOtp(encryptOtp('4821'))).toBe('4821');
    });

    it('preserves leading zeros', () => {
      // Losing these would silently turn '0042' into '42' and fail the handover at the door.
      expect(decryptOtp(encryptOtp('0042'))).toBe('0042');
    });

    it('never stores the plaintext in the ciphertext', () => {
      expect(encryptOtp('4821')).not.toContain('4821');
    });

    it('produces different ciphertext each time for the same code', () => {
      // A fixed IV would make the ciphertext a stable fingerprint of the code: 9 000 possible
      // OTPs, so equal ciphertexts across orders would leak equal codes and the table becomes a
      // frequency-analysis exercise.
      expect(encryptOtp('4821')).not.toBe(encryptOtp('4821'));
    });

    it('emits iv.tag.ciphertext', () => {
      const parts = encryptOtp('4821').split('.');
      expect(parts).toHaveLength(3);
      expect(Buffer.from(parts[0], 'base64')).toHaveLength(12);
      expect(Buffer.from(parts[1], 'base64')).toHaveLength(16);
    });
  });

  describe('tamper resistance', () => {
    it('rejects a modified ciphertext instead of returning plausible garbage', () => {
      const [iv, tag, enc] = encryptOtp('4821').split('.');
      const flipped = Buffer.from(enc, 'base64');
      flipped[0] ^= 0xff;
      expect(() => decryptOtp(`${iv}.${tag}.${flipped.toString('base64')}`)).toThrow();
    });

    it('rejects a forged auth tag', () => {
      const [iv, , enc] = encryptOtp('4821').split('.');
      expect(() => decryptOtp(`${iv}.${Buffer.alloc(16).toString('base64')}.${enc}`)).toThrow();
    });

    it('rejects a malformed payload', () => {
      expect(() => decryptOtp('nonsense')).toThrow('Malformed OTP ciphertext');
      expect(() => decryptOtp('a.b')).toThrow('Malformed OTP ciphertext');
      expect(() => decryptOtp('')).toThrow('Malformed OTP ciphertext');
    });

    it('cannot be decrypted with a different key', () => {
      const cipher = encryptOtp('4821');
      resetOtpKeyCache();
      process.env.OTP_ENC_KEY = 'a-completely-different-key';
      expect(() => decryptOtp(cipher)).toThrow();
    });
  });
});
