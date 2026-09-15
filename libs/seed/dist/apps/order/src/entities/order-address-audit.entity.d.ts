import { DeliveryAddressDto } from '@ore/contracts';
/** Append-only location history for support visibility, corrections and receiver confirmations. */
export declare class OrderAddressAudit {
    id: string;
    orderId: string;
    action: 'SNAPSHOT' | 'RECIPIENT_CONFIRMED' | 'SUPPORT_CORRECTION' | 'SYSTEM_NORMALIZATION';
    actorId: string | null;
    actorRole: string | null;
    source: string | null;
    beforeJson: DeliveryAddressDto | null;
    afterJson: DeliveryAddressDto;
    reason: string | null;
    createdAt: Date;
}
//# sourceMappingURL=order-address-audit.entity.d.ts.map