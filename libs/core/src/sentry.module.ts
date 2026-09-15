/** Sentry error tracking integration */

import { Module, DynamicModule, Global } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';

/** Load nodeProfilingIntegration only if the native binary is available. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function tryLoadProfiling(): (() => any) | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@sentry/profiling-node').nodeProfilingIntegration;
  } catch {
    return null;
  }
}

export interface SentryModuleOptions {
  dsn?: string;
  environment?: string;
  enabled?: boolean;
}

@Global()
@Module({})
export class SentryModule {
  static forRoot(options?: SentryModuleOptions): DynamicModule {
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
            : (hint?.originalException as any)?.config?.url;
          if (url && (url.includes('/health') || url.includes('/metrics'))) {
            return null;
          }
          return event;
        },
      });
    }

    return {
      module: SentryModule,
      providers: [
        {
          provide: 'SENTRY_ENABLED',
          useValue: enabled,
        },
      ],
      exports: ['SENTRY_ENABLED'],
    };
  }
}
