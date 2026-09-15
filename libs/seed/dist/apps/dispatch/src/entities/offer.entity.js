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
exports.Offer = void 0;
const typeorm_1 = require("typeorm");
const contracts_1 = require("@ore/contracts");
let Offer = class Offer {
    id;
    orderId;
    batchId; // grouped/batched offer (doc §2)
    riderId;
    vendorId;
    status;
    expiresAt;
    attempt;
    riderFeePesewas;
    /** Peak/surge incentive for this leg, fixed at offer time alongside the base fee. */
    peakPayPesewas;
    pickupDistanceKm;
    deliveryDistanceKm;
    score;
    validationJson;
    createdAt;
    updatedAt;
};
exports.Offer = Offer;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Offer.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Offer.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Offer.prototype, "batchId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Offer.prototype, "riderId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Offer.prototype, "vendorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: contracts_1.OfferStatus.PENDING }),
    __metadata("design:type", String)
], Offer.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date }),
    __metadata("design:type", Date)
], Offer.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Offer.prototype, "attempt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Offer.prototype, "riderFeePesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Offer.prototype, "peakPayPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', default: 0 }),
    __metadata("design:type", Number)
], Offer.prototype, "pickupDistanceKm", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', default: 0 }),
    __metadata("design:type", Number)
], Offer.prototype, "deliveryDistanceKm", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', default: 0 }),
    __metadata("design:type", Number)
], Offer.prototype, "score", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], Offer.prototype, "validationJson", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Offer.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Offer.prototype, "updatedAt", void 0);
exports.Offer = Offer = __decorate([
    (0, typeorm_1.Entity)({ schema: 'dispatch' }),
    (0, typeorm_1.Index)(['orderId', 'status'])
], Offer);
//# sourceMappingURL=offer.entity.js.map