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
exports.StockReservation = void 0;
const typeorm_1 = require("typeorm");
/** Idempotent inventory reservation used by confirmed Vendor orders. */
let StockReservation = class StockReservation {
    id;
    orderId;
    itemId;
    qty;
    status;
    createdAt;
    updatedAt;
};
exports.StockReservation = StockReservation;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], StockReservation.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], StockReservation.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], StockReservation.prototype, "itemId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], StockReservation.prototype, "qty", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'RESERVED' }),
    __metadata("design:type", String)
], StockReservation.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], StockReservation.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], StockReservation.prototype, "updatedAt", void 0);
exports.StockReservation = StockReservation = __decorate([
    (0, typeorm_1.Entity)({ schema: 'catalog' }),
    (0, typeorm_1.Index)(['orderId', 'status']),
    (0, typeorm_1.Index)(['itemId', 'status'])
], StockReservation);
//# sourceMappingURL=stock-reservation.entity.js.map