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
exports.VendorPenalty = exports.VendorSlaViolation = void 0;
const typeorm_1 = require("typeorm");
const contracts_1 = require("@ore/contracts");
/** One SLA violation (doc §4: late accept / ready-too-early / cancel-after-accept). */
let VendorSlaViolation = class VendorSlaViolation {
    id;
    vendorId;
    type; // LATE_ACCEPT | READY_EARLY | CANCEL_AFTER_ACCEPT | PRICE_MANIPULATION
    orderId;
    severity;
    note;
    createdAt;
    updatedAt;
};
exports.VendorSlaViolation = VendorSlaViolation;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], VendorSlaViolation.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], VendorSlaViolation.prototype, "vendorId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], VendorSlaViolation.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], VendorSlaViolation.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], VendorSlaViolation.prototype, "severity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], VendorSlaViolation.prototype, "note", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], VendorSlaViolation.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], VendorSlaViolation.prototype, "updatedAt", void 0);
exports.VendorSlaViolation = VendorSlaViolation = __decorate([
    (0, typeorm_1.Entity)({ schema: 'catalog' }),
    (0, typeorm_1.Index)(['vendorId', 'createdAt'])
], VendorSlaViolation);
/** A penalty applied to a vendor (doc §4 ladder: warning → financial → suspension → permanent). */
let VendorPenalty = class VendorPenalty {
    id;
    vendorId;
    level;
    trigger;
    amountPesewas;
    note;
    decidedBy;
    active;
    createdAt;
    updatedAt;
};
exports.VendorPenalty = VendorPenalty;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], VendorPenalty.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], VendorPenalty.prototype, "vendorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], VendorPenalty.prototype, "level", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], VendorPenalty.prototype, "trigger", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], VendorPenalty.prototype, "amountPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], VendorPenalty.prototype, "note", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], VendorPenalty.prototype, "decidedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], VendorPenalty.prototype, "active", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], VendorPenalty.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], VendorPenalty.prototype, "updatedAt", void 0);
exports.VendorPenalty = VendorPenalty = __decorate([
    (0, typeorm_1.Entity)({ schema: 'catalog' })
], VendorPenalty);
//# sourceMappingURL=vendor-sla.entity.js.map