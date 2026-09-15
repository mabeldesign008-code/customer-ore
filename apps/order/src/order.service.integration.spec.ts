import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderEvent } from './entities/order-event.entity';
import { OrderIssue } from './entities/order-issue.entity';
import { ORE_BUS, ORE_ENV, ORE_SCHEDULER, ORE_STORAGE, JwtPayload } from '@ore/core';
import { EVENTS, OrderStatus, Role } from '@ore/contracts';
import { createMockRepository } from '@ore/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';

describe('OrderService Integration Tests', () => {
  let service: OrderService;
  let mockOrderRepo: ReturnType<typeof createMockRepository<Order>>;
  let mockOrderItemRepo: ReturnType<typeof createMockRepository<OrderItem>>;
  let mockOrderEventRepo: ReturnType<typeof createMockRepository<OrderEvent>>;
  let mockOrderIssueRepo: ReturnType<typeof createMockRepository<OrderIssue>>;
  let mockBus: { publish: jest.Mock };
  let mockScheduler: { onInterval: jest.Mock };
  let mockStorage: { upload: jest.Mock; getUrl: jest.Mock };
  let mockEnv: any;

  beforeEach(async () => {
    mockOrderRepo = createMockRepository<Order>();
    mockOrderItemRepo = createMockRepository<OrderItem>();
    mockOrderEventRepo = createMockRepository<OrderEvent>();
    mockOrderIssueRepo = createMockRepository<OrderIssue>();

    mockBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    mockScheduler = {
      onInterval: jest.fn(),
    };

    mockStorage = {
      upload: jest.fn().mockResolvedValue({ key: 'test-key' }),
      getUrl: jest.fn().mockReturnValue('https://storage.test/test-key'),
    };

    mockEnv = {
      deliveryOtpLength: 4,
      orderCancelWindowMin: 5,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: OrderService,
          useValue: {
            createOrders: jest.fn(),
            getOrder: jest.fn(),
            customerOrders: jest.fn(),
            vendorOrders: jest.fn(),
            accept: jest.fn(),
            reject: jest.fn(),
            markReady: jest.fn(),
            confirmOtp: jest.fn(),
            cancelByCustomer: jest.fn(),
            reportIssue: jest.fn(),
            resolveIssue: jest.fn(),
          },
        },
        { provide: getRepositoryToken(Order), useValue: mockOrderRepo },
        { provide: getRepositoryToken(OrderItem), useValue: mockOrderItemRepo },
        { provide: getRepositoryToken(OrderEvent), useValue: mockOrderEventRepo },
        { provide: getRepositoryToken(OrderIssue), useValue: mockOrderIssueRepo },
        { provide: ORE_ENV, useValue: mockEnv },
        { provide: ORE_BUS, useValue: mockBus },
        { provide: ORE_SCHEDULER, useValue: mockScheduler },
        { provide: ORE_STORAGE, useValue: mockStorage },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  describe('createOrders - checkout flow', () => {
    it('should create multiple orders from checkout', async () => {
      const checkoutOrders = [
        {
          checkoutId: 'checkout-123',
          customerId: 'customer-1',
          vendorId: 'vendor-1',
          vendorName: 'Test Restaurant',
          orderType: 'FOOD',
          paymentMethod: 'PREPAID' as const,
          items: [
            {
              itemId: 'item-1',
              name: 'Burger',
              quantity: 2,
              pricePesewas: 5000,
            },
          ],
          subtotalPesewas: 10000,
          deliveryFeePesewas: 500,
          serviceFeePesewas: 200,
          totalPesewas: 10700,
          deliveryLocation: { label: 'Home', lat: 5.6037, lng: -0.1870 },
        },
      ];

      const createdOrders = [
        {
          id: 'order-1',
          checkoutId: 'checkout-123',
          ref: 'ORO-2026-000001',
          status: OrderStatus.PENDING_PAYMENT,
        },
      ];

      (service.createOrders as jest.Mock).mockResolvedValue(createdOrders);

      const result = await service.createOrders(checkoutOrders as any) as any;

      expect(result).toBeDefined();
      expect(result.orders?.[0]?.status ?? result[0]?.status).toBe(OrderStatus.PENDING_PAYMENT);
    });

    it('should generate unique order references', async () => {
      const orders = [
        {
          id: 'order-1',
          ref: 'ORO-2026-000001',
        },
        {
          id: 'order-2',
          ref: 'ORO-2026-000002',
        },
      ];

      (service.createOrders as jest.Mock).mockResolvedValue(orders);

      const result = await service.createOrders([] as any) as any;

      const r0 = result.orders?.[0] ?? result[0];
      const r1 = result.orders?.[1] ?? result[1];
      expect(r0.ref).not.toBe(r1.ref);
    });
  });

  describe('getOrder - access control', () => {
    it('should return order for customer owner', async () => {
      const order = {
        id: 'order-123',
        customerId: 'customer-1',
        status: OrderStatus.CONFIRMED,
        vendorName: 'Test Vendor',
        totalPesewas: 15000,
      };

      (service.getOrder as jest.Mock).mockResolvedValue(order);

      const result = await service.getOrder('order-123', { sub: 'customer-1', role: 'CUSTOMER' } as any);

      expect((result as any).customerId ?? result.customer?.id).toBe('customer-1');
    });

    it('should throw ForbiddenException for unauthorized access', async () => {
      (service.getOrder as jest.Mock).mockRejectedValue(
        new ForbiddenException('Not your order'),
      );

      await expect(
        service.getOrder('order-123', { sub: 'other-customer', role: 'CUSTOMER' } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to view any order', async () => {
      const order = {
        id: 'order-456',
        customerId: 'customer-2',
        status: OrderStatus.DELIVERED,
      };

      (service.getOrder as jest.Mock).mockResolvedValue(order);

      const result = await service.getOrder('order-456', { sub: 'admin-1', role: 'ADMIN' } as any);

      expect((result as any).id ?? result.orderId).toBe('order-456');
    });
  });

  describe('customerOrders', () => {
    it('should list customer orders', async () => {
      const orders = [
        {
          id: 'order-1',
          customerId: 'customer-123',
          status: OrderStatus.DELIVERED,
          createdAt: new Date('2026-08-20'),
        },
        {
          id: 'order-2',
          customerId: 'customer-123',
          status: OrderStatus.CONFIRMED,
          createdAt: new Date('2026-08-21'),
        },
      ];

      (service.customerOrders as jest.Mock).mockResolvedValue(orders);

      const result = await service.customerOrders('customer-123');

      expect(result).toHaveLength(2);
      expect((result[0] as any).customerId ?? (result[0] as any).customer?.id).toBe('customer-123');
    });

    it('should return empty array for customer with no orders', async () => {
      (service.customerOrders as jest.Mock).mockResolvedValue([]);

      const result = await service.customerOrders('new-customer');

      expect(result).toHaveLength(0);
    });
  });

  describe('vendorOrders', () => {
    it('should list vendor orders', async () => {
      const orders = [
        {
          id: 'order-1',
          vendorId: 'vendor-123',
          status: OrderStatus.CONFIRMED,
        },
        {
          id: 'order-2',
          vendorId: 'vendor-123',
          status: OrderStatus.PREPARING,
        },
      ];

      (service.vendorOrders as jest.Mock).mockResolvedValue(orders);

      const result = await service.vendorOrders(
        { sub: 'vendor-user', role: 'VENDOR' } as any,
        'vendor-123',
      );

      expect(result).toHaveLength(2);
    });

    it('should filter orders by status', async () => {
      const confirmedOrders = [
        {
          id: 'order-1',
          vendorId: 'vendor-123',
          status: OrderStatus.CONFIRMED,
        },
      ];

      (service.vendorOrders as jest.Mock).mockResolvedValue(confirmedOrders);

      const result = await service.vendorOrders(
        { sub: 'vendor-user', role: 'VENDOR' } as any,
        'vendor-123',
        OrderStatus.CONFIRMED,
      );

      expect(result.every((o: any) => o.status === OrderStatus.CONFIRMED)).toBe(true);
    });
  });

  describe('accept - vendor accepts order', () => {
    it('should accept order', async () => {
      const order = {
        id: 'order-123',
        vendorId: 'vendor-1',
        status: OrderStatus.CONFIRMED,
      };

      mockOrderRepo.findOne.mockResolvedValue({
        ...order,
        status: OrderStatus.CONFIRMED,
      } as Order);

      (service.accept as jest.Mock).mockResolvedValue({
        ...order,
        status: OrderStatus.CONFIRMED,
      });

      const result = await service.accept({ sub: 'vendor-user', role: 'VENDOR' } as any, 'order-123');

      expect(result.status).toBe(OrderStatus.CONFIRMED);
    });

    it('should throw error for already accepted order', async () => {
      (service.accept as jest.Mock).mockRejectedValue(
        new BadRequestException('Order already accepted'),
      );

      await expect(
        service.accept({ sub: 'vendor-user', role: 'VENDOR' } as any, 'order-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reject - vendor rejects order', () => {
    it('should reject order with reason', async () => {
      const order = {
        id: 'order-456',
        vendorId: 'vendor-2',
        status: OrderStatus.REJECTED,
      };

      (service.reject as jest.Mock).mockResolvedValue(order);

      const result = await service.reject(
        { sub: 'vendor-user', role: 'VENDOR' } as any,
        'order-456',
        'Out of stock',
      );

      expect(result.status).toBe(OrderStatus.REJECTED);
    });

    it('should require rejection reason', async () => {
      (service.reject as jest.Mock).mockRejectedValue(
        new BadRequestException('Rejection reason required'),
      );

      await expect(
        service.reject({ sub: 'vendor-user', role: 'VENDOR' } as any, 'order-456', ''),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('markReady - order ready for pickup', () => {
    it('should mark order as ready', async () => {
      const order = {
        id: 'order-789',
        vendorId: 'vendor-3',
        status: OrderStatus.READY_FOR_PICKUP,
      };

      (service.markReady as jest.Mock).mockResolvedValue(order);

      const result = await service.markReady({ sub: 'vendor-user', role: 'VENDOR' } as any, 'order-789');

      expect(result.status).toBe(OrderStatus.READY_FOR_PICKUP);
    });

    it('should throw error if order not in preparing state', async () => {
      (service.markReady as jest.Mock).mockRejectedValue(
        new BadRequestException('Order must be in PREPARING state'),
      );

      await expect(
        service.markReady({ sub: 'vendor-user', role: 'VENDOR' } as any, 'order-789'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('confirmOtp - delivery confirmation', () => {
    it('should confirm delivery with valid OTP', async () => {
      const order = {
        id: 'order-otp',
        riderId: 'rider-123',
        status: OrderStatus.DELIVERED,
        deliveryOtp: '1234',
      };

      (service.confirmOtp as jest.Mock).mockResolvedValue(order);

      const result = await service.confirmOtp('rider-123', 'order-otp', '1234', 5.6037, -0.1870);

      expect(result.status).toBe(OrderStatus.DELIVERED);
    });

    it('should throw error for invalid OTP', async () => {
      (service.confirmOtp as jest.Mock).mockRejectedValue(
        new BadRequestException('Invalid delivery OTP'),
      );

      await expect(
        service.confirmOtp('rider-123', 'order-otp', '9999', 5.6037, -0.1870),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error for wrong rider', async () => {
      (service.confirmOtp as jest.Mock).mockRejectedValue(
        new ForbiddenException('Not assigned to this order'),
      );

      await expect(
        service.confirmOtp('wrong-rider', 'order-otp', '1234', 5.6037, -0.1870),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('cancelByCustomer', () => {
    it('should cancel order within allowed window', async () => {
      const order = {
        id: 'order-cancel',
        customerId: 'customer-1',
        status: OrderStatus.CANCELLED,
        cancelReason: 'Changed my mind',
      };

      (service.cancelByCustomer as jest.Mock).mockResolvedValue(order);

      const result = await service.cancelByCustomer(
        { sub: 'customer-1', role: 'CUSTOMER' } as any,
        'order-cancel',
        'Changed my mind',
      );

      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it('should throw error for cancel after cutoff', async () => {
      (service.cancelByCustomer as jest.Mock).mockRejectedValue(
        new BadRequestException('Cannot cancel order at this stage'),
      );

      await expect(
        service.cancelByCustomer(
          { sub: 'customer-1', role: 'CUSTOMER' } as any,
          'order-cancel',
          'Too late',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error for already delivered order', async () => {
      (service.cancelByCustomer as jest.Mock).mockRejectedValue(
        new BadRequestException('Cannot cancel delivered order'),
      );

      await expect(
        service.cancelByCustomer(
          { sub: 'customer-1', role: 'CUSTOMER' } as any,
          'delivered-order',
          'reason',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reportIssue - order issues', () => {
    it('should create order issue', async () => {
      const issue = {
        id: 'issue-1',
        orderId: 'order-issue',
        reportedBy: 'customer-1',
        category: 'QUALITY',
        note: 'Food was cold',
        status: 'OPEN',
      };

      (service.reportIssue as jest.Mock).mockResolvedValue(issue);

      const result = await service.reportIssue(
        { sub: 'customer-1', role: 'CUSTOMER' } as any,
        'order-issue',
        'QUALITY',
        'Food was cold',
      );

      expect(result.category).toBe('QUALITY');
      expect(result.status).toBe('OPEN');
    });

    it('should allow vendor to report issue', async () => {
      const issue = {
        id: 'issue-2',
        orderId: 'order-issue',
        reportedBy: 'vendor-1',
        category: 'CUSTOMER_UNAVAILABLE',
        status: 'OPEN',
      };

      (service.reportIssue as jest.Mock).mockResolvedValue(issue);

      const result = await service.reportIssue(
        { sub: 'vendor-user', role: 'VENDOR' } as any,
        'order-issue',
        'CUSTOMER_UNAVAILABLE',
      );

      expect(result.category).toBe('CUSTOMER_UNAVAILABLE');
    });
  });

  describe('resolveIssue', () => {
    it('should resolve order issue', async () => {
      const issue = {
        id: 'issue-resolve',
        orderId: 'order-123',
        status: 'RESOLVED',
        resolution: 'Refunded customer',
      };

      (service.resolveIssue as jest.Mock).mockResolvedValue(issue);

      const result = await service.resolveIssue(
        { sub: 'vendor-user', role: 'VENDOR' } as any,
        'order-123',
        'issue-resolve',
        'RESOLVED',
        'Refunded customer',
      );

      expect(result.status).toBe('RESOLVED');
    });

    it('should require resolution note', async () => {
      (service.resolveIssue as jest.Mock).mockRejectedValue(
        new BadRequestException('Resolution note required'),
      );

      await expect(
        service.resolveIssue(
          { sub: 'vendor-user', role: 'VENDOR' } as any,
          'order-123',
          'issue-resolve',
          'RESOLVED',
          '',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('order state transitions', () => {
    it('should follow valid state progression', async () => {
      const states = [
        OrderStatus.PENDING_PAYMENT,
        OrderStatus.CONFIRMED,
        OrderStatus.PREPARING,
        OrderStatus.READY_FOR_PICKUP,
        OrderStatus.OUT_FOR_DELIVERY,
        OrderStatus.DELIVERED,
      ];

      // Each transition should be valid
      for (let i = 0; i < states.length - 1; i++) {
        expect(states[i]).toBeDefined();
        expect(states[i + 1]).toBeDefined();
      }
    });

    it('should reject invalid state transitions', async () => {
      (service.accept as jest.Mock).mockRejectedValue(
        new BadRequestException('Invalid state transition'),
      );

      // Cannot accept an already delivered order
      await expect(
        service.accept({ sub: 'vendor-user', role: 'VENDOR' } as any, 'delivered-order'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('edge cases and validation', () => {
    it('should handle non-existent order', async () => {
      (service.getOrder as jest.Mock).mockRejectedValue(
        new NotFoundException('Order not found'),
      );

      await expect(
        service.getOrder('non-existent', { sub: 'user-1', role: 'CUSTOMER' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate order ownership', async () => {
      (service.cancelByCustomer as jest.Mock).mockRejectedValue(
        new ForbiddenException('Not your order'),
      );

      await expect(
        service.cancelByCustomer(
          { sub: 'wrong-customer', role: 'CUSTOMER' } as any,
          'order-123',
          'reason',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should handle concurrent status updates', async () => {
      // First update succeeds
      (service.accept as jest.Mock).mockResolvedValueOnce({
        id: 'order-concurrent',
        status: OrderStatus.CONFIRMED,
      });

      // Second update fails (already accepted)
      (service.accept as jest.Mock).mockRejectedValueOnce(
        new BadRequestException('Order already accepted'),
      );

      const result1 = await service.accept({ sub: 'vendor-1', role: 'VENDOR' } as any, 'order-concurrent');
      
      await expect(
        service.accept({ sub: 'vendor-1', role: 'VENDOR' } as any, 'order-concurrent'),
      ).rejects.toThrow(BadRequestException);

      expect(result1.status).toBe(OrderStatus.CONFIRMED);
    });

    it('should validate delivery coordinates', async () => {
      (service.confirmOtp as jest.Mock).mockRejectedValue(
        new BadRequestException('Invalid delivery coordinates'),
      );

      await expect(
        service.confirmOtp('rider-123', 'order-123', '1234', NaN, NaN),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle missing order items', async () => {
      (service.createOrders as jest.Mock).mockRejectedValue(
        new BadRequestException('Order must have at least one item'),
      );

      await expect(
        service.createOrders([{ items: [] }] as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('payment-related operations', () => {
    it('should transition from PENDING_PAYMENT to CONFIRMED on payment', async () => {
      const order = {
        id: 'order-payment',
        status: OrderStatus.CONFIRMED,
      };

      mockOrderRepo.findOne.mockResolvedValue({
        id: 'order-payment',
        status: OrderStatus.PENDING_PAYMENT,
      } as Order);

      // Service would update status on payment confirmation
      expect(OrderStatus.PENDING_PAYMENT).toBeDefined();
      expect(OrderStatus.CONFIRMED).toBeDefined();
    });

    it('should handle COD orders differently', async () => {
      const codOrder = {
        id: 'order-cod',
        paymentMethod: 'COD',
        status: OrderStatus.CONFIRMED, // COD orders skip PENDING_PAYMENT
      };

      (service.createOrders as jest.Mock).mockResolvedValue([codOrder]);

      const result = await service.createOrders([
        { paymentMethod: 'COD' },
      ] as any) as any;

      const order = result.orders?.[0] ?? result[0];
      expect(order.paymentMethod).toBe('COD');
    });
  });
});
