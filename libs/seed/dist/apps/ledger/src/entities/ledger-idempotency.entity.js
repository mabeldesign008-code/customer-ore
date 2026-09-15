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
exports.LedgerIdempotency = void 0;
const typeorm_1 = require("typeorm");
/**
 * One row per journal batch that must be replay-safe (audit P0). The key is a
 * deterministic business key (`delivered:<orderId>`, `charge:<orderId>`, …); inserting
 * it is the commit point — if the key already exists the batch was already posted and
 * is skipped. The PK is the hard stop for concurrent duplicates.
 */
let LedgerIdempotency = class LedgerIdempotency {
    id;
    createdAt;
};
exports.LedgerIdempotency = LedgerIdempotency;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", String)
], LedgerIdempotency.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], LedgerIdempotency.prototype, "createdAt", void 0);
exports.LedgerIdempotency = LedgerIdempotency = __decorate([
    (0, typeorm_1.Entity)({ schema: 'ledger' })
], LedgerIdempotency);
//# sourceMappingURL=ledger-idempotency.entity.js.map