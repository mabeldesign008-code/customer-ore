import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderEvent } from './entities/order-event.entity';
import { OrderIssue } from './entities/order-issue.entity';
import { ORE_BUS, ORE_ENV, ORE_NOTIFY, ORE_SCHEDULER, ORE_STORAGE } from '@ore/core';
import { createMockRepository } from '@ore/testing';
import { OrderSequence } from './entities/order-sequence.entity';
import { OrderAddressAudit } from './entities/order-address-audit.entity';

/**
 * `setRiderFee` used to overwrite. Multi-leg orders dispatch more than once, so the second
 * write erased the first and the order looked cheaper than it was — which is how the laundry
 * collection rider ended up unpaid. It now accumulates when asked to.
 */
describe('OrderService.setRiderFee', () => {
  let service: OrderService;
  let orders: ReturnType<typeof createMockRepository<Order>>;

  beforeEach(async () => {
    orders = createMockRepository<Order>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: getRepositoryToken(Order), useValue: orders },
        { provide: getRepositoryToken(OrderItem), useValue: createMockRepository<OrderItem>() },
        { provide: getRepositoryToken(OrderEvent), useValue: createMockRepository<OrderEvent>() },
        { provide: getRepositoryToken(OrderSequence), useValue: createMockRepository<OrderSequence>() },
        { provide: getRepositoryToken(OrderIssue), useValue: createMockRepository<OrderIssue>() },
        { provide: getRepositoryToken(OrderAddressAudit), useValue: createMockRepository<OrderAddressAudit>() },
        { provide: ORE_BUS, useValue: { publish: jest.fn().mockResolvedValue(undefined) } },
        { provide: ORE_SCHEDULER, useValue: { onInterval: jest.fn(), onProcess: jest.fn(), schedule: jest.fn(), cancel: jest.fn() } },
        { provide: ORE_STORAGE, useValue: { upload: jest.fn(), getUrl: jest.fn() } },
        { provide: ORE_NOTIFY, useValue: { send: jest.fn().mockResolvedValue(undefined) } },
        { provide: ORE_ENV, useValue: { riderClearHours: 24 } },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  const seed = (fee = 0, peak = 0) => {
    const row = { id: 'order-1', riderFeePesewas: fee, peakPayPesewas: peak } as Order;
    orders.findOne.mockResolvedValue(row);
    orders.save.mockImplementation(async (o: Order) => o);
    return row;
  };

  it('accumulates across legs so the order shows its true delivery cost', async () => {
    const row = seed(0, 0);

    await service.setRiderFee('order-1', 800, 100, true);   // laundry collection
    await service.setRiderFee('order-1', 900, 0, true);     // laundry return

    expect(row.riderFeePesewas).toBe(1700);
    expect(row.peakPayPesewas).toBe(100);
  });

  it('replaces when not accumulating, so single-leg orders are unchanged', async () => {
    const row = seed(500, 50);

    await service.setRiderFee('order-1', 900, 20);

    expect(row.riderFeePesewas).toBe(900);
    expect(row.peakPayPesewas).toBe(20);
  });

  it('treats a missing existing value as zero rather than NaN', async () => {
    const row = { id: 'order-1' } as Order;
    orders.findOne.mockResolvedValue(row);
    orders.save.mockImplementation(async (o: Order) => o);

    await service.setRiderFee('order-1', 700, 0, true);

    expect(row.riderFeePesewas).toBe(700);
  });

  it('refuses negative and fractional amounts', async () => {
    const row = seed(0, 0);

    await service.setRiderFee('order-1', -500, -20, true);
    expect(row.riderFeePesewas).toBe(0);
    expect(row.peakPayPesewas).toBe(0);

    await service.setRiderFee('order-1', 10.9, 0, true);
    expect(row.riderFeePesewas).toBe(10);
  });

  it('throws when the order does not exist', async () => {
    orders.findOne.mockResolvedValue(null);
    await expect(service.setRiderFee('nope', 100)).rejects.toThrow('Order not found');
  });
});
