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
exports.ChartAccount = void 0;
const typeorm_1 = require("typeorm");
let ChartAccount = class ChartAccount {
    id;
    /** The internal ledger account name. This is the join key to `ledger_entry.account`. */
    name;
    /** The accountant's code, e.g. `4100`. Unique so a code cannot be reused across accounts. */
    code;
    /** Human label used on statements and exports. */
    label;
    nature;
    /**
     * Normal balance side. A liability increases on credit, an asset on debit. The trial
     * balance uses this to report a signed balance rather than forcing the reader to know
     * the convention.
     */
    normalSide;
    /** Set for accounts whose balance must be zero at a period end (clearing/suspense). */
    mustNetToZero;
    /** Free-text note for the accountant. Why this mapping exists is worth writing down. */
    note;
    updatedBy;
    createdAt;
    updatedAt;
};
exports.ChartAccount = ChartAccount;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ChartAccount.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], ChartAccount.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], ChartAccount.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], ChartAccount.prototype, "label", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'CONTROL' }),
    __metadata("design:type", String)
], ChartAccount.prototype, "nature", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'DEBIT' }),
    __metadata("design:type", String)
], ChartAccount.prototype, "normalSide", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], ChartAccount.prototype, "mustNetToZero", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], ChartAccount.prototype, "note", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], ChartAccount.prototype, "updatedBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ChartAccount.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], ChartAccount.prototype, "updatedAt", void 0);
exports.ChartAccount = ChartAccount = __decorate([
    (0, typeorm_1.Entity)({ schema: 'ledger' }),
    (0, typeorm_1.Index)(['name'], { unique: true }),
    (0, typeorm_1.Index)(['code'], { unique: true })
], ChartAccount);
//# sourceMappingURL=chart-account.entity.js.map