import { loadEnv } from './env';

/**
 * F-PAY-1 — an unset `PAYSTACK_MODE` gave away free orders in production.
 *
 * `paystackMode` defaulted to `'mock'`, and in mock mode `PaymentService.initialize()` grants the
 * charge on the spot: the order is confirmed, a SUCCESS payment row is written, the vendor cooks
 * and the rider delivers, and no money ever moved. A k8s configmap typo, a new region, a `.env`
 * that was not copied — any of those and every prepaid order in production is free, with nothing
 * anywhere reporting a problem.
 *
 * `mockComplete` was already guarded against production, which is what makes this an oversight
 * rather than a decision: the same rule simply was not applied to the default or to the implicit
 * grant inside `initialize`.
 */
describe('loadEnv — PAYSTACK_MODE', () => {
  /** The minimum a production env needs before the paystack check is even reached. */
  const prodBase = {
    NODE_ENV: 'production',
    INTERNAL_SERVICE_KEY: 'a-real-production-internal-key-0001',
    JWT_SECRET: 'a-real-production-jwt-secret-0001',
    DATABASE_URL: 'postgres://ore:ore@127.0.0.1:5432/oredelivery',
  } as Record<string, string>;

  describe('the default follows the environment, safe side first', () => {
    it('defaults to live in production', () => {
      expect(loadEnv({ ...prodBase, PAYSTACK_MODE: undefined as unknown as string }).paystackMode).toBe('live');
    });

    it('still defaults to mock outside production, so local development needs no card', () => {
      expect(loadEnv({ ...prodBase, NODE_ENV: 'development' }).paystackMode).toBe('mock');
      expect(loadEnv({ ...prodBase, NODE_ENV: 'test' }).paystackMode).toBe('mock');
    });
  });

  describe('production refuses to run in mock mode at all', () => {
    it.each(['mock', 'MOCK ', ' mock'])('throws for PAYSTACK_MODE=%p', (mode) => {
      // Trimmed, because ` mock` from a copied configmap value is the same mistake.
      const attempt = () => loadEnv({ ...prodBase, PAYSTACK_MODE: mode });
      expect(attempt).toThrow(/PAYSTACK_MODE must be "live" in production/);
    });

    it('names the consequence in the error, not just the rule', () => {
      // Whoever hits this at 3am should not have to read the source to know why it matters.
      expect(() => loadEnv({ ...prodBase, PAYSTACK_MODE: 'mock' }))
        .toThrow(/without taking payment/);
    });

    it('rejects an unrecognised value rather than falling back to mock', () => {
      expect(() => loadEnv({ ...prodBase, PAYSTACK_MODE: 'sandbox' })).toThrow(/PAYSTACK_MODE must be "live"/);
    });

    it('accepts live', () => {
      expect(loadEnv({ ...prodBase, PAYSTACK_MODE: 'live' }).paystackMode).toBe('live');
    });
  });

  it('leaves mock available outside production', () => {
    expect(loadEnv({ ...prodBase, NODE_ENV: 'staging', PAYSTACK_MODE: 'mock' }).paystackMode).toBe('mock');
  });
});
