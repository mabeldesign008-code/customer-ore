/** Sentry error tracking integration */
import { DynamicModule } from '@nestjs/common';
export interface SentryModuleOptions {
    dsn?: string;
    environment?: string;
    enabled?: boolean;
}
export declare class SentryModule {
    static forRoot(options?: SentryModuleOptions): DynamicModule;
}
//# sourceMappingURL=sentry.module.d.ts.map