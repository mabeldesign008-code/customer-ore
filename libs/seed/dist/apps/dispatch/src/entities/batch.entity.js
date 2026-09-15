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
exports.Batch = void 0;
const typeorm_1 = require("typeorm");
const contracts_1 = require("@ore/contracts");
/** Doc §2 — a grouped/batched delivery: one rider, N pickups, M drops.
 *  Orders keep their own assignments + fees (per-order fees unchanged); the batch
 *  coordinates the shared route. */
let Batch = class Batch {
    id;
    type;
    riderId; // null while offers are out
    status;
    orderIds;
    pickupOrder;
    dropOrder;
    totalRiderFeePesewas; // Σ per-order distance fees (doc §2: per-order fees unchanged)
    codExposurePesewas; // Σ COD totals — rider eligibility checked against the sum
    /**
     * Per-order fee split for this batch, keyed by order id.
     *
     * The offer carries the batch total, but each order's assignment must record what THAT order
     * is worth — the ledger pays per leg, per order. Without this, every assignment in a batch of
     * three would claim the whole batch fee.
     */
    feeByOrderJson;
    createdAt;
    updatedAt;
};
exports.Batch = Batch;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Batch.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], Batch.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Batch.prototype, "riderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: contracts_1.BatchStatus.PENDING }),
    __metadata("design:type", String)
], Batch.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json' }),
    __metadata("design:type", Array)
], Batch.prototype, "orderIds", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json' }),
    __metadata("design:type", Array)
], Batch.prototype, "pickupOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json' }),
    __metadata("design:type", Array)
], Batch.prototype, "dropOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Batch.prototype, "totalRiderFeePesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Batch.prototype, "codExposurePesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], Batch.prototype, "feeByOrderJson", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Batch.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Batch.prototype, "updatedAt", void 0);
exports.Batch = Batch = __decorate([
    (0, typeorm_1.Entity)({ schema: 'dispatch' }),
    (0, typeorm_1.Index)(['riderId', 'status'])
], Batch);
//# sourceMappingURL=batch.entity.js.map