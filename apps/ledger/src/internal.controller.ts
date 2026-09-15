/** Internal endpoints consumed by cart and referral. Require x-ore-internal-key. Never via the gateway. */
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Internal } from '@ore/core';
import { LedgerService } from './ledger.service';

@Controller('internal/ledger')
@Internal()
export class LedgerInternalController {
  constructor(private readonly ledger: LedgerService) {}

  @Get('customers/:userId/credit')
  customerCredit(@Param('userId') userId: string) {
    return this.ledger.customerCreditFor(userId);
  }

  @Post('customers/:userId/credit/spend')
  spend(@Param('userId') userId: string, @Body() body: { amountPesewas: number; ref: string }) {
    return this.ledger.spendCustomerCredit(userId, body.amountPesewas, body.ref);
  }

  /** Referral service grants rewards — idempotent by ref, optional 14-day expiry (doc §8). */
  @Post('customers/:userId/credit')
  credit(@Param('userId') userId: string, @Body() body: { amountPesewas: number; ref: string; reason: string; expiryDays?: number | null; kind?: string }) {
    return this.ledger.creditCustomerWallet(userId, body.amountPesewas, body.ref, body.reason, {
      expiryDays: body.expiryDays ?? undefined,
      kind: body.kind ?? 'referral',
    });
  }

  /** Referral service checks "non-refunded" before qualifying (doc §8). */
  @Get('orders/:orderId/refunded')
  refunded(@Param('orderId') orderId: string) {
    return this.ledger.isOrderRefunded(orderId);
  }
}
