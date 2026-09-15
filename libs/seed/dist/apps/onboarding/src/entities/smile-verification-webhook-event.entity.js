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
exports.SmileVerificationWebhookEvent = void 0;
const typeorm_1 = require("typeorm");
/** Dedupe ledger for at-least-once SmileID webhook delivery. */
let SmileVerificationWebhookEvent = class SmileVerificationWebhookEvent {
    id;
    eventHash;
    providerJobId;
    payloadJson;
    processed;
    createdAt;
};
exports.SmileVerificationWebhookEvent = SmileVerificationWebhookEvent;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SmileVerificationWebhookEvent.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SmileVerificationWebhookEvent.prototype, "eventHash", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SmileVerificationWebhookEvent.prototype, "providerJobId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json' }),
    __metadata("design:type", Object)
], SmileVerificationWebhookEvent.prototype, "payloadJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], SmileVerificationWebhookEvent.prototype, "processed", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], SmileVerificationWebhookEvent.prototype, "createdAt", void 0);
exports.SmileVerificationWebhookEvent = SmileVerificationWebhookEvent = __decorate([
    (0, typeorm_1.Entity)({ schema: 'onboarding' }),
    (0, typeorm_1.Index)(['eventHash'], { unique: true })
], SmileVerificationWebhookEvent);
//# sourceMappingURL=smile-verification-webhook-event.entity.js.map