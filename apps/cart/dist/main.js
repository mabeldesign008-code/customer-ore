"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const platform_fastify_1 = require("@nestjs/platform-fastify");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
const core_2 = require("@ore/core");
const config_1 = require("@ore/config");
const nestjs_pino_1 = require("nestjs-pino");
async function bootstrap() {
    await (0, config_1.hydrateSecretsManager)();
    const env = (0, config_1.loadEnv)();
    const app = await core_1.NestFactory.create(app_module_1.AppModule, new platform_fastify_1.FastifyAdapter(), { bufferLogs: true });
    app.useLogger(app.get(nestjs_pino_1.Logger));
    app.enableCors({ origin: (0, config_1.corsOrigin)() });
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new core_2.AllExceptionsFilter());
    const port = env.servicePort('cart');
    await app.listen(port, '0.0.0.0');
    app.get(nestjs_pino_1.Logger).log(`cart-service listening on :${port}`);
}
void bootstrap();
//# sourceMappingURL=main.js.map