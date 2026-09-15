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
exports.CartController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const cart_service_1 = require("./cart.service");
const checkout_service_1 = require("./checkout.service");
const core_1 = require("@ore/core");
const contracts_1 = require("@ore/contracts");
const idempotency_1 = require("./idempotency");
let CartController = class CartController {
    cart;
    checkoutService;
    constructor(cart, checkoutService) {
        this.cart = cart;
        this.checkoutService = checkoutService;
    }
    estimate(user, latRaw, lngRaw) {
        const lat = Number(latRaw);
        const lng = Number(lngRaw);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            throw new common_1.BadRequestException('Valid latitude and longitude are required');
        }
        return this.checkoutService.estimate(user.sub, lat, lng);
    }
    get(user) {
        return this.cart.getCart(user.sub);
    }
    add(user, body) {
        const dto = contracts_1.addCartItemSchema.parse(body);
        return this.cart.addItem(user.sub, dto.itemId, dto.qty, dto.modifiers, dto.selectedOptions);
    }
    update(user, lineId, qty) {
        return this.cart.updateLine(user.sub, lineId, qty);
    }
    remove(user, lineId) {
        return this.cart.updateLine(user.sub, lineId, 0);
    }
    clear(user) {
        return this.cart.clear(user.sub);
    }
    reorder(user, body) {
        const dto = contracts_1.reorderSchema.parse(body);
        return this.cart.reorder(user.sub, dto.orderId);
    }
    checkout(user, body) {
        const dto = contracts_1.checkoutSchema.parse(body);
        return this.checkoutService.checkout(user.sub, user.phone, dto);
    }
};
exports.CartController = CartController;
__decorate([
    (0, common_1.Get)('estimate'),
    __param(0, (0, core_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('lat')),
    __param(2, (0, common_1.Query)('lng')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], CartController.prototype, "estimate", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, core_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CartController.prototype, "get", null);
__decorate([
    (0, common_1.Post)('items'),
    (0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60000 } }),
    __param(0, (0, core_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], CartController.prototype, "add", null);
__decorate([
    (0, common_1.Patch)('items/:lineId'),
    __param(0, (0, core_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('lineId')),
    __param(2, (0, common_1.Query)('qty', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number]),
    __metadata("design:returntype", void 0)
], CartController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)('items/:lineId'),
    __param(0, (0, core_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('lineId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CartController.prototype, "remove", null);
__decorate([
    (0, common_1.Delete)(),
    __param(0, (0, core_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CartController.prototype, "clear", null);
__decorate([
    (0, common_1.Post)('reorder'),
    (0, core_1.Roles)(contracts_1.Role.CUSTOMER),
    __param(0, (0, core_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], CartController.prototype, "reorder", null);
__decorate([
    (0, common_1.Post)('checkout'),
    (0, common_1.UseInterceptors)(idempotency_1.CartIdempotencyInterceptor),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 3600000 } }),
    __param(0, (0, core_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], CartController.prototype, "checkout", null);
exports.CartController = CartController = __decorate([
    (0, common_1.Controller)('cart'),
    (0, common_1.UseGuards)(core_1.AuthGuard),
    __metadata("design:paramtypes", [cart_service_1.CartService,
        checkout_service_1.CheckoutService])
], CartController);
//# sourceMappingURL=cart.controller.js.map