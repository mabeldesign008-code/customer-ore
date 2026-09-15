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
exports.Dispute = void 0;
const typeorm_1 = require("typeorm");
const contracts_1 = require("@ore/contracts");
/** Doc §Payment — customer-raised dispute on a delivered order. One per order. */
let Dispute = class Dispute {
    id;
    orderId;
    customerId;
    vendorId;
    reason;
    description;
    evidenceKeys; // media storage keys
    status;
    fault; // doc §Payment fault matrix
    decisionPesewas; // amount the customer is entitled to (0 = none)
    refundedPesewas; // actually refunded (never refunded twice)
    refundMethod;
    note;
    decidedBy;
    decidedAt;
    createdAt;
    updatedAt;
};
exports.Dispute = Dispute;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Dispute.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Dispute.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Dispute.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Dispute.prototype, "vendorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], Dispute.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], Dispute.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], Dispute.prototype, "evidenceKeys", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: contracts_1.DisputeStatus.OPEN }),
    __metadata("design:type", String)
], Dispute.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Dispute.prototype, "fault", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Dispute.prototype, "decisionPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Dispute.prototype, "refundedPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Dispute.prototype, "refundMethod", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Dispute.prototype, "note", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Dispute.prototype, "decidedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], Dispute.prototype, "decidedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Dispute.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Dispute.prototype, "updatedAt", void 0);
exports.Dispute = Dispute = __decorate([
    (0, typeorm_1.Entity)({ schema: 'ledger' }),
    (0, typeorm_1.Index)(['status'])
], Dispute);
//# sourceMappingURL=dispute.entity.js.map