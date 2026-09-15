import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { OrderStatus, Role } from '@ore/contracts';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { OrderService } from './order.service';

jest.mock('typeorm-transactional', () => ({
  Transactional: () => () => {}, // Mock decorator
  initializeTransactionalContext: jest.fn(),
}));

const vendorUser = { sub: 'vendor-owner', role: Role.VENDOR, phone: '+233241234567' };

function makeOrder(overrides: Record<string, unknown> = {}): any {
  return {
    id: 'order-1',
    vendorId: 'vendor-1',
    vendorType: 'FOOD',
    serviceCode: 'FO',
    status: OrderStatus.CONFIRMED,
    prescriptionStatus: 'NOT_REQUIRED',
    prescriptionReviewNote: null,
    createdAt: new Date('2026-08-16T10:00:00Z'),
    prepTimeMin: 10,
    checkoutId: 'checkout-1',
    customerId: 'customer-1',
    paymentMethod: 'PREPAID',
    totalPesewas: 5000,
    ref: 'ORO-FO-0001',
    ...overrides,
  };
}

function makeService(order: any): any {
  const service = Object.create(OrderService.prototype) as any;
  service.orders = {
    findOne: jest.fn().mockResolvedValue(order),
    save: jest.fn().mockImplementation(async (value: any) => value),
  };
  service.orderItems = {
    find: jest.fn().mockResolvedValue([]),
  };
  service.events = {
    create: jest.fn((value: any) => value),
    save: jest.fn().mockResolvedValue(undefined),
    find: jest.fn().mockResolvedValue([]),
  };
  service.issues = {
    create: jest.fn((value: any) => value),
    save: jest.fn().mockImplementation(async (value: any) => ({ id: 'issue-1', ...value })),
    find: jest.fn().mockResolvedValue([]),
  };
  service.scheduler = {
    cancel: jest.fn().mockResolvedValue(undefined),
    schedule: jest.fn().mockResolvedValue(undefined),
    onProcess: jest.fn(),
  };
  service.bus = { publish: jest.fn().mockResolvedValue(undefined) };
  // Audit M-2: SLA knobs now come from the injected OreEnv instead of raw process.env.
  service.env = { vendorAcceptSlaSec: 180, vendorAutoCancelSec: 300 };
  service.vendorOwns = jest.fn().mockResolvedValue(true);
  service.reserveCatalogStock = jest.fn().mockResolvedValue(undefined);
  service.releaseCatalogStock = jest.fn().mockResolvedValue(undefined);
  service.releaseCatalogPromotion = jest.fn().mockResolvedValue(undefined);
  service.consumeCatalogStock = jest.fn().mockResolvedValue(undefined);
  service.getOrder = jest.fn().mockResolvedValue({ orderId: order.id, status: order.status });
  return service;
}

describe('Vendor order operations', () => {
  it('does not accept a prescription order before approval', async () => {
    const service = makeService(makeOrder({ prescriptionStatus: 'SUBMITTED' }));
    await expect(service.accept(vendorUser, 'order-1')).rejects.toBeInstanceOf(ConflictException);
    expect(service.scheduler.cancel).not.toHaveBeenCalled();
  });

  it('accepts an approved order and advances it through preparation', async () => {
    const order = makeOrder({ prescriptionStatus: 'APPROVED' });
    const service = makeService(order);
    await service.accept(vendorUser, order.id);
    expect(order.status).toBe(OrderStatus.PREPARING);
    expect(service.scheduler.cancel).toHaveBeenCalled();
    expect(service.scheduler.schedule).toHaveBeenCalledWith('auto-ready', expect.anything(), 10 * 60_000, expect.any(String));
    expect(service.bus.publish).toHaveBeenCalled();
  });

  it('allows a Vendor to review only its submitted prescription', async () => {
    const order = makeOrder({ prescriptionStatus: 'SUBMITTED' });
    const service = makeService(order);
    await service.reviewPrescription(vendorUser, order.id, true, 'Verified by pharmacist');
    expect(order.prescriptionStatus).toBe('APPROVED');
    expect(order.prescriptionReviewNote).toBe('Verified by pharmacist');

    order.prescriptionStatus = 'APPROVED';
    await expect(service.reviewPrescription(vendorUser, order.id, false)).rejects.toBeInstanceOf(ConflictException);
  });

  it('authorizes laundry condition logs only for a pre-pickup laundry order', async () => {
    const nonLaundry = makeService(makeOrder({ vendorType: 'FOOD' }));
    await expect(nonLaundry.recordLaundryCondition(vendorUser, 'order-1', { stains: 'none' })).rejects.toBeInstanceOf(BadRequestException);

    const laundryOrder = makeOrder({ vendorType: 'LAUNDRY', serviceCode: 'LD' });
    const laundry = makeService(laundryOrder);
    await laundry.recordLaundryCondition(vendorUser, laundryOrder.id, { stains: 'none', receivedAt: '2026-08-16T11:00:00Z' });
    expect(laundryOrder.conditionJson).toMatchObject({ stains: 'none' });

    laundryOrder.status = OrderStatus.READY_FOR_PICKUP;
    await expect(laundry.recordLaundryCondition(vendorUser, laundryOrder.id, { stains: 'none' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('records measured quantities only for a market order item', async () => {
    const order = makeOrder({ vendorType: 'MARKET', serviceCode: 'MK' });
    const service = makeService(order);
    service.orderItems.find.mockResolvedValue([{ id: 'order-item-1', orderId: order.id }]);
    await service.recordMarketFulfillment(vendorUser, order.id, [{ orderItemId: 'order-item-1', actualQuantity: 1.5, unit: 'kg', actualPricePesewas: 2500 }]);
    expect(order.marketFulfillmentJson.lines[0]).toMatchObject({ orderItemId: 'order-item-1', actualQuantity: 1.5, unit: 'kg', actualPricePesewas: 2500 });

    order.vendorType = 'FOOD';
    order.serviceCode = 'FO';
    await expect(service.recordMarketFulfillment(vendorUser, order.id, [{ orderItemId: 'order-item-1', actualQuantity: 1, unit: 'kg' }])).rejects.toBeInstanceOf(BadRequestException);
  });

  it('enforces Vendor ownership for direct order detail reads', async () => {
    const service = makeService(makeOrder());
    service.getOrder = OrderService.prototype.getOrder;
    service.vendorOwns.mockResolvedValue(false);
    await expect(service.getOrder('order-1', vendorUser)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('advances laundry stages in order and rejects skipping stages', async () => {
    const order = makeOrder({ vendorType: 'LAUNDRY', serviceCode: 'LD', laundryStage: 'AWAITING_COLLECTION', status: OrderStatus.OUT_FOR_DELIVERY });
    const service = makeService(order);
    await service.updateLaundryStage(vendorUser, order.id, 'COLLECTED');
    expect(order.laundryStage).toBe('COLLECTED');
    await expect(service.updateLaundryStage(vendorUser, order.id, 'RETURNED')).rejects.toBeInstanceOf(ConflictException);
  });

  it('enforces Vendor ownership for issue reports', async () => {
    const service = makeService(makeOrder());
    service.vendorOwns.mockResolvedValue(false);
    await expect(service.reportIssue(vendorUser, 'order-1', 'WRONG_ITEMS')).rejects.toBeInstanceOf(ForbiddenException);

    service.vendorOwns.mockResolvedValue(true);
    const issue = await service.reportIssue(vendorUser, 'order-1', 'WRONG_ITEMS', 'One item was missing');
    expect(issue).toMatchObject({ orderId: 'order-1', vendorId: 'vendor-1', category: 'WRONG_ITEMS', status: 'OPEN' });
  });
});
