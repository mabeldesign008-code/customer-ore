jest.setTimeout(30000);
/**
 * Cart service — true SQLite integration tests.
 * Verifies Cart + CartItem entity persistence, relationships, and
 * cart-level invariants without any external services.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TypeOrmSQLITETestingModule, clearTestDatabase } from '@ore/testing';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { CartStatus } from '@ore/contracts';

describe('Cart SQLite Integration', () => {
  let module: TestingModule;
  let cartRepo: Repository<Cart>;
  let itemRepo: Repository<CartItem>;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [...TypeOrmSQLITETestingModule([Cart, CartItem])],
    }).compile();

    cartRepo = module.get(getRepositoryToken(Cart));
    itemRepo = module.get(getRepositoryToken(CartItem));
  });

  afterAll(async () => {
    await module.close();
  });

  afterEach(async () => {
    await clearTestDatabase(module);
  });

  // ── Cart entity ───────────────────────────────────────────────────

  describe('Cart entity', () => {
    it('creates an ACTIVE cart with a customer', async () => {
      const cart = cartRepo.create({ customerId: 'cust-1', status: CartStatus.ACTIVE });
      await cartRepo.save(cart);

      const found = await cartRepo.findOne({ where: { customerId: 'cust-1' } });
      expect(found).not.toBeNull();
      expect(found!.status).toBe(CartStatus.ACTIVE);
      expect(found!.checkoutId).toBeNull();
    });

    it('transitions cart to CHECKED_OUT with a checkoutId', async () => {
      const cart = await cartRepo.save(
        cartRepo.create({ customerId: 'cust-2', status: CartStatus.ACTIVE }),
      );

      cart.status = CartStatus.CHECKED_OUT;
      cart.checkoutId = 'checkout-abc';
      await cartRepo.save(cart);

      const updated = await cartRepo.findOne({ where: { id: cart.id } });
      expect(updated!.status).toBe(CartStatus.CHECKED_OUT);
      expect(updated!.checkoutId).toBe('checkout-abc');
    });

    it('allows a customer to have only one ACTIVE cart found by query', async () => {
      await cartRepo.save(cartRepo.create({ customerId: 'cust-3', status: CartStatus.ACTIVE }));
      await cartRepo.save(cartRepo.create({ customerId: 'cust-3', status: CartStatus.CHECKED_OUT }));

      const active = await cartRepo.find({ where: { customerId: 'cust-3', status: CartStatus.ACTIVE } });
      expect(active).toHaveLength(1);
    });
  });

  // ── CartItem entity ───────────────────────────────────────────────

  describe('CartItem entity', () => {
    it('persists a cart item with correct pricing', async () => {
      const cart = await cartRepo.save(cartRepo.create({ customerId: 'cust-4', status: CartStatus.ACTIVE }));

      const item = itemRepo.create({
        cartId: cart.id,
        vendorId: 'vendor-1',
        itemId: 'item-1',
        itemName: 'Jollof Rice',
        qty: 2,
        unitPricePesewas: 2500,
        optionsTotalPesewas: 500,
        modifiers: [],
        selectedOptions: [],
      });
      await itemRepo.save(item);

      const found = await itemRepo.findOne({ where: { cartId: cart.id } });
      expect(found!.itemName).toBe('Jollof Rice');
      expect(found!.qty).toBe(2);
      expect(found!.unitPricePesewas).toBe(2500);
      expect(found!.optionsTotalPesewas).toBe(500);
    });

    it('calculates line total correctly from item fields', async () => {
      const cart = await cartRepo.save(cartRepo.create({ customerId: 'cust-5', status: CartStatus.ACTIVE }));

      const items = await itemRepo.save([
        itemRepo.create({ cartId: cart.id, vendorId: 'v1', itemId: 'i1', itemName: 'Burger', qty: 1, unitPricePesewas: 3000, optionsTotalPesewas: 0, modifiers: [], selectedOptions: [] }),
        itemRepo.create({ cartId: cart.id, vendorId: 'v1', itemId: 'i2', itemName: 'Fries', qty: 2, unitPricePesewas: 1500, optionsTotalPesewas: 0, modifiers: [], selectedOptions: [] }),
      ]);

      const cartItems = await itemRepo.find({ where: { cartId: cart.id } });
      const total = cartItems.reduce((sum, i) => sum + i.qty * (i.unitPricePesewas + i.optionsTotalPesewas), 0);
      expect(total).toBe(3000 + 3000); // 1×3000 + 2×1500
    });

    it('persists selected options as JSON', async () => {
      const cart = await cartRepo.save(cartRepo.create({ customerId: 'cust-6', status: CartStatus.ACTIVE }));

      const options = [
        { groupId: 'size', groupName: 'Size', optionId: 'large', optionName: 'Large', priceAdjustmentPesewas: 500 },
      ];

      const item = await itemRepo.save(
        itemRepo.create({
          cartId: cart.id,
          vendorId: 'v1',
          itemId: 'i1',
          itemName: 'Rice Bowl',
          qty: 1,
          unitPricePesewas: 2500,
          optionsTotalPesewas: 500,
          modifiers: [],
          selectedOptions: options,
        }),
      );

      const found = await itemRepo.findOne({ where: { id: item.id } });
      expect(found!.selectedOptions).toHaveLength(1);
      expect((found!.selectedOptions[0] as any).groupId).toBe('size');
      expect((found!.selectedOptions[0] as any).priceAdjustmentPesewas).toBe(500);
    });

    it('retrieves all items for a cart', async () => {
      const cart = await cartRepo.save(cartRepo.create({ customerId: 'cust-7', status: CartStatus.ACTIVE }));

      for (let i = 0; i < 4; i++) {
        await itemRepo.save(
          itemRepo.create({
            cartId: cart.id,
            vendorId: 'v1',
            itemId: `item-${i}`,
            itemName: `Item ${i}`,
            qty: 1,
            unitPricePesewas: 1000,
            optionsTotalPesewas: 0,
            modifiers: [],
            selectedOptions: [],
          }),
        );
      }

      const items = await itemRepo.find({ where: { cartId: cart.id } });
      expect(items).toHaveLength(4);
    });

    it('deletes all items when cart is cleared', async () => {
      const cart = await cartRepo.save(cartRepo.create({ customerId: 'cust-8', status: CartStatus.ACTIVE }));

      await itemRepo.save([
        itemRepo.create({ cartId: cart.id, vendorId: 'v1', itemId: 'i1', itemName: 'Item 1', qty: 1, unitPricePesewas: 1000, optionsTotalPesewas: 0, modifiers: [], selectedOptions: [] }),
        itemRepo.create({ cartId: cart.id, vendorId: 'v1', itemId: 'i2', itemName: 'Item 2', qty: 1, unitPricePesewas: 2000, optionsTotalPesewas: 0, modifiers: [], selectedOptions: [] }),
      ]);

      await itemRepo.delete({ cartId: cart.id });

      const remaining = await itemRepo.find({ where: { cartId: cart.id } });
      expect(remaining).toHaveLength(0);
    });
  });

  // ── Multi-vendor cart grouping ────────────────────────────────────

  describe('Multi-vendor cart grouping', () => {
    it('groups items by vendorId for checkout splitting', async () => {
      const cart = await cartRepo.save(cartRepo.create({ customerId: 'cust-9', status: CartStatus.ACTIVE }));

      await itemRepo.save([
        itemRepo.create({ cartId: cart.id, vendorId: 'vendor-a', itemId: 'ia1', itemName: 'Burger', qty: 1, unitPricePesewas: 3000, optionsTotalPesewas: 0, modifiers: [], selectedOptions: [] }),
        itemRepo.create({ cartId: cart.id, vendorId: 'vendor-a', itemId: 'ia2', itemName: 'Fries', qty: 2, unitPricePesewas: 1000, optionsTotalPesewas: 0, modifiers: [], selectedOptions: [] }),
        itemRepo.create({ cartId: cart.id, vendorId: 'vendor-b', itemId: 'ib1', itemName: 'Plantain', qty: 3, unitPricePesewas: 500, optionsTotalPesewas: 0, modifiers: [], selectedOptions: [] }),
      ]);

      const items = await itemRepo.find({ where: { cartId: cart.id } });
      const byVendor = items.reduce<Record<string, typeof items>>((acc, item) => {
        (acc[item.vendorId] ??= []).push(item);
        return acc;
      }, {});

      expect(Object.keys(byVendor)).toHaveLength(2);
      expect(byVendor['vendor-a']).toHaveLength(2);
      expect(byVendor['vendor-b']).toHaveLength(1);

      const vendorATotal = byVendor['vendor-a'].reduce((s, i) => s + i.qty * i.unitPricePesewas, 0);
      expect(vendorATotal).toBe(5000); // 1×3000 + 2×1000
    });
  });
});
