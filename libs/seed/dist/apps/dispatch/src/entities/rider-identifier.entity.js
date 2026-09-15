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
exports.RiderIdentifierAudit = exports.RiderIdentifierSequence = void 0;
const typeorm_1 = require("typeorm");
/**
 * Database-owned counter for public Rider identifiers.
 *
 * The primary key is exactly the spec scope: one atomic sequence per
 * `(city_code, approval_year)`. Application code must increment this table with a
 * single UPSERT/RETURNING statement; it must never use COUNT()+1.
 */
let RiderIdentifierSequence = class RiderIdentifierSequence {
    cityCode;
    approvalYear;
    seq;
};
exports.RiderIdentifierSequence = RiderIdentifierSequence;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: 'varchar' }),
    __metadata("design:type", String)
], RiderIdentifierSequence.prototype, "cityCode", void 0);
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: 'int' }),
    __metadata("design:type", Number)
], RiderIdentifierSequence.prototype, "approvalYear", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], RiderIdentifierSequence.prototype, "seq", void 0);
exports.RiderIdentifierSequence = RiderIdentifierSequence = __decorate([
    (0, typeorm_1.Entity)({ schema: 'dispatch', name: 'rider_identifier_sequence' })
], RiderIdentifierSequence);
/** Immutable audit trail for Rider ID creation, correction and historical lookup. */
let RiderIdentifierAudit = class RiderIdentifierAudit {
    id;
    /** Internal dispatch Rider UUID. Never the public Rider ID. */
    riderId;
    eventType;
    /** New/current public Rider ID for this event. */
    identifier;
    /** Original/previous public Rider ID when an audited correction occurs. */
    previousIdentifier;
    cityId;
    cityCode;
    approvalYear;
    sequenceNumber;
    previousCityId;
    previousCityCode;
    previousApprovalYear;
    previousSequenceNumber;
    reason;
    actorId;
    actorRole;
    /** Ticket/checker reference authorising a correction or source approval. */
    approvalReference;
    metadataJson;
    createdAt;
};
exports.RiderIdentifierAudit = RiderIdentifierAudit;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], RiderIdentifierAudit.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], RiderIdentifierAudit.prototype, "riderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], RiderIdentifierAudit.prototype, "eventType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], RiderIdentifierAudit.prototype, "identifier", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], RiderIdentifierAudit.prototype, "previousIdentifier", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], RiderIdentifierAudit.prototype, "cityId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], RiderIdentifierAudit.prototype, "cityCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Object)
], RiderIdentifierAudit.prototype, "approvalYear", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Object)
], RiderIdentifierAudit.prototype, "sequenceNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], RiderIdentifierAudit.prototype, "previousCityId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], RiderIdentifierAudit.prototype, "previousCityCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Object)
], RiderIdentifierAudit.prototype, "previousApprovalYear", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Object)
], RiderIdentifierAudit.prototype, "previousSequenceNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], RiderIdentifierAudit.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], RiderIdentifierAudit.prototype, "actorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], RiderIdentifierAudit.prototype, "actorRole", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], RiderIdentifierAudit.prototype, "approvalReference", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], RiderIdentifierAudit.prototype, "metadataJson", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], RiderIdentifierAudit.prototype, "createdAt", void 0);
exports.RiderIdentifierAudit = RiderIdentifierAudit = __decorate([
    (0, typeorm_1.Entity)({ schema: 'dispatch', name: 'rider_identifier_audit' }),
    (0, typeorm_1.Index)(['riderId']),
    (0, typeorm_1.Index)(['identifier']),
    (0, typeorm_1.Index)(['previousIdentifier'])
], RiderIdentifierAudit);
//# sourceMappingURL=rider-identifier.entity.js.map