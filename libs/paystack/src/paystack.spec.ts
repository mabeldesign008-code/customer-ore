import { computeSignature, verifyWebhookSignature } from './webhook';

describe('paystack webhook signature (G06)', () => {
  const secret = 'sk_test_abcdef123456';
  const body = JSON.stringify({ event: 'charge.success', data: { reference: 'ore-cc-1', amount: 5000 } });

  it('computes a valid HMAC-SHA512 over the raw body', () => {
    const sig = computeSignature(secret, body);
    expect(sig).toMatch(/^[0-9a-f]{128}$/); // sha512 hex
    expect(verifyWebhookSignature(secret, body, sig)).toBe(true);
  });

  it('rejects tampered body', () => {
    const sig = computeSignature(secret, body);
    const tampered = body.replace('5000', '9999');
    expect(verifyWebhookSignature(secret, tampered, sig)).toBe(false);
  });

  it('rejects wrong key', () => {
    const sig = computeSignature('other_key', body);
    expect(verifyWebhookSignature(secret, body, sig)).toBe(false);
  });

  it('rejects missing signature', () => {
    expect(verifyWebhookSignature(secret, body, undefined)).toBe(false);
  });
});
