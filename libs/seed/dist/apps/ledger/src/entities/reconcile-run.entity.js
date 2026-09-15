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
exports.ReconcileRun = void 0;
const typeorm_1 = require("typeorm");
/** Daily reconciliation report (G28/G30). */
let ReconcileRun = class ReconcileRun {
    id;
    period;
    status;
    reportJson;
    createdAt;
};
exports.ReconcileRun = ReconcileRun;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ReconcileRun.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], ReconcileRun.prototype, "period", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'RUNNING' }),
    __metadata("design:type", String)
], ReconcileRun.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], ReconcileRun.prototype, "reportJson", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ReconcileRun.prototype, "createdAt", void 0);
exports.ReconcileRun = ReconcileRun = __decorate([
    (0, typeorm_1.Entity)({ schema: 'ledger' })
], ReconcileRun);
//# sourceMappingURL=reconcile-run.entity.js.map