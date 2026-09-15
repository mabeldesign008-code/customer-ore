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
exports.OrderEvent = void 0;
const typeorm_1 = require("typeorm");
/** Immutable audit log of every transition — G34. Powers tracking feed + dispute evidence. */
let OrderEvent = class OrderEvent {
    id;
    orderId;
    from;
    to;
    actor;
    payloadJson;
    createdAt;
};
exports.OrderEvent = OrderEvent;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], OrderEvent.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], OrderEvent.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], OrderEvent.prototype, "from", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], OrderEvent.prototype, "to", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'system' }),
    __metadata("design:type", String)
], OrderEvent.prototype, "actor", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], OrderEvent.prototype, "payloadJson", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], OrderEvent.prototype, "createdAt", void 0);
exports.OrderEvent = OrderEvent = __decorate([
    (0, typeorm_1.Entity)({ schema: 'order' }),
    (0, typeorm_1.Index)(['orderId'])
], OrderEvent);
//# sourceMappingURL=order-event.entity.js.map