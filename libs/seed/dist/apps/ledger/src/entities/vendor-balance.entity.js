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
exports.VendorBalance = void 0;
const typeorm_1 = require("typeorm");
/** Vendor running balances (doc §4): accrued lifetime earnings, rolling reserve held,
 *  negative-balance carry (owed), lifetime paid out. Pending = unsettled VendorEarning rows. */
let VendorBalance = class VendorBalance {
    id;
    vendorId;
    accruedPesewas; // lifetime net earnings
    reservePesewas; // rolling reserve currently held
    owedPesewas; // negative balance (instant reversals on fault) — offsets future payouts
    withdrawalHeldPesewas; // early-payout requests awaiting transfer result
    paidOutPesewas; // lifetime settled to the vendor
    bonusPesewas; // doc §8: vendor referral bonus (GHS 200 after N real orders) — included in settlements
    version;
    createdAt;
    updatedAt;
};
exports.VendorBalance = VendorBalance;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], VendorBalance.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], VendorBalance.prototype, "vendorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], VendorBalance.prototype, "accruedPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], VendorBalance.prototype, "reservePesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], VendorBalance.prototype, "owedPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], VendorBalance.prototype, "withdrawalHeldPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], VendorBalance.prototype, "paidOutPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], VendorBalance.prototype, "bonusPesewas", void 0);
__decorate([
    (0, typeorm_1.VersionColumn)(),
    __metadata("design:type", Number)
], VendorBalance.prototype, "version", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], VendorBalance.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], VendorBalance.prototype, "updatedAt", void 0);
exports.VendorBalance = VendorBalance = __decorate([
    (0, typeorm_1.Entity)({ schema: 'ledger' })
], VendorBalance);
//# sourceMappingURL=vendor-balance.entity.js.map