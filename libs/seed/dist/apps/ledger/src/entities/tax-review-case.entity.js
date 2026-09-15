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
exports.TaxReviewCase = void 0;
const typeorm_1 = require("typeorm");
/** Exceptions queue: unclear classification never defaults to Ore revenue/no-WHT. */
let TaxReviewCase = class TaxReviewCase {
    id;
    transactionId;
    orderId;
    componentType;
    reasonCode;
    reason;
    status;
    assignedTo;
    resolvedBy;
    resolvedAt;
    resolutionNote;
    payloadJson;
    createdAt;
    updatedAt;
};
exports.TaxReviewCase = TaxReviewCase;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], TaxReviewCase.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], TaxReviewCase.prototype, "transactionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], TaxReviewCase.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], TaxReviewCase.prototype, "componentType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], TaxReviewCase.prototype, "reasonCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], TaxReviewCase.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'OPEN' }),
    __metadata("design:type", String)
], TaxReviewCase.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], TaxReviewCase.prototype, "assignedTo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], TaxReviewCase.prototype, "resolvedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], TaxReviewCase.prototype, "resolvedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], TaxReviewCase.prototype, "resolutionNote", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], TaxReviewCase.prototype, "payloadJson", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], TaxReviewCase.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], TaxReviewCase.prototype, "updatedAt", void 0);
exports.TaxReviewCase = TaxReviewCase = __decorate([
    (0, typeorm_1.Entity)({ schema: 'ledger' }),
    (0, typeorm_1.Index)(['status', 'createdAt']),
    (0, typeorm_1.Index)(['orderId']),
    (0, typeorm_1.Index)(['reasonCode'])
], TaxReviewCase);
//# sourceMappingURL=tax-review-case.entity.js.map