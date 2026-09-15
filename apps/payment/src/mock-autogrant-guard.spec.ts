jest.mock('typeorm-transactional', () => ({
  Transactional: () => (target: any, key: any, descriptor: any) => descriptor,
  initializeTransactionalContext: jest.fn(),
  addTransactionalDataSource: jest.fn(),
}));
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CheckoutPayment } from './entities/checkout-payment.entity';
import { PaymentAllocation } from './entities/payment-allocation.entity';
import { Refund } from './entities/refund.entity';
import { PaymentProcessorRecord } from './entities/payment-processor-record.entity';
import { ORE_BUS, ORE_ENV, ORE_PAYSTACK, ORE_SCHEDULER } from '@ore/core';
import { createMockRepository } from '@ore/testing';
import { PaystackClient } from '@ore/paystack';

/**
 * F-PAY-1 (second lock) — `initialize()` granted mock charges with no production guard.
 *
 * In mock mode `initialize()` calls `handleChargeSuccess` immediately: order confirmed, payment
 * row SUCCESS, vendor cooking, rider dispatched, no money taken. `mockComplete` refuses to do
 * this when `NODE_ENV=production`; `initialize` did not, so a production process that came up in
 * mock mode gave orders away and looked healthy doing it.
 *
 * `loadEnv` now refuses to boot that combination, which is the real fix. This is the belt to that
 * pair of braces, because the blast radius is "all revenue" and the two guards fail independently.
 */
describe('PaymentService.initialize — mock auto-grant guard', () => {
  let service: PaymentService;
  let module: TestingModule;
  let mockPaystack: { initialize: jest.Mock; verify: jest.Mock; transfer: jest.Mock; transferToRecipient: jest.Mock; createRecipient: jest.Mock; refund: jest.Mock; getTransferStatus: jest.Mock };
  let mockEnv: Record<string, unknown>;
  let paymentRepo: ReturnType<typeof createMockRepository<CheckoutPayment>>;

  const params = {
    checkoutId: 'checkout-1',
    amountPesewas: 7738,
    phone: '0501234567',
    allocations: [{ orderId: 'order-1', allocatedPesewas: 7738 }],
  };

  /** Boot the service with a given NODE_ENV, everything else held constant. */
  async function build(nodeEnv: string): Promise<void> {
    paymentRepo = createMockRepository<CheckoutPayment>();
    const allocationRepo = createMockRepository<PaymentAllocation>();
    const refundRepo = createMockRepository<Refund>();
    const processorRepo = createMockRepository<PaymentProcessorRecord>();
    for (const r of [paymentRepo, allocationRepo, refundRepo, processorRepo]) {
      (r.create as jest.Mock).mockImplementation((d: unknown) => d);
      (r.save as jest.Mock).mockImplementation((d: unknown) => Promise.resolve(d));
    }
    paymentRepo.save.mockImplementation((d: any) => Promise.resolve({ id: 'payment-1', ...d }));
    // The auto-grant re-reads the payment by reference, so hand back whatever was asked for.
    paymentRepo.findOne.mockImplementation((opts: any) =>
      Promise.resolve({
        id: 'payment-1',
        checkoutId: params.checkoutId,
        reference: opts?.where?.reference,
        amountPesewas: params.amountPesewas,
        currency: 'GHS',
        status: 'INITIATED',
        channel: 'mock',
      } as unknown as CheckoutPayment),
    );
    processorRepo.find.mockResolvedValue([]);

    mockPaystack = {
      initialize: jest.fn().mockResolvedValue({ authorizationUrl: null, mode: 'mock' }),
      verify: jest.fn(),
      transfer: jest.fn(),
      transferToRecipient: jest.fn(),
      createRecipient: jest.fn(),
      refund: jest.fn(),
      getTransferStatus: jest.fn(),
    };
    mockEnv = { nodeEnv, paystackRefPrefix: 'ORE-TEST', paystackCurrency: 'GHS', paystackMode: 'mock', paystackSecretKey: 'test-secret', otpTtlMin: 5 };

    module = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: getRepositoryToken(CheckoutPayment), useValue: paymentRepo },
        { provide: getRepositoryToken(PaymentAllocation), useValue: allocationRepo },
        { provide: getRepositoryToken(Refund), useValue: refundRepo },
        { provide: getRepositoryToken(PaymentProcessorRecord), useValue: processorRepo },
        { provide: ORE_ENV, useValue: mockEnv },
        { provide: ORE_BUS, useValue: { publish: jest.fn().mockResolvedValue(undefined), flush: jest.fn().mockResolvedValue(undefined) } },
        { provide: ORE_PAYSTACK, useValue: mockPaystack },
        { provide: ORE_SCHEDULER, useValue: { onInterval: jest.fn() } },
      ],
    }).compile();
    service = module.get(PaymentService);
  }

  beforeEach(() => PaystackClient.resetMockPaid());
  afterEach(async () => {
    await module?.close();
    PaystackClient.resetMockPaid();
  });

  it('refuses to auto-complete a mock charge when NODE_ENV=production', async () => {
    await build('production');
    await expect(service.initialize(params)).rejects.toThrow(/Refusing to auto-complete a mock charge in production/);
  });

  it('does not mark the reference paid when it refuses', async () => {
    await build('production');
    await service.initialize(params).catch(() => undefined);
    // A rejected grant must leave no trace that would let a later verify() call believe it.
    const client = new PaystackClient({
      NODE_ENV: 'development',
      PAYSTACK_MODE: 'mock',
      INTERNAL_SERVICE_KEY: 'dev-key-0001',
      JWT_SECRET: 'dev-jwt-0001',
      DATABASE_URL: 'postgres://ore:ore@127.0.0.1:5432/oredelivery',
    });
    const ref = (paymentRepo.create as jest.Mock).mock.calls[0]?.[0]?.reference as string;
    expect(ref).toBeTruthy();
    expect((await client.verify(ref)).status).toBe('abandoned');
  });

  it('still auto-completes outside production, so local development keeps working', async () => {
    await build('development');
    const result = await service.initialize(params);
    expect(result.mode).toBe('mock');
    expect(result.reference).toContain('ORE-TEST');
  });

  it('marks the reference paid outside production, so verify agrees with the payment row', async () => {
    await build('development');
    const { reference } = await service.initialize(params);
    const client = new PaystackClient({
      NODE_ENV: 'development',
      PAYSTACK_MODE: 'mock',
      INTERNAL_SERVICE_KEY: 'dev-key-0001',
      JWT_SECRET: 'dev-jwt-0001',
      DATABASE_URL: 'postgres://ore:ore@127.0.0.1:5432/oredelivery',
    });
    const v = await client.verify(reference);
    expect(v.status).toBe('success');
    expect(v.amountPesewas).toBe(params.amountPesewas);
  });

  it('never auto-grants when Paystack reports live mode, whatever the environment', async () => {
    await build('development');
    mockPaystack.initialize.mockResolvedValue({ authorizationUrl: 'https://paystack.test/pay/xyz', mode: 'live' });
    const { reference, paystackUrl } = await service.initialize(params);
    expect(paystackUrl).toBe('https://paystack.test/pay/xyz');
    const client = new PaystackClient({
      NODE_ENV: 'development',
      PAYSTACK_MODE: 'mock',
      INTERNAL_SERVICE_KEY: 'dev-key-0001',
      JWT_SECRET: 'dev-jwt-0001',
      DATABASE_URL: 'postgres://ore:ore@127.0.0.1:5432/oredelivery',
    });
    expect((await client.verify(reference)).status).toBe('abandoned');
  });
});
