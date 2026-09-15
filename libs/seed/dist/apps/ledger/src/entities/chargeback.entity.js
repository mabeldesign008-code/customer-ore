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
exports.Chargeback = void 0;
const typeorm_1 = require("typeorm");
const contracts_1 = require("@ore/contracts");
/** Doc §Payment — bank/PSP-initiated chargeback: freeze → evidence → won/lost. One per order. */
let Chargeback = class Chargeback {
    id;
    orderId;
    reference; // bank/PSP chargeback reference
    amountPesewas;
    reason;
    evidenceKeys;
    status;
    fault;
    feesPesewas; // PSP/bank chargeback fees — allocated to the at-fault party
    refundedPesewas; // money actually returned to the bank (LOST)
    note;
    decidedBy;
    decidedAt;
    createdAt;
    updatedAt;
};
exports.Chargeback = Chargeback;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Chargeback.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Chargeback.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Chargeback.prototype, "reference", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], Chargeback.prototype, "amountPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Chargeback.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], Chargeback.prototype, "evidenceKeys", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: contracts_1.ChargebackStatus.OPEN }),
    __metadata("design:type", String)
], Chargeback.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Chargeback.prototype, "fault", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Chargeback.prototype, "feesPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Chargeback.prototype, "refundedPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Chargeback.prototype, "note", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Chargeback.prototype, "decidedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], Chargeback.prototype, "decidedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Chargeback.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Chargeback.prototype, "updatedAt", void 0);
exports.Chargeback = Chargeback = __decorate([
    (0, typeorm_1.Entity)({ schema: 'ledger' }),
    (0, typeorm_1.Index)(['status'])
], Chargeback);
//# sourceMappingURL=chargeback.entity.js.map