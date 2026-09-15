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
exports.DispatchAudit = void 0;
const typeorm_1 = require("typeorm");
/** Dispatch audit log — doc §15: every pool, wave, score, accept, decline, timeout,
 *  radius expansion, assignment lock, and admin override is recorded. */
let DispatchAudit = class DispatchAudit {
    id;
    orderId;
    riderId;
    eventType; // pool_created | offer_created | accepted | declined | timed_out |
    // radius_expanded | assigned | superseded | admin_override | released
    detailJson;
    createdAt;
};
exports.DispatchAudit = DispatchAudit;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], DispatchAudit.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], DispatchAudit.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], DispatchAudit.prototype, "riderId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], DispatchAudit.prototype, "eventType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], DispatchAudit.prototype, "detailJson", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], DispatchAudit.prototype, "createdAt", void 0);
exports.DispatchAudit = DispatchAudit = __decorate([
    (0, typeorm_1.Entity)({ schema: 'dispatch' }),
    (0, typeorm_1.Index)(['orderId'])
], DispatchAudit);
//# sourceMappingURL=dispatch-audit.entity.js.map