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
exports.OtpCode = void 0;
const typeorm_1 = require("typeorm");
const uuid_1 = require("uuid");
let OtpCode = class OtpCode {
    /**
     * UUIDv7 (time-ordered) rather than TypeORM's default UUIDv4.
     *
     * Callers pick the newest OTP with `ORDER BY createdAt DESC, id DESC`.
     * TypeORM stores @CreateDateColumn as `datetime` with no precision, which on
     * SQLite truncates to whole seconds, so two OTPs requested in the same second
     * get an identical createdAt and the query falls through to the `id` tiebreaker.
     * With a random UUIDv4 that tiebreaker is a coin flip, so verifyOtp could load
     * the older OTP and reject the code the user was just sent. UUIDv7 sorts by
     * creation time, making the tiebreaker monotonic.
     */
    id;
    assignTimeOrderedId() {
        if (!this.id)
            this.id = (0, uuid_1.v7)();
    }
    phone;
    /** SHA-256 of the 6-digit code (never store plaintext). */
    codeHash;
    expiresAt;
    attempts;
    consumed;
    createdAt;
};
exports.OtpCode = OtpCode;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], OtpCode.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.BeforeInsert)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], OtpCode.prototype, "assignTimeOrderedId", null);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], OtpCode.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], OtpCode.prototype, "codeHash", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Date)
], OtpCode.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], OtpCode.prototype, "attempts", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], OtpCode.prototype, "consumed", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], OtpCode.prototype, "createdAt", void 0);
exports.OtpCode = OtpCode = __decorate([
    (0, typeorm_1.Entity)({ schema: 'auth' })
], OtpCode);
//# sourceMappingURL=otp.entity.js.map