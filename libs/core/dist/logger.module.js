"use strict";
/** Pino structured logging with trace context integration */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OreLoggerModule = void 0;
const common_1 = require("@nestjs/common");
const nestjs_pino_1 = require("nestjs-pino");
const trace_1 = require("./trace");
let OreLoggerModule = class OreLoggerModule {
};
exports.OreLoggerModule = OreLoggerModule;
exports.OreLoggerModule = OreLoggerModule = __decorate([
    (0, common_1.Module)({
        imports: [
            nestjs_pino_1.LoggerModule.forRoot({
                pinoHttp: {
                    // Inject trace context into every log
                    customProps: () => ({
                        traceId: (0, trace_1.traceId)(),
                        requestId: (0, trace_1.requestId)(),
                    }),
                    // Structured JSON in production, pretty-print in development
                    transport: process.env.NODE_ENV === 'production'
                        ? undefined
                        : {
                            target: 'pino-pretty',
                            options: {
                                colorize: true,
                                translateTime: 'HH:MM:ss.l',
                                ignore: 'pid,hostname',
                                singleLine: false,
                            },
                        },
                    // Log level based on environment
                    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
                    // Customize serializers
                    serializers: {
                        req: (req) => ({
                            method: req.method,
                            url: req.url,
                            headers: {
                                'user-agent': req.headers['user-agent'],
                                'x-request-id': req.headers['x-request-id'],
                            },
                        }),
                        res: (res) => ({
                            statusCode: res.statusCode,
                        }),
                    },
                    // Auto-log HTTP requests
                    // Redact sensitive headers and fields
                    redact: {
                        paths: ['req.headers.authorization', 'req.headers.cookie', 'req.headers["x-ore-internal-key"]', 'req.headers["x-ore-internal-mac"]'],
                        censor: '[REDACTED]',
                    },
                    autoLogging: {
                        ignore: (req) => req.url === '/health' || req.url === '/metrics',
                    },
                    // Custom log level for HTTP requests
                    customLogLevel: (req, res, err) => {
                        if (res.statusCode >= 500 || err)
                            return 'error';
                        if (res.statusCode >= 400)
                            return 'warn';
                        if (res.statusCode >= 300)
                            return 'info';
                        return 'debug';
                    },
                },
            }),
        ],
        exports: [nestjs_pino_1.LoggerModule],
    })
], OreLoggerModule);
//# sourceMappingURL=logger.module.js.map