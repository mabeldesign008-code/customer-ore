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
exports.VendorSettlement = void 0;
const typeorm_1 = require("typeorm");
const contracts_1 = require("@ore/contracts");
/** Weekly settlement cycle for a vendor (doc §4): Mon cutoff, min GHS 100,
 *  rolling reserve held, payout via Paystack Transfers. */
let VendorSettlement = class VendorSettlement {
    id;
    vendorId;
    cycleStart; // previous Monday 00:00 UTC
    cycleEnd; // this Monday 00:00 UTC (orders delivered before this belong to the cycle)
    grossPesewas;
    debtAppliedPesewas; // negative-balance offset (refunds/reversals)
    reservePesewas; // rolling reserve held by the platform
    payoutPesewas; // actually paid to the vendor (net − reserve)
    status;
    transferReference;
    note;
    paidAt;
    createdAt;
    updatedAt;
};
exports.VendorSettlement = VendorSettlement;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], VendorSettlement.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], VendorSettlement.prototype, "vendorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date }),
    __metadata("design:type", Date)
], VendorSettlement.prototype, "cycleStart", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date }),
    __metadata("design:type", Date)
], VendorSettlement.prototype, "cycleEnd", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], VendorSettlement.prototype, "grossPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], VendorSettlement.prototype, "debtAppliedPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], VendorSettlement.prototype, "reservePesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], VendorSettlement.prototype, "payoutPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: contracts_1.VendorSettlementStatus.READY }),
    __metadata("design:type", String)
], VendorSettlement.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], VendorSettlement.prototype, "transferReference", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], VendorSettlement.prototype, "note", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], VendorSettlement.prototype, "paidAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], VendorSettlement.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], VendorSettlement.prototype, "updatedAt", void 0);
exports.VendorSettlement = VendorSettlement = __decorate([
    (0, typeorm_1.Entity)({ schema: 'ledger' }),
    (0, typeorm_1.Index)(['vendorId', 'cycleStart'])
], VendorSettlement);
//# sourceMappingURL=vendor-settlement.entity.js.map