"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const core_1 = require("@nestjs/core");
const db_1 = require("@ore/db");
const _1750000000000_BaselineCart_1 = require("./migrations/1750000000000-BaselineCart");
const _1760000000005_AddSelectedOptionsToCart_1 = require("./migrations/1760000000005-AddSelectedOptionsToCart");
const core_2 = require("@ore/core");
const health_controller_1 = require("./health.controller");
const cart_controller_1 = require("./cart.controller");
const cart_service_1 = require("./cart.service");
const checkout_service_1 = require("./checkout.service");
const entities_1 = require("./entities");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            core_2.OreCoreModule.forRoot('cart'),
            (0, db_1.typeOrmForRoot)({
                schema: 'cart',
                entities: [entities_1.Cart, entities_1.CartItem],
                migrations: [_1750000000000_BaselineCart_1.BaselineCart1750000000000, _1760000000005_AddSelectedOptionsToCart_1.AddSelectedOptionsToCart1760000000005],
            }),
            typeorm_1.TypeOrmModule.forFeature([entities_1.Cart, entities_1.CartItem]),
        ],
        controllers: [cart_controller_1.CartController, health_controller_1.HealthController],
        providers: [
            cart_service_1.CartService,
            checkout_service_1.CheckoutService,
            ...(0, core_2.idempotencyProvider)('cart'),
            { provide: core_1.APP_GUARD, useClass: core_2.AuthGuard },
            // AuthGuard sets req.user, PermissionGuard decides allow/deny. Order matters.
            { provide: core_1.APP_GUARD, useClass: core_2.PermissionGuard },
            { provide: core_1.APP_FILTER, useClass: core_2.AllExceptionsFilter },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map