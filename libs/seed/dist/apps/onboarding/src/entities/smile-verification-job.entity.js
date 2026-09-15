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
exports.SmileVerificationJob = void 0;
const typeorm_1 = require("typeorm");
/**
 * Provider-job correlation and final-result storage for SmileID verification.
 * Raw image bytes are never stored here.
 */
let SmileVerificationJob = class SmileVerificationJob {
    id;
    applicationId;
    applicantUserId;
    providerJobId;
    providerUserId;
    status;
    reason;
    message;
    providerPayload;
    providerCreatedAt;
    completedAt;
    createdAt;
    updatedAt;
};
exports.SmileVerificationJob = SmileVerificationJob;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SmileVerificationJob.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], SmileVerificationJob.prototype, "applicationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], SmileVerificationJob.prototype, "applicantUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], SmileVerificationJob.prototype, "providerJobId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], SmileVerificationJob.prototype, "providerUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'PENDING' }),
    __metadata("design:type", String)
], SmileVerificationJob.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], SmileVerificationJob.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], SmileVerificationJob.prototype, "message", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], SmileVerificationJob.prototype, "providerPayload", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], SmileVerificationJob.prototype, "providerCreatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], SmileVerificationJob.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], SmileVerificationJob.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], SmileVerificationJob.prototype, "updatedAt", void 0);
exports.SmileVerificationJob = SmileVerificationJob = __decorate([
    (0, typeorm_1.Entity)({ schema: 'onboarding' }),
    (0, typeorm_1.Index)(['providerJobId'], { unique: true }),
    (0, typeorm_1.Index)(['applicationId', 'createdAt'])
], SmileVerificationJob);
//# sourceMappingURL=smile-verification-job.entity.js.map