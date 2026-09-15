import { PaystackClient } from './client';

/**
 * F-PAY-2 — the mock `verify()` approved every reference it was ever shown.
 *
 * The code carried the comment "if never completed, report abandoned" and then returned
 * `{ status: 'success' }` unconditionally, for any string, including references that had never
 * been initialised. Verify-before-grant is the control that stops a forged webhook conjuring a
 * paid order out of nothing, so the effect was that the control could not be exercised in any
 * environment except live — every dev, test and staging run trivially passed it.
 */
describe('PaystackClient mock verify', () => {
  /** A non-production env, since production now refuses to run in mock mode at all. */
  const env = {
    NODE_ENV: 'development',
    PAYSTACK_MODE: 'mock',
    INTERNAL_SERVICE_KEY: 'dev-key-not-used-here-0001',
    JWT_SECRET: 'dev-jwt-secret-0001',
    DATABASE_URL: 'postgres://ore:ore@127.0.0.1:5432/oredelivery',
  } as Record<string, string>;

  const client = new PaystackClient(env);

  beforeEach(() => PaystackClient.resetMockPaid());
  afterAll(() => PaystackClient.resetMockPaid());

  it('reports abandoned for a reference that was never paid', async () => {
    // This is the case the old code got wrong, and the one that matters: an attacker naming a
    // reference nobody ever paid must not be told it succeeded.
    const v = await client.verify('ore-cc-never-initialised');
    expect(v.status).toBe('abandoned');
    expect(v.amountPesewas).toBe(0);
  });

  it('reports abandoned for a reference that was initialised but not completed', async () => {
    await client.initialize({
      reference: 'ore-cc-pending',
      amountPesewas: 7738,
      email: 'customer@example.com',
      currency: 'GHS',
    });
    // Initialising is not paying. Paystack calls this state abandoned, and so must the mock.
    expect((await client.verify('ore-cc-pending')).status).toBe('abandoned');
  });

  it('reports success only once the reference is marked paid', async () => {
    PaystackClient.markMockPaid('ore-cc-paid', 7738, 'GHS');
    const v = await client.verify('ore-cc-paid');
    expect(v.status).toBe('success');
    expect(v.amountPesewas).toBe(7738);
    expect(v.currency).toBe('GHS');
  });

  it('returns the amount that was actually paid, so amount tampering is detectable', async () => {
    // The old mock returned amountPesewas: 0 for everything, which would defeat any
    // caller comparing the verified amount against the amount it expected.
    PaystackClient.markMockPaid('ore-cc-amount', 500, 'GHS');
    expect((await client.verify('ore-cc-amount')).amountPesewas).toBe(500);
  });

  it('keeps references separate — paying one does not vouch for another', async () => {
    PaystackClient.markMockPaid('ore-cc-a', 100, 'GHS');
    expect((await client.verify('ore-cc-a')).status).toBe('success');
    expect((await client.verify('ore-cc-b')).status).toBe('abandoned');
  });
});
