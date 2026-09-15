import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { AuthGuard, CurrentUser, Roles, internalFetch, serviceUrl, RequirePermission, requireDualControl, remainingDailyCap } from '@ore/core';
import { JwtPayload } from '@ore/core';
import {
  adminCustomerCreditSchema, FaultParty, RefundMethod, Role,
  loyaltyRedeemSchema, openChargebackSchema, openDisputeSchema, remittanceSchema,
  releaseVendorReserveSchema, requestVendorWithdrawalSchema, resolveChargebackSchema,
  resolveDisputeSchema, vendorSettlementReverseSchema, verifyRemittanceSchema,
  withdrawalRequestSchema, walletAdjustSchema,
} from '@ore/contracts';

@Controller('ledger')
export class LedgerController {
  constructor(private readonly ledger: LedgerService) {}

  // ── admin dashboard analytics ──────────────────────────────────────
  @Get('admin/analytics')
  @RequirePermission('ledger.analytics.read')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  analytics(@Query('period') period?: string) {
    return this.ledger.adminAnalytics(period || 'week');
  }

  @Get('orders/:orderId/breakdown')
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER, Role.ADMIN)
  breakdown(@CurrentUser() user: JwtPayload, @Param('orderId') orderId: string) {
    return this.ledger.breakdownFor(user, orderId);
  }

  @Get('orders/:orderId/entries')
  @RequirePermission('ledger.journal.read')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  entries(@Param('orderId') orderId: string) {
    return this.ledger.orderEntries(orderId);
  }

  // ── rider wallet (doc §5) ─────────────────────────────────────────
  @Get('wallet/me')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER)
  async myWallet(@CurrentUser() user: JwtPayload) {
    const rider = await this.riderForUser(user.sub);
    return this.ledger.walletView(rider.id);
  }

  @Get('wallet/me/statement')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER)
  async myWalletStatement(@CurrentUser() user: JwtPayload) {
    const rider = await this.riderForUser(user.sub);
    return this.ledger.riderStatement(rider.id);
  }

  @Post('wallet/me/withdrawals')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER)
  async requestWithdrawal(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    const dto = withdrawalRequestSchema.parse(body);
    const rider = await this.riderForUser(user.sub);
    await this.assertNoWithdrawalHold(rider.id);
    
    // BOLA defense: Ensure destination contains the rider's phone number
    const normalizedDest = dto.destination.replace(/\D/g, '');
    let normalizedPhone = rider.phone.replace(/\D/g, '');
    if (normalizedPhone.startsWith('233')) normalizedPhone = normalizedPhone.slice(3);
    else if (normalizedPhone.startsWith('0')) normalizedPhone = normalizedPhone.slice(1);
    
    if (!normalizedDest.includes(normalizedPhone)) {
        throw new BadRequestException('Recipient account must belong to the registered rider (BOLA prevention). Phone mismatch.');
    }

    return this.ledger.requestWithdrawal(rider.id, dto);
  }

  /**
   * Refuse a withdrawal when a compliance hold covers it.
   *
   * Fails closed: if auth cannot be reached the withdrawal is refused, because the alternative
   * is that an outage becomes a way to pay out someone who was deliberately stopped. That is
   * the same trade `StandingService` makes, for the same reason.
   */
  private async assertNoWithdrawalHold(riderId: string): Promise<void> {
    const res = await internalFetch(
      `${serviceUrl('auth')}/auth/internal/holds/withdrawal/RIDER/${encodeURIComponent(riderId)}`,
    ).catch(() => null);
    if (!res || !res.ok) {
      throw new ForbiddenException('We could not verify your account status right now. Please try again in a moment.');
    }
    const block = (await res.json()) as { blocked: boolean; reason: string | null };
    if (block.blocked) {
      throw new ForbiddenException(`Withdrawals are on hold: ${block.reason ?? 'please contact support'}`);
    }
  }

  @Get('wallet/me/withdrawals')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER)
  async myWithdrawals(@CurrentUser() user: JwtPayload) {
    const rider = await this.riderForUser(user.sub);
    return this.ledger.listWithdrawals(rider.id);
  }

  // ── remittance (G38) ──────────────────────────────────────────────
  @Post('riders/me/remit')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER)
  async remit(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    const dto = remittanceSchema.parse(body);
    const rider = await this.riderForUser(user.sub);
    return this.ledger.remit(rider.id, dto.amountPesewas);
  }

  @Get('riders/:riderId/balance')
  @UseGuards(AuthGuard)
  @Roles(Role.RIDER, Role.ADMIN)
  async balance(@CurrentUser() user: JwtPayload, @Param('riderId') riderId: string) {
    if (user.role === Role.RIDER) {
      const me = await this.riderForUser(user.sub);
      if (me.id !== riderId) throw new ForbiddenException('Not your wallet');
    }
    return this.ledger.balanceFor(riderId);
  }

  @Post('admin/riders/:riderId/remit/verify')
  @RequirePermission('finance.remit.verify')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  verifyRemittance(@CurrentUser() user: JwtPayload, @Param('riderId') riderId: string, @Body() body: unknown) {
    const dto = verifyRemittanceSchema.parse(body);
    // ⚖ Money arriving on a rider's balance is dual-controlled: one admin confirming a
    // cash remittance they also collected is how cash walks out of the business.
    return requireDualControl(
      {
        kind: 'remit.verify',
        permission: 'finance.remit.verify',
        service: 'ledger',
        resourceType: 'rider',
        resourceId: riderId,
        amountPesewas: dto.amountPesewas,
        payload: { riderId, amountPesewas: dto.amountPesewas },
        reason: null,
        makerUserId: user.sub,
        makerAdminRole: user.adminRole ?? null,
      },
      user.sub,
      () => this.ledger.verifyRiderRemittance(user.sub, riderId, dto.amountPesewas),
    );
  }

  // ── admin wallet / withdrawals (doc §5: finance ops, audited) ─────
  @Get('admin/wallets')
  @RequirePermission('finance.wallet.read')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  wallets() {
    return this.ledger.adminListWallets();
  }

  @Get('admin/withdrawals')
  @RequirePermission('finance.withdrawal.read')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  withdrawals(@Query('status') status?: string) {
    return this.ledger.adminListWithdrawals(status as never);
  }

  @Post('admin/withdrawals/:id/approve')
  @RequirePermission('finance.withdrawal.approve')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  approveWithdrawal(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    // ⚖ This is the endpoint that fires a real Paystack transfer. The executionRef is
    // derived from the withdrawal id, so a retry lands on the same approval row and the
    // UNIQUE(executionRef) constraint is what stops a second transfer.
    return this.ledger
      .adminListWithdrawals()
      .then((rows) => rows.find((r) => r.id === id))
      .then((w) =>
        requireDualControl(
          {
            kind: 'withdrawal.approve',
            permission: 'finance.withdrawal.approve',
            service: 'ledger',
            resourceType: 'rider_withdrawal',
            resourceId: id,
            amountPesewas: Number(w?.amountPesewas ?? 0),
            payload: { withdrawalId: id, amountPesewas: Number(w?.amountPesewas ?? 0) },
            reason: null,
            makerUserId: user.sub,
            makerAdminRole: user.adminRole ?? null,
          },
          user.sub,
          () => this.ledger.approveWithdrawal(user.sub, id),
        ),
      );
  }

  @Post('admin/withdrawals/:id/reject')
  @RequirePermission('finance.withdrawal.reject')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  rejectWithdrawal(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: { note?: string }) {
    return this.ledger.rejectWithdrawal(user.sub, id, body.note);
  }

  @Post('admin/wallets/:riderId/adjust')
  @RequirePermission('finance.wallet.adjust')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  async adjust(@CurrentUser() user: JwtPayload, @Param('riderId') riderId: string, @Body() body: unknown) {
    const dto = walletAdjustSchema.parse(body);
    // A manual wallet adjustment writes money that no transaction produced. It is always
    // dual-controlled whatever the amount, needs a reason, and is capped per admin per day.
    const reason = (dto as { reason?: string }).reason?.trim();
    if (!reason || reason.length < 5) {
      throw new BadRequestException('A reason of at least 5 characters is required for a manual wallet adjustment');
    }
    const cap = Number.parseInt(process.env.WALLET_ADJUST_DAILY_CAP_PESEWAS || '0', 10);
    if (cap > 0) {
      const left = await remainingDailyCap(user.sub, 'wallet.adjust', cap);
      if (Math.abs(dto.amountPesewas) > left) {
        throw new ForbiddenException(
          `Daily wallet-adjustment cap reached: ${left} pesewas left of ${cap} today`,
        );
      }
    }
    return requireDualControl(
      {
        kind: 'wallet.adjust',
        permission: 'finance.wallet.adjust',
        service: 'ledger',
        resourceType: 'rider',
        resourceId: riderId,
        amountPesewas: Math.abs(dto.amountPesewas),
        payload: { riderId, amountPesewas: dto.amountPesewas, reason },
        reason,
        forceApprovals: 2,
        forceRequiresSuper: true,
        makerUserId: user.sub,
        makerAdminRole: user.adminRole ?? null,
      },
      user.sub,
      () => this.ledger.adjustWallet(user.sub, riderId, dto),
    );
  }

  // ── vendor settlement (doc §4) ────────────────────────────────────
  @Get('vendors/me/balance')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  async myVendorBalance(@CurrentUser() user: JwtPayload) {
    const vendor = await this.vendorForUser(user.sub);
    return this.ledger.vendorBalanceFor(vendor.id);
  }

  @Get('vendors/me/statement')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  async myVendorStatement(@CurrentUser() user: JwtPayload, @Query('from') from?: string, @Query('to') to?: string) {
    const vendor = await this.vendorForUser(user.sub);
    return this.ledger.vendorStatement(vendor.id, from, to);
  }

  @Get('vendors/me/withdrawals')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR, Role.ADMIN)
  async myVendorWithdrawals(@CurrentUser() user: JwtPayload) {
    const vendor = await this.vendorForUser(user.sub);
    return this.ledger.listVendorWithdrawals(vendor.id);
  }

  @Post('vendors/me/withdrawals')
  @UseGuards(AuthGuard)
  @Roles(Role.VENDOR)
  async requestVendorWithdrawal(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    const dto = requestVendorWithdrawalSchema.parse(body);
    const vendor = await this.vendorForUser(user.sub);
    return this.ledger.requestVendorWithdrawal(vendor.id, dto.amountPesewas);
  }

  @Post('admin/vendors/settle')
  @RequirePermission('finance.settlement.run')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  settle() {
    return this.ledger.runVendorSettlements();
  }

  @Get('admin/vendors/settlements')
  @RequirePermission('finance.settlement.read')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  settlements(@Query('status') status?: string) {
    return this.ledger.adminListSettlements(status as never);
  }

  @Get('admin/vendors/settlements/:id')
  @RequirePermission('finance.settlement.read')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  settlement(@Param('id') id: string) {
    return this.ledger.adminListSettlements().then((rows) => rows.find((r) => r.id === id));
  }

  @Post('admin/vendors/settlements/:id/pay')
  @RequirePermission('finance.settlement.pay')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  paySettlement(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body?: { note?: string }) {
    // ⚖ Real money to a vendor's bank account.
    return this.ledger
      .adminListSettlements()
      .then((rows) => rows.find((r) => r.id === id))
      .then((st) =>
        requireDualControl(
          {
            kind: 'settlement.pay',
            permission: 'finance.settlement.pay',
            service: 'ledger',
            resourceType: 'vendor_settlement',
            resourceId: id,
            // VendorSettlement's real field is payoutPesewas — what actually goes to the
            // vendor, net of reserve. That is the number a checker needs to see.
            amountPesewas: Number(st?.payoutPesewas ?? 0),
            payload: { settlementId: id, amountPesewas: Number(st?.payoutPesewas ?? 0), note: body?.note ?? null },
            reason: body?.note ?? null,
            makerUserId: user.sub,
            makerAdminRole: user.adminRole ?? null,
          },
          user.sub,
          () => this.ledger.payVendorSettlement(user.sub, id, body?.note),
        ),
      );
  }

  @Post('admin/vendors/settlements/:id/reverse')
  @RequirePermission('finance.settlement.reverse')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  reverseSettlement(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    const dto = vendorSettlementReverseSchema.parse(body);
    // ⚖ Structural: reversing a settlement moves money back off a vendor.
    return requireDualControl(
      {
        kind: 'settlement.reverse',
        permission: 'finance.settlement.reverse',
        service: 'ledger',
        resourceType: 'vendor_settlement',
        resourceId: id,
        payload: { settlementId: id, reason: dto.reason },
        reason: dto.reason,
        forceApprovals: 2,
        forceRequiresSuper: true,
        makerUserId: user.sub,
        makerAdminRole: user.adminRole ?? null,
      },
      user.sub,
      () => this.ledger.reverseVendorSettlement(user.sub, id, dto.reason),
    );
  }

  @Post('admin/vendors/:vendorId/release-reserve')
  @RequirePermission('finance.reserve.release')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  releaseReserve(@CurrentUser() user: JwtPayload, @Param('vendorId') vendorId: string, @Body() body: unknown) {
    const dto = releaseVendorReserveSchema.parse(body);
    return requireDualControl(
      {
        kind: 'reserve.release',
        permission: 'finance.reserve.release',
        service: 'ledger',
        resourceType: 'vendor',
        resourceId: vendorId,
        amountPesewas: dto.amountPesewas,
        payload: { vendorId, amountPesewas: dto.amountPesewas, reason: dto.reason },
        reason: dto.reason,
        makerUserId: user.sub,
        makerAdminRole: user.adminRole ?? null,
      },
      user.sub,
      () => this.ledger.releaseVendorReserve(user.sub, vendorId, dto.amountPesewas, dto.reason),
    );
  }

  @Get('admin/vendors/:vendorId/statement')
  @RequirePermission('finance.settlement.read')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  vendorStatement(@Param('vendorId') vendorId: string) {
    return this.ledger.vendorStatement(vendorId);
  }

  // ── disputes / refunds / chargebacks (doc §Payment) ───────────────
  @Post('disputes')
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER)
  openDispute(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    const dto = openDisputeSchema.parse(body);
    return this.ledger.openDispute(user.sub, dto);
  }

  @Get('disputes/me')
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER)
  myDisputes(@CurrentUser() user: JwtPayload) {
    return this.ledger.listMyDisputes(user.sub);
  }

  @Get('admin/disputes')
  @RequirePermission('finance.dispute.read')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  adminDisputes(@Query('status') status?: string) {
    return this.ledger.adminListDisputes(status as never);
  }

  @Post('admin/disputes/:id/resolve')
  @RequirePermission('finance.dispute.resolve')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  async resolveDispute(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    const dto = resolveDisputeSchema.parse(body);
    // ⚖ A dispute resolution can refund a customer or penalise a vendor — both move money.
    // Resolve the FINAL amount before the approval: a `refund_full` has no dto amount,
    // and tiering it at 0 let one non-super signature approve a refund of any size
    // (audit F-SEC-9).
    const amountPesewas = await this.ledger.disputeResolutionAmount(id, dto as { decision?: string; amountPesewas?: number });
    return requireDualControl(
      {
        kind: 'dispute.resolve',
        permission: 'finance.dispute.resolve',
        service: 'ledger',
        resourceType: 'dispute',
        resourceId: id,
        amountPesewas,
        payload: { disputeId: id, ...dto },
        reason: (dto as { note?: string }).note ?? null,
        makerUserId: user.sub,
        makerAdminRole: user.adminRole ?? null,
      },
      user.sub,
      () =>
        this.ledger.resolveDispute(user.sub, id, {
          ...dto,
          fault: dto.fault as FaultParty | undefined,
          refundMethod: dto.refundMethod as RefundMethod | undefined,
        }),
    );
  }

  // ── customer wallet credit (doc §Payment: refund priority = wallet first) ──
  @Get('customers/me/credit')
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER)
  myCredit(@CurrentUser() user: JwtPayload) {
    return this.ledger.customerCreditStatement(user.sub);
  }

  @Get('customers/me/loyalty')
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER)
  myLoyalty(@CurrentUser() user: JwtPayload) {
    return this.ledger.loyaltyView(user.sub);
  }

  @Post('customers/me/loyalty/redeem')
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER)
  redeemLoyalty(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    const dto = loyaltyRedeemSchema.parse(body);
    return this.ledger.redeemLoyalty(user.sub, dto.points);
  }

  @Get('admin/customers/:userId/credit')
  @RequirePermission('customer.wallet.read')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  adminCredit(@Param('userId') userId: string) {
    return this.ledger.customerCreditStatement(userId);
  }

  @Post('admin/customers/:userId/credit')
  @RequirePermission('customer.credit.grant')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  grantCredit(@CurrentUser() user: JwtPayload, @Param('userId') userId: string, @Body() body: unknown) {
    const dto = adminCustomerCreditSchema.parse(body);
    // ⚖ Customer credit is a liability the platform owes back. Granting it to yourself
    // and spending it is a free-money loop, so it needs a second signature.
    return requireDualControl(
      {
        kind: 'credit.grant',
        permission: 'customer.credit.grant',
        service: 'ledger',
        resourceType: 'customer_credit',
        resourceId: userId,
        amountPesewas: dto.amountPesewas,
        payload: { userId, amountPesewas: dto.amountPesewas, reason: dto.reason },
        reason: dto.reason,
        makerUserId: user.sub,
        makerAdminRole: user.adminRole ?? null,
      },
      user.sub,
      () => this.ledger.adminCreditCustomer(user.sub, userId, dto.amountPesewas, dto.reason),
    );
  }

  // ── chargebacks (doc §Payment) ────────────────────────────────────
  @Post('admin/chargebacks')
  @RequirePermission('finance.chargeback.open')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  openChargeback(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    const dto = openChargebackSchema.parse(body);
    return this.ledger.openChargeback(user.sub, dto);
  }

  @Get('admin/chargebacks')
  @RequirePermission('finance.chargeback.read')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  adminChargebacks(@Query('status') status?: string) {
    return this.ledger.adminListChargebacks(status as never);
  }

  @Post('admin/chargebacks/:id/resolve')
  @RequirePermission('finance.chargeback.resolve')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  async resolveChargeback(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    const dto = resolveChargebackSchema.parse(body);
    // A `lost` chargeback moves the full claim amount — resolved from the chargeback
    // row, not the (absent) dto amount, so the approval tiers at the real value
    // (audit F-SEC-9).
    const amountPesewas = await this.ledger.chargebackResolutionAmount(id, dto as { outcome?: string });
    return requireDualControl(
      {
        kind: 'chargeback.resolve',
        permission: 'finance.chargeback.resolve',
        service: 'ledger',
        resourceType: 'chargeback',
        resourceId: id,
        amountPesewas,
        payload: { chargebackId: id, ...dto },
        reason: (dto as { note?: string }).note ?? null,
        makerUserId: user.sub,
        makerAdminRole: user.adminRole ?? null,
      },
      user.sub,
      () => this.ledger.resolveChargeback(user.sub, id, { ...dto, fault: dto.fault as FaultParty | undefined }),
    );
  }

  // ── reconciliation (G28/G30) ──────────────────────────────────────
  @Post('admin/reconcile')
  @RequirePermission('ledger.reconcile.run')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  reconcile() {
    return this.ledger.reconcile();
  }

  @Get('admin/reconciliation/latest')
  @RequirePermission('ledger.reconcile.read')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  latest() {
    return this.ledger.latestReconcile();
  }

  private async riderForUser(userId: string): Promise<{ id: string; phone: string }> {
    const res = await internalFetch(`${serviceUrl('dispatch')}/internal/riders/by-user/${userId}`);
    if (!res.ok) throw new Error('Rider profile not found');
    return (await res.json()) as { id: string; phone: string };
  }

  private async vendorForUser(userId: string): Promise<{ id: string; name: string }> {
    const res = await internalFetch(`${serviceUrl('catalog')}/internal/vendors?ownerId=${userId}`);
    if (!res.ok) throw new Error('Vendor profile not found');
    const vendors = (await res.json()) as { id: string; name: string }[];
    if (vendors.length === 0) throw new Error('Vendor profile not found');
    return vendors[0];
  }
}
