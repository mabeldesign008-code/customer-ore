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
exports.CustomerCreditLog = void 0;
const typeorm_1 = require("typeorm");
/** Immutable credit log — the idempotency key for wallet credits (no double refund). */
let CustomerCreditLog = class CustomerCreditLog {
    id;
    userId;
    amountPesewas;
    ref; // e.g. "dispute:<id>" — a credit is applied exactly once
    kind; // manual | referral | errand | dispute | admin
    expiresAt; // doc §8: referral credits expire after 14 days if unused
    expiredAt;
    reason;
    createdAt;
    updatedAt;
};
exports.CustomerCreditLog = CustomerCreditLog;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], CustomerCreditLog.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], CustomerCreditLog.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], CustomerCreditLog.prototype, "amountPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], CustomerCreditLog.prototype, "ref", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'manual' }),
    __metadata("design:type", String)
], CustomerCreditLog.prototype, "kind", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], CustomerCreditLog.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], CustomerCreditLog.prototype, "expiredAt", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], CustomerCreditLog.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], CustomerCreditLog.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], CustomerCreditLog.prototype, "updatedAt", void 0);
exports.CustomerCreditLog = CustomerCreditLog = __decorate([
    (0, typeorm_1.Entity)({ schema: 'ledger' })
], CustomerCreditLog);
//# sourceMappingURL=customer-credit-log.entity.js.map