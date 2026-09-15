import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CartService } from './cart.service';
import { CheckoutService } from './checkout.service';
import { AuthGuard, CurrentUser, Roles } from '@ore/core';
import { JwtPayload } from '@ore/core';
import { Role, addCartItemSchema, checkoutSchema, reorderSchema } from '@ore/contracts';
import { CartIdempotencyInterceptor } from './idempotency';

@Controller('cart')
@UseGuards(AuthGuard)
export class CartController {
  constructor(
    private readonly cart: CartService,
    private readonly checkoutService: CheckoutService,
  ) {}

  @Get('estimate')
  estimate(
    @CurrentUser() user: JwtPayload,
    @Query('lat') latRaw: string,
    @Query('lng') lngRaw: string,
  ) {
    const lat = Number(latRaw);
    const lng = Number(lngRaw);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new BadRequestException('Valid latitude and longitude are required');
    }
    return this.checkoutService.estimate(user.sub, lat, lng);
  }

  @Get()
  get(@CurrentUser() user: JwtPayload) {
    return this.cart.getCart(user.sub);
  }

  @Post('items')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  add(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    const dto = addCartItemSchema.parse(body);
    return this.cart.addItem(user.sub, dto.itemId, dto.qty, dto.modifiers, dto.selectedOptions);
  }

  @Patch('items/:lineId')
  update(@CurrentUser() user: JwtPayload, @Param('lineId') lineId: string, @Query('qty', ParseIntPipe) qty: number) {
    return this.cart.updateLine(user.sub, lineId, qty);
  }

  @Delete('items/:lineId')
  remove(@CurrentUser() user: JwtPayload, @Param('lineId') lineId: string) {
    return this.cart.updateLine(user.sub, lineId, 0);
  }

  @Delete()
  clear(@CurrentUser() user: JwtPayload) {
    return this.cart.clear(user.sub);
  }

  @Post('reorder')
  @Roles(Role.CUSTOMER)
  reorder(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    const dto = reorderSchema.parse(body);
    return this.cart.reorder(user.sub, dto.orderId);
  }

  @Post('checkout')
  @UseInterceptors(CartIdempotencyInterceptor)
  @Throttle({ default: { limit: 10, ttl: 3600000 } })
  checkout(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    const dto = checkoutSchema.parse(body);
    return this.checkoutService.checkout(user.sub, user.phone, dto);
  }
}
