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
exports.Assignment = void 0;
const typeorm_1 = require("typeorm");
let Assignment = class Assignment {
    id;
    orderId;
    riderId;
    offerId;
    batchId;
    pickupDistanceKm;
    score;
    source;
    /**
     * What this rider earns for THIS leg, fixed at the moment the offer was accepted.
     *
     * Rider pay is per-assignment, not per-order: a laundry order has a collection leg and a
     * return leg worked by two different riders, and a reassignment after pickup leaves two
     * riders each owed for the distance they actually covered. The order-level
     * `riderFeePesewas` is the SUM across legs (what the order costs Ore); this is the split
     * (what each rider is owed). Booking earnings from the order-level field alone paid only
     * whoever happened to be assigned at delivery.
     */
    riderFeePesewas;
    peakPayPesewas;
    /** Set when the ledger has credited this leg, so a redelivery cannot pay it twice. */
    earningsPostedAt;
    validationJson;
    status;
    assignedAt;
    /**
     * When the rider confirmed pickup, inside the vendor's geofence.
     *
     * Recorded so delivery time can be decomposed into legs rather than measured only end to end.
     * A single "45 minutes" figure cannot say whether the kitchen was slow, the rider was far, or
     * the rider stood at the counter waiting — and those three have completely different fixes.
     * Every ETA model worth the name (Swiggy's four-leg decomposition, Deliveroo's Frank) is built
     * on per-leg history, and none of it existed here.
     */
    pickedUpAt;
    completedAt;
};
exports.Assignment = Assignment;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Assignment.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Assignment.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Assignment.prototype, "riderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Assignment.prototype, "offerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Assignment.prototype, "batchId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', default: 0 }),
    __metadata("design:type", Number)
], Assignment.prototype, "pickupDistanceKm", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', default: 0 }),
    __metadata("design:type", Number)
], Assignment.prototype, "score", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'competitive_wave' }),
    __metadata("design:type", String)
], Assignment.prototype, "source", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Assignment.prototype, "riderFeePesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Assignment.prototype, "peakPayPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], Assignment.prototype, "earningsPostedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], Assignment.prototype, "validationJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'ACTIVE' }),
    __metadata("design:type", String)
], Assignment.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Assignment.prototype, "assignedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], Assignment.prototype, "pickedUpAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], Assignment.prototype, "completedAt", void 0);
exports.Assignment = Assignment = __decorate([
    (0, typeorm_1.Entity)({ schema: 'dispatch' }),
    (0, typeorm_1.Index)('assignment_active_order', ['orderId'], { unique: true, where: `"status" = 'ACTIVE'` })
], Assignment);
//# sourceMappingURL=assignment.entity.js.map