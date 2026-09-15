/**
 * Refund maker-checker endpoints.
 *
 * The gateway maps /api/payment to the service root, so routes here are declared without
 * a 'payment' prefix — that is how PaymentController does it too. Declaring
 * @Controller('payment') made every path /api/payment/payment/... from outside.
 *
 *   POST /payment/admin/refund-requests          finance.refund.initiate  — raise
 *   GET  /payment/admin/refund-requests          finance.refund.initiate  — the queue
 *   GET  /payment/admin/refund-requests/:id      finance.refund.initiate
 *   POST /payment/admin/refund-requests/:id/approve   finance.refund.approve (⚖)
 *   POST /payment/admin/refund-requests/:id/reject    finance.refund.approve
 *   POST /payment/admin/refund-requests/:id/cancel    finance.refund.initiate
 *
 * The customer-facing raise path stays on `POST /payment/payments/refund-request`, which
 * verifies ownership through the same `refundForUser` ownership check the direct refund
 * uses. Customers never reach an approval endpoint.
 */
import { BadRequestException, Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser, RequirePermission, Roles } from '@ore/core';
import type { JwtPayload } from '@ore/core';
import { Role } from '@ore/contracts';
import { z } from 'zod';
import { RefundApprovalService } from './refund-approval.service';
import { RefundService } from './refund.service';

const refundTaxFields = {
  refundComponent: z.enum(['UNSPECIFIED', 'VENDOR_PRODUCT', 'ORE_COMMISSION', 'ORE_SERVICE_FEE', 'DELIVERY_FEE', 'PRIORITY_FEE', 'TIP', 'ERRAND_BUDGET']).optional(),
  originalTaxStatus: z.enum(['UNKNOWN', 'NOT_TAXED', 'TAXED_OPEN_PERIOD', 'TAXED_FILED_PERIOD']).optional(),
  taxPeriodStatus: z.enum(['OPEN', 'FILED', 'AMENDED', 'CLOSED']).optional(),
};

const raiseSchema = z.object({
  orderId: z.string().min(1),
  amountPesewas: z.number().int().positive(),
  reason: z.string().min(5),
  ...refundTaxFields,
});

const customerRaiseSchema = z.object({
  orderId: z.string().min(1),
  amountPesewas: z.number().int().positive().optional(),
  reason: z.string().min(5),
  ...refundTaxFields,
});

@Controller()
export class RefundApprovalController {
  constructor(
    private readonly approvals: RefundApprovalService,
    private readonly refunds: RefundService,
  ) {}

  @Post('admin/refund-requests')
  @RequirePermission('finance.refund.initiate')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  raise(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    const dto = raiseSchema.parse(body);
    return this.approvals.raise({ ...dto, raisedBy: 'admin', raisedByUserId: user.sub });
  }

  @Get('admin/refund-requests')
  @RequirePermission('finance.refund.initiate')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  async queue(@Query('status') status?: string) {
    const rows = await this.approvals.queue(status);
    // Attach what has already been refunded per order so an over-refund is visible in the
    // queue without opening each order.
    const totals = new Map<string, number>();
    for (const r of rows) {
      if (!totals.has(r.orderId)) totals.set(r.orderId, await this.approvals.refundedTotal(r.orderId));
    }
    return { requests: rows.map((r) => ({ ...r, alreadyRefundedPesewas: totals.get(r.orderId) ?? 0 })) };
  }

  @Get('admin/refund-requests/:id')
  @RequirePermission('finance.refund.initiate')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  one(@Param('id') id: string) {
    return this.approvals.one(id);
  }

  @Post('admin/refund-requests/:id/approve')
  @RequirePermission('finance.refund.approve')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  approve(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body?: { note?: string }) {
    return this.approvals.approve(user, id, body?.note);
  }

  @Post('admin/refund-requests/:id/reject')
  @RequirePermission('finance.refund.approve')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  reject(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.approvals.reject(user, id, body?.reason ?? '');
  }

  @Post('admin/refund-requests/:id/cancel')
  @RequirePermission('finance.refund.initiate')
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  cancel(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.approvals.cancel(id, user.sub);
  }

  /**
   * Customer-facing: ask for a refund. Ownership is checked by resolving the order
   * through the caller's own token, exactly like the existing direct-refund path — a
   * customer cannot raise a request against someone else's order.
   */
  @Post('payments/refund-request')
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER)
  async customerRaise(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    const dto = customerRaiseSchema.parse(body);
    // Reuse the ownership check rather than re-implementing it.
    const owned = await this.refunds.assertOwnsOrder(user, dto.orderId);
    if (!owned.amountPesewas && !dto.amountPesewas) {
      throw new BadRequestException('Could not determine the order amount; pass amountPesewas');
    }
    const amount = dto.amountPesewas ?? owned.amountPesewas;
    return this.approvals.raise({
      orderId: dto.orderId,
      amountPesewas: amount,
      reason: dto.reason,
      raisedBy: 'customer',
      raisedByUserId: user.sub,
    });
  }
}
