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
exports.AdminUser = void 0;
const typeorm_1 = require("typeorm");
/**
 * An admin account. 1:1 with `user` where role='admin'.
 *
 * This lives in its own table rather than as more columns on `user` because `user` is
 * shared by customers, vendors and riders and is written by the public OTP signup path.
 * Admin-only concerns — TOTP enrolment, suspension, Telegram alerting, job title —
 * have no business on a row a customer signup also touches.
 *
 * `status` is checked live by `PermissionGuard` on every admin request (cached 15s),
 * so suspending somebody bites immediately instead of waiting out their access token.
 */
let AdminUser = class AdminUser {
    id;
    userId;
    /** AdminRole. Authoritative — `user.adminRole` is only the bootstrap backfill. */
    adminRole;
    displayName;
    jobTitle;
    /** ACTIVE | SUSPENDED | REVOKED | PENDING_ENROLMENT */
    status;
    /**
     * Null until the admin completes first-login enrolment. An admin who has not enrolled
     * cannot be issued a session — see AuthService.adminLogin.
     */
    pendingTotpSecret;
    totpEnrolledAt;
    /**
     * One-shot enrolment token.
     *
     * `adminLogin` deliberately refuses anyone without `user.totpSecret`, and that secret
     * only exists once enrolment completes — so enrolment cannot require a login token or
     * the admin could never get in. This token is the way in: handed to the invitee once,
     * consumed by POST /auth/admin/enrol, and cleared on success.
     */
    enrolToken;
    enrolTokenExpiresAt;
    /** Where escalation alerts go. Linked via the /link <code> bot flow, never typed in. */
    telegramChatId;
    telegramLinkedAt;
    notificationPrefsJson;
    invitedBy;
    invitedAt;
    lastLoginAt;
    lastLoginIp;
    createdAt;
    updatedAt;
};
exports.AdminUser = AdminUser;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AdminUser.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], AdminUser.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'support' }),
    __metadata("design:type", String)
], AdminUser.prototype, "adminRole", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AdminUser.prototype, "displayName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AdminUser.prototype, "jobTitle", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'ACTIVE' }),
    __metadata("design:type", String)
], AdminUser.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AdminUser.prototype, "pendingTotpSecret", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], AdminUser.prototype, "totpEnrolledAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AdminUser.prototype, "enrolToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], AdminUser.prototype, "enrolTokenExpiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AdminUser.prototype, "telegramChatId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], AdminUser.prototype, "telegramLinkedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], AdminUser.prototype, "notificationPrefsJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AdminUser.prototype, "invitedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], AdminUser.prototype, "invitedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], AdminUser.prototype, "lastLoginAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AdminUser.prototype, "lastLoginIp", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], AdminUser.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], AdminUser.prototype, "updatedAt", void 0);
exports.AdminUser = AdminUser = __decorate([
    (0, typeorm_1.Entity)({ schema: 'auth' }),
    (0, typeorm_1.Index)(['userId'], { unique: true }),
    (0, typeorm_1.Index)(['adminRole', 'status'])
], AdminUser);
//# sourceMappingURL=admin-user.entity.js.map