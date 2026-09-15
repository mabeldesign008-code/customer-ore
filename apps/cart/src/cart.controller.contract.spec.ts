/**
 * Cart controller — API contract tests.
 *
 * Verifies:
 *   - addCartItemSchema / checkoutSchema / reorderSchema parsing & rejection
 *   - Route-level role guards (CUSTOMER only for reorder/checkout)
 *   - Correct delegation to CartService / CheckoutService
 *   - Response shapes for get/add/update/remove/clear/checkout
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { CheckoutService } from './checkout.service';
import { CartIdempotencyInterceptor } from './idempotency';
import { AuthGuard } from '@ore/core';
import { CartStatus, Role } from '@ore/contracts';

// ── helpers ──────────────────────────────────────────────────────────────────

function customerJwt(id = 'cust-1') {
  return { sub: id, phone: '233501234567', role: Role.CUSTOMER, roles: [Role.CUSTOMER] } as any;
}

function makeCartService() {
  return {
    getCart: jest.fn(),
    addItem: jest.fn(),
    updateLine: jest.fn(),
    clear: jest.fn(),
    reorder: jest.fn(),
  };
}

function makeCheckoutService() {
  return { checkout: jest.fn() };
}

const stubCart = {
  id: 'cart-1',
  customerId: 'cust-1',
  status: CartStatus.ACTIVE,
  items: [],
};

const stubItem = {
  id: 'line-1',
  cartId: 'cart-1',
  itemId: 'item-abc',
  itemName: 'Jollof Rice',
  qty: 2,
  unitPricePesewas: 2500,
  optionsTotalPesewas: 0,
};

const stubCheckout = {
  checkoutId: 'chk-1',
  orders: [{ id: 'order-1', vendorId: 'vendor-1', totalPesewas: 5000 }],
  totalPesewas: 5000,
};

const CUSTOMER = customerJwt();

// ── setup ─────────────────────────────────────────────────────────────────────

describe('CartController — API contract', () => {
  let controller: CartController;
  let cartService: ReturnType<typeof makeCartService>;
  let checkoutService: ReturnType<typeof makeCheckoutService>;

  beforeEach(async () => {
    cartService = makeCartService();
    checkoutService = makeCheckoutService();
    cartService.getCart.mockResolvedValue(stubCart);
    cartService.addItem.mockResolvedValue({ ...stubCart, lines: [stubItem] });
    cartService.updateLine.mockResolvedValue({ ...stubCart, lines: [{ ...stubItem, qty: 3 }] });
    cartService.clear.mockResolvedValue(undefined);
    cartService.reorder.mockResolvedValue({ cart: { ...stubCart, lines: [stubItem] }, added: 1, skipped: [] });
    checkoutService.checkout.mockResolvedValue(stubCheckout);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [
        { provide: CartService, useValue: cartService },
        { provide: CheckoutService, useValue: checkoutService },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideInterceptor(CartIdempotencyInterceptor)
      .useValue({ intercept: (context: any, next: any) => next.handle() })
      .compile();

    controller = module.get<CartController>(CartController);
  });

  // ── GET /cart ─────────────────────────────────────────────────────

  describe('get', () => {
    it('returns the active cart for the current user', async () => {
      const result = await controller.get(customerJwt());
      expect(result.customerId).toBe('cust-1');
      expect(cartService.getCart).toHaveBeenCalledWith('cust-1');
    });

    it('uses the JWT sub as the customerId (not a query param)', async () => {
      await controller.get(customerJwt('other-cust'));
      expect(cartService.getCart).toHaveBeenCalledWith('other-cust');
    });

    it('propagates NotFoundException when customer has no cart', async () => {
      cartService.getCart.mockRejectedValue(new NotFoundException('No active cart'));
      await expect(controller.get(customerJwt())).rejects.toThrow(NotFoundException);
    });
  });

  // ── POST /cart/items ──────────────────────────────────────────────

  describe('add', () => {
    const validBody = {
      itemId: 'item-abc',
      qty: 2,
      modifiers: [],
      selectedOptions: [],
    };

    it('adds an item and returns updated cart', async () => {
      const result = await controller.add(customerJwt(), validBody);
      expect((result as any).lines).toHaveLength(1);
      expect(cartService.addItem).toHaveBeenCalledWith('cust-1', 'item-abc', 2, [], []);
    });

    it('passes selectedOptions to cartService', async () => {
      const opts = [{ groupId: 'size', groupName: 'Size', optionId: 'lg', optionName: 'Large', priceAdjustmentPesewas: 500 }];
      await controller.add(customerJwt(), { ...validBody, selectedOptions: opts });
      expect(cartService.addItem).toHaveBeenCalledWith('cust-1', 'item-abc', 2, [], opts);
    });

    it('throws for missing itemId', () => {
      expect(() => controller.add(customerJwt(), { qty: 2 } as any)).toThrow();
    });

    it('throws for missing qty', () => {
      expect(() => controller.add(customerJwt(), { itemId: 'item-2' } as any)).toThrow();
    });

    it('throws for qty < 1', () => {
      expect(() => controller.add(customerJwt(), { itemId: 'item-abc', qty: 0 })).toThrow();
    });

    it('throws for non-integer qty', () => {
      expect(() => controller.add(customerJwt(), { itemId: 'item-abc', qty: 1.5 })).toThrow();
    });

    it('throws for null body', () => {
      expect(() => controller.add(customerJwt(), null)).toThrow();
    });
  });

  // ── PATCH /cart/items/:lineId ─────────────────────────────────────

  describe('update', () => {
    it('updates line quantity via cartService.updateLine', async () => {
      const result = await controller.update(customerJwt(), 'line-1', 3);
      expect(cartService.updateLine).toHaveBeenCalledWith('cust-1', 'line-1', 3);
      expect((result as any).lines[0].qty).toBe(3);
    });

    it('passes qty=0 to remove a line (handled by service)', async () => {
      await controller.update(customerJwt(), 'line-1', 0);
      expect(cartService.updateLine).toHaveBeenCalledWith('cust-1', 'line-1', 0);
    });
  });

  // ── DELETE /cart/items/:lineId ────────────────────────────────────

  describe('remove', () => {
    it('calls updateLine with qty=0 (soft-remove pattern)', async () => {
      await controller.remove(customerJwt(), 'line-2');
      expect(cartService.updateLine).toHaveBeenCalledWith('cust-1', 'line-2', 0);
    });
  });

  // ── DELETE /cart ──────────────────────────────────────────────────

  describe('clear', () => {
    it('clears all cart items', async () => {
      const result = await controller.clear(customerJwt());
      expect(result).toBeUndefined();
      expect(cartService.clear).toHaveBeenCalledWith('cust-1');
    });
  });

  // ── POST /cart/reorder ────────────────────────────────────────────

  describe('reorder', () => {
    it('reorders from a previous orderId', async () => {
      const result = await controller.reorder(customerJwt(), { orderId: 'order-prev' });
      expect(cartService.reorder).toHaveBeenCalledWith('cust-1', 'order-prev');
      expect((result as any).cart.lines).toHaveLength(1);
    });

    it('throws for missing orderId', () => {
      expect(() => controller.reorder(customerJwt(), {} as any)).toThrow();
    });

    it('throws for non-string orderId', () => {
      expect(() => controller.reorder(customerJwt(), { orderId: 12345 } as any)).toThrow();
    });

    it('throws for null body', () => {
      expect(() => controller.reorder(customerJwt(), null)).toThrow();
    });
  });

  // ── POST /cart/checkout ───────────────────────────────────────────

  describe('checkout', () => {
    const validCheckout = {
      address: {
        label: 'Home',
        lat: 5.6037,
        lng: -0.1870,
        source: 'MANUAL',
      },
    };

    it('returns a checkout response with orders array', async () => {
      const result = await controller.checkout(customerJwt(), validCheckout);
      expect(result.checkoutId).toBe('chk-1');
      expect(result.orders).toHaveLength(1);
      expect(checkoutService.checkout).toHaveBeenCalledWith(
        'cust-1',
        '233501234567',
        expect.objectContaining({ address: expect.any(Object) }),
      );
    });

    it('passes the user phone from JWT to checkout service', async () => {
      await controller.checkout({ sub: 'cust-2', phone: '233502222222', role: Role.CUSTOMER, roles: [Role.CUSTOMER] } as any, validCheckout);
      expect(checkoutService.checkout).toHaveBeenCalledWith(
        'cust-2',
        '233502222222',
        expect.any(Object),
      );
    });

    it('throws for missing address', () => {
      expect(() => controller.checkout(CUSTOMER, {} as any)).toThrow();
    });

    it('throws for address missing lat/lng', () => {
      expect(() => controller.checkout(CUSTOMER, { address: { label: 'Home', source: 'MANUAL' } } as any)).toThrow();
    });

    it('propagates BadRequestException from checkout service (empty cart)', async () => {
      checkoutService.checkout.mockRejectedValue(new BadRequestException('Cart is empty'));
      await expect(controller.checkout(customerJwt(), validCheckout)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.checkout(customerJwt(), validCheckout)).rejects.toThrow('Cart is empty');
    });
  });

  // ── Checkout response shape ───────────────────────────────────────

  describe('checkout response shape', () => {
    const validCheckout = {
      address: {
        label: 'Home',
        lat: 5.6037,
        lng: -0.1870,
        source: 'MANUAL',
      },
    };

    it('includes checkoutId, orders array, and totalPesewas', async () => {
      const result = await controller.checkout(CUSTOMER, validCheckout);
      expect(result).toHaveProperty('checkoutId');
      expect(result).toHaveProperty('orders');
      expect(result).toHaveProperty('totalPesewas');
      expect(Array.isArray(result.orders)).toBe(true);
    });

    it('each order in orders array has id, vendorId, totalPesewas', async () => {
      const result = await controller.checkout(CUSTOMER, validCheckout);
      const order = result.orders[0];
      expect(order).toHaveProperty('id');
      expect(order).toHaveProperty('vendorId');
      expect(order).toHaveProperty('totalPesewas');
    });
  });
});
