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
exports.TaxTransaction = void 0;
const typeorm_1 = require("typeorm");
/** One append-only classification row per tax-relevant transaction component. */
let TaxTransaction = class TaxTransaction {
    id;
    transactionId;
    orderId;
    componentType;
    payerType;
    payerId;
    payeeType;
    payeeId;
    supplierType;
    supplierId;
    customerId;
    grossAmountPesewas;
    taxableAmountPesewas;
    taxCategory;
    revenueOwner;
    paymentProcessor;
    settlementMethod;
    contractType;
    transactionType;
    residentStatus;
    classificationStatus;
    whtStatus;
    vatStatus;
    reviewReason;
    metadataJson;
    createdAt;
};
exports.TaxTransaction = TaxTransaction;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], TaxTransaction.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], TaxTransaction.prototype, "transactionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], TaxTransaction.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], TaxTransaction.prototype, "componentType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], TaxTransaction.prototype, "payerType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], TaxTransaction.prototype, "payerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], TaxTransaction.prototype, "payeeType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], TaxTransaction.prototype, "payeeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], TaxTransaction.prototype, "supplierType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], TaxTransaction.prototype, "supplierId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], TaxTransaction.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], TaxTransaction.prototype, "grossAmountPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], TaxTransaction.prototype, "taxableAmountPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], TaxTransaction.prototype, "taxCategory", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], TaxTransaction.prototype, "revenueOwner", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], TaxTransaction.prototype, "paymentProcessor", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], TaxTransaction.prototype, "settlementMethod", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], TaxTransaction.prototype, "contractType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], TaxTransaction.prototype, "transactionType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], TaxTransaction.prototype, "residentStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'REVIEW_REQUIRED' }),
    __metadata("design:type", String)
], TaxTransaction.prototype, "classificationStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'REVIEW_REQUIRED' }),
    __metadata("design:type", String)
], TaxTransaction.prototype, "whtStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'REVIEW_REQUIRED' }),
    __metadata("design:type", String)
], TaxTransaction.prototype, "vatStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], TaxTransaction.prototype, "reviewReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], TaxTransaction.prototype, "metadataJson", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], TaxTransaction.prototype, "createdAt", void 0);
exports.TaxTransaction = TaxTransaction = __decorate([
    (0, typeorm_1.Entity)({ schema: 'ledger' }),
    (0, typeorm_1.Index)(['transactionId', 'componentType']),
    (0, typeorm_1.Index)(['orderId']),
    (0, typeorm_1.Index)(['revenueOwner']),
    (0, typeorm_1.Index)(['classificationStatus', 'createdAt'])
], TaxTransaction);
//# sourceMappingURL=tax-transaction.entity.js.map