import { DisputeReason, DisputeStatus, FaultParty, RefundMethod } from '@ore/contracts';
/** Doc §Payment — customer-raised dispute on a delivered order. One per order. */
export declare class Dispute {
    id: string;
    orderId: string;
    customerId: string;
    vendorId: string;
    reason: DisputeReason;
    description: string;
    evidenceKeys: string[] | null;
    status: DisputeStatus;
    fault: FaultParty | null;
    decisionPesewas: number;
    refundedPesewas: number;
    refundMethod: RefundMethod | null;
    note: string | null;
    decidedBy: string | null;
    decidedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=dispute.entity.d.ts.map