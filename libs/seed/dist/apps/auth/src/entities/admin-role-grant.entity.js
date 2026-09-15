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
exports.AdminRoleGrant = void 0;
const typeorm_1 = require("typeorm");
/**
 * A single permission granted to, or taken away from, one admin on top of their role.
 *
 * `deny` exists so you can subtract one permission without forking a whole new role —
 * the usual real case is "everyone in finance except Kwame can release reserves".
 *
 * Denials win over grants, and both win over the role matrix. `PermissionGuard.holds()`
 * applies them in that order.
 */
let AdminRoleGrant = class AdminRoleGrant {
    id;
    adminUserId;
    permission;
    /** grant | deny */
    mode;
    grantedBy;
    reason;
    createdAt;
};
exports.AdminRoleGrant = AdminRoleGrant;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AdminRoleGrant.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], AdminRoleGrant.prototype, "adminUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], AdminRoleGrant.prototype, "permission", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'grant' }),
    __metadata("design:type", String)
], AdminRoleGrant.prototype, "mode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AdminRoleGrant.prototype, "grantedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], AdminRoleGrant.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], AdminRoleGrant.prototype, "createdAt", void 0);
exports.AdminRoleGrant = AdminRoleGrant = __decorate([
    (0, typeorm_1.Entity)({ schema: 'auth' }),
    (0, typeorm_1.Index)(['adminUserId', 'permission'], { unique: true })
], AdminRoleGrant);
//# sourceMappingURL=admin-role-grant.entity.js.map