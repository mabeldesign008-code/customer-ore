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
exports.DeliveryPartnerProfile = void 0;
const typeorm_1 = require("typeorm");
/** Legal/settlement profile used for tax/WHT classification; rider status is not employment status. */
let DeliveryPartnerProfile = class DeliveryPartnerProfile {
    id;
    type;
    userId;
    fleetPartnerId;
    vehicle;
    zoneId;
    settlementMethod;
    contractType;
    residentStatus;
    status;
    taxProfileJson;
    createdAt;
    updatedAt;
};
exports.DeliveryPartnerProfile = DeliveryPartnerProfile;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], DeliveryPartnerProfile.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], DeliveryPartnerProfile.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], DeliveryPartnerProfile.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], DeliveryPartnerProfile.prototype, "fleetPartnerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], DeliveryPartnerProfile.prototype, "vehicle", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], DeliveryPartnerProfile.prototype, "zoneId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'PAYSTACK_TRANSFER' }),
    __metadata("design:type", String)
], DeliveryPartnerProfile.prototype, "settlementMethod", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'INDEPENDENT_DELIVERY_PARTNER' }),
    __metadata("design:type", String)
], DeliveryPartnerProfile.prototype, "contractType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'UNKNOWN' }),
    __metadata("design:type", String)
], DeliveryPartnerProfile.prototype, "residentStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'ACTIVE' }),
    __metadata("design:type", String)
], DeliveryPartnerProfile.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], DeliveryPartnerProfile.prototype, "taxProfileJson", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], DeliveryPartnerProfile.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], DeliveryPartnerProfile.prototype, "updatedAt", void 0);
exports.DeliveryPartnerProfile = DeliveryPartnerProfile = __decorate([
    (0, typeorm_1.Entity)({ schema: 'dispatch' }),
    (0, typeorm_1.Index)(['userId']),
    (0, typeorm_1.Index)(['fleetPartnerId'])
], DeliveryPartnerProfile);
//# sourceMappingURL=delivery-partner.entity.js.map