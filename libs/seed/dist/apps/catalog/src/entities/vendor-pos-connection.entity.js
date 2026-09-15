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
exports.VendorPosConnection = void 0;
const typeorm_1 = require("typeorm");
/** Generic POS/webhook bridge connection; external adapters can build on this contract. */
let VendorPosConnection = class VendorPosConnection {
    id;
    vendorId;
    provider;
    externalStoreId;
    tokenHash;
    active;
    lastReceivedAt;
    createdAt;
    updatedAt;
};
exports.VendorPosConnection = VendorPosConnection;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], VendorPosConnection.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], VendorPosConnection.prototype, "vendorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], VendorPosConnection.prototype, "provider", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], VendorPosConnection.prototype, "externalStoreId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], VendorPosConnection.prototype, "tokenHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], VendorPosConnection.prototype, "active", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], VendorPosConnection.prototype, "lastReceivedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], VendorPosConnection.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], VendorPosConnection.prototype, "updatedAt", void 0);
exports.VendorPosConnection = VendorPosConnection = __decorate([
    (0, typeorm_1.Entity)({ schema: 'catalog' })
], VendorPosConnection);
//# sourceMappingURL=vendor-pos-connection.entity.js.map