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
exports.Application = exports.SmileIdStatus = exports.ApplicationStatus = void 0;
const typeorm_1 = require("typeorm");
const contracts_1 = require("@ore/contracts");
Object.defineProperty(exports, "ApplicationStatus", { enumerable: true, get: function () { return contracts_1.ApplicationStatus; } });
Object.defineProperty(exports, "SmileIdStatus", { enumerable: true, get: function () { return contracts_1.SmileIdStatus; } });
let Application = class Application {
    id;
    applicantUserId;
    applicantPhone;
    applicantName;
    kind;
    status;
    currentStage;
    maxStages;
    stageData;
    smileIdStatus;
    vendorClass;
    vendorType;
    businessName;
    lat;
    lng;
    workplaceGps;
    payoutInfo;
    vehicle;
    reason; // rejection reason
    requiresActionField;
    publicId; // Vendors: ORV-YYYY-NNNN. Riders: backend-issued YDR-CC-YYYY-NNNN Rider ID.
    createdAt;
    updatedAt;
};
exports.Application = Application;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Application.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Application.prototype, "applicantUserId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Application.prototype, "applicantPhone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Application.prototype, "applicantName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], Application.prototype, "kind", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: contracts_1.ApplicationStatus.DRAFT }),
    __metadata("design:type", String)
], Application.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 1 }),
    __metadata("design:type", Number)
], Application.prototype, "currentStage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 4 }),
    __metadata("design:type", Number)
], Application.prototype, "maxStages", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Application.prototype, "stageData", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: contracts_1.SmileIdStatus.NOT_STARTED }),
    __metadata("design:type", String)
], Application.prototype, "smileIdStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Application.prototype, "vendorClass", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Application.prototype, "vendorType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Application.prototype, "businessName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Object)
], Application.prototype, "lat", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Object)
], Application.prototype, "lng", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Application.prototype, "workplaceGps", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Application.prototype, "payoutInfo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Application.prototype, "vehicle", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Application.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Application.prototype, "requiresActionField", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Application.prototype, "publicId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Application.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Application.prototype, "updatedAt", void 0);
exports.Application = Application = __decorate([
    (0, typeorm_1.Entity)({ schema: 'onboarding' }),
    (0, typeorm_1.Index)(['status', 'kind'])
], Application);
//# sourceMappingURL=application.entity.js.map