import { Transactional as Transaction } from 'typeorm-transactional';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartStatus, MenuItemDto, CartDto, SelectedOptionDto } from '@ore/contracts';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { internalFetch, serviceUrl } from '@ore/core';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart) private readonly carts: Repository<Cart>,
    @InjectRepository(CartItem) private readonly cartItems: Repository<CartItem>,
  ) {}

  /** Get-or-create the customer's active cart. */
  async getCart(customerId: string): Promise<CartDto> {
    const cart = await this.activeCart(customerId);
    const lines = await this.cartItems.find({ where: { cartId: cart.id }, order: { createdAt: 'ASC' } });
    const vendorIds = [...new Set(lines.map((l) => l.vendorId))];
    const vendors = await this.fetchVendors(vendorIds);
    return {
      id: cart.id,
      customerId,
      lines: lines.map((l) => ({
        id: l.id,
        itemId: l.itemId,
        vendorId: l.vendorId,
        qty: l.qty,
        unitPricePesewas: l.unitPricePesewas,
        modifiers: l.modifiers ?? [],
        selectedOptions: (l.selectedOptions ?? []) as unknown as SelectedOptionDto[],
        optionsTotalPesewas: l.optionsTotalPesewas ?? 0,
        itemName: l.itemName,
      })),
      vendors: vendors.map((v) => ({ vendorId: v.id, vendorName: v.name, lineCount: lines.filter((l) => l.vendorId === v.id).length })),
    };
  }

  @Transaction()
  async addItem(
    customerId: string,
    itemId: string,
    qty: number,
    modifiers: string[] = [],
    selectedOptions: SelectedOptionDto[] = [],
  ) {
    console.log("addItem 1");
const item = await this.fetchItem(itemId);
console.log("addItem 2");
    if (!item) throw new NotFoundException('Item not found');
    if (!item.available) throw new BadRequestException(`"${item.name}" is currently unavailable`);
console.log("addItem 3");
    const normalizedOptions = validateAndNormalizeOptions(item, selectedOptions);
    const optionsTotalPesewas = normalizedOptions.reduce((sum, option) => sum + option.priceAdjustmentPesewas, 0);
    const unitPricePesewas = item.pricePesewas + optionsTotalPesewas;
console.log("addItem 4");
    const cart = await this.activeCart(customerId);
console.log("addItem 5");
    const existingLines = await this.cartItems.find({ where: { cartId: cart.id, itemId } });
    const selectedOptionsKey = JSON.stringify(normalizedOptions);
    const existing = existingLines.find(
      (line) => JSON.stringify(line.selectedOptions ?? []) === selectedOptionsKey &&
        JSON.stringify(line.modifiers ?? []) === JSON.stringify(modifiers),
    );
    if (existing) {
      existing.qty += qty;
      existing.unitPricePesewas = unitPricePesewas;
      existing.optionsTotalPesewas = optionsTotalPesewas;
      existing.selectedOptions = normalizedOptions as unknown as Record<string, unknown>[];
      await this.cartItems.save(existing);
    } else {
      await this.cartItems.save(
        this.cartItems.create({
          cartId: cart.id,
          vendorId: item.vendorId,
          itemId: item.id,
          itemName: item.name,
          qty,
          unitPricePesewas,
          modifiers,
          selectedOptions: normalizedOptions as unknown as Record<string, unknown>[],
          optionsTotalPesewas,
        }),
      );
    }
    return this.getCart(customerId);
  }

  @Transaction()
  async updateLine(customerId: string, lineId: string, qty: number): Promise<CartDto> {
    const cart = await this.activeCart(customerId);
    const line = await this.cartItems.findOne({ where: { id: lineId, cartId: cart.id } });
    if (!line) throw new NotFoundException('Cart line not found');
    
    if (qty > 100) throw new BadRequestException('Quantity cannot exceed 100 per item');
    
    if (qty <= 0) {
      await this.cartItems.remove(line);
    } else {
      line.qty = qty;
      await this.cartItems.save(line);
    }
    return this.getCart(customerId);
  }

  @Transaction()
  async reorder(customerId: string, orderId: string): Promise<{ cart: CartDto; added: number; skipped: { itemId: string; name: string; reason: string }[] }> {
    const res = await internalFetch(`${serviceUrl('order')}/internal/orders/${orderId}`);
    if (!res.ok) throw new NotFoundException('Order not found');
    const order = (await res.json()) as {
      customerId: string;
      items?: Array<{ itemId: string; name: string; qty: number; selectedOptions?: SelectedOptionDto[]; modifiers?: string[] }>;
    };
    if (order.customerId !== customerId) throw new BadRequestException('You can only reorder your own order');
    const skipped: { itemId: string; name: string; reason: string }[] = [];
    let added = 0;
    for (const line of order.items ?? []) {
      try {
        await this.addItem(customerId, line.itemId, line.qty, line.modifiers ?? [], line.selectedOptions ?? []);
        added += 1;
      } catch (error) {
        skipped.push({
          itemId: line.itemId,
          name: line.name,
          reason: error instanceof Error ? error.message : 'Item could not be added',
        });
      }
    }
    return { cart: await this.getCart(customerId), added, skipped };
  }

  @Transaction()
  async clear(customerId: string): Promise<void> {
    const cart = await this.activeCart(customerId);
    await this.cartItems.delete({ cartId: cart.id });
  }

  async activeCart(customerId: string): Promise<Cart> {
    let cart = await this.carts.findOne({ where: { customerId, status: CartStatus.ACTIVE } });
    if (!cart) {
      cart = await this.carts.save(this.carts.create({ customerId, status: CartStatus.ACTIVE }));
    }
    return cart;
  }

  private async fetchItem(itemId: string): Promise<MenuItemDto | null> {
    try {
      const res = await internalFetch(`${serviceUrl('catalog')}/internal/item/${itemId}`);
      if (!res.ok) return null;
      return (await res.json()) as MenuItemDto;
    } catch {
      return null;
    }
  }

  private async fetchVendors(ids: string[]): Promise<{ id: string; name: string }[]> {
    const out: { id: string; name: string }[] = [];
    for (const vid of ids) {
      try {
        const res = await internalFetch(`${serviceUrl('catalog')}/internal/vendors/${vid}`);
        if (res.ok) {
          const body = (await res.json()) as { id: string; name: string };
          out.push({ id: body.id, name: body.name });
        }
      } catch {
        // ignore
      }
    }
    return out;
  }
}

export function validateAndNormalizeOptions(item: MenuItemDto, selected: SelectedOptionDto[]): SelectedOptionDto[] {
  const groups = item.addonGroups ?? [];
  if (groups.length === 0) {
    if (selected.length === 0) return [];
    throw new BadRequestException(`"${item.name}" has no selectable variants`);
  }

  const normalized: SelectedOptionDto[] = [];
  const selectedKeys = new Set<string>();
  for (const requested of selected) {
    const group = groups.find((candidate) => candidate && candidate.id === requested.groupId);
    if (!group || !Array.isArray(group.options)) {
      throw new BadRequestException(`Invalid variant group for "${item.name}"`);
    }
    const selectionKey = `${String(group.id)}:${requested.optionId}`;
    if (selectedKeys.has(selectionKey)) throw new BadRequestException(`Duplicate variant option for "${item.name}"`);
    selectedKeys.add(selectionKey);
    const option = (group.options as unknown[]).find(
      (candidate) => candidate && typeof candidate === 'object' && (candidate as Record<string, unknown>).id === requested.optionId,
    ) as Record<string, unknown> | undefined;
    if (!option || typeof option.id !== 'string' || typeof option.name !== 'string') throw new BadRequestException(`Invalid variant option for "${item.name}"`);
    const priceAdjustmentPesewas = option.priceAdjustmentPesewas ?? 0;
    if (!Number.isInteger(priceAdjustmentPesewas) || (priceAdjustmentPesewas as number) < 0) {
      throw new BadRequestException(`Variant price adjustment is invalid for "${item.name}"`);
    }
    normalized.push({
      groupId: String(group.id),
      groupName: String(group.name),
      optionId: option.id,
      optionName: option.name,
      priceAdjustmentPesewas: priceAdjustmentPesewas as number,
    });
  }

  for (const group of groups) {
    const selections = normalized.filter((option) => option.groupId === String(group.id)).length;
    const minSelections = Number(group.minSelections ?? (group.required ? 1 : 0));
    const maxSelections = Number(group.maxSelections ?? Number.MAX_SAFE_INTEGER);
    if (!Number.isInteger(minSelections) || !Number.isInteger(maxSelections) || minSelections < 0 || maxSelections < 1 || minSelections > maxSelections || selections < minSelections || selections > maxSelections) {
      throw new BadRequestException(`Select between ${minSelections} and ${maxSelections} options for ${String(group.name)}`);
    }
  }
  return normalized;
}
