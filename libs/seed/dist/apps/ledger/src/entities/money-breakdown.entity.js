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
exports.MoneyBreakdown = void 0;
const typeorm_1 = require("typeorm");
/** Per-order money breakdown — the G10 split, recorded at checkout, settled later. */
let MoneyBreakdown = class MoneyBreakdown {
    id;
    orderId;
    subtotalPesewas;
    deliveryFeePesewas;
    serviceFeePesewas;
    platformFeePesewas;
    vendorSharePesewas;
    riderFeePesewas;
    pspFeePesewas;
    totalPesewas;
    createdAt;
    updatedAt;
};
exports.MoneyBreakdown = MoneyBreakdown;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], MoneyBreakdown.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], MoneyBreakdown.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], MoneyBreakdown.prototype, "subtotalPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], MoneyBreakdown.prototype, "deliveryFeePesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], MoneyBreakdown.prototype, "serviceFeePesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], MoneyBreakdown.prototype, "platformFeePesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], MoneyBreakdown.prototype, "vendorSharePesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], MoneyBreakdown.prototype, "riderFeePesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], MoneyBreakdown.prototype, "pspFeePesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], MoneyBreakdown.prototype, "totalPesewas", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], MoneyBreakdown.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], MoneyBreakdown.prototype, "updatedAt", void 0);
exports.MoneyBreakdown = MoneyBreakdown = __decorate([
    (0, typeorm_1.Entity)({ schema: 'ledger' })
], MoneyBreakdown);
//# sourceMappingURL=money-breakdown.entity.js.map