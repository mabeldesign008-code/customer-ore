import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { OrderService } from './order.service';
import { AuthGuard, CurrentUser, Internal, Public, Roles, internalFetch, serviceUrl, RequirePermission , requireDualControl , RequireStanding } from '@ore/core';
import { JwtPayload } from '@ore/core';
import {
  OrderStatus, Role,
  adminCancelSchema, confirmGiftLocationSchema, confirmOtpSchema, orderAddressCorrectionSchema,
  createErrandSchema, createParcelSchema, errandReceiptSchema,
  errandSubDecisionSchema, errandSubstitutionSchema,
  forceStateSchema, laundryConditionPhotoSchema, laundryConditionSchema,
  laundryStageSchema, marketFulfillmentSchema, orderCancelSchema, orderDelaySchema,
  prescriptionReviewSchema, reportIssueSchema, resolveIssueSchema,
  uploadDeliveryProofSchema, uploadDeliverySignatureSchema, uploadPrescriptionSchema,
} from '@ore/contracts';

@Controller()
export class OrderController {
  constructor(private readonly orders: OrderService) {}

  // Internal: cart checkout creates N orders (G36)
  @Post('internal/orders')
  @Internal()
  create(@Body() body: { orders: Parameters<OrderService['createOrders']>[0] }) {
    return this.orders.createOrders(body.orders);
  }

  @Get('internal/orders')
  @Internal()
  listInternal(@Query('customerId') customerId?: string, @Query('limit') limit?: string) {
    if (customerId) return this.orders.customerOrders(customerId, limit ? Number(limit) : undefined);
    return [];
  }

  /** Internal: the audit timeline for an order (support AI). */
  @Get('internal/orders/:id/events')
  @Internal()
  orderEvents(@Param('id') id: string) {
    return this.orders.orderEvents(id);
  }

  @Get('internal/orders/checkout/:checkoutId')
  @Internal()
  byCheckout(@Param('checkoutId') checkoutId: string) {
    return this.orders.ordersByCheckout(checkoutId);
  }

  // Internal: dispatch persists distance-based rider payout
  @Post('internal/orders/:id/cancel')
  @Internal()
  cancelInternal(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.orders.cancelSystem(id, body.reason ?? 'internal cancellation');
  }

  @Post('internal/orders/:id/rider-fee')
  @Internal()
  riderFee(@Param('id') id: string, @Body() body: { riderFeePesewas: number; peakPayPesewas?: number; accumulate?: boolean }) {
    return this.orders.setRiderFee(id, body.riderFeePesewas, body.peakPayPesewas ?? 0, body.accumulate === true);
  }

  /** Cart checkout: redeem failed — restore full price so the order can still proceed. */
  @Post('internal/orders/:id/clear-promotion')
  @Internal()
  clearPromotion(@Param('id') id: string) {
    return this.orders.clearPromotion(id);
  }

  // Internal: dispatch + ledger read raw order rows
  @Get('internal/orders/:id')
  @Internal()
  rawOrder(@Param('id') id: string) {
    return this.orders.getRaw(id);
  }

  /** Internal: reveal a delivery OTP to another service (notification → gift recipient SMS). */
  @Post('internal/orders/:id/otp/reveal')
  @Internal()
  revealOtp(@Param('id') id: string) {
    return this.orders.revealOtpForService(id);
  }

  // Internal: dispatch grouping — orders ready for pickup (doc §2)
  @Get('internal/orders/ready')
  @Internal()
  readyOrders() {
    return this.orders.readyForDispatch();
  }

  // Internal: Delivery Matching Engine — includes preparing orders for the 10-minute grouping rule.
  @Get('internal/orders/dispatch-candidates')
  @Internal()
  dispatchCandidates() {
    return this.orders.dispatchCandidates();
  }

  /** Internal, privacy-safe marketing aggregates consumed by the notification service. */
  @Get('internal/marketing/customer-aggregates')
  @Internal()
  marketingAggregates() {
    return this.orders.marketingAggregates();
  }

  /** Internal, privacy-safe operational demand feed consumed by Dispatch. */
  @Get('internal/demand/orders')
  @Internal()
  demandOrders(@Query('from') from?: string, @Query('to') to?: string) {
    return this.orders.demandOrders(from, to);
  }

  @Get('internal/vendors/:vendorId/orders')
  @Internal()
  internalVendorOrders(@Param('vendorId') vendorId: string, @Query('status') status?: OrderStatus) {
    return this.orders.vendorOrdersForInternal(vendorId, status);
  }

  // Internal: cart confirms prepaid orders fully covered by wallet credit (no PSP charge)
  @Post('internal/orders/:checkoutId/confirm-credit')
  @Internal()
  confirmByCredit(@Param('checkoutId') checkoutId: string) {
    return this.orders.confirmOnPayment(checkoutId);
  }

  @Get('orders/:id')
  @UseGuards(AuthGuard)
  async get(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    // Orders store the Dispatch rider id, while JWT sub is the auth user id.
    // Resolve the projection before applying the rider ownership check.
    const riderId = user.role === Role.RIDER
      ? await this.riderIdFor(user.sub)
      : undefined;
    return this.orders.getOrder(id, user, riderId);
  }

  @Get('orders/:id/location-history')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER, Role.CUSTOMER, Role.VENDOR, Role.ADMIN)
  async locationHistory(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const riderId = user.role === Role.RIDER ? await this.riderIdFor(user.sub) : undefined;
    return this.orders.orderAddressHistory(id, user, riderId);
  }

  @Post('admin/orders/:id/address-correction')
  @RequirePermission('order.address.correct')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  correctAddress(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    const dto = orderAddressCorrectionSchema.parse(body);
    return this.orders.correctOrderAddress(id, user, dto.address, dto.reason, dto.source);
  }

  @Get('orders/:id/delivery-proof')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER, Role.CUSTOMER, Role.ADMIN)
  async getDeliveryProof(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const riderId = user.role === Role.RIDER ? await this.riderIdFor(user.sub) : undefined;
    return this.orders.getDeliveryProof(id, user, riderId);
  }

  @Post('orders/:id/prescription')
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER)
  uploadPrescription(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const dto = uploadPrescriptionSchema.parse(body);
    return this.orders.uploadPrescription(user.sub, id, dto.dataBase64, dto.contentType ?? 'application/pdf');
  }

  @Get('orders/:id/prescription')
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER, Role.VENDOR, Role.ADMIN)
  prescription(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.orders.getPrescription(id, user);
  }

  @Post('orders/:id/prescription/approve')
  @RequirePermission('order.prescription.decide')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  approvePrescription(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    const dto = prescriptionReviewSchema.parse(body ?? {});
    return this.orders.reviewPrescription(user, id, true, dto.note);
  }

  @Post('orders/:id/prescription/reject')
  @RequirePermission('order.prescription.decide')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  rejectPrescription(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    const dto = prescriptionReviewSchema.parse(body ?? {});
    return this.orders.reviewPrescription(user, id, false, dto.note);
  }

  @Post('orders/:id/issues')
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER, Role.VENDOR, Role.ADMIN)
  issue(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    const dto = reportIssueSchema.parse(body ?? {});
    return this.orders.reportIssue(user, id, dto.category ?? 'OTHER', dto.note);
  }

  @Get('orders/:id/issues')
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER, Role.VENDOR, Role.ADMIN)
  issues(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.orders.listIssues(user, id);
  }

  @Patch('orders/:id/issues/:issueId')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  resolveIssue(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Param('issueId') issueId: string, @Body() body: unknown) {
    const dto = resolveIssueSchema.parse(body ?? {});
    return this.orders.resolveIssue(user, id, issueId, dto.status ?? '', dto.note);
  }

  @Get('orders/:id/otp')
  @UseGuards(AuthGuard)
  otp(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.orders.getOtp(user, id);
  }

  @Get('customers/me/orders')
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER)
  mine(@CurrentUser() user: JwtPayload) {
    return this.orders.customerOrders(user.sub);
  }

  @Get('riders/me/orders')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER)
  async riderOrders(@CurrentUser() user: JwtPayload) {
    return this.orders.riderOrders(await this.riderIdFor(user.sub));
  }

  @Get('vendors/:vendorId/orders')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  vendorOrders(@CurrentUser() user: JwtPayload, @Param('vendorId') vendorId: string, @Query('status') status?: OrderStatus, @Query('q') query?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.orders.vendorOrders(user, vendorId, status, query, from, to);
  }

  @Post('orders/:id/accept')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  accept(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.orders.accept(user, id);
  }

  @Post('orders/:id/reject')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  reject(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.orders.reject(user, id, body.reason);
  }

  @Post('orders/:id/ready')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  ready(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.orders.markReady(user, id);
  }

  @Post('orders/:id/delayed')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  delayed(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    const dto = orderDelaySchema.parse(body);
    return this.orders.delay(user, id, dto);
  }

  @Post('orders/:id/market-fulfillment')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  marketFulfillment(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const dto = marketFulfillmentSchema.parse(body ?? {});
    return this.orders.recordMarketFulfillment(
      user,
      id,
      (dto.lines ?? []).map((l) => ({ ...l, actualPricePesewas: l.actualPricePesewas ?? undefined, note: l.note ?? undefined }))
    );
  }

  @Post('orders/:id/laundry-stage')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  laundryStage(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    const dto = laundryStageSchema.parse(body);
    return this.orders.updateLaundryStage(user, id, dto.stage);
  }

  @Post('orders/:id/laundry-condition')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  laundryCondition(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    const dto = laundryConditionSchema.parse(body);
    return this.orders.recordLaundryCondition(user, id, dto.condition);
  }

  @Post('orders/:id/laundry-condition/photos')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  laundryConditionPhoto(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const dto = laundryConditionPhotoSchema.parse(body);
    return this.orders.uploadLaundryConditionPhoto(user, id, dto.dataBase64, dto.contentType ?? 'image/jpeg');
  }

  @Get('orders/:id/laundry-condition/photos')
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER, Role.VENDOR, Role.ADMIN)
  laundryConditionPhotos(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.orders.getLaundryConditionPhotos(id, user);
  }

  // ── Gift / order-for-someone (doc §3 Case 2) ──────────────────────
  @Post('gifts/:token/confirm-location')
  @Public()
  confirmGift(@Param('token') token: string, @Body() body: unknown) {
    const dto = confirmGiftLocationSchema.parse(body);
    return this.orders.confirmGiftLocation(token, dto);
  }

  // ── Parcel / Courier (request-only) ───────────────────────────────
  @Post('orders/parcels')
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER)
  // A suspended or banned customer must not be able to create work for a rider. Checked
  // here rather than in the JWT so a suspension bites within seconds, not at token expiry.
  @RequireStanding()
  @Throttle({ default: { limit: 10, ttl: 3600000 } })
  createParcel(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    const dto = createParcelSchema.parse(body);
    return this.orders.createParcel(user.sub, dto);
  }

  // ── Errands (doc §Errands) ────────────────────────────────────────
  @Post('orders/errands')
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER)
  // A suspended or banned customer must not be able to create work for a rider. Checked
  // here rather than in the JWT so a suspension bites within seconds, not at token expiry.
  @RequireStanding()
  @Throttle({ default: { limit: 10, ttl: 3600000 } })
  createErrand(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    const dto = createErrandSchema.parse(body);
    return this.orders.createErrand(user.sub, user.phone, dto);
  }

  @Post('orders/:id/errand/shopping')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER)
  async errandShopping(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const rider = await this.riderIdFor(user.sub);
    return this.orders.markErrandShopping(rider, id);
  }

  @Post('orders/:id/errand/receipt')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER)
  async errandReceipt(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    const dto = errandReceiptSchema.parse(body);
    const rider = await this.riderIdFor(user.sub);
    return this.orders.submitErrandReceipt(rider, id, dto);
  }

  @Post('orders/:id/errand/ready-for-delivery')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER)
  async errandReadyForDelivery(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const rider = await this.riderIdFor(user.sub);
    return this.orders.readyErrandForDelivery(rider, id);
  }

  @Post('orders/:id/errand/substitution')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER)
  async errandSubstitution(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    const dto = errandSubstitutionSchema.parse(body);
    const rider = await this.riderIdFor(user.sub);
    return this.orders.requestErrandSubstitution(rider, id, dto);
  }

  @Post('orders/:id/errand/substitution-decision')
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER)
  errandSubDecision(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    const dto = errandSubDecisionSchema.parse(body);
    return this.orders.decideErrandSubstitution(user.sub, id, dto);
  }

  // CUSTOMER only: the service enforces ownership for customers, but the ADMIN branch
  // had no permission at all — any admin sub-role could cancel any order in the system,
  // bypassing the `order.cancel` permission the dedicated admin route enforces (audit
  // F-SEC-6). Admins use POST /admin/orders/:id/cancel.
  @Post('orders/:id/cancel')
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER)
  cancel(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    const dto = orderCancelSchema.parse(body ?? {});
    return this.orders.cancelByCustomer(user, id, dto.reason);
  }

  @Post('admin/orders/:id/cancel')
  @RequirePermission('order.cancel')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  adminCancel(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    const dto = adminCancelSchema.parse(body);
    return this.orders.cancelByAdmin(user.sub, id, dto.reason);
  }

  @Post('admin/orders/:id/force-state')
  @RequirePermission('order.force_state')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  forceState(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const dto = forceStateSchema.parse(body);
    // ⚖ Force-transitioning an order can trigger the delivery split in the ledger, so it
    // is dual-controlled: one admin must not be able to mark an order delivered alone.
    return requireDualControl(
      {
        kind: 'order.force_state',
        permission: 'order.force_state',
        service: 'order',
        resourceType: 'order',
        resourceId: id,
        payload: { orderId: id, targetStatus: dto.targetStatus, reason: dto.reason },
        reason: dto.reason,
        forceApprovals: 2,
        forceRequiresSuper: true,
        makerUserId: user.sub,
        makerAdminRole: user.adminRole ?? null,
      },
      user.sub,
      () => this.orders.adminForceStateTransition(id, dto.targetStatus as any, dto.reason, user.sub),
    );
  }

  @Get('admin/orders')
  @RequirePermission('order.list')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  adminOrders(@Query('limit') limit?: string, @Query('status') status?: string) {
    return this.orders.adminOrdersList(parseInt(limit || '50'), status);
  }

  @Post('orders/:id/confirm-otp')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER)
  async confirmOtp(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    const dto = confirmOtpSchema.parse(body);
    const rider = await this.riderIdFor(user.sub);
    return this.orders.confirmOtp(rider, id, dto.otp, dto.riderLat, dto.riderLng);
  }

  @Post('orders/:id/delivery-proof')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER)
  async deliveryProof(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const dto = uploadDeliveryProofSchema.parse(body);
    const rider = await this.riderIdFor(user.sub);
    return this.orders.uploadDeliveryProof(rider, id, dto.photoBase64, dto.contentType ?? 'image/jpeg');
  }

  @Post('orders/:id/delivery-signature')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER)
  async deliverySignature(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const dto = uploadDeliverySignatureSchema.parse(body);
    const rider = await this.riderIdFor(user.sub);
    return this.orders.uploadDeliverySignature(rider, id, dto.signatureBase64, dto.contentType ?? 'image/png');
  }

  /** JWT sub = auth user id; order.riderId = dispatch rider id → resolve via dispatch. */
  private async riderIdFor(userId: string): Promise<string> {
    const res = await internalFetch(`${serviceUrl('dispatch')}/internal/riders/by-user/${userId}`);
    if (!res.ok) throw new ForbiddenException('Rider profile not found');
    const rider = (await res.json()) as { id: string };
    return rider.id;
  }
}
