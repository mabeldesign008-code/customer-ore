"use strict";
/** Consistent error envelope: { error: { code, message, statusCode, traceId } } */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
const zod_1 = require("zod");
const Sentry = __importStar(require("@sentry/nestjs"));
const trace_1 = require("./trace");
let AllExceptionsFilter = class AllExceptionsFilter {
    logger = new common_1.Logger('Exceptions');
    catch(exception, host) {
        const res = host.switchToHttp().getResponse();
        const req = host.switchToHttp().getRequest();
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let code = 'INTERNAL_ERROR';
        if (exception instanceof zod_1.ZodError) {
            status = common_1.HttpStatus.BAD_REQUEST;
            code = 'BAD_REQUEST';
            message = exception.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ') || 'Invalid request';
        }
        else if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const body = exception.getResponse();
            if (typeof body === 'string')
                message = body;
            else if (body && typeof body === 'object') {
                const b = body;
                message = Array.isArray(b.message) ? b.message.join('; ') : (b.message ?? b.error ?? 'Error');
            }
            code = status === 400 ? 'BAD_REQUEST' : status === 401 ? 'UNAUTHORIZED' : status === 403 ? 'FORBIDDEN' : status === 404 ? 'NOT_FOUND' : status === 409 ? 'CONFLICT' : status === 413 ? 'PAYLOAD_TOO_LARGE' : status === 429 ? 'RATE_LIMIT_EXCEEDED' : 'HTTP_ERROR';
        }
        else if (exception instanceof Error) {
            this.logger.error(exception.message, exception.stack);
            // Send 500-level errors to Sentry
            if (status >= 500) {
                Sentry.captureException(exception, {
                    contexts: {
                        http: {
                            method: req.method,
                            url: req.url,
                            headers: req.headers,
                        },
                    },
                    tags: {
                        traceId: (0, trace_1.traceId)() || (0, trace_1.requestId)(),
                    },
                });
            }
            message = 'Internal server error';
            code = 'INTERNAL_ERROR';
        }
        // Guards (auth) reject before the telemetry interceptor seeds the ALS context,
        // so fall back to the edge-minted correlation header when present.
        const headerRid = req.headers?.['x-request-id'];
        const traceIdValue = (0, trace_1.traceId)() || (0, trace_1.requestId)() || headerRid || '';
        void res.status(status).send({
            error: { code, message, statusCode: status, ...(traceIdValue ? { traceId: traceIdValue } : {}) },
        });
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = __decorate([
    (0, common_1.Catch)()
], AllExceptionsFilter);
//# sourceMappingURL=filter.js.map