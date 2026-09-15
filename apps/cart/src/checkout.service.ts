/** Checkout orchestration — G36/G37/G08/G02/G01.
 *  One checkout → N vendor-orders, snapshotted, fee-broken-down, payment initialized once. */

import { Transactional as Transaction } from 'typeorm-transactional';

import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EVENTS,
  CheckoutDto,
  CheckoutResultDto,
  DeliveryAddressDto,
  OrderItemSnapshot,
  PaymentMethod,
  VendorType,
  computeBreakdown,
  feePolicyFromEnv,
  serviceCodeFor,
  MenuItemDto,
  VendorLocationDto,
  SelectedOptionDto, bpsToPct, bpsOf } from '@ore/contracts';
import { distanceKm, isPointInZone, loadZone } from '@ore/geo';
import { ORE_BUS, ORE_ENV, internalFetch, serviceUrl } from '@ore/core';
import { Bus } from '@ore/bus';
import { OreEnv } from '@ore/config';
import { CartStatus } from '@ore/contracts';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { validateAndNormalizeOptions } from './cart.service';
import { CatalogPromotion, discountPesewasFor, pickPromotion } from './checkout.promos';
import { allocatePspCharge } from './checkout.allocate';

interface CatalogItem extends MenuItemDto {
  vendorName: string;
  vendorType: VendorType;
  vendorLat: number;
  vendorLng: number;
  deliveryRadiusKm: number;
  accepting: boolean;
  acceptsCod: boolean;
  plan?: string;
  locations?: VendorLocationDto[];
}

@Injectable()
export class CheckoutService {
  constructor(
    @InjectRepository(Cart) private readonly carts: Repository<Cart>,
    @InjectRepository(CartItem) private readonly cartItems: Repository<CartItem>,
    @Inject(ORE_BUS) private readonly bus: Bus,
    @Inject(ORE_ENV) private readonly env: OreEnv,
  ) {}

  async estimate(customerId: string, lat: number, lng: number) {
    const zone = loadZone();
    if (!isPointInZone({ lat, lng }, zone)) {
      return {
        zoneOk: false,
        subtotalPesewas: 0,
        deliveryFeePesewas: 0,
        serviceFeePesewas: 0,
        totalPesewas: 0,
        vendors: [],
      };
    }

    const cart = await this.carts.findOne({ where: { customerId, status: CartStatus.ACTIVE } });
    const lines = cart ? await this.cartItems.find({ where: { cartId: cart.id } }) : [];
    if (lines.length === 0) {
      return {
        zoneOk: true,
        subtotalPesewas: 0,
        deliveryFeePesewas: 0,
        serviceFeePesewas: 0,
        totalPesewas: 0,
        vendors: [],
      };
    }

    const items = await this.fetchItems(lines.map((line) => line.itemId));
    const itemMap = new Map(items.map((item) => [item.id, item]));
    const feePolicy = feePolicyFromEnv(this.env.rawEnv);
    const byVendor = new Map<string, { vendorName: string; lines: CartItem[] }>();
    for (const line of lines) {
      const item = itemMap.get(line.itemId);
      if (!item) continue;
      const group = byVendor.get(line.vendorId) ?? { vendorName: item.vendorName, lines: [] };
      group.lines.push(line);
      byVendor.set(line.vendorId, group);
    }

    const vendors = [...byVendor.entries()].map(([vendorId, group]) => {
      const firstItem = itemMap.get(group.lines[0].itemId)!;
      const subtotalPesewas = group.lines.reduce((sum, line) => sum + line.unitPricePesewas * line.qty, 0);
      const distance = distanceKm({ lat: firstItem.vendorLat, lng: firstItem.vendorLng }, { lat, lng });
      const breakdown = computeBreakdown({
        subtotalPesewas,
        distanceKm: distance,
        feePolicy,
        vendorType: firstItem.vendorType,
        serviceLevel: 'STANDARD',
      });
      return {
        vendorId,
        vendorName: group.vendorName,
        subtotalPesewas,
        deliveryFeePesewas: breakdown.deliveryFeePesewas,
        serviceFeePesewas: breakdown.serviceFeePesewas,
        totalPesewas: breakdown.totalPesewas,
      };
    });

    return {
      zoneOk: true,
      subtotalPesewas: vendors.reduce((sum, vendor) => sum + vendor.subtotalPesewas, 0),
      deliveryFeePesewas: vendors.reduce((sum, vendor) => sum + vendor.deliveryFeePesewas, 0),
      serviceFeePesewas: vendors.reduce((sum, vendor) => sum + vendor.serviceFeePesewas, 0),
      totalPesewas: vendors.reduce((sum, vendor) => sum + vendor.totalPesewas, 0),
      vendors,
    };
  }

  @Transaction()
  async checkout(customerId: string, phone: string, dto: CheckoutDto): Promise<CheckoutResultDto> {
    const cart = await this.carts.findOne({ where: { customerId, status: CartStatus.ACTIVE } });
    if (!cart) throw new BadRequestException('Cart is empty');
    const lines = await this.cartItems.find({ where: { cartId: cart.id } });
    if (lines.length === 0) throw new BadRequestException('Cart is empty');

    // 1. Zone gate (G01)
    const zone = loadZone();
    if (!isPointInZone({ lat: dto.address.lat, lng: dto.address.lng }, zone)) {
      throw new BadRequestException('Delivery address is outside the Cape Coast zone');
    }
    let scheduledFor: string | null = null;
    const serviceLevel = dto.serviceLevel ?? (dto.scheduledFor ? 'SCHEDULED' : 'STANDARD');
    if (dto.scheduledFor) {
      const slot = new Date(dto.scheduledFor);
      const min = Date.now() + 30 * 60_000;
      const max = Date.now() + 7 * 86_400_000;
      if (Number.isNaN(slot.getTime()) || slot.getTime() < min || slot.getTime() > max) {
        throw new BadRequestException('Scheduled delivery must be between 30 minutes and 7 days from now');
      }
      scheduledFor = slot.toISOString();
    }

    // 2. Fetch current item data → validate + snapshot (G04/G08)
    const items = await this.fetchItems(lines.map((l) => l.itemId));
    const itemMap = new Map(items.map((i) => [i.id, i]));
    for (const line of lines) {
      const item = itemMap.get(line.itemId);
      if (!item) throw new BadRequestException('An item in your cart no longer exists');
      if (!item.available) throw new BadRequestException(`"${line.itemName}" is no longer available`);
      if (!item.accepting) throw new BadRequestException(`${item.vendorName} is not accepting orders right now`);
      if (distanceKm({ lat: item.vendorLat, lng: item.vendorLng }, dto.address) > item.deliveryRadiusKm) {
        throw new BadRequestException(`${item.vendorName} does not deliver to your address`);
      }
    }

    // 3. Group by vendor (G36) + per-vendor money breakdown (G02/G10)
    const feePolicy = feePolicyFromEnv(this.env.rawEnv);

    const packingBuffer = this.env.packingBufferMin;
    const byVendor = new Map<string, { vendorName: string; lines: CartItem[] }>();
    for (const line of lines) {
      const item = itemMap.get(line.itemId)!;
      if (!byVendor.has(line.vendorId)) {
        byVendor.set(line.vendorId, { vendorName: item.vendorName, lines: [] });
      }
      byVendor.get(line.vendorId)!.lines.push(line);
    }

    const paymentMethodMap = new Map((dto.paymentMethods ?? []).map((p) => [p.vendorId, p.method]));
    const requestedByVendor = new Map((dto.promotions ?? []).map((row) => [row.vendorId, row.promotionId]));
    const tipByVendor = new Map((dto.tips ?? []).map((row) => [row.vendorId, row.tipPesewas]));
    let promotionsSpecified = dto.promotions !== undefined;
    const promotionWarnings: string[] = [];
    if (dto.voucherCode) {
      const voucher = await this.fetchVoucherPromotion(dto.voucherCode);
      if (voucher) {
        if (!requestedByVendor.has(voucher.vendorId)) {
          requestedByVendor.set(voucher.vendorId, voucher.id);
          promotionsSpecified = true;
        }
      } else {
        promotionWarnings.push('That voucher code is not an active promotion.');
      }
    }
    const orderPayloads: OrderCreatePayload[] = [];
    for (const [vendorId, group] of byVendor) {
      const itemsSnap: OrderItemSnapshot[] = group.lines.map((l) => {
        const item = itemMap.get(l.itemId)!;
        const selectedOptions = validateAndNormalizeOptions(item, (l.selectedOptions ?? []) as unknown as SelectedOptionDto[]);
        const optionsTotalPesewas = selectedOptions.reduce((sum, option) => sum + option.priceAdjustmentPesewas, 0);
        return {
          itemId: item.id,
          name: item.name,
          qty: l.qty,
          unit: item.unit ?? null,
          unitPricePesewas: item.pricePesewas + optionsTotalPesewas,
          prepTimeMin: item.prepTimeMin,
          modifiers: l.modifiers ?? [],
          selectedOptions,
          optionsTotalPesewas,
          prescriptionOnly: item.prescriptionOnly ?? false,
        };
      });
      const subtotal = itemsSnap.reduce((s, i) => s + i.unitPricePesewas * i.qty, 0);
      const dKm = distanceKm(
        { lat: itemMap.get(group.lines[0].itemId)!.vendorLat, lng: itemMap.get(group.lines[0].itemId)!.vendorLng },
        dto.address,
      );
      const vendorType = (itemMap.get(group.lines[0].itemId)!.vendorType as VendorType) ?? VendorType.FOOD;
      const active = await this.fetchActivePromotions(vendorId);
      const picked = pickPromotion(active, requestedByVendor.get(vendorId), promotionsSpecified);
      if (picked.warning) promotionWarnings.push(`${group.vendorName}: ${picked.warning}`);
      const breakdown = computeBreakdown({ subtotalPesewas: subtotal, distanceKm: dKm, feePolicy, vendorType, serviceLevel });
      const promotion = picked.promotion;
      const promotionDiscountPesewas = promotion ? discountPesewasFor(promotion, subtotal, breakdown.vendorSharePesewas) : 0;
      if (promotion && promotionDiscountPesewas === 0 && requestedByVendor.get(vendorId)) {
        promotionWarnings.push(`${group.vendorName}: cart is below the promotion minimum. Charged full price.`);
      }
      if (promotionDiscountPesewas > 0) {
        breakdown.totalPesewas -= promotionDiscountPesewas;
        breakdown.vendorSharePesewas -= promotionDiscountPesewas;
      }
      const tipPesewas = tipByVendor.get(vendorId) ?? 0;
      if (tipPesewas > 0) breakdown.totalPesewas += tipPesewas;
      // doc §4 Premium: reduced commission
      if (itemMap.get(group.lines[0].itemId)!.plan === 'PREMIUM') {
        const discountPct = this.env.premiumCommissionDiscountPct;
        // In basis points the discount lands exactly: 25% off 1800 bps is 1350 bps (13.5%).
        // In whole percent it could not be expressed — 18 × 0.75 = 13.5 rounded to 14 — so
        // every premium order quietly took an extra half a point off the vendor.
        const premiumBps = Math.max(0, Math.round(breakdown.commissionBps * (1 - discountPct / 100)));
        breakdown.commissionBps = premiumBps;
        breakdown.vendorSharePesewas = Math.max(0, subtotal - bpsOf(subtotal, premiumBps) - promotionDiscountPesewas);
      }
      const prepTimeMin = Math.max(...itemsSnap.map((i) => i.prepTimeMin)) + packingBuffer;
      const firstItem = itemMap.get(group.lines[0].itemId)!;
      const paymentMethod = paymentMethodMap.get(vendorId) ?? PaymentMethod.PREPAID;
      if (paymentMethod === PaymentMethod.COD && !firstItem.acceptsCod) {
        throw new BadRequestException(`${group.vendorName} does not accept cash on delivery`);
      }
      const pickup = firstItem.locations?.length === 1
        ? firstItem.locations[0]
        : null;

      orderPayloads.push({
        recipient: dto.recipient ?? null,
        customerPhone: phone,
        vendorId,
        vendorName: group.vendorName,
        vendorType,
        serviceCode: serviceCodeFor(vendorType),
        feePolicyVersion: feePolicy.version,
        customerId,
        address: { ...dto.address },
        pickup: pickup
          ? { locationId: pickup.id, name: pickup.name, address: pickup.address, lat: pickup.lat, lng: pickup.lng }
          : null,
        items: itemsSnap,
        paymentMethod,
        prepTimeMin,
        subtotalPesewas: breakdown.subtotalPesewas,
        deliveryFeePesewas: breakdown.deliveryFeePesewas,
        serviceFeePesewas: breakdown.serviceFeePesewas,
        commissionBps: breakdown.commissionBps,
        platformFeePesewas: 0,
        vendorSharePesewas: breakdown.vendorSharePesewas,
        riderFeePesewas: breakdown.riderFeePesewas,
        totalPesewas: breakdown.totalPesewas,
        promotionId: promotionDiscountPesewas > 0 ? promotion?.id ?? null : null,
        promotionTitle: promotionDiscountPesewas > 0 ? promotion?.title ?? null : null,
        promotionDiscountPesewas,
        tipPesewas,
        note: dto.note,
        leaveAtDoor: !!dto.leaveAtDoor,
        dropNote: dto.dropNote?.trim() || null,
        scheduledFor,
        serviceLevel,
      });
    }

    const codEstimatePesewas = orderPayloads
      .filter((order) => order.paymentMethod === PaymentMethod.COD)
      .reduce((sum, order) => sum + order.totalPesewas, 0);
    if (codEstimatePesewas > 0) await this.assertCustomerCanUseCod(customerId, codEstimatePesewas);

    // 4. Create the N orders (order-service owns the state machine)
    const created = await this.createOrders(orderPayloads);
    for (const order of created.orders) {
      if (!order.promotionId || (order.promotionDiscountPesewas ?? 0) <= 0) continue;
      try {
        await this.redeemPromotion(order.promotionId, order.orderId, order.promotionDiscountPesewas!, customerId);
      } catch {
        const cleared = await this.clearOrderPromotion(order.orderId);
        order.promotionId = null;
        order.promotionTitle = null;
        order.promotionDiscountPesewas = 0;
        order.totalPesewas = cleared?.totalPesewas ?? order.totalPesewas;
        promotionWarnings.push(`${order.vendorName}: promotion could not be redeemed. Charged full price.`);
      }
    }

    const prepaid = created.orders.filter((o) => o.paymentMethod === PaymentMethod.PREPAID);
    const cod = created.orders.filter((o) => o.paymentMethod === PaymentMethod.COD);
    const prepaidTotal = prepaid.reduce((s, o) => s + o.totalPesewas, 0);
    const codTotal = cod.reduce((s, o) => s + o.totalPesewas, 0);

    // 5. Wallet credit (doc §Payment): credit reduces what the customer pays via PSP
    let creditAppliedPesewas = 0;
    if (prepaid.length > 0 && dto.creditPesewas && dto.creditPesewas > 0) {
      const spent = await this.spendCredit(customerId, Math.min(dto.creditPesewas, prepaidTotal), `checkout:${created.checkoutId}`);
      creditAppliedPesewas = spent.appliedPesewas;
    }
    const pspChargePesewas = Math.max(0, prepaidTotal - creditAppliedPesewas);

    // 6. Gift orders (doc §3 Case 2): nothing is charged until the recipient confirms the
    //    location — the order-service initializes the payment then. COD gifts confirm directly.
    const isGift = !!dto.recipient;
    let payment: CheckoutResultDto['payment'];
    if (isGift) {
      // all sub-orders are AWAITING_RECIPIENT — no payment yet
    } else if (prepaid.length > 0 && pspChargePesewas > 0) {
      try {
        payment = await this.initializePayment({
          checkoutId: created.checkoutId,
          amountPesewas: pspChargePesewas,
          phone,
          allocations: allocatePspCharge(prepaid, prepaidTotal, pspChargePesewas),
        });
      } catch (err) {
        for (const o of created.orders) await this.cancelCreatedOrder(o.orderId, 'payment-init-failed');
        throw err;
      }
    } else if (prepaid.length > 0 && creditAppliedPesewas > 0) {
      await internalFetch(`${serviceUrl('order')}/internal/orders/${created.checkoutId}/confirm-credit`, { method: 'POST' });
    }

    cart.status = CartStatus.CHECKED_OUT;
    cart.checkoutId = created.checkoutId;
    await this.carts.save(cart);

    await this.bus.publish(EVENTS.CHECKOUT_COMPLETED, {
      checkoutId: created.checkoutId,
      orderIds: created.orders.map((o) => o.orderId),
      customerId,
      prepaidTotalPesewas: prepaidTotal,
      codTotalPesewas: codTotal,
      creditAppliedPesewas,
      pspChargePesewas,
    });

    return {
      checkoutId: created.checkoutId,
      orders: created.orders.map((o) => ({
        orderId: o.orderId,
        vendorId: o.vendorId,
        vendorName: o.vendorName,
        vendorType: o.vendorType,
        serviceCode: o.serviceCode,
        feePolicyVersion: o.feePolicyVersion,
        serviceLevel: o.serviceLevel,
        status: o.status,
        paymentMethod: o.paymentMethod,
        subtotalPesewas: o.subtotalPesewas,
        deliveryFeePesewas: o.deliveryFeePesewas,
        serviceFeePesewas: o.serviceFeePesewas,
        commissionPct: bpsToPct(o.commissionBps ?? 0),
        totalPesewas: o.totalPesewas,
        promotionId: o.promotionId,
        promotionTitle: o.promotionTitle,
        promotionDiscountPesewas: o.promotionDiscountPesewas,
        tipPesewas: o.tipPesewas ?? 0,
        prepTimeMin: o.prepTimeMin,
      })),
      prepaidTotalPesewas: prepaidTotal,
      codTotalPesewas: codTotal,
      creditAppliedPesewas: creditAppliedPesewas > 0 ? creditAppliedPesewas : undefined,
      pspChargePesewas: pspChargePesewas > 0 ? pspChargePesewas : undefined,
      payment,
      promotionWarnings: promotionWarnings.length > 0 ? promotionWarnings : undefined,
    };
  }

  private async assertCustomerCanUseCod(customerId: string, amountPesewas: number): Promise<void> {
    // `/auth/internal/...`, not `/internal/...` — the auth service mounts its internal routes
    // under the controller's `/auth` prefix. Without it this is a 404 on every single COD
    // checkout, surfaced to the customer as "Could not verify cash-on-delivery eligibility".
    // Nothing caught it because the unit tests stub `internalFetch`, and the e2e scripts run
    // the whole stack in one sqlite process where the call never leaves the box either.
    const res = await internalFetch(`${serviceUrl('auth')}/auth/internal/users/${encodeURIComponent(customerId)}/standing`);
    if (!res.ok) throw new BadRequestException('Could not verify cash-on-delivery eligibility');
    const standing = (await res.json()) as { codAllowed?: boolean; codLimitPesewas?: number; codTier?: string; codBlockReason?: string | null };
    if (!standing.codAllowed) throw new BadRequestException(standing.codBlockReason ?? 'Cash on delivery is not available for this account');
    const limit = standing.codLimitPesewas ?? 0;
    if (amountPesewas > limit) {
      throw new BadRequestException(`Cash-on-delivery limit exceeded for ${standing.codTier ?? 'NEW'} tier`);
    }
  }

  /** Apply wallet credit via the ledger (idempotent per checkout ref). */
  private async spendCredit(customerId: string, amountPesewas: number, ref: string): Promise<{ appliedPesewas: number }> {
    const res = await internalFetch(`${serviceUrl('ledger')}/internal/ledger/customers/${customerId}/credit/spend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountPesewas, ref }),
    });
    if (!res.ok) return { appliedPesewas: 0 };
    return (await res.json()) as { appliedPesewas: number };
  }

  private async redeemPromotion(promotionId: string, orderId: string, discountPesewas: number, customerId: string): Promise<void> {
    const res = await internalFetch(`${serviceUrl('catalog')}/internal/promotions/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promotionId, orderId, discountPesewas, customerId }),
    });
    if (!res.ok) throw new BadRequestException('Promotion budget or redemption limit is no longer available');
  }

  private async cancelCreatedOrder(orderId: string, reason: string): Promise<void> {
    await internalFetch(`${serviceUrl('order')}/internal/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    }).catch(() => undefined);
  }

  private async fetchActivePromotions(vendorId: string): Promise<CatalogPromotion[]> {
    try {
      const res = await internalFetch(`${serviceUrl('catalog')}/internal/vendors/${vendorId}/promotions/active`);
      if (!res.ok) return [];
      const rows = (await res.json()) as CatalogPromotion[];
      return Array.isArray(rows) ? rows : [];
    } catch {
      return [];
    }
  }

  private async clearOrderPromotion(orderId: string): Promise<{ totalPesewas: number } | null> {
    try {
      const res = await internalFetch(`${serviceUrl('order')}/internal/orders/${orderId}/clear-promotion`, { method: 'POST' });
      if (!res.ok) return null;
      return (await res.json()) as { totalPesewas: number };
    } catch {
      return null;
    }
  }

  private async fetchItems(ids: string[]): Promise<CatalogItem[]> {
    const res = await internalFetch(`${serviceUrl('catalog')}/internal/items?ids=${ids.join(',')}`);
    if (!res.ok) throw new BadRequestException('Could not load menu items');
    const items = (await res.json()) as MenuItemDto[];
    // vendor metadata: fetch each vendor's detail is N+1; for one-city MVP fetch vendor by items via catalog search is not available.
    // We approximate: re-fetch full vendor menu per vendor id via internal endpoint (bounded by #vendors in cart).
    const vendorIds = [...new Set(items.map((i) => i.vendorId))];
    const vendorMap = new Map<string, { name: string; vendorType: VendorType; lat: number; lng: number; deliveryRadiusKm: number; accepting: boolean; acceptsCod?: boolean; plan?: string; locations?: VendorLocationDto[] }>();
    for (const vid of vendorIds) {
      try {
        const r = await internalFetch(`${serviceUrl('catalog')}/internal/vendors/${vid}`);
        if (r.ok) {
          const body = (await r.json()) as { id: string; name: string; vendorType: VendorType; lat: number; lng: number; deliveryRadiusKm: number; accepting: boolean; acceptsCod?: boolean; plan?: string; locations?: VendorLocationDto[] };
          vendorMap.set(vid, {
            name: body.name,
            vendorType: body.vendorType ?? VendorType.FOOD,
            lat: body.lat,
            lng: body.lng,
            deliveryRadiusKm: body.deliveryRadiusKm,
            accepting: body.accepting,
            acceptsCod: body.acceptsCod ?? false,
            plan: body.plan,
            locations: body.locations ?? [],
          });
        }
      } catch {
        // ignore
      }
    }
    return items.map((i) => {
      const v = vendorMap.get(i.vendorId);
      return {
        ...i,
        vendorName: v?.name ?? 'Unknown',
        vendorType: v?.vendorType ?? VendorType.FOOD,
        vendorLat: v?.lat ?? 0,
        vendorLng: v?.lng ?? 0,
        deliveryRadiusKm: v?.deliveryRadiusKm ?? 0,
        accepting: v?.accepting ?? false,
        acceptsCod: v?.acceptsCod ?? false,
        plan: v?.plan ?? 'STANDARD',
        locations: v?.locations ?? [],
      };
    });
  }

  private async createOrders(payloads: OrderCreatePayload[]) {
    const res = await internalFetch(`${serviceUrl('order')}/internal/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders: payloads }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new BadRequestException((body as { error?: { message?: string } }).error?.message ?? 'Could not create orders');
    }
    return (await res.json()) as { checkoutId: string; orders: CreatedOrder[] };
  }

  private async fetchVoucherPromotion(code: string): Promise<{ id: string; vendorId: string; title: string; code: string } | null> {
    try {
      const res = await internalFetch(`${serviceUrl('catalog')}/internal/promotions/by-code/${encodeURIComponent(code)}`);
      if (!res.ok) return null;
      return (await res.json()) as { id: string; vendorId: string; title: string; code: string } | null;
    } catch {
      return null;
    }
  }

  private async initializePayment(p: { checkoutId: string; amountPesewas: number; phone: string; allocations: { orderId: string; allocatedPesewas: number }[] }) {
    const res = await internalFetch(`${serviceUrl('payment')}/internal/payments/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p),
    });
    if (!res.ok) throw new BadRequestException('Could not initialize payment');
    return (await res.json()) as CheckoutResultDto['payment'];
  }
}

export interface OrderCreatePayload {
  recipient?: { name: string; phone: string } | null;
  customerPhone?: string | null;
  vendorId: string;
  vendorName: string;
  vendorType: VendorType;
  serviceCode: string;
  feePolicyVersion: number;
  commissionBps: number;
  customerId: string;
  address: DeliveryAddressDto;
  pickup?: { locationId?: string | null; name: string; address?: string | null; lat: number; lng: number } | null;
  items: OrderItemSnapshot[];
  paymentMethod: PaymentMethod;
  prepTimeMin: number;
  subtotalPesewas: number;
  deliveryFeePesewas: number;
  serviceFeePesewas: number;
  platformFeePesewas: number;
  vendorSharePesewas: number;
  riderFeePesewas: number;
  totalPesewas: number;
  promotionId?: string | null;
  promotionTitle?: string | null;
  promotionDiscountPesewas?: number;
  tipPesewas?: number;
  note?: string;
  leaveAtDoor?: boolean;
  dropNote?: string | null;
  scheduledFor?: string | null;
  serviceLevel?: 'STANDARD' | 'SCHEDULED' | 'PRIORITY';
}

export interface CreatedOrder {
  orderId: string;
  vendorId: string;
  vendorName: string;
  vendorType: VendorType;
  serviceCode: string;
  feePolicyVersion: number;
  serviceLevel?: 'STANDARD' | 'SCHEDULED' | 'PRIORITY';
  status: string;
  paymentMethod: PaymentMethod;
  subtotalPesewas: number;
  deliveryFeePesewas: number;
  serviceFeePesewas: number;
  commissionBps: number;
  totalPesewas: number;
  promotionId?: string | null;
  promotionTitle?: string | null;
  promotionDiscountPesewas?: number;
  tipPesewas?: number;
  prepTimeMin: number;
}
