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
exports.PromotionRedemption = void 0;
const typeorm_1 = require("typeorm");
/** Idempotent promotion redemption tied to an order. */
let PromotionRedemption = class PromotionRedemption {
    id;
    orderId;
    promotionId;
    customerId;
    discountPesewas;
    status;
    createdAt;
    updatedAt;
};
exports.PromotionRedemption = PromotionRedemption;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PromotionRedemption.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], PromotionRedemption.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PromotionRedemption.prototype, "promotionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], PromotionRedemption.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], PromotionRedemption.prototype, "discountPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'REDEEMED' }),
    __metadata("design:type", String)
], PromotionRedemption.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], PromotionRedemption.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], PromotionRedemption.prototype, "updatedAt", void 0);
exports.PromotionRedemption = PromotionRedemption = __decorate([
    (0, typeorm_1.Entity)({ schema: 'catalog' }),
    (0, typeorm_1.Index)(['promotionId', 'status'])
], PromotionRedemption);
//# sourceMappingURL=promotion-redemption.entity.js.map