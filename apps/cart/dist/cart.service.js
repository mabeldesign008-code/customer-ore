"use strict";
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
exports.CartService = void 0;
exports.validateAndNormalizeOptions = validateAndNormalizeOptions;
const typeorm_transactional_1 = require("typeorm-transactional");
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const contracts_1 = require("@ore/contracts");
const cart_entity_1 = require("./entities/cart.entity");
const cart_item_entity_1 = require("./entities/cart-item.entity");
const core_1 = require("@ore/core");
let CartService = class CartService {
    carts;
    cartItems;
    constructor(carts, cartItems) {
        this.carts = carts;
        this.cartItems = cartItems;
    }
    /** Get-or-create the customer's active cart. */
    async getCart(customerId) {
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
                selectedOptions: (l.selectedOptions ?? []),
                optionsTotalPesewas: l.optionsTotalPesewas ?? 0,
                itemName: l.itemName,
            })),
            vendors: vendors.map((v) => ({ vendorId: v.id, vendorName: v.name, lineCount: lines.filter((l) => l.vendorId === v.id).length })),
        };
    }
    async addItem(customerId, itemId, qty, modifiers = [], selectedOptions = []) {
        console.log("addItem 1");
        const item = await this.fetchItem(itemId);
        console.log("addItem 2");
        if (!item)
            throw new common_1.NotFoundException('Item not found');
        if (!item.available)
            throw new common_1.BadRequestException(`"${item.name}" is currently unavailable`);
        console.log("addItem 3");
        const normalizedOptions = validateAndNormalizeOptions(item, selectedOptions);
        const optionsTotalPesewas = normalizedOptions.reduce((sum, option) => sum + option.priceAdjustmentPesewas, 0);
        const unitPricePesewas = item.pricePesewas + optionsTotalPesewas;
        console.log("addItem 4");
        const cart = await this.activeCart(customerId);
        console.log("addItem 5");
        const existingLines = await this.cartItems.find({ where: { cartId: cart.id, itemId } });
        const selectedOptionsKey = JSON.stringify(normalizedOptions);
        const existing = existingLines.find((line) => JSON.stringify(line.selectedOptions ?? []) === selectedOptionsKey &&
            JSON.stringify(line.modifiers ?? []) === JSON.stringify(modifiers));
        if (existing) {
            existing.qty += qty;
            existing.unitPricePesewas = unitPricePesewas;
            existing.optionsTotalPesewas = optionsTotalPesewas;
            existing.selectedOptions = normalizedOptions;
            await this.cartItems.save(existing);
        }
        else {
            await this.cartItems.save(this.cartItems.create({
                cartId: cart.id,
                vendorId: item.vendorId,
                itemId: item.id,
                itemName: item.name,
                qty,
                unitPricePesewas,
                modifiers,
                selectedOptions: normalizedOptions,
                optionsTotalPesewas,
            }));
        }
        return this.getCart(customerId);
    }
    async updateLine(customerId, lineId, qty) {
        const cart = await this.activeCart(customerId);
        const line = await this.cartItems.findOne({ where: { id: lineId, cartId: cart.id } });
        if (!line)
            throw new common_1.NotFoundException('Cart line not found');
        if (qty > 100)
            throw new common_1.BadRequestException('Quantity cannot exceed 100 per item');
        if (qty <= 0) {
            await this.cartItems.remove(line);
        }
        else {
            line.qty = qty;
            await this.cartItems.save(line);
        }
        return this.getCart(customerId);
    }
    async reorder(customerId, orderId) {
        const res = await (0, core_1.internalFetch)(`${(0, core_1.serviceUrl)('order')}/internal/orders/${orderId}`);
        if (!res.ok)
            throw new common_1.NotFoundException('Order not found');
        const order = (await res.json());
        if (order.customerId !== customerId)
            throw new common_1.BadRequestException('You can only reorder your own order');
        const skipped = [];
        let added = 0;
        for (const line of order.items ?? []) {
            try {
                await this.addItem(customerId, line.itemId, line.qty, line.modifiers ?? [], line.selectedOptions ?? []);
                added += 1;
            }
            catch (error) {
                skipped.push({
                    itemId: line.itemId,
                    name: line.name,
                    reason: error instanceof Error ? error.message : 'Item could not be added',
                });
            }
        }
        return { cart: await this.getCart(customerId), added, skipped };
    }
    async clear(customerId) {
        const cart = await this.activeCart(customerId);
        await this.cartItems.delete({ cartId: cart.id });
    }
    async activeCart(customerId) {
        let cart = await this.carts.findOne({ where: { customerId, status: contracts_1.CartStatus.ACTIVE } });
        if (!cart) {
            cart = await this.carts.save(this.carts.create({ customerId, status: contracts_1.CartStatus.ACTIVE }));
        }
        return cart;
    }
    async fetchItem(itemId) {
        try {
            const res = await (0, core_1.internalFetch)(`${(0, core_1.serviceUrl)('catalog')}/internal/item/${itemId}`);
            if (!res.ok)
                return null;
            return (await res.json());
        }
        catch {
            return null;
        }
    }
    async fetchVendors(ids) {
        const out = [];
        for (const vid of ids) {
            try {
                const res = await (0, core_1.internalFetch)(`${(0, core_1.serviceUrl)('catalog')}/internal/vendors/${vid}`);
                if (res.ok) {
                    const body = (await res.json());
                    out.push({ id: body.id, name: body.name });
                }
            }
            catch {
                // ignore
            }
        }
        return out;
    }
};
exports.CartService = CartService;
__decorate([
    (0, typeorm_transactional_1.Transactional)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number, Array, Array]),
    __metadata("design:returntype", Promise)
], CartService.prototype, "addItem", null);
__decorate([
    (0, typeorm_transactional_1.Transactional)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number]),
    __metadata("design:returntype", Promise)
], CartService.prototype, "updateLine", null);
__decorate([
    (0, typeorm_transactional_1.Transactional)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CartService.prototype, "reorder", null);
__decorate([
    (0, typeorm_transactional_1.Transactional)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CartService.prototype, "clear", null);
exports.CartService = CartService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(cart_entity_1.Cart)),
    __param(1, (0, typeorm_1.InjectRepository)(cart_item_entity_1.CartItem)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], CartService);
function validateAndNormalizeOptions(item, selected) {
    const groups = item.addonGroups ?? [];
    if (groups.length === 0) {
        if (selected.length === 0)
            return [];
        throw new common_1.BadRequestException(`"${item.name}" has no selectable variants`);
    }
    const normalized = [];
    const selectedKeys = new Set();
    for (const requested of selected) {
        const group = groups.find((candidate) => candidate && candidate.id === requested.groupId);
        if (!group || !Array.isArray(group.options)) {
            throw new common_1.BadRequestException(`Invalid variant group for "${item.name}"`);
        }
        const selectionKey = `${String(group.id)}:${requested.optionId}`;
        if (selectedKeys.has(selectionKey))
            throw new common_1.BadRequestException(`Duplicate variant option for "${item.name}"`);
        selectedKeys.add(selectionKey);
        const option = group.options.find((candidate) => candidate && typeof candidate === 'object' && candidate.id === requested.optionId);
        if (!option || typeof option.id !== 'string' || typeof option.name !== 'string')
            throw new common_1.BadRequestException(`Invalid variant option for "${item.name}"`);
        const priceAdjustmentPesewas = option.priceAdjustmentPesewas ?? 0;
        if (!Number.isInteger(priceAdjustmentPesewas) || priceAdjustmentPesewas < 0) {
            throw new common_1.BadRequestException(`Variant price adjustment is invalid for "${item.name}"`);
        }
        normalized.push({
            groupId: String(group.id),
            groupName: String(group.name),
            optionId: option.id,
            optionName: option.name,
            priceAdjustmentPesewas: priceAdjustmentPesewas,
        });
    }
    for (const group of groups) {
        const selections = normalized.filter((option) => option.groupId === String(group.id)).length;
        const minSelections = Number(group.minSelections ?? (group.required ? 1 : 0));
        const maxSelections = Number(group.maxSelections ?? Number.MAX_SAFE_INTEGER);
        if (!Number.isInteger(minSelections) || !Number.isInteger(maxSelections) || minSelections < 0 || maxSelections < 1 || minSelections > maxSelections || selections < minSelections || selections > maxSelections) {
            throw new common_1.BadRequestException(`Select between ${minSelections} and ${maxSelections} options for ${String(group.name)}`);
        }
    }
    return normalized;
}
//# sourceMappingURL=cart.service.js.map