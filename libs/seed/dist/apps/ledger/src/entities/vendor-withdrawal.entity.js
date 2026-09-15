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
exports.VendorWithdrawal = void 0;
const typeorm_1 = require("typeorm");
/** Optional early Vendor payout request; scheduled settlements remain the default path. */
let VendorWithdrawal = class VendorWithdrawal {
    id;
    vendorId;
    amountPesewas;
    destination;
    status;
    transferReference;
    note;
    processedAt;
    createdAt;
    updatedAt;
};
exports.VendorWithdrawal = VendorWithdrawal;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], VendorWithdrawal.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], VendorWithdrawal.prototype, "vendorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], VendorWithdrawal.prototype, "amountPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], VendorWithdrawal.prototype, "destination", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'REQUESTED' }),
    __metadata("design:type", String)
], VendorWithdrawal.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], VendorWithdrawal.prototype, "transferReference", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], VendorWithdrawal.prototype, "note", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], VendorWithdrawal.prototype, "processedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], VendorWithdrawal.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], VendorWithdrawal.prototype, "updatedAt", void 0);
exports.VendorWithdrawal = VendorWithdrawal = __decorate([
    (0, typeorm_1.Entity)({ schema: 'ledger' }),
    (0, typeorm_1.Index)(['vendorId', 'status'])
], VendorWithdrawal);
//# sourceMappingURL=vendor-withdrawal.entity.js.map