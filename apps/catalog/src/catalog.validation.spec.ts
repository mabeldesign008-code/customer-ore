import { BadRequestException, ConflictException } from '@nestjs/common';
import { Role, createVendorPromotionSchema } from '@ore/contracts';
import { StockReservation } from './entities/stock-reservation.entity';
import { CatalogService, calculateVendorAnalytics, normalizeAddonGroups, validateAddonGroups, validateVerticalFields } from './catalog.service';

function expectBadRequest(callback: () => unknown): void {
  expect(callback).toThrow(BadRequestException);
}

const validGroups = [
  {
    id: 'size',
    name: 'Size',
    required: true,
    minSelections: 1,
    maxSelections: 1,
    options: [{ id: 'large', name: 'Large', priceAdjustmentPesewas: 500 }],
  },
];

describe('catalog option contract', () => {
  it('accepts the canonical variant shape and preserves pesewa integers', () => {
    expect(validateAddonGroups(validGroups)).toBeUndefined();
    expect(normalizeAddonGroups(validGroups)).toEqual(validGroups);
  });

  it('normalizes omitted optional selection metadata and zero adjustment', () => {
    expect(normalizeAddonGroups([
      { id: 'extras', name: 'Extras', options: [{ id: 'none', name: 'None' }] },
    ])).toEqual([
      {
        id: 'extras',
        name: 'Extras',
        required: false,
        minSelections: 0,
        maxSelections: 1,
        options: [{ id: 'none', name: 'None', priceAdjustmentPesewas: 0 }],
      },
    ]);
  });

  it('rejects malformed groups, duplicate ids, and invalid selection limits', () => {
    expectBadRequest(() => validateAddonGroups([{ id: 'size', name: 'Size', options: [] }]));
    expectBadRequest(() => validateAddonGroups([
      { id: 'size', name: 'Size', options: [{ id: 'small', name: 'Small' }] },
      { id: 'size', name: 'Other size', options: [{ id: 'large', name: 'Large' }] },
    ]));
    expectBadRequest(() => validateAddonGroups([
      { id: 'size', name: 'Size', minSelections: 2, maxSelections: 1, options: [{ id: 'small', name: 'Small' }] },
    ]));
    expectBadRequest(() => validateAddonGroups([
      { id: 'size', name: 'Size', required: true, minSelections: 0, maxSelections: 1, options: [{ id: 'small', name: 'Small' }] },
    ]));
    expectBadRequest(() => validateAddonGroups([
      { id: 'size', name: 'Size', options: [{ id: 'small', name: 'Small', priceAdjustmentPesewas: -1 }] },
    ]));
  });
});

describe('six Vendor vertical catalogue policies', () => {
  const common = {
    pricePesewas: 1000,
    prepTimeMin: 10,
    unit: 'each',
    stock: 5,
    sku: 'SKU-1',
    expiryDate: '2027-01-01T00:00:00.000Z',
    prescriptionOnly: false,
    dailyMarketPrice: false,
  };

  it.each([
    ['FOOD', { prepTimeMin: 15 }],
    ['GROCERY', { unit: 'kg', stock: 10, sku: 'GROC-1' }],
    ['SHOP', { unit: 'piece', stock: 3, sku: 'SHOP-1' }],
    ['PHARMACY', { unit: 'box', stock: 4, sku: 'RX-1', expiryDate: '2027-04-30T00:00:00.000Z' }],
    ['MARKET', { unit: 'olonka', dailyMarketPrice: true }],
    ['LAUNDRY', { unit: 'kg', turnaround: '48 hours', garmentType: 'Shirt' }],
  ])('accepts a valid %s item payload', (vendorType, fields) => {
    expect(() => validateVerticalFields(vendorType, { ...common, ...fields })).not.toThrow();
  });

  it('requires inventory identity for groceries and shop', () => {
    expectBadRequest(() => validateVerticalFields('GROCERY', { ...common, sku: null }));
    expectBadRequest(() => validateVerticalFields('SHOP', { ...common, stock: null }));
  });

  it('requires pharmacy expiry and dosage when prescription-only', () => {
    expectBadRequest(() => validateVerticalFields('PHARMACY', { ...common, expiryDate: null }));
    expectBadRequest(() => validateVerticalFields('PHARMACY', { ...common, prescriptionOnly: true, dosage: '' }));
  });

  it('requires market unit and laundry service metadata', () => {
    expectBadRequest(() => validateVerticalFields('MARKET', { ...common, unit: '' }));
    expectBadRequest(() => validateVerticalFields('LAUNDRY', { ...common, turnaround: '48 hours', garmentType: '' }));
  });
});

describe('Vendor tax profile administration', () => {
  it('updates supplier tax profile fields through the validated admin path', async () => {
    const vendor = {
      id: 'vendor-1',
      name: 'Cape Coast Kitchen',
      taxResidentStatus: 'UNKNOWN',
      taxIdentificationNumber: null,
      taxProfileJson: null,
    } as any;
    const service = Object.create(CatalogService.prototype) as any;
    service.vendors = {
      findOne: jest.fn().mockResolvedValue(vendor),
      save: jest.fn(async (value: any) => value),
    };
    service.bus = { publish: jest.fn().mockResolvedValue(undefined) };

    const result = await service.updateVendorTaxProfile(
      { sub: 'admin-1', role: Role.ADMIN } as any,
      vendor.id,
      { residentStatus: 'RESIDENT', taxIdentificationNumber: ' GRA-123 ', taxProfileJson: { certificate: 'WHT-EXEMPT' } },
    );

    expect(result).toEqual({
      id: vendor.id,
      taxResidentStatus: 'RESIDENT',
      taxIdentificationNumber: 'GRA-123',
      taxProfileJson: { certificate: 'WHT-EXEMPT' },
    });
    expect(service.bus.publish).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ vendorId: vendor.id, taxProfileUpdated: true }));
  });
});

describe('Vendor campaign contract', () => {
  it('accepts bounded discount windows and rejects invalid percent values', () => {
    expect(() => createVendorPromotionSchema.parse({
      title: 'Weekend savings',
      discountType: 'PERCENT',
      discountValue: 20,
      startsAt: '2026-08-16T00:00:00.000Z',
      endsAt: '2026-08-23T23:59:59.000Z',
    })).not.toThrow();
    expect(() => createVendorPromotionSchema.parse({
      title: 'Too much',
      discountType: 'PERCENT',
      discountValue: 150,
      startsAt: '2026-08-16T00:00:00.000Z',
      endsAt: '2026-08-23T23:59:59.000Z',
    })).toThrow();
  });
});


/**
 * Mock of the atomic conditional UPDATE that reserveStock/releaseStock use.
 *
 * The service deliberately avoids `lock: { mode: 'pessimistic_write' }` (SQLite cannot
 * honour it) and instead issues `UPDATE ... SET stock = stock ± :qty WHERE stock >= :qty`,
 * reading `affected` to learn whether it won. The mock reproduces exactly that contract —
 * including the predicate check — so a reservation that exceeds stock really does come back
 * with affected: 0 rather than silently succeeding.
 */
function mockAtomicStockBuilder(item: any) {
  let sign = 0;
  let qty = 0;
  const builder: any = {
    update: () => builder,
    set: (spec: Record<string, () => string>) => {
      const expr = String(Object.values(spec)[0]());
      sign = expr.includes('-') ? -1 : 1;
      return builder;
    },
    where: (_clause: string, params: { qty: number }) => {
      qty = params.qty;
      return builder;
    },
    execute: async () => {
      if (item.stock === null) return { affected: 0 };
      if (sign < 0 && item.stock < qty) return { affected: 0 };
      item.stock += sign * qty;
      return { affected: 1 };
    },
  };
  return builder;
}

describe('quantity-tracked stock lifecycle', () => {
  it('reserves atomically, is idempotent, releases before pickup and consumes at pickup', async () => {
    const item = { id: 'item-1', name: 'Rice', stock: 3 } as any;
    const reservation = { id: 'reservation-1', orderId: 'order-1', itemId: 'item-1', qty: 2, status: 'RESERVED' } as any;
    const itemRepo = {
      findOne: jest.fn().mockImplementation(async () => item),
      save: jest.fn().mockImplementation(async (value: any) => value),
      createQueryBuilder: jest.fn(() => mockAtomicStockBuilder(item)),
    };
    const reservationRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((value: any) => value),
      save: jest.fn().mockImplementation(async (value: any) => value),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const manager = {
      getRepository: jest.fn((entity: unknown) => entity === StockReservation ? reservationRepo : itemRepo),
    };
    const service = Object.create(CatalogService.prototype) as any;
    service.items = { manager: { transaction: async (callback: (value: unknown) => Promise<void>) => callback(manager) } };
    service.reservations = reservationRepo;

    await service.reserveStock('order-1', [{ itemId: 'item-1', qty: 2 }]);
    expect(item.stock).toBe(1);
    expect(reservationRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'RESERVED', qty: 2 }));

    reservationRepo.find.mockResolvedValue([reservation]);
    await service.reserveStock('order-1', [{ itemId: 'item-1', qty: 2 }]);
    expect(item.stock).toBe(1);

    await service.releaseStock('order-1');
    expect(item.stock).toBe(3);
    expect(reservation.status).toBe('RELEASED');

    await service.consumeStock('order-1');
    expect(reservationRepo.update).toHaveBeenCalledWith({ orderId: 'order-1', status: 'RESERVED' }, { status: 'CONSUMED' });
  });

  it('rejects a reservation larger than available stock', async () => {
    const scarce = { id: 'item-1', name: 'Rice', stock: 1 } as any;
    const itemRepo = {
      findOne: jest.fn().mockImplementation(async () => scarce),
      save: jest.fn(),
      createQueryBuilder: jest.fn(() => mockAtomicStockBuilder(scarce)),
    };
    const reservationRepo = { find: jest.fn().mockResolvedValue([]), create: jest.fn(), save: jest.fn() };
    const manager = { getRepository: jest.fn((entity: unknown) => entity === StockReservation ? reservationRepo : itemRepo) };
    const service = Object.create(CatalogService.prototype) as any;
    service.items = { manager: { transaction: async (callback: (value: unknown) => Promise<void>) => callback(manager) } };
    await expect(service.reserveStock('order-2', [{ itemId: 'item-1', qty: 2 }])).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('Vendor analytics calculations', () => {
  it('counts all operational orders but recognizes revenue only after delivery', () => {
    const result = calculateVendorAnalytics([
      {
        orderId: 'delivered',
        status: 'DELIVERED',
        totalPesewas: 5000,
        prepTimeMin: 20,
        customer: { id: 'customer-1' },
        items: [{ itemId: 'rice', name: 'Rice', qty: 2 }],
        timeline: [{ at: '2026-08-15T10:00:00Z' }],
      },
      {
        orderId: 'cancelled',
        status: 'CANCELLED',
        totalPesewas: 9000,
        prepTimeMin: 10,
        customer: { id: 'customer-2' },
        items: [{ itemId: 'rice', name: 'Rice', qty: 9 }],
        timeline: [{ at: '2026-08-15T11:00:00Z' }],
      },
    ], new Date('2026-08-14T00:00:00Z'), 'vendor-1', 'week');

    expect(result).toMatchObject({
      vendorId: 'vendor-1',
      period: 'week',
      orders: { total: 2, completed: 1, cancelled: 1, avgValuePesewas: 5000 },
      revenue: { totalPesewas: 5000 },
      customers: { total: 1 },
    });
    expect((result.items as { topSelling: { count: number }[] }).topSelling[0].count).toBe(2);
  });
});
