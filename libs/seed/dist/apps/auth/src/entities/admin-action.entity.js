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
exports.AdminAction = void 0;
const typeorm_1 = require("typeorm");
/**
 * The central admin audit log. APPEND-ONLY.
 *
 * Before this table existed there was no queryable record of who moved money, who
 * approved a withdrawal, or who force-transitioned an order — the services threaded an
 * `adminUserId` into ledger refs, and since there was only ever one shared admin account
 * even that was meaningless.
 *
 * There is deliberately no update path and no delete path anywhere in the codebase for
 * this table. Same treatment as `ledger_entry`, `support_escalation` and
 * `support_tool_audit`.
 */
let AdminAction = class AdminAction {
    id;
    actorUserId;
    /** The role the actor held at the time. Recorded, not joined — roles change. */
    actorAdminRole;
    permission;
    /** allow | deny */
    decision;
    reason;
    service;
    method;
    path;
    resourceType;
    resourceId;
    /** Set on money actions so "everything above GHS X today" is one indexed query. */
    amountPesewas;
    beforeJson;
    afterJson;
    /**
     * True when the permission decision fell back to the JWT because the auth service was
     * unreachable. Lets you reconstruct exactly which window ran degraded.
     */
    degraded;
    ip;
    userAgent;
    traceId;
    createdAt;
};
exports.AdminAction = AdminAction;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AdminAction.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AdminAction.prototype, "actorUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AdminAction.prototype, "actorAdminRole", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AdminAction.prototype, "permission", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], AdminAction.prototype, "decision", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AdminAction.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AdminAction.prototype, "service", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AdminAction.prototype, "method", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AdminAction.prototype, "path", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AdminAction.prototype, "resourceType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AdminAction.prototype, "resourceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Object)
], AdminAction.prototype, "amountPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], AdminAction.prototype, "beforeJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], AdminAction.prototype, "afterJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], AdminAction.prototype, "degraded", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AdminAction.prototype, "ip", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AdminAction.prototype, "userAgent", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AdminAction.prototype, "traceId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], AdminAction.prototype, "createdAt", void 0);
exports.AdminAction = AdminAction = __decorate([
    (0, typeorm_1.Entity)({ schema: 'auth' }),
    (0, typeorm_1.Index)(['actorUserId', 'createdAt']),
    (0, typeorm_1.Index)(['resourceType', 'resourceId']),
    (0, typeorm_1.Index)(['permission', 'createdAt'])
], AdminAction);
//# sourceMappingURL=admin-action.entity.js.map