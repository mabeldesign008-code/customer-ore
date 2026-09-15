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
exports.CustomerAddressAudit = exports.CustomerSavedAddress = void 0;
const typeorm_1 = require("typeorm");
let CustomerSavedAddress = class CustomerSavedAddress {
    id;
    customerId;
    label;
    addressJson;
    isDefault;
    active;
    createdBy;
    updatedBy;
    createdAt;
    updatedAt;
};
exports.CustomerSavedAddress = CustomerSavedAddress;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], CustomerSavedAddress.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], CustomerSavedAddress.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], CustomerSavedAddress.prototype, "label", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json' }),
    __metadata("design:type", Object)
], CustomerSavedAddress.prototype, "addressJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], CustomerSavedAddress.prototype, "isDefault", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], CustomerSavedAddress.prototype, "active", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], CustomerSavedAddress.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], CustomerSavedAddress.prototype, "updatedBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], CustomerSavedAddress.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], CustomerSavedAddress.prototype, "updatedAt", void 0);
exports.CustomerSavedAddress = CustomerSavedAddress = __decorate([
    (0, typeorm_1.Entity)({ schema: 'auth' }),
    (0, typeorm_1.Index)(['customerId', 'active'])
], CustomerSavedAddress);
let CustomerAddressAudit = class CustomerAddressAudit {
    id;
    customerId;
    addressId;
    action;
    actorId;
    actorRole;
    beforeJson;
    afterJson;
    reason;
    createdAt;
};
exports.CustomerAddressAudit = CustomerAddressAudit;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], CustomerAddressAudit.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], CustomerAddressAudit.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], CustomerAddressAudit.prototype, "addressId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], CustomerAddressAudit.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], CustomerAddressAudit.prototype, "actorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], CustomerAddressAudit.prototype, "actorRole", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], CustomerAddressAudit.prototype, "beforeJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], CustomerAddressAudit.prototype, "afterJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], CustomerAddressAudit.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], CustomerAddressAudit.prototype, "createdAt", void 0);
exports.CustomerAddressAudit = CustomerAddressAudit = __decorate([
    (0, typeorm_1.Entity)({ schema: 'auth' }),
    (0, typeorm_1.Index)(['customerId', 'createdAt']),
    (0, typeorm_1.Index)(['addressId', 'createdAt'])
], CustomerAddressAudit);
//# sourceMappingURL=customer-address.entity.js.map