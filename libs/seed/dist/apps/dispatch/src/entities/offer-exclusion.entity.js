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
exports.OfferExclusion = void 0;
const typeorm_1 = require("typeorm");
/** Declined/timed-out riders never see the same order again (doc §7). */
let OfferExclusion = class OfferExclusion {
    id;
    orderId;
    riderId;
    reason; // declined | timed_out | admin
    createdAt;
};
exports.OfferExclusion = OfferExclusion;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], OfferExclusion.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], OfferExclusion.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], OfferExclusion.prototype, "riderId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], OfferExclusion.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], OfferExclusion.prototype, "createdAt", void 0);
exports.OfferExclusion = OfferExclusion = __decorate([
    (0, typeorm_1.Entity)({ schema: 'dispatch' }),
    (0, typeorm_1.Index)(['orderId', 'riderId'], { unique: true })
], OfferExclusion);
//# sourceMappingURL=offer-exclusion.entity.js.map