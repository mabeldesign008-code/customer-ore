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
exports.VendorStaff = void 0;
const typeorm_1 = require("typeorm");
/** Staff access is attached to the existing Vendor auth role and scoped to one Vendor. */
let VendorStaff = class VendorStaff {
    id;
    vendorId;
    userId;
    displayName;
    phone;
    staffRole;
    active;
    createdAt;
    updatedAt;
};
exports.VendorStaff = VendorStaff;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], VendorStaff.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], VendorStaff.prototype, "vendorId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], VendorStaff.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], VendorStaff.prototype, "displayName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], VendorStaff.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'ORDER_OPERATOR' }),
    __metadata("design:type", String)
], VendorStaff.prototype, "staffRole", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], VendorStaff.prototype, "active", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], VendorStaff.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], VendorStaff.prototype, "updatedAt", void 0);
exports.VendorStaff = VendorStaff = __decorate([
    (0, typeorm_1.Entity)({ schema: 'catalog' }),
    (0, typeorm_1.Index)(['vendorId', 'userId'], { unique: true })
], VendorStaff);
//# sourceMappingURL=vendor-staff.entity.js.map