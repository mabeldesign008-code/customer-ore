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
exports.MenuItem = void 0;
const typeorm_1 = require("typeorm");
let MenuItem = class MenuItem {
    id;
    vendorId;
    name;
    category;
    pricePesewas;
    prepTimeMin; // = fulfillment time for non-food (doc: generic catalogue)
    unit; // each | kg | pack | box | portion
    stock; // null = no inventory tracking (food); used for grocery/shop/market/pharmacy
    prescriptionOnly; // pharmacy — requires prescription upload (doc §Pharmacy compliance)
    available;
    modifiers;
    /** Structured variant/add-on groups with pesewa price adjustments. */
    addonGroups;
    imageKey;
    imageContentType;
    sku;
    expiryDate;
    /** Pharmacy-specific dosage/strength, e.g. 500mg or 10ml. */
    dosage;
    /** Laundry-specific service turnaround, e.g. 24h Express. */
    turnaround;
    /** Market-specific flag indicating that the price is refreshed daily. */
    dailyMarketPrice;
    /** Laundry-specific garment/service classification. */
    garmentType;
    /** Laundry intake/inspection metadata; state is retained with the item. */
    conditionJson;
    /** Food dietary tags and other vertical-specific searchable labels. */
    dietaryTags;
    description;
    createdAt;
    updatedAt;
};
exports.MenuItem = MenuItem;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], MenuItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], MenuItem.prototype, "vendorId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], MenuItem.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], MenuItem.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], MenuItem.prototype, "pricePesewas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 10 }),
    __metadata("design:type", Number)
], MenuItem.prototype, "prepTimeMin", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'each' }),
    __metadata("design:type", String)
], MenuItem.prototype, "unit", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Object)
], MenuItem.prototype, "stock", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], MenuItem.prototype, "prescriptionOnly", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], MenuItem.prototype, "available", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', default: () => "'[]'" }),
    __metadata("design:type", Array)
], MenuItem.prototype, "modifiers", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], MenuItem.prototype, "addonGroups", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], MenuItem.prototype, "imageKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], MenuItem.prototype, "imageContentType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], MenuItem.prototype, "sku", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: Date, nullable: true }),
    __metadata("design:type", Object)
], MenuItem.prototype, "expiryDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], MenuItem.prototype, "dosage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], MenuItem.prototype, "turnaround", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], MenuItem.prototype, "dailyMarketPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], MenuItem.prototype, "garmentType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], MenuItem.prototype, "conditionJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', default: () => "'[]'" }),
    __metadata("design:type", Array)
], MenuItem.prototype, "dietaryTags", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], MenuItem.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], MenuItem.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], MenuItem.prototype, "updatedAt", void 0);
exports.MenuItem = MenuItem = __decorate([
    (0, typeorm_1.Entity)({ schema: 'catalog' })
], MenuItem);
//# sourceMappingURL=menu-item.entity.js.map