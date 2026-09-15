import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { DispatchService } from './dispatch.service';
import { AuthGuard, CurrentUser, Internal, Roles, RequirePermission } from '@ore/core';
import { JwtPayload } from '@ore/core';
import {
  Role, RiderCodStatus, RiderCodTier, RiderStatus, VehicleType,
  adminAssignSchema, codBlockSchema, codStatusSchema, codTierSchema, createRiderBlockSchema,
  patchRiderProfileSchema, pickupSchema, riderAvailabilityBodySchema, riderIdentifierCorrectionSchema,
  riderIncidentSchema, riderPauseSchema, riderSessionSchema, registerRiderSchema, setRiderVerifiedSchema,
  deliveryPartnerTaxProfileUpsertSchema, performanceConfigUpsertSchema, performanceCorrectionSchema, performanceHistorySearchSchema,
  performanceReviewRunSchema, riderIncidentAttributionSchema,
} from '@ore/contracts';

@Controller()
export class DispatchController {
  constructor(private readonly dispatch: DispatchService) {}

  @Get('internal/riders/by-user/:userId')
  @Internal()
  riderByUser(@Param('userId') userId: string) {
    return this.dispatch.riderByUserId(userId);
  }

  @Get('internal/riders/list')
  @Internal()
  riderList() {
    return this.dispatch.riderList();
  }

  @Get('internal/riders/:id')
  @Internal()
  riderById(@Param('id') id: string) {
    return this.dispatch.riderById(id);
  }

  /**
   * Every leg worked on an order, with what each leg is owed.
   *
   * The ledger needs this at settlement because rider pay is per-assignment: a laundry order
   * has two legs worked by two riders, and paying only the rider present at delivery left the
   * collection rider unpaid.
   */
  @Get('internal/orders/:orderId/assignments')
  @Internal()
  orderAssignments(@Param('orderId') orderId: string) {
    return this.dispatch.assignmentsForOrder(orderId);
  }

  /** Ledger confirms it has credited this leg. Idempotent — first stamp wins. */
  @Post('internal/assignments/:id/earnings-posted')
  @Internal()
  markEarningsPosted(@Param('id') id: string) {
    return this.dispatch.markEarningsPosted(id);
  }

  @Post('riders')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER, Role.ADMIN)
  register(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    const dto = registerRiderSchema.parse(body);
    return this.dispatch.registerRider(user, dto);
  }

  @Get('riders/me')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER)
  profile(@CurrentUser() user: JwtPayload) {
    return this.dispatch.riderForUser(user);
  }

  @Patch('riders/me')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER)
  updateProfile(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    const dto = patchRiderProfileSchema.parse(body);
    return this.dispatch.updateRiderProfile(user, { vehicle: dto.vehicle as VehicleType, licensePlate: dto.licensePlate });
  }

  @Post('riders/me/availability')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER)
  availability(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    const dto = riderAvailabilityBodySchema.parse(body);
    return this.dispatch.setAvailability(user, dto.status as RiderStatus.AVAILABLE | RiderStatus.OFFLINE);
  }

  @Post('riders/me/pause')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER)
  pause(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    const dto = riderPauseSchema.parse(body);
    return this.dispatch.pauseRider(user, dto.minutes);
  }

  @Post('riders/me/resume')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER)
  resume(@CurrentUser() user: JwtPayload) {
    return this.dispatch.resumeRider(user);
  }

  @Post('riders/me/incidents')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER)
  incident(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    return this.dispatch.createIncident(user, riderIncidentSchema.parse(body));
  }

  @Post('riders/me/session/extend')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER)
  extendSession(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    const dto = riderSessionSchema.parse(body);
    return this.dispatch.extendSession(user, dto.durationMin);
  }

  @Get('riders/me/offers')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER)
  offers(@CurrentUser() user: JwtPayload) {
    return this.dispatch.riderForUser(user).then((r) => this.dispatch.pendingOffers(r.id));
  }

  @Post('offers/:id/accept')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  acceptOffer(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.dispatch.riderForUser(user).then((r) => this.dispatch.acceptOffer(r.id, id));
  }

  @Post('offers/:id/decline')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  declineOffer(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.dispatch.riderForUser(user).then((r) => this.dispatch.declineOffer(r.id, id));
  }

  @Get('riders/me/tasks')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER)
  task(@CurrentUser() user: JwtPayload) {
    return this.dispatch.riderForUser(user).then((r) => this.dispatch.task(r.id));
  }

  @Get('riders/me/demand-zones')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER)
  demandZones(@CurrentUser() user: JwtPayload) {
    return this.dispatch.riderForUser(user).then((r) => this.dispatch.demandZones(r.id));
  }

  @Get('riders/me/peak-pay')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER)
  peakPay(@CurrentUser() user: JwtPayload) {
    return this.dispatch.riderForUser(user).then((r) => this.dispatch.riderPeakPay(r.id));
  }

  @Get('riders/me/blocks')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER)
  listBlocks(@CurrentUser() user: JwtPayload) {
    return this.dispatch.riderForUser(user).then((r) => this.dispatch.listRiderBlocks(r.id));
  }

  @Post('riders/me/blocks')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER)
  createBlock(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    return this.dispatch.createRiderBlock(user, createRiderBlockSchema.parse(body));
  }

  @Delete('riders/me/blocks/:id')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER)
  cancelBlock(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.dispatch.cancelRiderBlock(user, id);
  }

  @Get('riders/me/performance')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER)
  performance(@CurrentUser() user: JwtPayload) {
    return this.dispatch.riderForUser(user).then((r) => this.dispatch.performance(r.id));
  }

  @Get('admin/performance/riders/configs')
  @RequirePermission('rider.performance.config')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  riderPerformanceConfigs() {
    return this.dispatch.listRiderPerformanceConfigs();
  }

  @Post('admin/performance/riders/configs')
  @RequirePermission('rider.performance.config')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  upsertRiderPerformanceConfig(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    return this.dispatch.upsertRiderPerformanceConfig(user, performanceConfigUpsertSchema.parse(body));
  }

  @Get('admin/performance/riders/history')
  @RequirePermission('rider.performance.read')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  riderPerformanceHistory(
    @Query('riderId') riderId?: string,
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
    return this.dispatch.searchRiderPerformanceHistory(performanceHistorySearchSchema.parse({ subjectId: riderId, status, reviewer, metricCategory, incidentType, action, outcome, periodStart, periodEnd, limit }));
  }

  @Post('admin/riders/:id/performance/reviews')
  @RequirePermission('rider.performance.manage')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  runRiderPerformanceReview(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    return this.dispatch.runRiderPerformanceReview(id, user, performanceReviewRunSchema.parse(body));
  }

  @Post('admin/riders/:id/performance/corrections')
  @RequirePermission('rider.performance.manage')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  correctRiderPerformance(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    return this.dispatch.recordRiderPerformanceCorrection(id, user, performanceCorrectionSchema.parse(body));
  }

  @Post('admin/rider-incidents/:id/classification')
  @RequirePermission('rider.performance.manage')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  classifyRiderIncident(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    return this.dispatch.classifyRiderIncident(user, id, riderIncidentAttributionSchema.parse(body));
  }

  @Get('admin/riders')
  @RequirePermission('rider.list')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  adminRiders(@Query('q') q?: string) {
    return this.dispatch.riderList(q);
  }

  @Get('admin/riders/:id/identifier/audit')
  @RequirePermission('rider.location.history')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  riderIdentifierAudit(@Param('id') id: string) {
    return this.dispatch.riderIdentifierAudit(id);
  }

  @Post('admin/riders/:id/approve')
  @RequirePermission('rider.approve')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  approveRider(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    const dto = setRiderVerifiedSchema.parse(body ?? {});
    return this.dispatch.approveRider(user, id, dto.verified, dto.approvedOperatingLocationId);
  }

  @Patch('admin/riders/:id/tax-profile')
  @RequirePermission('tax.profile.manage')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  setRiderTaxProfile(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    return this.dispatch.setRiderTaxProfile(user, id, deliveryPartnerTaxProfileUpsertSchema.parse(body));
  }

  @Post('admin/riders/:id/identifier/correction')
  @RequirePermission('rider.identifier.correct')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  correctRiderIdentifier(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    return this.dispatch.correctRiderIdentifier(user, id, riderIdentifierCorrectionSchema.parse(body));
  }

  @Post('admin/riders/:id/cod-block')
  @RequirePermission('rider.cod.manage')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  codBlock(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    const dto = codBlockSchema.parse(body);
    return this.dispatch.setCodBlock(user, id, dto.blocked);
  }

  @Post('admin/riders/:id/cod-tier')
  @RequirePermission('rider.tier.set')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  codTier(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    const dto = codTierSchema.parse(body);
    return this.dispatch.setCodTier(user, id, dto.tier as RiderCodTier, dto.reason);
  }

  @Post('admin/riders/:id/cod-status')
  @RequirePermission('rider.cod.manage')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  codStatus(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    const dto = codStatusSchema.parse(body);
    return this.dispatch.setCodStatus(user, id, dto.status as RiderCodStatus, dto.reason);
  }

  @Post('admin/orders/:orderId/assign')
  @RequirePermission('ops.dispatch.manual')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  adminAssign(@CurrentUser() user: JwtPayload, @Param('orderId') orderId: string, @Body() body: unknown) {
    const dto = adminAssignSchema.parse(body);
    return this.dispatch.adminAssign(user, orderId, dto.riderId, dto.reason);
  }

  @Post('orders/:id/release')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER)
  release(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.dispatch.releaseByRider(user, id);
  }

  @Post('orders/:id/skip')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER)
  skip(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    const reason = (body as any)?.reason || 'Skipped by rider';
    return this.dispatch.skipOrderFromBatch(user, id, reason);
  }

  @Post('orders/:id/picked-up')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER)
  pickedUp(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    const dto = pickupSchema.parse(body);
    return this.dispatch.riderForUser(user).then((r) => this.dispatch.confirmPickup(r.id, id, dto.riderLat, dto.riderLng));
  }

  @Post('orders/:id/errand-arrived')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER)
  errandArrived(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    const dto = pickupSchema.parse(body);
    return this.dispatch.riderForUser(user).then((r) => this.dispatch.confirmErrandArrival(r.id, id, dto.riderLat, dto.riderLng));
  }

  @Post('orders/:id/laundry-handoff')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER)
  laundryHandoff(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    const dto = pickupSchema.parse(body);
    return this.dispatch.riderForUser(user).then((r) => this.dispatch.confirmLaundryHandoff(r.id, id, dto.riderLat, dto.riderLng));
  }
}
