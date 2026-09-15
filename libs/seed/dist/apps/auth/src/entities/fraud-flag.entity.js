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
exports.FraudFlag = void 0;
const typeorm_1 = require("typeorm");
let FraudFlag = class FraudFlag {
    id;
    targetType;
    targetId;
    severity;
    /** Short machine-ish label so flags can be grouped: COD_MISMATCH, STOLEN_CARD, MULTI_ACCOUNT… */
    category;
    reason;
    evidenceJson;
    status;
    /** 'MANUAL' for a person, or the name of the rule/service that raised it. */
    raisedBy;
    assignedTo;
    resolvedBy;
    resolvedAt;
    /** Required on CONFIRMED and DISMISSED: a conclusion with no reasoning cannot be reviewed. */
    resolutionNote;
    /** The hold placed because of this flag, if one was. Lifting the flag should surface it. */
    holdId;
    createdAt;
    updatedAt;
};
exports.FraudFlag = FraudFlag;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], FraudFlag.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], FraudFlag.prototype, "targetType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], FraudFlag.prototype, "targetId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'MEDIUM' }),
    __metadata("design:type", String)
], FraudFlag.prototype, "severity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], FraudFlag.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], FraudFlag.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], FraudFlag.prototype, "evidenceJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'OPEN' }),
    __metadata("design:type", String)
], FraudFlag.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'MANUAL' }),
    __metadata("design:type", String)
], FraudFlag.prototype, "raisedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], FraudFlag.prototype, "assignedTo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], FraudFlag.prototype, "resolvedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], FraudFlag.prototype, "resolvedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], FraudFlag.prototype, "resolutionNote", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], FraudFlag.prototype, "holdId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], FraudFlag.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], FraudFlag.prototype, "updatedAt", void 0);
exports.FraudFlag = FraudFlag = __decorate([
    (0, typeorm_1.Entity)({ schema: 'auth' }),
    (0, typeorm_1.Index)(['status', 'severity']),
    (0, typeorm_1.Index)(['targetType', 'targetId']),
    (0, typeorm_1.Index)(['createdAt'])
], FraudFlag);
//# sourceMappingURL=fraud-flag.entity.js.map