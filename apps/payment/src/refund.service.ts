/** Refunds — ownership checked for customers; internal callers skip this wrapper. */

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@ore/contracts';
import { JwtPayload, internalFetch, serviceUrl } from '@ore/core';
import { PaymentService } from './payment.service';

@Injectable()
export class RefundService {
  constructor(private readonly payments: PaymentService) {}

  refund(orderId: string, reason: string, amountPesewas?: number) {
    return this.payments.refundOrder(orderId, reason, amountPesewas);
  }

  /**
   * The single ownership check for every customer-initiated refund path — direct refund
   * and refund *request* both come through here. Keeping it in one place is the point:
   * an earlier version of this file had the check inlined once, and wiring a second
   * refund route to the unchecked `refund()` let any customer refund any order by id.
   *
   * Returns what the order was actually charged for, so a request can default to a full
   * refund without the caller guessing the amount.
   */
  async assertOwnsOrder(user: JwtPayload, orderId: string): Promise<{ orderId: string; amountPesewas: number }> {
    const res = await internalFetch(`${serviceUrl('order')}/internal/orders/${orderId}`);
    if (!res.ok) throw new NotFoundException('Order not found');
    const order = (await res.json()) as { customerId?: string; totalPesewas?: number };
    if (order.customerId !== user.sub) throw new ForbiddenException('Not your order');
    return { orderId, amountPesewas: Math.trunc(order.totalPesewas ?? 0) };
  }

  async refundForUser(user: JwtPayload, orderId: string, reason: string, amountPesewas?: number) {
    // The route is @Roles(CUSTOMER); refuse anything else outright rather than silently
    // skipping the ownership check — that skip was the admin-bypass in F-SEC-8.
    if (user.role !== Role.CUSTOMER) {
      throw new ForbiddenException('Customer-initiated refunds are for customer accounts; use the admin refund-requests flow');
    }
    await this.assertOwnsOrder(user, orderId);
    return this.payments.refundOrder(orderId, reason, amountPesewas);
  }
}
