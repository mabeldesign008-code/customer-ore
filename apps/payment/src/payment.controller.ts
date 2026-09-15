import { BadRequestException, Body, Controller, Get, Headers, HttpCode, HttpStatus, Inject, Param, Post, Req, UseGuards, UseInterceptors, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard, CurrentUser, Internal, ORE_ENV, Public, RequireStanding, Roles } from '@ore/core';
import { JwtPayload } from '@ore/core';
import { OreEnv, isAllowedWebhookIp } from '@ore/config';
import {
  Role,
  initializePaymentSchema, internalRefundSchema, transferSchema, vendorTransferSchema,
} from '@ore/contracts';
import { PaymentService } from './payment.service';
import { WebhookService } from './webhook.service';
import { RefundService } from './refund.service';
import { PaymentIdempotencyInterceptor } from './idempotency';

interface RawRequest {
  rawBody?: Buffer;
  body?: unknown;
}

@Controller()
export class PaymentController {
  constructor(
    private readonly payments: PaymentService,
    private readonly webhook: WebhookService,
    private readonly refunds: RefundService,
    @Inject(ORE_ENV) private readonly env: OreEnv,
  ) {}

  // Internal — cart checkout initializes the single charge (G37)
  @Post('internal/payments/initialize')
  @Internal()
  @UseInterceptors(PaymentIdempotencyInterceptor)
  initialize(@Body() body: unknown) {
    const dto = initializePaymentSchema.parse(body);
    return this.payments.initialize(dto);
  }

  // NOTE: customer wallet top-up endpoints were intentionally removed. Customers never top up —
  // they pay at checkout. The wallet only ever receives refunds (see ledger CustomerCredit).

  // Public — Paystack posts here. Signature checked against the RAW body (G06).
  @Post('payments/webhook/paystack')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async handleWebhook(
    @Req() req: RawRequest,
    @Headers('x-paystack-signature') signature: string | undefined,
    @Req() request: any,
  ) {
    // Paystack source-IP allowlist (doc §3).
    //
    // Two fixes here (audit M-1). It was gated on `process.env.PAYSTACK_MODE !== 'mock'`,
    // so a process that came up in mock mode — the exact misconfiguration loadEnv refuses
    // in production — skipped source-IP checking altogether. The check is now unconditional:
    // loopback and RFC1918 are always permitted by `isAllowedWebhookIp`, so local and
    // in-cluster deliveries (including the mock flow) still work without the escape hatch.
    //
    // It also read process.env directly, bypassing loadEnv, and normalised only loopback
    // out of Node's IPv4-mapped IPv6 form (`::ffff:52.31.139.75`) — a genuine Paystack
    // delivery over IPv6 transport would have been rejected for being on the list.
    const ip = request.ip || request.connection?.remoteAddress || request.socket?.remoteAddress;
    if (!isAllowedWebhookIp(ip, this.env.paystackWebhookAllowedIps)) {
      throw new BadRequestException('Invalid webhook source IP');
    }
    if (!req.rawBody) throw new BadRequestException('Raw webhook body is required');
    return this.webhook.handleWebhook(req.rawBody, signature);
  }

  // Mock-mode only — simulate Paystack charging the customer (full pipeline incl. signature).
  //
  // Was @Public(): an unauthenticated money-creating endpoint. The service still refuses
  // outside mock mode (404 in production or PAYSTACK_MODE=live), but the route itself now
  // requires the internal service key, so a misconfigured deployment cannot expose it.
  // Dev tooling reaches it with the shared INTERNAL_SERVICE_KEY like every other internal
  // route; the Flutter apps never call it.
  @Post('payments/mock/complete')
  @Internal()
  mockComplete(@Body() body: { reference: string }) {
    return this.payments.mockComplete(body.reference);
  }

  /** Internal: the payment behind one vendor-order (support AI). */
  @Get('internal/payments/order/:orderId')
  @Internal()
  byOrder(@Param('orderId') orderId: string) {
    return this.payments.paymentForOrder(orderId);
  }

  /**
   * Internal: payment truth for one checkout (audit S-1, consumer re-verification).
   * The ledger and order consumers call this before acting on a `payment.charge_succeeded`
   * bus event: the envelope signature proves where an event came from, this proves the
   * underlying money actually moved. Always 200 — `found:false` is a normal answer, and
   * consumers refuse on anything but `status === 'SUCCESS'`.
   */
  @Get('internal/payments/checkout/:checkoutId')
  @Internal()
  checkoutStatus(@Param('checkoutId') checkoutId: string) {
    return this.payments.checkoutStatus(checkoutId);
  }

  /**
   * Internal: refunds recorded for one order (audit S-1). The ledger verifies a
   * `payment.refund_processed` event against these rows before crediting a wallet —
   * a forged refund event must not be able to mint customer credit.
   */
  @Get('internal/payments/refunds/:orderId')
  @Internal()
  refundsForOrder(@Param('orderId') orderId: string) {
    return this.payments.refundsForOrder(orderId);
  }

  @Get('internal/payments/transfers/:reference')
  @Internal()
  getTransferStatus(@Param('reference') reference: string) {
    return this.payments.getTransferStatus(reference);
  }

  @Get('internal/payments/settlements/report')
  @Internal()
  reconciliationReport(@Query('date') date: string) {
    if (!date) throw new BadRequestException('date is required');
    return this.payments.getReconciliationReport(date);
  }

  // Internal — ledger executes rider withdrawals through Paystack Transfers (doc §5)
  @Post('internal/payments/transfers')
  @Internal()
  transfer(@Body() body: unknown) {
    const dto = transferSchema.parse(body);
    return this.payments.transfer(dto);
  }

  @Post('internal/payments/vendor-transfers')
  @Internal()
  vendorTransfer(@Body() body: unknown) {
    const dto = vendorTransferSchema.parse(body);
    return this.payments.vendorTransfer(dto);
  }

  // Internal — ledger resolves disputes with refund-to-original-method (doc §Payment)
  @Post('internal/payments/refund')
  @Internal()
  internalRefund(@Body() body: unknown) {
    const dto = internalRefundSchema.parse(body);
    return this.refunds.refund(dto.orderId, dto.reason, dto.amountPesewas);
  }

  /**
   * Customer-facing refund request.
   *
   * Must go through `refundForUser`, which verifies the caller owns the order.
   * Wiring this to the unguarded `refunds.refund()` let any authenticated
   * customer refund ANY order in the system by putting its id in the body —
   * real money straight out of the Paystack account.
   */
  @Post('payments/refund')
  // A banned account must not be able to initiate money movement, even a refund of its own
  // order — that is exactly the lever a fraudster would pull on the way out.
  //
  // CUSTOMER only: admins settle refunds through the maker-checker flow
  // (`POST admin/refund-requests` → finance.refund.initiate/approve), which requires a
  // second, non-requesting admin to approve. Leaving this open to ADMIN let an admin
  // bypass ownership AND maker-checker on any order by putting its id in the body.
  @RequireStanding()
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER)
  refund(@CurrentUser() user: JwtPayload, @Body() body: { orderId: string; reason: string; amountPesewas?: number }) {
    return this.refunds.refundForUser(user, body.orderId, body.reason, body.amountPesewas);
  }
}
