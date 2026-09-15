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
exports.FleetPartner = void 0;
const typeorm_1 = require("typeorm");
/** Fleet partner legal profile. Fleet-linked riders inherit settlement/tax treatment from here. */
let FleetPartner = class FleetPartner {
    id;
    name;
    contractType;
    residentStatus;
    settlementMethod;
    status;
    taxProfileJson;
    createdAt;
    updatedAt;
};
exports.FleetPartner = FleetPartner;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], FleetPartner.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], FleetPartner.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'FLEET_DELIVERY_PARTNER' }),
    __metadata("design:type", String)
], FleetPartner.prototype, "contractType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'UNKNOWN' }),
    __metadata("design:type", String)
], FleetPartner.prototype, "residentStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'PAYSTACK_TRANSFER' }),
    __metadata("design:type", String)
], FleetPartner.prototype, "settlementMethod", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'ACTIVE' }),
    __metadata("design:type", String)
], FleetPartner.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], FleetPartner.prototype, "taxProfileJson", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], FleetPartner.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], FleetPartner.prototype, "updatedAt", void 0);
exports.FleetPartner = FleetPartner = __decorate([
    (0, typeorm_1.Entity)({ schema: 'dispatch' }),
    (0, typeorm_1.Index)(['name'])
], FleetPartner);
//# sourceMappingURL=fleet-partner.entity.js.map