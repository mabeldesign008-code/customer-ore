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
exports.SequenceCounter = void 0;
const typeorm_1 = require("typeorm");
/**
 * Shared shape for the `(key, seq)` counter tables that mint human-readable public IDs.
 *
 * Three services keep one — auth (`ORC-<year>`), onboarding (`ORV-<year>`) and order
 * (`CC-FO-<date>`) — and each had declared the same two columns independently. `nextSequenceValue`
 * already unified the *statement*; this unifies the *shape*, so a change to one (a widened `seq`,
 * a collation, an index) cannot silently apply to only one of the three.
 *
 * It stays an abstract base rather than a single shared table because schema-per-service is a
 * hard boundary here: no service declares an entity in another service's schema, and a shared
 * counter table would be the first thing to break that. Each service therefore still owns its
 * own physical table, in its own schema, and only the definition is common.
 *
 * Not applicable to dispatch's `RiderIdentifierSequence`, whose key is genuinely different — a
 * composite `(cityCode, approvalYear)` rather than a single opaque string. Forcing it into this
 * shape would mean encoding two meaningful fields into one, which is how a key stops being
 * queryable.
 */
class SequenceCounter {
    /** Opaque scope of the counter — whatever combination resets the sequence. */
    key;
    /**
     * Last value handed out. Incremented by `nextSequenceValue` in a single atomic UPSERT;
     * never derived with `COUNT() + 1`, which races and reuses numbers after a deletion.
     */
    seq;
}
exports.SequenceCounter = SequenceCounter;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", String)
], SequenceCounter.prototype, "key", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], SequenceCounter.prototype, "seq", void 0);
//# sourceMappingURL=sequence-counter.entity.js.map