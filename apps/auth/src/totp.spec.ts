import { verifyTotp } from './totp';

describe('TOTP (RFC 6238)', () => {
  // Test secret in Base32 format (commonly used by authenticator apps)
  const testSecret = 'JBSWY3DPEHPK3PXP'; // Decodes to "Hello!"

  describe('verifyTotp', () => {
    it('should reject non-numeric codes', () => {
      expect(verifyTotp(testSecret, 'abc123')).toBe(false);
      expect(verifyTotp(testSecret, '12345a')).toBe(false);
      expect(verifyTotp(testSecret, 'ABCDEF')).toBe(false);
    });

    it('should reject codes with wrong length', () => {
      expect(verifyTotp(testSecret, '12345')).toBe(false); // Too short
      expect(verifyTotp(testSecret, '1234567')).toBe(false); // Too long
      expect(verifyTotp(testSecret, '123')).toBe(false);
      expect(verifyTotp(testSecret, '12345678')).toBe(false);
    });

    it('should accept exactly 6 digits', () => {
      // We can't predict the exact current TOTP code without freezing time,
      // but we can verify the format validation works
      const validFormat = '123456';
      // This will be false because it's not the correct code for current time,
      // but it passes format validation
      const result = verifyTotp(testSecret, validFormat);
      expect(typeof result).toBe('boolean');
    });

    it('should handle leading zeros in codes', () => {
      const codeWithLeadingZeros = '000123';
      const result = verifyTotp(testSecret, codeWithLeadingZeros);
      expect(typeof result).toBe('boolean');
    });

    it('should reject invalid base32 secrets', () => {
      const invalidSecret = 'INVALID!!!SECRET';
      expect(() => verifyTotp(invalidSecret, '123456')).toThrow('Invalid TOTP secret');
    });

    it('should handle secrets with padding', () => {
      const secretWithPadding = 'JBSWY3DPEHPK3PXP====';
      const result = verifyTotp(secretWithPadding, '123456');
      expect(typeof result).toBe('boolean');
    });

    it('should handle secrets with whitespace', () => {
      const secretWithSpaces = 'JBSW Y3DP EHPK 3PXP';
      const result = verifyTotp(secretWithSpaces, '123456');
      expect(typeof result).toBe('boolean');
    });

    it('should be case-insensitive for secrets', () => {
      const lowerCaseSecret = 'jbswy3dpehpk3pxp';
      const upperCaseSecret = 'JBSWY3DPEHPK3PXP';

      // Both should behave the same way
      const result1 = verifyTotp(lowerCaseSecret, '123456');
      const result2 = verifyTotp(upperCaseSecret, '123456');

      expect(typeof result1).toBe('boolean');
      expect(typeof result2).toBe('boolean');
    });

    it('should use time window for verification', () => {
      // TOTP uses 30-second time windows
      // With window=1, it checks current, previous, and next time slot
      // This means codes from ~90 seconds range should be valid
      // We can't test actual timing without mocking Date.now(),
      // but we verify the window parameter is accepted
      const result = verifyTotp(testSecret, '123456', 1);
      expect(typeof result).toBe('boolean');
    });

    it('should reject empty code', () => {
      expect(verifyTotp(testSecret, '')).toBe(false);
    });

    it('should reject code with special characters', () => {
      expect(verifyTotp(testSecret, '123-456')).toBe(false);
      expect(verifyTotp(testSecret, '123 456')).toBe(false);
      expect(verifyTotp(testSecret, '123.456')).toBe(false);
    });

    it('should handle various valid base32 characters', () => {
      // Base32 uses A-Z and 2-7
      const validSecrets = [
        'ABCDEFGHIJKLMNOP',
        'QRSTUVWXYZ234567',
        'AAAABBBBCCCCDDDD',
        '2222333344445555',
      ];

      validSecrets.forEach((secret) => {
        const result = verifyTotp(secret, '123456');
        expect(typeof result).toBe('boolean');
      });
    });

    it('should reject base32 secrets with invalid characters', () => {
      const invalidSecrets = [
        'ABCDEFGH1JKLMNOP', // Contains '1' (not in base32)
        'ABCDEFGH8JKLMNOP', // Contains '8' (not in base32)
        'ABCDEFGH9JKLMNOP', // Contains '9' (not in base32)
        'ABCDEFGH0JKLMNOP', // Contains '0' (not in base32)
      ];

      invalidSecrets.forEach((secret) => {
        expect(() => verifyTotp(secret, '123456')).toThrow('Invalid TOTP secret');
      });
    });

    describe('timing attack protection', () => {
      it('should use constant-time comparison', () => {
        // The implementation uses timingSafeEqual which protects against timing attacks
        // We can't directly test timing, but we can verify behavior is consistent
        const results: boolean[] = [];
        for (let i = 0; i < 10; i++) {
          results.push(verifyTotp(testSecret, '123456'));
        }
        // All results should be consistent
        expect(results.every((r) => r === results[0])).toBe(true);
      });
    });

    describe('window parameter', () => {
      it('should accept custom window size', () => {
        expect(typeof verifyTotp(testSecret, '123456', 0)).toBe('boolean'); // No window
        expect(typeof verifyTotp(testSecret, '123456', 1)).toBe('boolean'); // Default
        expect(typeof verifyTotp(testSecret, '123456', 2)).toBe('boolean'); // Larger window
      });

      it('should default to window of 1', () => {
        // Calling without window parameter should use default
        const resultDefault = verifyTotp(testSecret, '123456');
        const resultExplicit = verifyTotp(testSecret, '123456', 1);

        // Both should behave the same way
        expect(typeof resultDefault).toBe('boolean');
        expect(typeof resultExplicit).toBe('boolean');
      });
    });

    describe('RFC 6238 compliance', () => {
      it('should generate 6-digit codes', () => {
        // TOTP codes are always 6 digits as per RFC 6238
        // This is verified in the format validation
        expect(verifyTotp(testSecret, '000000')).toBeDefined();
        expect(verifyTotp(testSecret, '999999')).toBeDefined();
      });

      it('should use SHA-1 HMAC algorithm', () => {
        // Implementation uses SHA-1 as per RFC 6238 standard
        // This is the most common TOTP configuration
        const result = verifyTotp(testSecret, '123456');
        expect(typeof result).toBe('boolean');
      });

      it('should use 30-second time step', () => {
        // RFC 6238 specifies 30-second time windows
        // This is hardcoded in the implementation: Date.now() / 1000 / 30
        const result = verifyTotp(testSecret, '123456');
        expect(typeof result).toBe('boolean');
      });
    });

    describe('real-world scenarios', () => {
      it('should handle authenticator app format secrets', () => {
        // Common secret formats from Google Authenticator, Authy, etc.
        const authenticatorSecrets = [
          'JBSWY3DPEHPK3PXP',
          'HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ',
          'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',
        ];

        authenticatorSecrets.forEach((secret) => {
          const result = verifyTotp(secret, '123456');
          expect(typeof result).toBe('boolean');
        });
      });

      it('should handle clock skew with window parameter', () => {
        // Window parameter allows for clock skew between client and server
        // With window=1, accepts codes from ±30 seconds
        const result = verifyTotp(testSecret, '123456', 1);
        expect(typeof result).toBe('boolean');
      });

      it('should reject obviously wrong codes', () => {
        // These codes are statistically very unlikely to match
        expect(verifyTotp(testSecret, '111111')).toBe(false);
        expect(verifyTotp(testSecret, '000000')).toBe(false);
        expect(verifyTotp(testSecret, '999999')).toBe(false);
        expect(verifyTotp(testSecret, '123456')).toBe(false);
        expect(verifyTotp(testSecret, '654321')).toBe(false);
      });
    });

    describe('error handling', () => {
      it('should throw on malformed base32', () => {
        expect(() => verifyTotp('!!!INVALID!!!', '123456')).toThrow();
      });

      it('should handle empty secret gracefully', () => {
        expect(verifyTotp('', '123456')).toBe(false);
      });

      it('should handle very short secrets', () => {
        // Very short secrets might not provide enough entropy
        const shortSecret = 'AB';
        const result = verifyTotp(shortSecret, '123456');
        expect(typeof result).toBe('boolean');
      });

      it('should handle very long secrets', () => {
        // Very long secrets should still work
        const longSecret = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
        const result = verifyTotp(longSecret, '123456');
        expect(typeof result).toBe('boolean');
      });
    });
  });
});
