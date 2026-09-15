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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartItem = void 0;
const typeorm_1 = require("typeorm");
let CartItem = class CartItem {
    id;
    cartId;
    vendorId;
    itemId;
    itemName;
    qty;
    unitPricePesewas;
    modifiers;
    selectedOptions;
    optionsTotalPesewas;
    createdAt;
    updatedAt;
};
exports.CartItem = CartItem;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], CartItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], CartItem.prototype, "cartId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], CartItem.prototype, "vendorId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], CartItem.prototype, "itemId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], CartItem.prototype, "itemName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], CartItem.prototype, "qty", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], CartItem.prototype, "unitPricePesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', default: () => "'[]'" }),
    __metadata("design:type", Array)
], CartItem.prototype, "modifiers", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', default: () => "'[]'" }),
    __metadata("design:type", Array)
], CartItem.prototype, "selectedOptions", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], CartItem.prototype, "optionsTotalPesewas", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], CartItem.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], CartItem.prototype, "updatedAt", void 0);
exports.CartItem = CartItem = __decorate([
    (0, typeorm_1.Entity)({ schema: 'cart' })
], CartItem);
//# sourceMappingURL=cart-item.entity.js.map