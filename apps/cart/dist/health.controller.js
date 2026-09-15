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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@ore/core");
const typeorm_1 = require("typeorm");
let HealthController = class HealthController {
    ds;
    constructor(ds) {
        this.ds = ds;
    }
    health() {
        return { status: 'ok', service: 'cart', ts: new Date().toISOString() };
    }
    async ready() {
        const checks = {};
        if (this.ds) {
            try {
                await this.ds.query('SELECT 1');
                checks.db = true;
            }
            catch {
                checks.db = false;
            }
        }
        const ok = Object.values(checks).every(Boolean);
        const status = ok ? 'ok' : 'not_ready';
        return { status, service: 'cart', ts: new Date().toISOString(), checks };
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "health", null);
__decorate([
    (0, common_1.Get)('ready'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "ready", null);
exports.HealthController = HealthController = __decorate([
    (0, common_1.Controller)('health'),
    (0, core_1.Public)(),
    __param(0, (0, common_1.Optional)()),
    __param(0, (0, common_1.Inject)(typeorm_1.DataSource)),
    __metadata("design:paramtypes", [Object])
], HealthController);
//# sourceMappingURL=health.controller.js.map