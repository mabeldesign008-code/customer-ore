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
exports.OrderAddressAudit = void 0;
const typeorm_1 = require("typeorm");
/** Append-only location history for support visibility, corrections and receiver confirmations. */
let OrderAddressAudit = class OrderAddressAudit {
    id;
    orderId;
    action;
    actorId;
    actorRole;
    source;
    beforeJson;
    afterJson;
    reason;
    createdAt;
};
exports.OrderAddressAudit = OrderAddressAudit;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], OrderAddressAudit.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], OrderAddressAudit.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], OrderAddressAudit.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], OrderAddressAudit.prototype, "actorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], OrderAddressAudit.prototype, "actorRole", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], OrderAddressAudit.prototype, "source", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], OrderAddressAudit.prototype, "beforeJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json' }),
    __metadata("design:type", Object)
], OrderAddressAudit.prototype, "afterJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], OrderAddressAudit.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], OrderAddressAudit.prototype, "createdAt", void 0);
exports.OrderAddressAudit = OrderAddressAudit = __decorate([
    (0, typeorm_1.Entity)({ schema: 'order' }),
    (0, typeorm_1.Index)(['orderId', 'createdAt']),
    (0, typeorm_1.Index)(['orderId', 'action'])
], OrderAddressAudit);
//# sourceMappingURL=order-address-audit.entity.js.map