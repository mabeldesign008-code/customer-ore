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
exports.WhtDecision = void 0;
const typeorm_1 = require("typeorm");
/** Every WHT evaluation is logged, including not-applicable and threshold-not-met outcomes. */
let WhtDecision = class WhtDecision {
    id;
    transactionId;
    orderId;
    componentType;
    ruleId;
    whtStatus;
    supplierId;
    supplierType;
    payerType;
    payeeType;
    transactionType;
    contractType;
    residentStatus;
    taxYear;
    currentTransactionAmountPesewas;
    priorCumulativeAmountPesewas;
    postTransactionCumulativeAmountPesewas;
    thresholdType;
    thresholdAmountPesewas;
    thresholdReachedFlag;
    thresholdTriggerTransactionId;
    rateBps;
    taxBasePesewas;
    whtAmountPesewas;
    certificateRequired;
    certificateNumber;
    reviewReason;
    createdAt;
};
exports.WhtDecision = WhtDecision;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], WhtDecision.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], WhtDecision.prototype, "transactionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], WhtDecision.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], WhtDecision.prototype, "componentType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], WhtDecision.prototype, "ruleId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], WhtDecision.prototype, "whtStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], WhtDecision.prototype, "supplierId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], WhtDecision.prototype, "supplierType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], WhtDecision.prototype, "payerType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], WhtDecision.prototype, "payeeType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], WhtDecision.prototype, "transactionType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], WhtDecision.prototype, "contractType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], WhtDecision.prototype, "residentStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Object)
], WhtDecision.prototype, "taxYear", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], WhtDecision.prototype, "currentTransactionAmountPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], WhtDecision.prototype, "priorCumulativeAmountPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], WhtDecision.prototype, "postTransactionCumulativeAmountPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], WhtDecision.prototype, "thresholdType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Object)
], WhtDecision.prototype, "thresholdAmountPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], WhtDecision.prototype, "thresholdReachedFlag", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], WhtDecision.prototype, "thresholdTriggerTransactionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], WhtDecision.prototype, "rateBps", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], WhtDecision.prototype, "taxBasePesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], WhtDecision.prototype, "whtAmountPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], WhtDecision.prototype, "certificateRequired", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], WhtDecision.prototype, "certificateNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], WhtDecision.prototype, "reviewReason", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], WhtDecision.prototype, "createdAt", void 0);
exports.WhtDecision = WhtDecision = __decorate([
    (0, typeorm_1.Entity)({ schema: 'ledger' }),
    (0, typeorm_1.Index)(['transactionId', 'componentType']),
    (0, typeorm_1.Index)(['supplierId', 'taxYear', 'transactionType']),
    (0, typeorm_1.Index)(['whtStatus', 'createdAt'])
], WhtDecision);
//# sourceMappingURL=wht-decision.entity.js.map