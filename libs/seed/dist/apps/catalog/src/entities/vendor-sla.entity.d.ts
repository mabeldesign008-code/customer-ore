import { VendorPenaltyLevel } from '@ore/contracts';
/** One SLA violation (doc §4: late accept / ready-too-early / cancel-after-accept). */
export declare class VendorSlaViolation {
    id: string;
    vendorId: string;
    type: string;
    orderId: string | null;
    severity: number;
    note: string | null;
    createdAt: Date;
    updatedAt: Date;
}
/** A penalty applied to a vendor (doc §4 ladder: warning → financial → suspension → permanent). */
export declare class VendorPenalty {
    id: string;
    vendorId: string;
    level: VendorPenaltyLevel;
    trigger: string;
    amountPesewas: number;
    note: string | null;
    decidedBy: string | null;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=vendor-sla.entity.d.ts.map