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
exports.RiderIncident = void 0;
const typeorm_1 = require("typeorm");
let RiderIncident = class RiderIncident {
    id;
    riderId;
    orderId;
    type;
    note;
    lat;
    lng;
    status;
    severity;
    attribution;
    excludedFromPerformance;
    exclusionReason;
    performanceImpact;
    reviewerId;
    reviewedAt;
    outcome;
    createdAt;
    updatedAt;
};
exports.RiderIncident = RiderIncident;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], RiderIncident.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], RiderIncident.prototype, "riderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], RiderIncident.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], RiderIncident.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], RiderIncident.prototype, "note", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Object)
], RiderIncident.prototype, "lat", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Object)
], RiderIncident.prototype, "lng", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'OPEN' }),
    __metadata("design:type", String)
], RiderIncident.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'LOW' }),
    __metadata("design:type", String)
], RiderIncident.prototype, "severity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'UNKNOWN' }),
    __metadata("design:type", String)
], RiderIncident.prototype, "attribution", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], RiderIncident.prototype, "excludedFromPerformance", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], RiderIncident.prototype, "exclusionReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], RiderIncident.prototype, "performanceImpact", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], RiderIncident.prototype, "reviewerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], RiderIncident.prototype, "reviewedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], RiderIncident.prototype, "outcome", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], RiderIncident.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], RiderIncident.prototype, "updatedAt", void 0);
exports.RiderIncident = RiderIncident = __decorate([
    (0, typeorm_1.Entity)({ schema: 'dispatch' }),
    (0, typeorm_1.Index)(['riderId', 'createdAt'])
], RiderIncident);
//# sourceMappingURL=rider-incident.entity.js.map