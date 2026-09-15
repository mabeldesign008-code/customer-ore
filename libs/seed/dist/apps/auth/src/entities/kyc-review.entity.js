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
exports.KycReview = void 0;
const typeorm_1 = require("typeorm");
let KycReview = class KycReview {
    id;
    userId;
    userType;
    status;
    /** Storage keys of the submitted documents. Never the documents themselves. */
    documentKeysJson;
    idNumber;
    fullName;
    submittedBy;
    submittedAt;
    decidedBy;
    decidedAt;
    /**
     * Mandatory on reject and on needs-info. A rejection with no reason cannot be appealed and
     * cannot be reviewed by the next person in the queue.
     */
    decisionNote;
    /** Which automated provider produced the result, once one is wired. Null while manual. */
    provider;
    createdAt;
    updatedAt;
};
exports.KycReview = KycReview;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], KycReview.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], KycReview.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'CUSTOMER' }),
    __metadata("design:type", String)
], KycReview.prototype, "userType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'PENDING' }),
    __metadata("design:type", String)
], KycReview.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], KycReview.prototype, "documentKeysJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], KycReview.prototype, "idNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], KycReview.prototype, "fullName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], KycReview.prototype, "submittedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], KycReview.prototype, "submittedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], KycReview.prototype, "decidedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], KycReview.prototype, "decidedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], KycReview.prototype, "decisionNote", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], KycReview.prototype, "provider", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], KycReview.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], KycReview.prototype, "updatedAt", void 0);
exports.KycReview = KycReview = __decorate([
    (0, typeorm_1.Entity)({ schema: 'auth' }),
    (0, typeorm_1.Index)(['status', 'createdAt']),
    (0, typeorm_1.Index)(['userId', 'createdAt'])
], KycReview);
//# sourceMappingURL=kyc-review.entity.js.map