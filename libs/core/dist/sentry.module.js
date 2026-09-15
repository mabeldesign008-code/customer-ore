"use strict";
/** Sentry error tracking integration */
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
var SentryModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SentryModule = void 0;
const common_1 = require("@nestjs/common");
const Sentry = __importStar(require("@sentry/nestjs"));
/** Load nodeProfilingIntegration only if the native binary is available. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function tryLoadProfiling() {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require('@sentry/profiling-node').nodeProfilingIntegration;
    }
    catch {
        return null;
    }
}
let SentryModule = SentryModule_1 = class SentryModule {
    static forRoot(options) {
        const dsn = options?.dsn || process.env.SENTRY_DSN;
        const environment = options?.environment || process.env.NODE_ENV || 'development';
        const enabled = options?.enabled ?? (!!dsn && environment === 'production');
        if (enabled && dsn) {
            const nodeProfilingIntegration = tryLoadProfiling();
            Sentry.init({
                dsn,
                environment,
                integrations: [
                    ...(nodeProfilingIntegration ? [nodeProfilingIntegration()] : []),
                    Sentry.httpIntegration(),
                    Sentry.nativeNodeFetchIntegration(),
                ],
                // Performance monitoring
                tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
                // Profiling
                profilesSampleRate: environment === 'production' ? 0.1 : 1.0,
                // Release tracking
                release: process.env.RELEASE_VERSION,
                // Filter out health checks and metrics endpoints
                beforeSend(event, hint) {
                    const url = hint?.originalException instanceof Error
                        ? undefined
                        : hint?.originalException?.config?.url;
                    if (url && (url.includes('/health') || url.includes('/metrics'))) {
                        return null;
                    }
                    return event;
                },
            });
        }
        return {
            module: SentryModule_1,
            providers: [
                {
                    provide: 'SENTRY_ENABLED',
                    useValue: enabled,
                },
            ],
            exports: ['SENTRY_ENABLED'],
        };
    }
};
exports.SentryModule = SentryModule;
exports.SentryModule = SentryModule = SentryModule_1 = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({})
], SentryModule);
//# sourceMappingURL=sentry.module.js.map