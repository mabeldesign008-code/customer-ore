import { BadRequestException, Body, Controller, Get, Headers, Param, ParseFloatPipe, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { CatalogService } from './catalog.service';

type CatalogReply = { type(contentType: string): CatalogReply; send(body: Buffer): unknown };
import { CatalogConsumers } from './catalog.consumers';
import { VendorPerformanceService } from './vendor-performance.service';
import { AuthGuard, CurrentUser, Public, Roles, RequirePermission } from '@ore/core';
import { JwtPayload } from '@ore/core';
import {
  Role, VendorPenaltyLevel,
  addMenuItemSchema, applyPenaltySchema, connectPosSchema, createStorySchema,
  createVendorLocationSchema, createVendorPromotionSchema, createVendorReviewSchema,
  createVendorSchema, addVendorStaffSchema, posWebhookSchema, redeemVoucherSchema,
  setVendorPlanSchema, vendorReviewResponseSchema, vendorTaxProfileUpsertSchema, performanceConfigUpsertSchema, performanceCorrectionSchema,
  performanceHistorySearchSchema, performanceReviewRunSchema,
} from '@ore/contracts';

@Controller()
export class CatalogController {
  constructor(
    private readonly catalog: CatalogService,
    private readonly sla: CatalogConsumers,
    private readonly vendorPerformance: VendorPerformanceService,
  ) {}

  @Get('media')
  @Public()
  async media(@Query('key') key: string, @Res() response: CatalogReply) {
    const image = (key ?? '').startsWith('catalog-stories/')
      ? await this.catalog.readPublicStoryMedia(key ?? '')
      : (key ?? '').startsWith('vendor-media/')
        ? await this.catalog.readPublicVendorMedia(key ?? '')
        : await this.catalog.readPublicItemImage(key ?? '');
    return response.type(image.contentType).send(image.body);
  }

  @Get('vendors')
  @Public()
  listVendors(@Query('lat', ParseFloatPipe) lat: number, @Query('lng', ParseFloatPipe) lng: number, @Query('type') type?: string) {
    return this.catalog.listVendors(lat, lng, type);
  }

  /** Authenticated Vendor projection used by the Vendor mobile app. */
  @Get('vendors/me')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR)
  myVendor(@CurrentUser() user: JwtPayload) {
    return this.catalog.getMyVendor(user);
  }

  @Get('vendors/me/analytics')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR)
  analytics(@CurrentUser() user: JwtPayload, @Query('period') period?: string) {
    return this.catalog.getMyAnalytics(user, period ?? 'week');
  }

  @Get('vendors/:id/pos')
  @RequirePermission('catalog.pos.manage')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  pos(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.catalog.getPosConnection(user, id);
  }

  @Post('vendors/:id/pos')
  @RequirePermission('catalog.pos.manage')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  connectPos(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    const dto = connectPosSchema.parse(body);
    return this.catalog.connectPos(user, id, dto.provider, dto.externalStoreId);
  }

  @Post('vendors/:id/pos/disconnect')
  @RequirePermission('catalog.pos.manage')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  disconnectPos(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.catalog.disconnectPos(user, id);
  }

  @Post('pos/webhook/:connectionId')
  @Public()
  posWebhook(@Param('connectionId') connectionId: string, @Headers('x-ore-pos-token') token: string | undefined, @Body() body: unknown) {
    const dto = posWebhookSchema.parse(body);
    return this.catalog.handlePosWebhook(connectionId, token, dto);
  }

  @Get('vendors/:id/locations')
  @RequirePermission('catalog.vendor.manage')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  locations(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.catalog.listLocations(user, id);
  }

  @Post('vendors/:id/locations')
  @RequirePermission('catalog.vendor.manage')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  createLocation(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    const dto = createVendorLocationSchema.parse(body);
    return this.catalog.createLocation(user, id, dto);
  }

  @Patch('vendors/:id/locations/:locationId')
  @RequirePermission('catalog.vendor.manage')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  updateLocation(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Param('locationId') locationId: string, @Body() body: Record<string, unknown>) {
    return this.catalog.updateLocation(user, id, locationId, body as never);
  }

  @Post('vendors/:id/locations/:locationId/deactivate')
  @RequirePermission('catalog.vendor.manage')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  deactivateLocation(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Param('locationId') locationId: string) {
    return this.catalog.deactivateLocation(user, id, locationId);
  }

  @Get('vendors/:id/staff')
  @RequirePermission('vendor.staff.manage')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  staff(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.catalog.listStaff(user, id);
  }

  @Post('vendors/:id/staff')
  @RequirePermission('vendor.staff.manage')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  addStaff(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    const dto = addVendorStaffSchema.parse(body);
    return this.catalog.addStaff(user, id, dto);
  }

  @Patch('vendors/:id/staff/:staffId')
  @RequirePermission('vendor.staff.manage')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  setStaffActive(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Param('staffId') staffId: string, @Body() body: { active?: boolean }) {
    if (typeof body.active !== 'boolean') throw new BadRequestException('Staff active must be a boolean');
    return this.catalog.setStaffActive(user, id, staffId, body.active);
  }

  @Get('vendors/:id/categories')
  @RequirePermission('catalog.vendor.manage')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  categories(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.catalog.getVendorCategories(user, id);
  }

  @Patch('vendors/:id/categories/:category')
  @RequirePermission('catalog.vendor.manage')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  renameCategory(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Param('category') category: string, @Body() body: { name?: string }) {
    return this.catalog.renameVendorCategory(user, id, decodeURIComponent(category), body.name ?? '');
  }

  @Get('vendors/:id')
  @Public()
  vendor(@Param('id') id: string) {
    return this.catalog.getVendor(id);
  }

  @Get('search/items')
  @Public()
  search(@Query('q') q: string, @Query('lat', ParseFloatPipe) lat: number, @Query('lng', ParseFloatPipe) lng: number) {
    return this.catalog.searchItems(q, lat, lng);
  }

  @Post('vendors')
  @RequirePermission('catalog.vendor.manage')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  createVendor(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    const dto = createVendorSchema.parse(body);
    return this.catalog.createVendor(user, dto);
  }

  @Patch('vendors/:id')
  @RequirePermission('catalog.vendor.manage')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  updateVendor(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.catalog.updateVendor(user, id, body as never);
  }

  @Post('vendors/:id/items')
  @RequirePermission('catalog.item.manage')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  addItem(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const dto = addMenuItemSchema.parse(body);
    return this.catalog.addItem(user, id, dto);
  }

  @Patch('items/:id')
  @RequirePermission('catalog.item.manage')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  updateItem(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.catalog.updateItem(user, id, body as never);
  }

  @Post('vendors/:id/media/:kind')
  @RequirePermission('catalog.vendor.manage')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  uploadVendorMedia(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Param('kind') kind: string, @Body() body: { contentType?: string; dataBase64?: string }) {
    if (kind !== 'logo' && kind !== 'banner') throw new BadRequestException('Store media kind must be logo or banner');
    if (!body?.dataBase64?.trim()) throw new BadRequestException('Store media data is required');
    return this.catalog.uploadVendorMedia(user, id, kind, body.contentType ?? 'image/jpeg', body.dataBase64);
  }

  @Post('items/:id/media')
  @RequirePermission('catalog.item.manage')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  uploadItemMedia(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { contentType?: string; dataBase64?: string },
  ) {
    if (!body?.dataBase64?.trim()) throw new BadRequestException('Product image data is required');
    return this.catalog.uploadItemImage(user, id, body.contentType ?? 'image/jpeg', body.dataBase64);
  }

  // ── doc §4 plans / stories / penalties ───────────────────────────
  // Admin-only: the plan sets the vendor's commission tier (Premium = 25% discount), so
  // self-service upgrade let any vendor flip its own discount with no approval (audit
  // F-SEC-5). The permission matrix makes vendor.plan.set dual-control (DD).
  @Post('vendors/:id/plan')
  @RequirePermission('vendor.plan.set')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  setPlan(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    const dto = setVendorPlanSchema.parse(body);
    return this.catalog.setPlan(user.sub, id, dto.plan, user.role);
  }

  @Patch('admin/vendors/:id/tax-profile')
  @RequirePermission('tax.profile.manage')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  setVendorTaxProfile(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    return this.catalog.updateVendorTaxProfile(user, id, vendorTaxProfileUpsertSchema.parse(body));
  }

  @Post('vendors/:id/stories/media')
  @RequirePermission('catalog.story.moderate')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  uploadStoryMedia(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: { contentType?: string; dataBase64?: string }) {
    if (!body?.dataBase64?.trim()) throw new BadRequestException('Story image data is required');
    return this.catalog.uploadStoryMedia(user, id, body.contentType ?? 'image/jpeg', body.dataBase64);
  }

  @Post('vendors/:id/stories')
  @RequirePermission('catalog.story.moderate')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  createStory(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    const dto = createStorySchema.parse(body);
    return this.catalog.createStory(user.sub, id, dto, user.role);
  }

  @Get('stories')
  @Public()
  stories() {
    return this.catalog.activeStories();
  }

  @Get('customers/me/favourites')
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER)
  favourites(@CurrentUser() user: JwtPayload) {
    return this.catalog.listFavourites(user.sub);
  }

  @Post('customers/me/favourites')
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER)
  addFavourite(@CurrentUser() user: JwtPayload, @Body() body: { vendorId?: string }) {
    if (!body.vendorId) throw new BadRequestException('vendorId is required');
    return this.catalog.addFavourite(user.sub, body.vendorId);
  }

  @Post('customers/me/favourites/:vendorId/remove')
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER)
  removeFavourite(@CurrentUser() user: JwtPayload, @Param('vendorId') vendorId: string) {
    return this.catalog.removeFavourite(user.sub, vendorId);
  }

  @Get('vouchers/me')
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER)
  vouchers(@CurrentUser() user: JwtPayload) {
    return this.catalog.listVouchers(user.sub);
  }

  @Post('vouchers/redeem')
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER)
  redeemVoucher(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    return this.catalog.redeemVoucher(user.sub, redeemVoucherSchema.parse(body).code);
  }

  @Get('vendors/:id/promotions/active')
  @Public()
  activePromotions(@Param('id') id: string) {
    return this.catalog.publicActivePromotions(id);
  }

  @Get('vendors/:id/promotions')
  @RequirePermission('catalog.vendor.manage')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  promotions(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.catalog.listPromotions(user, id);
  }

  @Post('vendors/:id/promotions')
  @RequirePermission('catalog.vendor.manage')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  createPromotion(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    return this.catalog.createPromotion(user, id, createVendorPromotionSchema.parse(body));
  }

  @Get('vendors/:id/promotions/:promotionId/analytics')
  @RequirePermission('catalog.vendor.manage')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  promotionAnalytics(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Param('promotionId') promotionId: string) {
    return this.catalog.promotionAnalytics(user, id, promotionId);
  }

  @Patch('vendors/:id/promotions/:promotionId')
  @RequirePermission('catalog.vendor.manage')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  togglePromotion(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Param('promotionId') promotionId: string, @Body() body: { active?: boolean }) {
    if (typeof body.active !== 'boolean') throw new BadRequestException('Promotion active must be a boolean');
    return this.catalog.setPromotionActive(user, id, promotionId, body.active);
  }

  @Post('reviews')
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER)
  createReview(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    return this.catalog.createReview(user, createVendorReviewSchema.parse(body));
  }

  @Get('vendors/:id/reviews')
  @RequirePermission('catalog.review.moderate')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  reviews(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.catalog.listReviews(user, id);
  }

  @Post('reviews/:reviewId/response')
  @RequirePermission('catalog.review.moderate')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  reviewResponse(@CurrentUser() user: JwtPayload, @Param('reviewId') reviewId: string, @Body() body: unknown) {
    const dto = vendorReviewResponseSchema.parse(body);
    return this.catalog.respondToReview(user, reviewId, dto.response);
  }

  @Get('vendors/me/performance')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR)
  myPerformance(@CurrentUser() user: JwtPayload) {
    return this.vendorPerformance.myHistory(user);
  }

  @Get('vendors/:id/performance')
  @RequirePermission('vendor.performance.read')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  vendorPerformanceHistory(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.vendorPerformance.vendorHistory(user, id);
  }

  @Get('admin/performance/vendors/configs')
  @RequirePermission('vendor.performance.config')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  vendorPerformanceConfigs() {
    return this.vendorPerformance.listConfigs();
  }

  @Post('admin/performance/vendors/configs')
  @RequirePermission('vendor.performance.config')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  upsertVendorPerformanceConfig(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    return this.vendorPerformance.upsertConfig(user, performanceConfigUpsertSchema.parse(body));
  }

  @Get('admin/performance/vendors/history')
  @RequirePermission('vendor.performance.read')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  searchVendorPerformance(
    @Query('vendorId') vendorId?: string,
    @Query('status') status?: string,
    @Query('reviewer') reviewer?: string,
    @Query('metricCategory') metricCategory?: string,
    @Query('incidentType') incidentType?: string,
    @Query('action') action?: string,
    @Query('outcome') outcome?: string,
    @Query('periodStart') periodStart?: string,
    @Query('periodEnd') periodEnd?: string,
    @Query('limit') limit?: string,
  ) {
    return this.vendorPerformance.searchHistory(performanceHistorySearchSchema.parse({ subjectId: vendorId, status, reviewer, metricCategory, incidentType, action, outcome, periodStart, periodEnd, limit }));
  }

  @Post('admin/vendors/:id/performance/reviews')
  @RequirePermission('vendor.performance.manage')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  runVendorPerformanceReview(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    return this.vendorPerformance.runReview(id, user, performanceReviewRunSchema.parse(body));
  }

  @Post('admin/vendors/:id/performance/corrections')
  @RequirePermission('vendor.performance.manage')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  correctVendorPerformance(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    return this.vendorPerformance.recordCorrection(id, user, performanceCorrectionSchema.parse(body));
  }

  @Get('admin/penalties')
  @RequirePermission('vendor.sla.violations.read')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  penalties() {
    return this.sla.listPenalties();
  }

  @Get('admin/violations')
  @RequirePermission('vendor.sla.violations.read')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  violations() {
    return this.sla.listViolations();
  }

  @Post('admin/vendors/:id/penalties')
  @RequirePermission('vendor.penalty.apply')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  applyPenalty(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    const dto = applyPenaltySchema.parse(body);
    return this.sla.applyPenalty(id, dto.level as VendorPenaltyLevel, dto.trigger, dto.amountPesewas ?? 0, `admin:${user.sub}`, dto.note);
  }

  @Post('admin/penalties/:id/lift')
  @RequirePermission('vendor.penalty.lift')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  liftPenalty(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.sla.liftPenalty(user.sub, id);
  }
}
