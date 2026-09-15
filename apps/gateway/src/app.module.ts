import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { OreCoreModule, AuthGuard, PermissionGuard, AllExceptionsFilter } from '@ore/core';
import { HealthController } from './health.controller';
import { FlagsController } from './flags.controller';

/**
 * NOTE: this module used to register no APP_GUARD at all. `FlagsController` declared
 * `@Roles(Role.ADMIN)`, but with no global AuthGuard the only thing that ran was its own
 * `@UseGuards(AuthGuard)` — which verifies the JWT and then checks `@Roles` itself, so
 * the role gate happened to work by accident. Registering both guards globally makes it
 * deliberate and lets `@RequirePermission` work here like everywhere else.
 */
@Module({
  imports: [OreCoreModule.forRoot('gateway')],
  controllers: [HealthController, FlagsController],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
