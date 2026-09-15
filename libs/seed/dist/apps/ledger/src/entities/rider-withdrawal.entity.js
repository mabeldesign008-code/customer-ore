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
exports.RiderWithdrawal = void 0;
const typeorm_1 = require("typeorm");
const contracts_1 = require("@ore/contracts");
/** Rider payout request — doc §5: min GHS 50, daily cap GHS 2,000, 1 free payout/day then GHS 2.
 *  Status is driven by the money-out channel (Paystack Transfer webhook/response = truth). */
let RiderWithdrawal = class RiderWithdrawal {
    id;
    riderId;
    /**
     * Explicit `int`, like every other money column. TypeORM infers `integer` for a `number`
     * property on Postgres, so this was already correct — but an inferred column type is a bad
     * thing to rely on in a withdrawal table, and it was the only money column relying on it.
     */
    amountPesewas;
    feePesewas;
    destination; // "2335… MoMo" / bank label the rider provided
    status;
    transferReference; // Paystack Transfer reference (money-out truth)
    adminNote;
    processedAt;
    createdAt;
    updatedAt;
};
exports.RiderWithdrawal = RiderWithdrawal;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], RiderWithdrawal.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], RiderWithdrawal.prototype, "riderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], RiderWithdrawal.prototype, "amountPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], RiderWithdrawal.prototype, "feePesewas", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], RiderWithdrawal.prototype, "destination", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: contracts_1.WithdrawalStatus.REQUESTED }),
    __metadata("design:type", String)
], RiderWithdrawal.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], RiderWithdrawal.prototype, "transferReference", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], RiderWithdrawal.prototype, "adminNote", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], RiderWithdrawal.prototype, "processedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], RiderWithdrawal.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], RiderWithdrawal.prototype, "updatedAt", void 0);
exports.RiderWithdrawal = RiderWithdrawal = __decorate([
    (0, typeorm_1.Entity)({ schema: 'ledger' }),
    (0, typeorm_1.Index)(['riderId', 'status'])
], RiderWithdrawal);
//# sourceMappingURL=rider-withdrawal.entity.js.map