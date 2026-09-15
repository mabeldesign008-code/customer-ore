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
exports.TaxRule = void 0;
const typeorm_1 = require("typeorm");
/** Versioned tax/WHT rule table. Rates are data, not posting-code constants. */
let TaxRule = class TaxRule {
    id;
    ruleId;
    taxType;
    supplierType;
    payerType;
    payeeType;
    residentStatus;
    transactionType;
    contractType;
    thresholdType;
    thresholdAmountPesewas;
    /** Basis points: 15% = 1500, 2.5% = 250, 7% = 700. */
    rateBps;
    taxBase;
    effectiveFrom;
    effectiveTo;
    exemption;
    certificateRequired;
    active;
    version;
    updatedBy;
    createdAt;
    updatedAt;
};
exports.TaxRule = TaxRule;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], TaxRule.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], TaxRule.prototype, "ruleId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], TaxRule.prototype, "taxType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], TaxRule.prototype, "supplierType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], TaxRule.prototype, "payerType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], TaxRule.prototype, "payeeType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], TaxRule.prototype, "residentStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], TaxRule.prototype, "transactionType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], TaxRule.prototype, "contractType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], TaxRule.prototype, "thresholdType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Object)
], TaxRule.prototype, "thresholdAmountPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], TaxRule.prototype, "rateBps", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'TAXABLE_AMOUNT' }),
    __metadata("design:type", String)
], TaxRule.prototype, "taxBase", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date }),
    __metadata("design:type", Date)
], TaxRule.prototype, "effectiveFrom", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], TaxRule.prototype, "effectiveTo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], TaxRule.prototype, "exemption", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], TaxRule.prototype, "certificateRequired", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], TaxRule.prototype, "active", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 1 }),
    __metadata("design:type", Number)
], TaxRule.prototype, "version", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], TaxRule.prototype, "updatedBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], TaxRule.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], TaxRule.prototype, "updatedAt", void 0);
exports.TaxRule = TaxRule = __decorate([
    (0, typeorm_1.Entity)({ schema: 'ledger' }),
    (0, typeorm_1.Index)(['taxType', 'active', 'effectiveFrom']),
    (0, typeorm_1.Index)(['ruleId'], { unique: true })
], TaxRule);
//# sourceMappingURL=tax-rule.entity.js.map