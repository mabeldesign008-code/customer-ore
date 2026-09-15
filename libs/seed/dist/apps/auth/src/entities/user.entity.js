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
exports.User = void 0;
const typeorm_1 = require("typeorm");
const contracts_1 = require("@ore/contracts");
let User = class User {
    id;
    phone;
    role;
    roles;
    name;
    email;
    passwordHash;
    totpSecret;
    deviceToken;
    deviceFingerprint;
    verified;
    /** AdminRole for admin users; null for everyone else. Drives support queue routing. */
    adminRole;
    publicId; // ORC-YYYY-NNNNNN (doc §IDs — auto at signup)
    /* ─────────────────── account standing (Operations) ───────────────────
     * None of this existed, so there was no way to stop an abusive account: no status, no
     * suspension, and nothing for the auth guard to enforce. A banned customer could simply
     * keep ordering.
     */
    /** ACTIVE | SUSPENDED | BANNED. Only ACTIVE may transact. */
    status;
    /** When a SUSPENDED account may come back on its own. Null for an indefinite suspension. */
    suspendedUntil;
    /** Shown to the customer and kept in the audit trail. Mandatory — a suspension with no
     * reason is unauditable and, in a dispute, indefensible. */
    suspensionReason;
    suspendedBy;
    lastLoginAt;
    /** City, for the operations map and for city-scoped marketing. */
    city;
    /**
     * Marketing consent. Separate from `verified`: a verified account is not a consenting
     * one, and conflating them is how you end up emailing people who never asked.
     */
    marketingConsent;
    /** Customer COD risk tier. Applies only to customer accounts and is enforced at checkout. */
    customerCodTier;
    customerCodBlocked;
    customerCodBlockReason;
    /** Bumped on suspend/ban so issued tokens stop being trusted immediately. */
    tokenEpoch;
    createdAt;
    updatedAt;
};
exports.User = User;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], User.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], User.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: contracts_1.Role.CUSTOMER }),
    __metadata("design:type", String)
], User.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', default: contracts_1.Role.CUSTOMER }),
    __metadata("design:type", Array)
], User.prototype, "roles", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "passwordHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "totpSecret", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "deviceToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "deviceFingerprint", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "verified", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "adminRole", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "publicId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'ACTIVE' }),
    __metadata("design:type", String)
], User.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "suspendedUntil", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "suspensionReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "suspendedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "lastLoginAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "city", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "marketingConsent", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'NEW' }),
    __metadata("design:type", String)
], User.prototype, "customerCodTier", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "customerCodBlocked", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "customerCodBlockReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], User.prototype, "tokenEpoch", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], User.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], User.prototype, "updatedAt", void 0);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)({ schema: 'auth' })
], User);
//# sourceMappingURL=user.entity.js.map