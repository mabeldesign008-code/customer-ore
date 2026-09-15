"use strict";
/** Checkout orchestration — G36/G37/G08/G02/G01.
 *  One checkout → N vendor-orders, snapshotted, fee-broken-down, payment initialized once. */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckoutService = void 0;
const typeorm_transactional_1 = require("typeorm-transactional");
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const contracts_1 = require("@ore/contracts");
const geo_1 = require("@ore/geo");
const core_1 = require("@ore/core");
const contracts_2 = require("@ore/contracts");
const cart_entity_1 = require("./entities/cart.entity");
const cart_item_entity_1 = require("./entities/cart-item.entity");
const cart_service_1 = require("./cart.service");
const checkout_promos_1 = require("./checkout.promos");
const checkout_allocate_1 = require("./checkout.allocate");
let CheckoutService = class CheckoutService {
    carts;
    cartItems;
    bus;
    env;
    constructor(carts, cartItems, bus, env) {
        this.carts = carts;
        this.cartItems = cartItems;
        this.bus = bus;
        this.env = env;
    }
    async estimate(customerId, lat, lng) {
        const zone = (0, geo_1.loadZone)();
        if (!(0, geo_1.isPointInZone)({ lat, lng }, zone)) {
            return {
                zoneOk: false,
                subtotalPesewas: 0,
                deliveryFeePesewas: 0,
                serviceFeePesewas: 0,
                totalPesewas: 0,
                vendors: [],
            };
        }
        const cart = await this.carts.findOne({ where: { customerId, status: contracts_2.CartStatus.ACTIVE } });
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
        const feePolicy = (0, contracts_1.feePolicyFromEnv)(this.env.rawEnv);
        const byVendor = new Map();
        for (const line of lines) {
            const item = itemMap.get(line.itemId);
            if (!item)
                continue;
            const group = byVendor.get(line.vendorId) ?? { vendorName: item.vendorName, lines: [] };
            group.lines.push(line);
            byVendor.set(line.vendorId, group);
        }
        const vendors = [...byVendor.entries()].map(([vendorId, group]) => {
            const firstItem = itemMap.get(group.lines[0].itemId);
            const subtotalPesewas = group.lines.reduce((sum, line) => sum + line.unitPricePesewas * line.qty, 0);
            const distance = (0, geo_1.distanceKm)({ lat: firstItem.vendorLat, lng: firstItem.vendorLng }, { lat, lng });
            const breakdown = (0, contracts_1.computeBreakdown)({
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
    async checkout(customerId, phone, dto) {
        const cart = await this.carts.findOne({ where: { customerId, status: contracts_2.CartStatus.ACTIVE } });
        if (!cart)
            throw new common_1.BadRequestException('Cart is empty');
        const lines = await this.cartItems.find({ where: { cartId: cart.id } });
        if (lines.length === 0)
            throw new common_1.BadRequestException('Cart is empty');
        // 1. Zone gate (G01)
        const zone = (0, geo_1.loadZone)();
        if (!(0, geo_1.isPointInZone)({ lat: dto.address.lat, lng: dto.address.lng }, zone)) {
            throw new common_1.BadRequestException('Delivery address is outside the Cape Coast zone');
        }
        let scheduledFor = null;
        const serviceLevel = dto.serviceLevel ?? (dto.scheduledFor ? 'SCHEDULED' : 'STANDARD');
        if (dto.scheduledFor) {
            const slot = new Date(dto.scheduledFor);
            const min = Date.now() + 30 * 60_000;
            const max = Date.now() + 7 * 86_400_000;
            if (Number.isNaN(slot.getTime()) || slot.getTime() < min || slot.getTime() > max) {
                throw new common_1.BadRequestException('Scheduled delivery must be between 30 minutes and 7 days from now');
            }
            scheduledFor = slot.toISOString();
        }
        // 2. Fetch current item data → validate + snapshot (G04/G08)
        const items = await this.fetchItems(lines.map((l) => l.itemId));
        const itemMap = new Map(items.map((i) => [i.id, i]));
        for (const line of lines) {
            const item = itemMap.get(line.itemId);
            if (!item)
                throw new common_1.BadRequestException('An item in your cart no longer exists');
            if (!item.available)
                throw new common_1.BadRequestException(`"${line.itemName}" is no longer available`);
            if (!item.accepting)
                throw new common_1.BadRequestException(`${item.vendorName} is not accepting orders right now`);
            if ((0, geo_1.distanceKm)({ lat: item.vendorLat, lng: item.vendorLng }, dto.address) > item.deliveryRadiusKm) {
                throw new common_1.BadRequestException(`${item.vendorName} does not deliver to your address`);
            }
        }
        // 3. Group by vendor (G36) + per-vendor money breakdown (G02/G10)
        const feePolicy = (0, contracts_1.feePolicyFromEnv)(this.env.rawEnv);
        const packingBuffer = this.env.packingBufferMin;
        const byVendor = new Map();
        for (const line of lines) {
            const item = itemMap.get(line.itemId);
            if (!byVendor.has(line.vendorId)) {
                byVendor.set(line.vendorId, { vendorName: item.vendorName, lines: [] });
            }
            byVendor.get(line.vendorId).lines.push(line);
        }
        const paymentMethodMap = new Map((dto.paymentMethods ?? []).map((p) => [p.vendorId, p.method]));
        const requestedByVendor = new Map((dto.promotions ?? []).map((row) => [row.vendorId, row.promotionId]));
        const tipByVendor = new Map((dto.tips ?? []).map((row) => [row.vendorId, row.tipPesewas]));
        let promotionsSpecified = dto.promotions !== undefined;
        const promotionWarnings = [];
        if (dto.voucherCode) {
            const voucher = await this.fetchVoucherPromotion(dto.voucherCode);
            if (voucher) {
                if (!requestedByVendor.has(voucher.vendorId)) {
                    requestedByVendor.set(voucher.vendorId, voucher.id);
                    promotionsSpecified = true;
                }
            }
            else {
                promotionWarnings.push('That voucher code is not an active promotion.');
            }
        }
        const orderPayloads = [];
        for (const [vendorId, group] of byVendor) {
            const itemsSnap = group.lines.map((l) => {
                const item = itemMap.get(l.itemId);
                const selectedOptions = (0, cart_service_1.validateAndNormalizeOptions)(item, (l.selectedOptions ?? []));
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
            const dKm = (0, geo_1.distanceKm)({ lat: itemMap.get(group.lines[0].itemId).vendorLat, lng: itemMap.get(group.lines[0].itemId).vendorLng }, dto.address);
            const vendorType = itemMap.get(group.lines[0].itemId).vendorType ?? contracts_1.VendorType.FOOD;
            const active = await this.fetchActivePromotions(vendorId);
            const picked = (0, checkout_promos_1.pickPromotion)(active, requestedByVendor.get(vendorId), promotionsSpecified);
            if (picked.warning)
                promotionWarnings.push(`${group.vendorName}: ${picked.warning}`);
            const breakdown = (0, contracts_1.computeBreakdown)({ subtotalPesewas: subtotal, distanceKm: dKm, feePolicy, vendorType, serviceLevel });
            const promotion = picked.promotion;
            const promotionDiscountPesewas = promotion ? (0, checkout_promos_1.discountPesewasFor)(promotion, subtotal, breakdown.vendorSharePesewas) : 0;
            if (promotion && promotionDiscountPesewas === 0 && requestedByVendor.get(vendorId)) {
                promotionWarnings.push(`${group.vendorName}: cart is below the promotion minimum. Charged full price.`);
            }
            if (promotionDiscountPesewas > 0) {
                breakdown.totalPesewas -= promotionDiscountPesewas;
                breakdown.vendorSharePesewas -= promotionDiscountPesewas;
            }
            const tipPesewas = tipByVendor.get(vendorId) ?? 0;
            if (tipPesewas > 0)
                breakdown.totalPesewas += tipPesewas;
            // doc §4 Premium: reduced commission
            if (itemMap.get(group.lines[0].itemId).plan === 'PREMIUM') {
                const discountPct = this.env.premiumCommissionDiscountPct;
                // In basis points the discount lands exactly: 25% off 1800 bps is 1350 bps (13.5%).
                // In whole percent it could not be expressed — 18 × 0.75 = 13.5 rounded to 14 — so
                // every premium order quietly took an extra half a point off the vendor.
                const premiumBps = Math.max(0, Math.round(breakdown.commissionBps * (1 - discountPct / 100)));
                breakdown.commissionBps = premiumBps;
                breakdown.vendorSharePesewas = Math.max(0, subtotal - (0, contracts_1.bpsOf)(subtotal, premiumBps) - promotionDiscountPesewas);
            }
            const prepTimeMin = Math.max(...itemsSnap.map((i) => i.prepTimeMin)) + packingBuffer;
            const firstItem = itemMap.get(group.lines[0].itemId);
            const paymentMethod = paymentMethodMap.get(vendorId) ?? contracts_1.PaymentMethod.PREPAID;
            if (paymentMethod === contracts_1.PaymentMethod.COD && !firstItem.acceptsCod) {
                throw new common_1.BadRequestException(`${group.vendorName} does not accept cash on delivery`);
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
                serviceCode: (0, contracts_1.serviceCodeFor)(vendorType),
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
            .filter((order) => order.paymentMethod === contracts_1.PaymentMethod.COD)
            .reduce((sum, order) => sum + order.totalPesewas, 0);
        if (codEstimatePesewas > 0)
            await this.assertCustomerCanUseCod(customerId, codEstimatePesewas);
        // 4. Create the N orders (order-service owns the state machine)
        const created = await this.createOrders(orderPayloads);
        for (const order of created.orders) {
            if (!order.promotionId || (order.promotionDiscountPesewas ?? 0) <= 0)
                continue;
            try {
                await this.redeemPromotion(order.promotionId, order.orderId, order.promotionDiscountPesewas, customerId);
            }
            catch {
                const cleared = await this.clearOrderPromotion(order.orderId);
                order.promotionId = null;
                order.promotionTitle = null;
                order.promotionDiscountPesewas = 0;
                order.totalPesewas = cleared?.totalPesewas ?? order.totalPesewas;
                promotionWarnings.push(`${order.vendorName}: promotion could not be redeemed. Charged full price.`);
            }
        }
        const prepaid = created.orders.filter((o) => o.paymentMethod === contracts_1.PaymentMethod.PREPAID);
        const cod = created.orders.filter((o) => o.paymentMethod === contracts_1.PaymentMethod.COD);
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
        let payment;
        if (isGift) {
            // all sub-orders are AWAITING_RECIPIENT — no payment yet
        }
        else if (prepaid.length > 0 && pspChargePesewas > 0) {
            try {
                payment = await this.initializePayment({
                    checkoutId: created.checkoutId,
                    amountPesewas: pspChargePesewas,
                    phone,
                    allocations: (0, checkout_allocate_1.allocatePspCharge)(prepaid, prepaidTotal, pspChargePesewas),
                });
            }
            catch (err) {
                for (const o of created.orders)
                    await this.cancelCreatedOrder(o.orderId, 'payment-init-failed');
                throw err;
            }
        }
        else if (prepaid.length > 0 && creditAppliedPesewas > 0) {
            await (0, core_1.internalFetch)(`${(0, core_1.serviceUrl)('order')}/internal/orders/${created.checkoutId}/confirm-credit`, { method: 'POST' });
        }
        cart.status = contracts_2.CartStatus.CHECKED_OUT;
        cart.checkoutId = created.checkoutId;
        await this.carts.save(cart);
        await this.bus.publish(contracts_1.EVENTS.CHECKOUT_COMPLETED, {
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
                commissionPct: (0, contracts_1.bpsToPct)(o.commissionBps ?? 0),
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
    async assertCustomerCanUseCod(customerId, amountPesewas) {
        // `/auth/internal/...`, not `/internal/...` — the auth service mounts its internal routes
        // under the controller's `/auth` prefix. Without it this is a 404 on every single COD
        // checkout, surfaced to the customer as "Could not verify cash-on-delivery eligibility".
        // Nothing caught it because the unit tests stub `internalFetch`, and the e2e scripts run
        // the whole stack in one sqlite process where the call never leaves the box either.
        const res = await (0, core_1.internalFetch)(`${(0, core_1.serviceUrl)('auth')}/auth/internal/users/${encodeURIComponent(customerId)}/standing`);
        if (!res.ok)
            throw new common_1.BadRequestException('Could not verify cash-on-delivery eligibility');
        const standing = (await res.json());
        if (!standing.codAllowed)
            throw new common_1.BadRequestException(standing.codBlockReason ?? 'Cash on delivery is not available for this account');
        const limit = standing.codLimitPesewas ?? 0;
        if (amountPesewas > limit) {
            throw new common_1.BadRequestException(`Cash-on-delivery limit exceeded for ${standing.codTier ?? 'NEW'} tier`);
        }
    }
    /** Apply wallet credit via the ledger (idempotent per checkout ref). */
    async spendCredit(customerId, amountPesewas, ref) {
        const res = await (0, core_1.internalFetch)(`${(0, core_1.serviceUrl)('ledger')}/internal/ledger/customers/${customerId}/credit/spend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amountPesewas, ref }),
        });
        if (!res.ok)
            return { appliedPesewas: 0 };
        return (await res.json());
    }
    async redeemPromotion(promotionId, orderId, discountPesewas, customerId) {
        const res = await (0, core_1.internalFetch)(`${(0, core_1.serviceUrl)('catalog')}/internal/promotions/redeem`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ promotionId, orderId, discountPesewas, customerId }),
        });
        if (!res.ok)
            throw new common_1.BadRequestException('Promotion budget or redemption limit is no longer available');
    }
    async cancelCreatedOrder(orderId, reason) {
        await (0, core_1.internalFetch)(`${(0, core_1.serviceUrl)('order')}/internal/orders/${orderId}/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason }),
        }).catch(() => undefined);
    }
    async fetchActivePromotions(vendorId) {
        try {
            const res = await (0, core_1.internalFetch)(`${(0, core_1.serviceUrl)('catalog')}/internal/vendors/${vendorId}/promotions/active`);
            if (!res.ok)
                return [];
            const rows = (await res.json());
            return Array.isArray(rows) ? rows : [];
        }
        catch {
            return [];
        }
    }
    async clearOrderPromotion(orderId) {
        try {
            const res = await (0, core_1.internalFetch)(`${(0, core_1.serviceUrl)('order')}/internal/orders/${orderId}/clear-promotion`, { method: 'POST' });
            if (!res.ok)
                return null;
            return (await res.json());
        }
        catch {
            return null;
        }
    }
    async fetchItems(ids) {
        const res = await (0, core_1.internalFetch)(`${(0, core_1.serviceUrl)('catalog')}/internal/items?ids=${ids.join(',')}`);
        if (!res.ok)
            throw new common_1.BadRequestException('Could not load menu items');
        const items = (await res.json());
        // vendor metadata: fetch each vendor's detail is N+1; for one-city MVP fetch vendor by items via catalog search is not available.
        // We approximate: re-fetch full vendor menu per vendor id via internal endpoint (bounded by #vendors in cart).
        const vendorIds = [...new Set(items.map((i) => i.vendorId))];
        const vendorMap = new Map();
        for (const vid of vendorIds) {
            try {
                const r = await (0, core_1.internalFetch)(`${(0, core_1.serviceUrl)('catalog')}/internal/vendors/${vid}`);
                if (r.ok) {
                    const body = (await r.json());
                    vendorMap.set(vid, {
                        name: body.name,
                        vendorType: body.vendorType ?? contracts_1.VendorType.FOOD,
                        lat: body.lat,
                        lng: body.lng,
                        deliveryRadiusKm: body.deliveryRadiusKm,
                        accepting: body.accepting,
                        acceptsCod: body.acceptsCod ?? false,
                        plan: body.plan,
                        locations: body.locations ?? [],
                    });
                }
            }
            catch {
                // ignore
            }
        }
        return items.map((i) => {
            const v = vendorMap.get(i.vendorId);
            return {
                ...i,
                vendorName: v?.name ?? 'Unknown',
                vendorType: v?.vendorType ?? contracts_1.VendorType.FOOD,
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
    async createOrders(payloads) {
        const res = await (0, core_1.internalFetch)(`${(0, core_1.serviceUrl)('order')}/internal/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orders: payloads }),
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new common_1.BadRequestException(body.error?.message ?? 'Could not create orders');
        }
        return (await res.json());
    }
    async fetchVoucherPromotion(code) {
        try {
            const res = await (0, core_1.internalFetch)(`${(0, core_1.serviceUrl)('catalog')}/internal/promotions/by-code/${encodeURIComponent(code)}`);
            if (!res.ok)
                return null;
            return (await res.json());
        }
        catch {
            return null;
        }
    }
    async initializePayment(p) {
        const res = await (0, core_1.internalFetch)(`${(0, core_1.serviceUrl)('payment')}/internal/payments/initialize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(p),
        });
        if (!res.ok)
            throw new common_1.BadRequestException('Could not initialize payment');
        return (await res.json());
    }
};
exports.CheckoutService = CheckoutService;
__decorate([
    (0, typeorm_transactional_1.Transactional)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], CheckoutService.prototype, "checkout", null);
exports.CheckoutService = CheckoutService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(cart_entity_1.Cart)),
    __param(1, (0, typeorm_1.InjectRepository)(cart_item_entity_1.CartItem)),
    __param(2, (0, common_1.Inject)(core_1.ORE_BUS)),
    __param(3, (0, common_1.Inject)(core_1.ORE_ENV)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository, Object, Object])
], CheckoutService);
//# sourceMappingURL=checkout.service.js.map