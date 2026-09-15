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
exports.AdminApproval = void 0;
const typeorm_1 = require("typeorm");
/**
 * A dual-controlled money action, waiting for its checkers.
 *
 * This is the maker-checker state machine. Before it existed, holding a `⚖` permission
 * meant a single finance admin could approve and execute a payout alone — the guard
 * checked *whether* they could, never *whether anyone had checked it*.
 *
 * Two design points do the heavy lifting:
 *
 * 1. `executionRef` is UNIQUE. That is the whole idempotency story: a payout that fires
 *    twice would be this table failing, not the PSP being slow. If a service dies after
 *    the approval is released, replaying lands on the unique constraint, not on a second
 *    transfer. The reference the calling service uses as its PSP idempotency key must be
 *    this same value.
 *
 * 2. The payload is frozen at submission. `payloadJson` and `payloadHash` are written once
 *    in PENDING and never updated afterwards, so a maker cannot quietly change the amount
 *    or the beneficiary between asking and being approved. `assertPayloadUnchanged()`
 *    re-hashes at execution time and refuses if it differs.
 *
 * Status flow: PENDING -> (checkers sign) -> APPROVED -> EXECUTING -> EXECUTED
 *                     \-> REJECTED / EXPIRED / CANCELLED / FAILED
 *
 * EXECUTING is deliberately not recoverable by a plain retry. If a service dies there,
 * nobody knows whether the money moved, so a human has to look and either confirm it
 * happened (`confirmExecuted`) or write the reversal. Guessing is how you pay twice.
 */
let AdminApproval = class AdminApproval {
    id;
    /** Human-readable kind, e.g. `withdrawal.approve`, `wallet.adjust`. */
    kind;
    /** The dual-controlled permission being exercised, e.g. `finance.withdrawal.approve`. */
    permission;
    /** Which service owns the action. Used to route the execution call and the audit row. */
    service;
    resourceType;
    resourceId;
    /**
     * Idempotency key AND the DB-level guard against paying twice. Unique across the table.
     * The executing service must pass this same value to the PSP as its own reference.
     */
    executionRef;
    /** Money in pesewas. Zero for structural actions, which are always dual regardless. */
    amountPesewas;
    currency;
    /** Frozen at submission. Never edited afterwards. */
    payloadJson;
    /** sha256 of the canonicalised payload. Re-checked at execution. */
    payloadHash;
    makerUserId;
    makerAdminRole;
    /** One-line justification from the maker. Mandatory for wallet adjustments. */
    reason;
    /** How many distinct checkers must sign. Derived from the amount tier. */
    requiredApprovals;
    /** True when a super admin must be among the checkers. */
    requiresSuperAdmin;
    /** Distinct checkers who have signed so far. */
    approvalsJson;
    /** PENDING | APPROVED | EXECUTING | EXECUTED | REJECTED | EXPIRED | CANCELLED | FAILED */
    status;
    /** Approvals lapse. A stale request must not be approvable a week later. */
    expiresAt;
    decidedBy;
    decidedAt;
    executedBy;
    executedAt;
    /** What the executing service reported — PSP reference, transfer id, error. */
    resultJson;
    failureReason;
    createdAt;
    updatedAt;
};
exports.AdminApproval = AdminApproval;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AdminApproval.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], AdminApproval.prototype, "kind", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], AdminApproval.prototype, "permission", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], AdminApproval.prototype, "service", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AdminApproval.prototype, "resourceType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AdminApproval.prototype, "resourceId", void 0);
__decorate([
    (0, typeorm_1.Index)({ unique: true }),
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], AdminApproval.prototype, "executionRef", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], AdminApproval.prototype, "amountPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], AdminApproval.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], AdminApproval.prototype, "payloadJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], AdminApproval.prototype, "payloadHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], AdminApproval.prototype, "makerUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AdminApproval.prototype, "makerAdminRole", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], AdminApproval.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], AdminApproval.prototype, "requiredApprovals", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], AdminApproval.prototype, "requiresSuperAdmin", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], AdminApproval.prototype, "approvalsJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'PENDING' }),
    __metadata("design:type", String)
], AdminApproval.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date }),
    __metadata("design:type", Date)
], AdminApproval.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AdminApproval.prototype, "decidedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], AdminApproval.prototype, "decidedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AdminApproval.prototype, "executedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], AdminApproval.prototype, "executedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], AdminApproval.prototype, "resultJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], AdminApproval.prototype, "failureReason", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], AdminApproval.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], AdminApproval.prototype, "updatedAt", void 0);
exports.AdminApproval = AdminApproval = __decorate([
    (0, typeorm_1.Entity)({ schema: 'auth' }),
    (0, typeorm_1.Index)(['status', 'createdAt']),
    (0, typeorm_1.Index)(['makerUserId', 'createdAt']),
    (0, typeorm_1.Index)(['permission', 'status'])
], AdminApproval);
//# sourceMappingURL=admin-approval.entity.js.map