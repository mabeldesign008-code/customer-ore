import { VendorSettlementStatus } from '@ore/contracts';
/** Weekly settlement cycle for a vendor (doc §4): Mon cutoff, min GHS 100,
 *  rolling reserve held, payout via Paystack Transfers. */
export declare class VendorSettlement {
    id: string;
    vendorId: string;
    cycleStart: Date;
    cycleEnd: Date;
    grossPesewas: number;
    debtAppliedPesewas: number;
    reservePesewas: number;
    payoutPesewas: number;
    status: VendorSettlementStatus;
    transferReference: string | null;
    note: string | null;
    paidAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=vendor-settlement.entity.d.ts.map