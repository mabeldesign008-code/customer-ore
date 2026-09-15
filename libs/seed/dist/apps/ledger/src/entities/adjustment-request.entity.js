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
exports.AdjustmentRequest = void 0;
const typeorm_1 = require("typeorm");
let AdjustmentRequest = class AdjustmentRequest {
    id;
    /** Short human reference, e.g. `ADJ-00001`. */
    ref;
    status;
    proposedBy;
    decidedBy;
    /** Why. Mandatory and audited — an unexplained adjustment is indistinguishable from theft. */
    reason;
    /** The entry this reverses, if it reverses one. */
    reversesRef;
    orderId;
    /** The balanced legs to post, frozen at proposal time. */
    entriesJson;
    amountPesewas;
    /** The period the mistake belongs to. Posting still happens now; this records where it
     *  came from so the current month's statement can explain the entry. */
    correctsPeriod;
    /** Dual-control idempotency key. Unique, so a replay after a crash cannot post twice. */
    executionRef;
    executionNote;
    createdAt;
    decidedAt;
    executedAt;
};
exports.AdjustmentRequest = AdjustmentRequest;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AdjustmentRequest.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AdjustmentRequest.prototype, "ref", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'PROPOSED' }),
    __metadata("design:type", String)
], AdjustmentRequest.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AdjustmentRequest.prototype, "proposedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AdjustmentRequest.prototype, "decidedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], AdjustmentRequest.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AdjustmentRequest.prototype, "reversesRef", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AdjustmentRequest.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json' }),
    __metadata("design:type", Array)
], AdjustmentRequest.prototype, "entriesJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], AdjustmentRequest.prototype, "amountPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AdjustmentRequest.prototype, "correctsPeriod", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AdjustmentRequest.prototype, "executionRef", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AdjustmentRequest.prototype, "executionNote", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], AdjustmentRequest.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], AdjustmentRequest.prototype, "decidedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], AdjustmentRequest.prototype, "executedAt", void 0);
exports.AdjustmentRequest = AdjustmentRequest = __decorate([
    (0, typeorm_1.Entity)({ schema: 'ledger' }),
    (0, typeorm_1.Index)(['status', 'createdAt']),
    (0, typeorm_1.Index)(['executionRef'], { unique: true })
], AdjustmentRequest);
//# sourceMappingURL=adjustment-request.entity.js.map