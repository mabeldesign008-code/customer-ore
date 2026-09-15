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
exports.OrderItem = void 0;
const typeorm_1 = require("typeorm");
let OrderItem = class OrderItem {
    id;
    orderId;
    itemId;
    name;
    qty;
    unit;
    unitPricePesewas;
    prepTimeMin;
    modifiers;
    selectedOptions;
    optionsTotalPesewas;
    prescriptionOnly;
    createdAt;
};
exports.OrderItem = OrderItem;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], OrderItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], OrderItem.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], OrderItem.prototype, "itemId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], OrderItem.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], OrderItem.prototype, "qty", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], OrderItem.prototype, "unit", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], OrderItem.prototype, "unitPricePesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], OrderItem.prototype, "prepTimeMin", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', default: () => "'[]'" }),
    __metadata("design:type", Array)
], OrderItem.prototype, "modifiers", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', default: () => "'[]'" }),
    __metadata("design:type", Array)
], OrderItem.prototype, "selectedOptions", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], OrderItem.prototype, "optionsTotalPesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], OrderItem.prototype, "prescriptionOnly", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], OrderItem.prototype, "createdAt", void 0);
exports.OrderItem = OrderItem = __decorate([
    (0, typeorm_1.Entity)({ schema: 'order' })
], OrderItem);
//# sourceMappingURL=order-item.entity.js.map