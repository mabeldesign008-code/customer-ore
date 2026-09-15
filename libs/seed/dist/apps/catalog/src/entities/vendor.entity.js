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
exports.Vendor = void 0;
const typeorm_1 = require("typeorm");
const contracts_1 = require("@ore/contracts");
let Vendor = class Vendor {
    id;
    ownerUserId;
    vendorType;
    approved; // doc: no orders before admin approval
    publicId; // ORV-YYYY-NNNN (assigned at approval)
    logoKey;
    bannerKey;
    name;
    lat;
    lng;
    deliveryRadiusKm;
    acceptsCod;
    accepting;
    maxConcurrentOrders;
    defaultPrepTimeMin;
    hoursJson;
    holidayHoursJson;
    payoutAccountJson;
    /** Supplier tax profile used for WHT decisions on Ore-paid vendor incentives; unknown requires Finance/Tax review. */
    taxResidentStatus;
    taxIdentificationNumber;
    taxProfileJson;
    // ── doc §4 plans / SLA ───────────────────────────────────────────
    plan; // Premium = stories + reduced commission (doc §4)
    suspendUntil; // SLA penalty suspension window
    createdAt;
    updatedAt;
};
exports.Vendor = Vendor;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Vendor.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Vendor.prototype, "ownerUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: contracts_1.VendorType.FOOD }),
    __metadata("design:type", String)
], Vendor.prototype, "vendorType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Vendor.prototype, "approved", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Vendor.prototype, "publicId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Vendor.prototype, "logoKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Vendor.prototype, "bannerKey", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Vendor.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float' }),
    __metadata("design:type", Number)
], Vendor.prototype, "lat", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float' }),
    __metadata("design:type", Number)
], Vendor.prototype, "lng", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', default: 8 }),
    __metadata("design:type", Number)
], Vendor.prototype, "deliveryRadiusKm", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], Vendor.prototype, "acceptsCod", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], Vendor.prototype, "accepting", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 5 }),
    __metadata("design:type", Number)
], Vendor.prototype, "maxConcurrentOrders", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 10 }),
    __metadata("design:type", Number)
], Vendor.prototype, "defaultPrepTimeMin", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], Vendor.prototype, "hoursJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], Vendor.prototype, "holidayHoursJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], Vendor.prototype, "payoutAccountJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'UNKNOWN' }),
    __metadata("design:type", String)
], Vendor.prototype, "taxResidentStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Vendor.prototype, "taxIdentificationNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], Vendor.prototype, "taxProfileJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: contracts_1.VendorPlan.STANDARD }),
    __metadata("design:type", String)
], Vendor.prototype, "plan", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], Vendor.prototype, "suspendUntil", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Vendor.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Vendor.prototype, "updatedAt", void 0);
exports.Vendor = Vendor = __decorate([
    (0, typeorm_1.Entity)({ schema: 'catalog' })
], Vendor);
//# sourceMappingURL=vendor.entity.js.map