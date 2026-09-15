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
exports.TaxLedger = void 0;
const typeorm_1 = require("typeorm");
/** ORE_TAX_LEDGER — append-only tax ledger. Filed rows are immutable by migration trigger. */
let TaxLedger = class TaxLedger {
    taxTransactionId;
    orderId;
    invoiceId;
    partyId;
    taxType;
    taxCategory;
    taxableValuePesewas;
    taxRateBps;
    taxAmountPesewas;
    taxPeriod;
    transactionDate;
    sourceTransaction;
    sourceComponent;
    ruleId;
    reversalReference;
    paymentStatus;
    filingStatus;
    certificateNumber;
    metaJson;
    createdAt;
};
exports.TaxLedger = TaxLedger;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], TaxLedger.prototype, "taxTransactionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], TaxLedger.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], TaxLedger.prototype, "invoiceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], TaxLedger.prototype, "partyId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], TaxLedger.prototype, "taxType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], TaxLedger.prototype, "taxCategory", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], TaxLedger.prototype, "taxableValuePesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], TaxLedger.prototype, "taxRateBps", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], TaxLedger.prototype, "taxAmountPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], TaxLedger.prototype, "taxPeriod", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date }),
    __metadata("design:type", Date)
], TaxLedger.prototype, "transactionDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], TaxLedger.prototype, "sourceTransaction", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], TaxLedger.prototype, "sourceComponent", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], TaxLedger.prototype, "ruleId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], TaxLedger.prototype, "reversalReference", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'CONFIRMED' }),
    __metadata("design:type", String)
], TaxLedger.prototype, "paymentStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'OPEN' }),
    __metadata("design:type", String)
], TaxLedger.prototype, "filingStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], TaxLedger.prototype, "certificateNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], TaxLedger.prototype, "metaJson", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], TaxLedger.prototype, "createdAt", void 0);
exports.TaxLedger = TaxLedger = __decorate([
    (0, typeorm_1.Entity)({ schema: 'ledger', name: 'ore_tax_ledger' }),
    (0, typeorm_1.Index)(['orderId']),
    (0, typeorm_1.Index)(['invoiceId']),
    (0, typeorm_1.Index)(['partyId']),
    (0, typeorm_1.Index)(['taxType', 'taxPeriod']),
    (0, typeorm_1.Index)(['sourceTransaction'])
], TaxLedger);
//# sourceMappingURL=tax-ledger.entity.js.map