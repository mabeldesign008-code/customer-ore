import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { typeOrmForRoot } from '@ore/db';
import { BaselineCart1750000000000 } from './migrations/1750000000000-BaselineCart';
import { AddSelectedOptionsToCart1760000000005 } from './migrations/1760000000005-AddSelectedOptionsToCart';
import { OreCoreModule, AuthGuard, PermissionGuard, AllExceptionsFilter, idempotencyProvider } from '@ore/core';
import { HealthController } from './health.controller';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { CheckoutService } from './checkout.service';
import { Cart, CartItem } from './entities';

@Module({
  imports: [
    OreCoreModule.forRoot('cart'),
    typeOrmForRoot({
      schema: 'cart',
      entities: [Cart, CartItem],
      migrations: [BaselineCart1750000000000, AddSelectedOptionsToCart1760000000005],
    }),
    TypeOrmModule.forFeature([Cart, CartItem]),
  ],
  controllers: [CartController, HealthController],
  providers: [
    CartService,
    CheckoutService,
    ...idempotencyProvider('cart'),
    { provide: APP_GUARD, useClass: AuthGuard },
    // AuthGuard sets req.user, PermissionGuard decides allow/deny. Order matters.
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
