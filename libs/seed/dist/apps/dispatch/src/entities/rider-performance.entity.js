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
exports.RiderPerformanceAudit = exports.RiderPerformanceRecord = exports.RiderPerformanceConfig = void 0;
const typeorm_1 = require("typeorm");
let RiderPerformanceConfig = class RiderPerformanceConfig {
    id;
    name;
    version;
    reviewPeriod;
    active;
    configJson;
    createdBy;
    approvedBy;
    notes;
    createdAt;
    updatedAt;
};
exports.RiderPerformanceConfig = RiderPerformanceConfig;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], RiderPerformanceConfig.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], RiderPerformanceConfig.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], RiderPerformanceConfig.prototype, "version", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'MONTHLY' }),
    __metadata("design:type", String)
], RiderPerformanceConfig.prototype, "reviewPeriod", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], RiderPerformanceConfig.prototype, "active", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json' }),
    __metadata("design:type", Object)
], RiderPerformanceConfig.prototype, "configJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], RiderPerformanceConfig.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], RiderPerformanceConfig.prototype, "approvedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], RiderPerformanceConfig.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], RiderPerformanceConfig.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], RiderPerformanceConfig.prototype, "updatedAt", void 0);
exports.RiderPerformanceConfig = RiderPerformanceConfig = __decorate([
    (0, typeorm_1.Entity)({ schema: 'dispatch' }),
    (0, typeorm_1.Index)(['active', 'createdAt'])
], RiderPerformanceConfig);
let RiderPerformanceRecord = class RiderPerformanceRecord {
    id;
    riderId;
    periodStart;
    periodEnd;
    configVersion;
    configId;
    reviewerId;
    overallScore;
    grade;
    status;
    trend;
    insufficientData;
    resultJson;
    metricCategories;
    incidentTypes;
    actionCodes;
    outcome;
    recordType;
    linkedRecordId;
    notes;
    createdAt;
};
exports.RiderPerformanceRecord = RiderPerformanceRecord;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], RiderPerformanceRecord.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], RiderPerformanceRecord.prototype, "riderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date }),
    __metadata("design:type", Date)
], RiderPerformanceRecord.prototype, "periodStart", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date }),
    __metadata("design:type", Date)
], RiderPerformanceRecord.prototype, "periodEnd", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], RiderPerformanceRecord.prototype, "configVersion", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], RiderPerformanceRecord.prototype, "configId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], RiderPerformanceRecord.prototype, "reviewerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Object)
], RiderPerformanceRecord.prototype, "overallScore", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], RiderPerformanceRecord.prototype, "grade", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], RiderPerformanceRecord.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], RiderPerformanceRecord.prototype, "trend", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], RiderPerformanceRecord.prototype, "insufficientData", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json' }),
    __metadata("design:type", Object)
], RiderPerformanceRecord.prototype, "resultJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Object)
], RiderPerformanceRecord.prototype, "metricCategories", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Object)
], RiderPerformanceRecord.prototype, "incidentTypes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Object)
], RiderPerformanceRecord.prototype, "actionCodes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], RiderPerformanceRecord.prototype, "outcome", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'REVIEW' }),
    __metadata("design:type", String)
], RiderPerformanceRecord.prototype, "recordType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], RiderPerformanceRecord.prototype, "linkedRecordId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], RiderPerformanceRecord.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], RiderPerformanceRecord.prototype, "createdAt", void 0);
exports.RiderPerformanceRecord = RiderPerformanceRecord = __decorate([
    (0, typeorm_1.Entity)({ schema: 'dispatch' }),
    (0, typeorm_1.Index)(['riderId', 'periodStart', 'periodEnd']),
    (0, typeorm_1.Index)(['status', 'createdAt']),
    (0, typeorm_1.Index)(['reviewerId', 'createdAt']),
    (0, typeorm_1.Index)(['outcome', 'createdAt'])
], RiderPerformanceRecord);
let RiderPerformanceAudit = class RiderPerformanceAudit {
    id;
    riderId;
    action;
    actorId;
    recordId;
    payloadJson;
    reason;
    createdAt;
};
exports.RiderPerformanceAudit = RiderPerformanceAudit;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], RiderPerformanceAudit.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], RiderPerformanceAudit.prototype, "riderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], RiderPerformanceAudit.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], RiderPerformanceAudit.prototype, "actorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], RiderPerformanceAudit.prototype, "recordId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], RiderPerformanceAudit.prototype, "payloadJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], RiderPerformanceAudit.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], RiderPerformanceAudit.prototype, "createdAt", void 0);
exports.RiderPerformanceAudit = RiderPerformanceAudit = __decorate([
    (0, typeorm_1.Entity)({ schema: 'dispatch' }),
    (0, typeorm_1.Index)(['riderId', 'createdAt'])
], RiderPerformanceAudit);
//# sourceMappingURL=rider-performance.entity.js.map