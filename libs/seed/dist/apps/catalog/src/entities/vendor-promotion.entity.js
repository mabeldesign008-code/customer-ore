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
exports.VendorPromotion = void 0;
const typeorm_1 = require("typeorm");
/** Vendor campaign management record. Checkout application is a separate pricing contract. */
let VendorPromotion = class VendorPromotion {
    id;
    vendorId;
    title;
    /** Optional customer-facing code. Unique when set. */
    code;
    discountType;
    discountValue; // percentage points or pesewas depending on discountType
    minimumSubtotalPesewas;
    budgetPesewas;
    redemptionLimit;
    spentPesewas;
    redemptionsUsed;
    startsAt;
    endsAt;
    active;
    createdAt;
    updatedAt;
};
exports.VendorPromotion = VendorPromotion;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], VendorPromotion.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], VendorPromotion.prototype, "vendorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], VendorPromotion.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, unique: true }),
    __metadata("design:type", Object)
], VendorPromotion.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], VendorPromotion.prototype, "discountType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], VendorPromotion.prototype, "discountValue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], VendorPromotion.prototype, "minimumSubtotalPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Object)
], VendorPromotion.prototype, "budgetPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Object)
], VendorPromotion.prototype, "redemptionLimit", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], VendorPromotion.prototype, "spentPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], VendorPromotion.prototype, "redemptionsUsed", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date }),
    __metadata("design:type", Date)
], VendorPromotion.prototype, "startsAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date }),
    __metadata("design:type", Date)
], VendorPromotion.prototype, "endsAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], VendorPromotion.prototype, "active", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], VendorPromotion.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], VendorPromotion.prototype, "updatedAt", void 0);
exports.VendorPromotion = VendorPromotion = __decorate([
    (0, typeorm_1.Entity)({ schema: 'catalog' }),
    (0, typeorm_1.Index)(['vendorId', 'active', 'startsAt', 'endsAt'])
], VendorPromotion);
//# sourceMappingURL=vendor-promotion.entity.js.map