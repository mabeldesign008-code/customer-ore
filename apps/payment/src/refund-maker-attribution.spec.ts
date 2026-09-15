jest.mock('typeorm-transactional', () => ({
  Transactional: () => (t: any, k: any, d: any) => d,
  initializeTransactionalContext: jest.fn(),
  addTransactionalDataSource: jest.fn(),
}));

const requireDualControl = jest.fn();
jest.mock('@ore/core', () => ({
  ...jest.requireActual('@ore/core'),
  requireDualControl: (...args: unknown[]) => requireDualControl(...args),
  executionRefFor: (kind: string, id: string) => `${kind}:${id}`,
}));

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createMockRepository } from '@ore/testing';
import { RefundApprovalService } from './refund-approval.service';
import { RefundRequest } from './entities/refund-request.entity';
import { Refund } from './entities/refund.entity';
import { PaymentService } from './payment.service';

/**
 * F-SEC-20 — a customer-raised refund let ONE finance admin pay themselves out.
 *
 * `approve()` recorded the dual-control maker as `row.raisedByUserId ?? user.sub`. That is correct
 * when an admin raises the request, and wrong the moment a customer does:
 * `POST /payments/refund-request` lets any customer raise a refund for the full order value, and
 * that stored the CUSTOMER as the maker.
 *
 * A customer can never sign an admin approval, so the gate was reduced to "one signature from
 * anybody who is not this customer" — and the finance admin calling `approve` is exactly that.
 * Their own signature satisfied the gate and the refund executed. The four-eyes control this
 * service's own docblock promises ("the approver cannot be the person who raised it") was absent
 * on the most common refund path in the product.
 *
 * Driven live in `tools/e2e/s2-money-out.cjs`: the self-signature was accepted with 201, while
 * the same self-signature on `withdrawal.approve` and `settlement.pay` was refused with 403.
 */
describe('RefundApprovalService.approve — dual-control maker attribution', () => {
  let service: RefundApprovalService;
  let module: TestingModule;
  let requests: ReturnType<typeof createMockRepository<RefundRequest>>;

  const FINANCE_ADMIN = 'admin-finance-1';
  const OTHER_ADMIN = 'admin-ops-2';
  const CUSTOMER = 'customer-9';

  /** The dual-control request object the service handed to the gate. */
  const gateRequest = () => requireDualControl.mock.calls[0][0] as { makerUserId: string };

  async function approveAs(user: string, row: Partial<RefundRequest>): Promise<void> {
    requests.findOne.mockResolvedValue({
      id: 'req-1',
      orderId: 'order-1',
      amountPesewas: 7738,
      reason: 'item missing from the bag',
      status: 'PENDING',
      refundComponent: 'UNSPECIFIED',
      originalTaxStatus: 'UNKNOWN',
      taxPeriodStatus: 'OPEN',
      ...row,
    } as RefundRequest);
    await service.approve({ sub: user, adminRole: 'super_admin' } as never, 'req-1', 'note');
  }

  beforeEach(async () => {
    requireDualControl.mockReset();
    requireDualControl.mockResolvedValue({ id: 'refund-1' });
    requests = createMockRepository<RefundRequest>();
    requests.save.mockImplementation((d: unknown) => Promise.resolve(d));

    module = await Test.createTestingModule({
      providers: [
        RefundApprovalService,
        { provide: getRepositoryToken(RefundRequest), useValue: requests },
        { provide: getRepositoryToken(Refund), useValue: createMockRepository<Refund>() },
        { provide: PaymentService, useValue: { refundOrder: jest.fn().mockResolvedValue({ id: 'refund-1' }) } },
      ],
    }).compile();
    service = module.get(RefundApprovalService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('names the approving admin as maker when a CUSTOMER raised the request', async () => {
    // The regression proper. With the customer as maker, the approving admin counted as the
    // independent second party and could sign alone.
    await approveAs(FINANCE_ADMIN, { raisedBy: 'customer', raisedByUserId: CUSTOMER });
    expect(gateRequest().makerUserId).toBe(FINANCE_ADMIN);
  });

  it('never names a customer as the maker of an admin approval', async () => {
    await approveAs(FINANCE_ADMIN, { raisedBy: 'customer', raisedByUserId: CUSTOMER });
    expect(gateRequest().makerUserId).not.toBe(CUSTOMER);
  });

  it('keeps the raising ADMIN as maker, so they cannot approve their own request', async () => {
    // The case the original code got right, and which the fix must not break: an admin who
    // raised a refund must still need somebody else to approve it.
    await approveAs(FINANCE_ADMIN, { raisedBy: 'admin', raisedByUserId: OTHER_ADMIN });
    expect(gateRequest().makerUserId).toBe(OTHER_ADMIN);
  });

  it('falls back to the approver when an admin-raised request has no recorded raiser', async () => {
    await approveAs(FINANCE_ADMIN, { raisedBy: 'admin', raisedByUserId: null });
    expect(gateRequest().makerUserId).toBe(FINANCE_ADMIN);
  });

  it('still passes the refund amount to the gate, so amount tiering keeps working', async () => {
    await approveAs(FINANCE_ADMIN, { raisedBy: 'customer', raisedByUserId: CUSTOMER });
    expect(requireDualControl.mock.calls[0][0]).toMatchObject({
      kind: 'refund.approve',
      amountPesewas: 7738,
      resourceId: 'req-1',
    });
  });
});
