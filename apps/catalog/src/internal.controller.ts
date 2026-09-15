import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Internal } from '@ore/core';
import { CatalogService } from './catalog.service';
import { Vendor } from './entities';
import { onboardVendorSchema, reserveStockSchema } from '@ore/contracts';

/** Internal endpoints consumed by other services (cart/checkout, order vendor checks). */
@Controller('internal')
@Internal()
export class InternalController {
  constructor(
    private readonly catalog: CatalogService,
    @InjectRepository(Vendor) private readonly vendors: Repository<Vendor>,
  ) {}

  @Post('inventory/reserve')
  reserveStock(@Body() body: unknown) {
    const dto = reserveStockSchema.parse(body);
    return this.catalog.reserveStock(dto.orderId, dto.lines);
  }

  @Post('inventory/release')
  releaseStock(@Body() body: { orderId: string }) {
    return this.catalog.releaseStock(body.orderId);
  }

  @Post('inventory/consume')
  consumeStock(@Body() body: { orderId: string }) {
    return this.catalog.consumeStock(body.orderId);
  }

  @Get('items')
  items(@Query('ids') ids: string) {
    const list = ids.split(',').map((s) => s.trim()).filter(Boolean);
    return this.catalog.getItemsByIds(list);
  }

  @Get('item/:id')
  item(@Param('id') id: string) {
    return this.catalog.getItem(id);
  }

  @Get('vendors/:id/promotions/active')
  activePromotions(@Param('id') id: string) {
    return this.catalog.activePromotions(id);
  }

  @Get('promotions/by-code/:code')
  promotionByCode(@Param('code') code: string) {
    return this.catalog.promotionByCode(code);
  }

  @Post('promotions/redeem')
  redeemPromotion(@Body() body: { promotionId: string; orderId: string; discountPesewas: number; customerId?: string }) {
    return this.catalog.redeemPromotion(body.promotionId, body.orderId, body.discountPesewas, body.customerId);
  }

  @Post('promotions/release')
  releasePromotion(@Body() body: { orderId: string }) {
    return this.catalog.releasePromotion(body.orderId);
  }

  @Get('vendors/:id')
  vendorById(@Param('id') id: string) {
    return this.catalog.getVendorMeta(id);
  }

  /** Live kitchen signals so dispatch can time a rider's arrival to when food is actually ready. */
  @Get('vendors/:id/prep-signals')
  vendorPrepSignals(@Param('id') id: string) {
    return this.catalog.getVendorPrepSignals(id);
  }

  /** Ledger uses this to resolve the owning user for settlement notifications. */
  @Get('vendors/:id/owner')
  vendorOwner(@Param('id') id: string) {
    return this.vendors.findOne({ where: { id }, select: { id: true, ownerUserId: true } });
  }

  @Get('vendors/:id/payout')
  vendorPayout(@Param('id') id: string) {
    return this.vendors.findOne({ where: { id }, select: { id: true, payoutAccountJson: true } });
  }

  /** Ledger uses this to classify Ore-paid vendor incentives without inferring residency. */
  @Get('vendors/:id/tax-profile')
  vendorTaxProfile(@Param('id') id: string) {
    return this.catalog.getVendorTaxProfile(id);
  }

  /** Onboarding calls this on approval — creates the approved vendor (doc: no orders before approval). */
  @Post('vendors/onboard')
  onboard(@Body() body: unknown) {
    const dto = onboardVendorSchema.parse(body);
    return this.catalog.onboardVendor(dto);
  }

  @Get('vendors')
  byOwner(@Query('ownerId') ownerId: string) {
    return this.catalog.getVendorsForUser(ownerId);
  }
}
