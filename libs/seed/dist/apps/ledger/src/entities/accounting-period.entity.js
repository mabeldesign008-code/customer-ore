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
exports.AccountingPeriod = void 0;
const typeorm_1 = require("typeorm");
/**
 * A closed accounting period.
 *
 * Once a month is closed, nothing may post into it — not a correction, not a "quick fix",
 * not a re-run of a settlement that was late. That is the whole point: a statement already
 * given to an accountant or filed with an authority must keep meaning the same thing. A
 * correction to a closed month is made **in the current month** as an adjusting entry that
 * names the period it corrects, so the history stays readable and the original still adds up.
 *
 * Unique on (year, month) so two admins racing to close the same month produce one row.
 */
let AccountingPeriod = class AccountingPeriod {
    id;
    year;
    /** 1-12. */
    month;
    label; // e.g. '2026-08'
    lockedBy;
    reason;
    /** Snapshot of the trial balance at lock time, so "what did we report?" is answerable
     *  forever even if the underlying rows are later disputed. */
    trialBalanceJson;
    netDebitPesewas;
    netCreditPesewas;
    /** True only if debits equalled credits at lock time. A period locked out of balance is
     *  still locked — you cannot un-report it — but it is flagged so it gets chased. */
    balanced;
    lockedAt;
};
exports.AccountingPeriod = AccountingPeriod;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AccountingPeriod.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], AccountingPeriod.prototype, "year", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], AccountingPeriod.prototype, "month", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], AccountingPeriod.prototype, "label", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AccountingPeriod.prototype, "lockedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AccountingPeriod.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], AccountingPeriod.prototype, "trialBalanceJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], AccountingPeriod.prototype, "netDebitPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], AccountingPeriod.prototype, "netCreditPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], AccountingPeriod.prototype, "balanced", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], AccountingPeriod.prototype, "lockedAt", void 0);
exports.AccountingPeriod = AccountingPeriod = __decorate([
    (0, typeorm_1.Entity)({ schema: 'ledger' }),
    (0, typeorm_1.Index)(['year', 'month'], { unique: true })
], AccountingPeriod);
//# sourceMappingURL=accounting-period.entity.js.map