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
exports.OrderIssue = void 0;
const typeorm_1 = require("typeorm");
/** Vendor/customer order issue report; resolution remains an operations workflow. */
let OrderIssue = class OrderIssue {
    id;
    orderId;
    vendorId;
    reporterUserId;
    category;
    note;
    status;
    resolutionNote;
    resolvedBy;
    resolvedAt;
    createdAt;
    updatedAt;
};
exports.OrderIssue = OrderIssue;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], OrderIssue.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], OrderIssue.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], OrderIssue.prototype, "vendorId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], OrderIssue.prototype, "reporterUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], OrderIssue.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], OrderIssue.prototype, "note", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'OPEN' }),
    __metadata("design:type", String)
], OrderIssue.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], OrderIssue.prototype, "resolutionNote", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], OrderIssue.prototype, "resolvedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], OrderIssue.prototype, "resolvedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], OrderIssue.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], OrderIssue.prototype, "updatedAt", void 0);
exports.OrderIssue = OrderIssue = __decorate([
    (0, typeorm_1.Entity)({ schema: 'order' }),
    (0, typeorm_1.Index)(['orderId', 'createdAt'])
], OrderIssue);
//# sourceMappingURL=order-issue.entity.js.map