import { ChargebackStatus, FaultParty } from '@ore/contracts';
/** Doc §Payment — bank/PSP-initiated chargeback: freeze → evidence → won/lost. One per order. */
export declare class Chargeback {
    id: string;
    orderId: string;
    reference: string;
    amountPesewas: number;
    reason: string;
    evidenceKeys: string[] | null;
    status: ChargebackStatus;
    fault: FaultParty | null;
    feesPesewas: number;
    refundedPesewas: number;
    note: string | null;
    decidedBy: string | null;
    decidedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=chargeback.entity.d.ts.map