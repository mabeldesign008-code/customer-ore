import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { executionRefFor, requireDualControl } from '@ore/core';
import type { JwtPayload } from '@ore/core';
import { RefundRequest } from './entities/refund-request.entity';
import { Refund } from './entities/refund.entity';
import { PaymentService } from './payment.service';

/**
 * Refund maker-checker.
 *
 * `finance.refund.initiate` raises a request. `finance.refund.approve` executes it — and
 * only through the dual-control gate, so the approver cannot be the person who raised it
 * and a large refund needs more than one signature.
 *
 * The refund itself is executed at most once: `executionRef` is derived from the request
 * id, and the auth approval table has a UNIQUE constraint on it. A replay after a crash
 * is rejected before Paystack is called a second time.
 */
@Injectable()
export class RefundApprovalService {
  private readonly logger = new Logger(RefundApprovalService.name);

  constructor(
    @InjectRepository(RefundRequest) private readonly requests: Repository<RefundRequest>,
    @InjectRepository(Refund) private readonly refunds: Repository<Refund>,
    private readonly payments: PaymentService,
  ) {}

  /** Raise a refund. Never pays anything. */
  async raise(input: {
    orderId: string;
    amountPesewas: number;
    reason: string;
    raisedBy?: 'admin' | 'customer';
    raisedByUserId?: string | null;
    refundComponent?: string;
    originalTaxStatus?: string;
    taxPeriodStatus?: 'OPEN' | 'FILED' | 'AMENDED' | 'CLOSED';
  }): Promise<RefundRequest> {
    if (!input.orderId) throw new BadRequestException('orderId is required');
    if (!Number.isFinite(input.amountPesewas) || input.amountPesewas <= 0) {
      throw new BadRequestException('amountPesewas must be a positive number');
    }
    const reason = (input.reason ?? '').trim();
    if (reason.length < 5) throw new BadRequestException('A reason of at least 5 characters is required');

    // One live request per order. Two concurrent requests for the same order would each
    // get their own approval and could each pay out.
    const open = await this.requests.findOne({
      where: { orderId: input.orderId, status: 'PENDING' },
      order: { createdAt: 'DESC' },
    });
    if (open) throw new ConflictException(`A refund request for this order is already pending (${open.id})`);

    return this.requests.save(
      this.requests.create({
        orderId: input.orderId,
        amountPesewas: Math.trunc(input.amountPesewas),
        reason,
        refundComponent: input.refundComponent ?? 'UNSPECIFIED',
        originalTaxStatus: input.originalTaxStatus ?? 'UNKNOWN',
        taxPeriodStatus: input.taxPeriodStatus ?? 'OPEN',
        raisedBy: input.raisedBy ?? 'admin',
        raisedByUserId: input.raisedByUserId ?? null,
        status: 'PENDING',
      }),
    );
  }

  async queue(status?: string): Promise<RefundRequest[]> {
    const qb = this.requests.createQueryBuilder('r').orderBy('r.createdAt', 'DESC').take(200);
    if (status) qb.andWhere('r.status = :status', { status });
    return qb.getMany();
  }

  async one(id: string): Promise<RefundRequest> {
    const row = await this.requests.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Refund request not found');
    return row;
  }

  /** Withdraw a request. Only the person who raised it. */
  async cancel(id: string, userId: string): Promise<RefundRequest> {
    const row = await this.one(id);
    if (row.raisedByUserId !== userId) throw new ForbiddenException('Only the person who raised it can withdraw it');
    if (row.status !== 'PENDING') throw new ConflictException(`Refund request is ${row.status}`);
    row.status = 'REJECTED';
    row.decidedBy = userId;
    row.decidedAt = new Date();
    row.decisionNote = 'withdrawn by maker';
    return this.requests.save(row);
  }

  /**
   * Approve and pay. Goes through the maker-checker gate, so:
   *   - the first call creates the approval and returns 409 with how many signatures remain
   *   - the caller who raised the request can never be the one who signs it off
   *   - once EXECUTED, every further call is refused
   */
  async approve(user: JwtPayload, id: string, note?: string): Promise<Refund | RefundRequest> {
    const row = await this.one(id);
    if (row.status === 'EXECUTED') {
      throw new ConflictException(`Already refunded (refund ${row.refundId}) — refusing to repeat it`);
    }
    if (row.status === 'REJECTED') {
      throw new ConflictException(`Rejected: ${row.decisionNote ?? 'no reason given'}`);
    }

    const executionRef = executionRefFor('refund.approve', row.id);

    return requireDualControl(
      {
        kind: 'refund.approve',
        permission: 'finance.refund.approve',
        service: 'payment',
        resourceType: 'refund_request',
        resourceId: row.id,
        amountPesewas: row.amountPesewas,
        // Frozen fields only. If the request row changed underneath us, the hash would
        // differ and the gate refuses — so an edit between ask and approve cannot pay.
        payload: {
          refundRequestId: row.id,
          orderId: row.orderId,
          amountPesewas: row.amountPesewas,
          reason: row.reason,
          refundComponent: row.refundComponent,
          originalTaxStatus: row.originalTaxStatus,
          taxPeriodStatus: row.taxPeriodStatus,
          note: note ?? null,
        },
        reason: row.reason,
        // The maker is the ADMIN who put this refund forward — never the customer who asked
        // for it.
        //
        // This read `row.raisedByUserId ?? user.sub`, which is right when an admin raised the
        // request and wrong the moment a customer did. `POST /payments/refund-request` lets any
        // customer raise one for the full order value, and that stored the customer as the maker.
        // The customer can never sign an admin approval, so the gate was left needing one
        // signature from anybody who was not the customer — and the finance admin calling
        // `approve` is exactly that. Their own signature closed the gate and the money went out.
        // One admin, acting alone, could approve and execute a refund of any size, on a request
        // they could invite the customer to raise. Compare `withdrawal.approve` and
        // `settlement.pay`, which both record the acting admin and therefore do need a second.
        makerUserId: row.raisedBy === 'admin' && row.raisedByUserId ? row.raisedByUserId : user.sub,
        makerAdminRole: null,
      },
      user.sub,
      async () => {
        const refund = await this.payments.refundOrder(row.orderId, row.reason, row.amountPesewas, {
          refundComponent: row.refundComponent,
          originalTaxStatus: row.originalTaxStatus,
          taxPeriodStatus: row.taxPeriodStatus,
        });
        row.status = 'EXECUTED';
        row.refundId = refund.id;
        row.decidedBy = user.sub;
        row.decidedAt = new Date();
        row.decisionNote = note ?? null;
        row.executionRef = executionRef;
        await this.requests.save(row);
        return refund;
      },
      // A refund that errored is not safe to blind-retry: Paystack may have taken it.
      { safeToRetryOnFailure: false },
    );
  }

  /**
   * Record an approval decision without executing. Used by the finance queue so a
   * rejection is visible to everyone, not just swallowed as a 409.
   */
  async reject(user: JwtPayload, id: string, reason: string): Promise<RefundRequest> {
    const row = await this.one(id);
    if (row.status !== 'PENDING') throw new ConflictException(`Refund request is ${row.status}`);
    if (row.raisedByUserId === user.sub) {
      throw new ForbiddenException('You cannot reject a refund request you raised');
    }
    if (!reason || reason.trim().length < 3) throw new BadRequestException('A reason is required to reject');
    row.status = 'REJECTED';
    row.decidedBy = user.sub;
    row.decidedAt = new Date();
    row.decisionNote = reason.trim();
    return this.requests.save(row);
  }

  /** Total refunded per order, so an over-refund is visible without leaving the service. */
  async refundedTotal(orderId: string): Promise<number> {
    const rows = await this.refunds.find({ where: { orderId } });
    return rows.reduce((sum, r) => sum + r.amountPesewas, 0);
  }
}
