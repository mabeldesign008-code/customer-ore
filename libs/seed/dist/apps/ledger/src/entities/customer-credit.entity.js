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
exports.CustomerCredit = void 0;
const typeorm_1 = require("typeorm");
/** Doc §Payment — customer wallet credit (ledger-based; instant, no PSP round trip).
 *  Refund priority: wallet credit first. */
let CustomerCredit = class CustomerCredit {
    id;
    userId;
    creditPesewas;
    lifetimeCreditedPesewas;
    lifetimeUsedPesewas;
    version;
    createdAt;
    updatedAt;
};
exports.CustomerCredit = CustomerCredit;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], CustomerCredit.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], CustomerCredit.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], CustomerCredit.prototype, "creditPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], CustomerCredit.prototype, "lifetimeCreditedPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], CustomerCredit.prototype, "lifetimeUsedPesewas", void 0);
__decorate([
    (0, typeorm_1.VersionColumn)(),
    __metadata("design:type", Number)
], CustomerCredit.prototype, "version", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], CustomerCredit.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], CustomerCredit.prototype, "updatedAt", void 0);
exports.CustomerCredit = CustomerCredit = __decorate([
    (0, typeorm_1.Entity)({ schema: 'ledger' })
], CustomerCredit);
//# sourceMappingURL=customer-credit.entity.js.map