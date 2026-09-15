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
exports.RefreshRevocation = void 0;
const typeorm_1 = require("typeorm");
/**
 * Server-side refresh-token revocation (audit F-SEC-13).
 *
 * Refresh tokens are stateless JWTs valid for 30 days. Logout used to only clear the
 * browser cookie, so a captured refresh token (stolen cookie, shared/stale device)
 * kept minting fresh access tokens for the whole 30-day window. Each refresh token now
 * carries a unique `jti`; revoking it records the jti here, and `refresh()` refuses any
 * revoked jti. Rows are pruned at 31 days (beyond the token's own 30-day expiry).
 */
let RefreshRevocation = class RefreshRevocation {
    jti;
    sub;
    revokedAt;
};
exports.RefreshRevocation = RefreshRevocation;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", String)
], RefreshRevocation.prototype, "jti", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], RefreshRevocation.prototype, "sub", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], RefreshRevocation.prototype, "revokedAt", void 0);
exports.RefreshRevocation = RefreshRevocation = __decorate([
    (0, typeorm_1.Entity)({ schema: 'auth' })
], RefreshRevocation);
//# sourceMappingURL=refresh-revocation.entity.js.map