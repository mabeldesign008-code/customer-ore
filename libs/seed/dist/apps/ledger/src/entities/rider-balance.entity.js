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
exports.RiderBalance = void 0;
const typeorm_1 = require("typeorm");
/** Rider wallet — doc §5: Pending / Available (cleared) / Locked / Cash Liability.
 *  available payout = cleared − COD cash owed − locked (penalties/holds), never negative. */
let RiderBalance = class RiderBalance {
    id;
    riderId;
    userId;
    pendingPesewas; // fees earned, not yet cleared (clearing window RIDER_CLEAR_HOURS)
    clearedPesewas; // available base — earnings that have cleared
    lockedPesewas; // penalties + in-transit withdrawal holds
    cashOwedPesewas; // COD cash collected, owed to platform (mirror of EXPECTED cod_cash)
    feesEarnedPesewas; // lifetime rider fees earned
    remittedPesewas; // lifetime COD cash actually remitted
    // ── clearing window ───────────────────────────────────────────────
    clearsAt; // when the current pending batch becomes cleared
    // ── withdrawal day-accounting (daily cap + free-withdrawal counting) ──
    withdrawalDay; // yyyy-mm-dd of the last withdrawal batch
    withdrawnTodayPesewas;
    withdrawalsTodayCount;
    version;
    createdAt;
    updatedAt;
};
exports.RiderBalance = RiderBalance;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], RiderBalance.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], RiderBalance.prototype, "riderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], RiderBalance.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], RiderBalance.prototype, "pendingPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], RiderBalance.prototype, "clearedPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], RiderBalance.prototype, "lockedPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], RiderBalance.prototype, "cashOwedPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], RiderBalance.prototype, "feesEarnedPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], RiderBalance.prototype, "remittedPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], RiderBalance.prototype, "clearsAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], RiderBalance.prototype, "withdrawalDay", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], RiderBalance.prototype, "withdrawnTodayPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], RiderBalance.prototype, "withdrawalsTodayCount", void 0);
__decorate([
    (0, typeorm_1.VersionColumn)(),
    __metadata("design:type", Number)
], RiderBalance.prototype, "version", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], RiderBalance.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], RiderBalance.prototype, "updatedAt", void 0);
exports.RiderBalance = RiderBalance = __decorate([
    (0, typeorm_1.Entity)({ schema: 'ledger' })
], RiderBalance);
//# sourceMappingURL=rider-balance.entity.js.map