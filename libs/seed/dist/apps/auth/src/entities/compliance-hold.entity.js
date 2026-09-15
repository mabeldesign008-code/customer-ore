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
exports.ComplianceHold = void 0;
const typeorm_1 = require("typeorm");
let ComplianceHold = class ComplianceHold {
    id;
    targetType;
    /** The party's id: a user id for CUSTOMER, a rider id for RIDER, a vendor id for VENDOR. */
    targetId;
    scope;
    /** Mandatory. A hold with no reason is unauditable and, in a dispute, indefensible. */
    reason;
    status;
    /** Optional end date. Null means it stays until someone lifts it. */
    until;
    placedBy;
    liftedBy;
    liftedAt;
    liftNote;
    /** Set when the hold came from a fraud flag, so lifting one can be tied back to it. */
    fraudFlagId;
    createdAt;
};
exports.ComplianceHold = ComplianceHold;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ComplianceHold.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], ComplianceHold.prototype, "targetType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], ComplianceHold.prototype, "targetId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'ALL' }),
    __metadata("design:type", String)
], ComplianceHold.prototype, "scope", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], ComplianceHold.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'ACTIVE' }),
    __metadata("design:type", String)
], ComplianceHold.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], ComplianceHold.prototype, "until", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], ComplianceHold.prototype, "placedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], ComplianceHold.prototype, "liftedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], ComplianceHold.prototype, "liftedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], ComplianceHold.prototype, "liftNote", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], ComplianceHold.prototype, "fraudFlagId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ComplianceHold.prototype, "createdAt", void 0);
exports.ComplianceHold = ComplianceHold = __decorate([
    (0, typeorm_1.Entity)({ schema: 'auth' }),
    (0, typeorm_1.Index)(['targetType', 'targetId', 'status']),
    (0, typeorm_1.Index)(['status', 'createdAt'])
], ComplianceHold);
//# sourceMappingURL=compliance-hold.entity.js.map