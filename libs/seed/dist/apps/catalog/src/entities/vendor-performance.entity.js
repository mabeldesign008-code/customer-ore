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
exports.VendorPerformanceAudit = exports.VendorPerformanceRecord = exports.VendorPerformanceConfig = void 0;
const typeorm_1 = require("typeorm");
let VendorPerformanceConfig = class VendorPerformanceConfig {
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
exports.VendorPerformanceConfig = VendorPerformanceConfig;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], VendorPerformanceConfig.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], VendorPerformanceConfig.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], VendorPerformanceConfig.prototype, "version", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'MONTHLY' }),
    __metadata("design:type", String)
], VendorPerformanceConfig.prototype, "reviewPeriod", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], VendorPerformanceConfig.prototype, "active", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json' }),
    __metadata("design:type", Object)
], VendorPerformanceConfig.prototype, "configJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], VendorPerformanceConfig.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], VendorPerformanceConfig.prototype, "approvedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], VendorPerformanceConfig.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], VendorPerformanceConfig.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], VendorPerformanceConfig.prototype, "updatedAt", void 0);
exports.VendorPerformanceConfig = VendorPerformanceConfig = __decorate([
    (0, typeorm_1.Entity)({ schema: 'catalog' }),
    (0, typeorm_1.Index)(['active', 'createdAt'])
], VendorPerformanceConfig);
let VendorPerformanceRecord = class VendorPerformanceRecord {
    id;
    vendorId;
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
exports.VendorPerformanceRecord = VendorPerformanceRecord;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], VendorPerformanceRecord.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], VendorPerformanceRecord.prototype, "vendorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date }),
    __metadata("design:type", Date)
], VendorPerformanceRecord.prototype, "periodStart", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date }),
    __metadata("design:type", Date)
], VendorPerformanceRecord.prototype, "periodEnd", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], VendorPerformanceRecord.prototype, "configVersion", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], VendorPerformanceRecord.prototype, "configId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], VendorPerformanceRecord.prototype, "reviewerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Object)
], VendorPerformanceRecord.prototype, "overallScore", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], VendorPerformanceRecord.prototype, "grade", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], VendorPerformanceRecord.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], VendorPerformanceRecord.prototype, "trend", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], VendorPerformanceRecord.prototype, "insufficientData", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json' }),
    __metadata("design:type", Object)
], VendorPerformanceRecord.prototype, "resultJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Object)
], VendorPerformanceRecord.prototype, "metricCategories", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Object)
], VendorPerformanceRecord.prototype, "incidentTypes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Object)
], VendorPerformanceRecord.prototype, "actionCodes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], VendorPerformanceRecord.prototype, "outcome", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'REVIEW' }),
    __metadata("design:type", String)
], VendorPerformanceRecord.prototype, "recordType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], VendorPerformanceRecord.prototype, "linkedRecordId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], VendorPerformanceRecord.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], VendorPerformanceRecord.prototype, "createdAt", void 0);
exports.VendorPerformanceRecord = VendorPerformanceRecord = __decorate([
    (0, typeorm_1.Entity)({ schema: 'catalog' }),
    (0, typeorm_1.Index)(['vendorId', 'periodStart', 'periodEnd']),
    (0, typeorm_1.Index)(['status', 'createdAt']),
    (0, typeorm_1.Index)(['reviewerId', 'createdAt']),
    (0, typeorm_1.Index)(['outcome', 'createdAt'])
], VendorPerformanceRecord);
let VendorPerformanceAudit = class VendorPerformanceAudit {
    id;
    vendorId;
    action;
    actorId;
    recordId;
    payloadJson;
    reason;
    createdAt;
};
exports.VendorPerformanceAudit = VendorPerformanceAudit;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], VendorPerformanceAudit.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], VendorPerformanceAudit.prototype, "vendorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], VendorPerformanceAudit.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], VendorPerformanceAudit.prototype, "actorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], VendorPerformanceAudit.prototype, "recordId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], VendorPerformanceAudit.prototype, "payloadJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], VendorPerformanceAudit.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], VendorPerformanceAudit.prototype, "createdAt", void 0);
exports.VendorPerformanceAudit = VendorPerformanceAudit = __decorate([
    (0, typeorm_1.Entity)({ schema: 'catalog' }),
    (0, typeorm_1.Index)(['vendorId', 'createdAt'])
], VendorPerformanceAudit);
//# sourceMappingURL=vendor-performance.entity.js.map