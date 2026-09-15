import { TaxPartyType } from '@ore/contracts';
export type DeliveryPartnerProfileType = 'INDEPENDENT_DELIVERY_PARTNER' | 'FLEET_DELIVERY_PARTNER';
/** Legal/settlement profile used for tax/WHT classification; rider status is not employment status. */
export declare class DeliveryPartnerProfile {
    id: string;
    type: DeliveryPartnerProfileType;
    userId: string | null;
    fleetPartnerId: string | null;
    vehicle: string | null;
    zoneId: string | null;
    settlementMethod: string;
    contractType: string;
    residentStatus: string;
    status: string;
    taxProfileJson: {
        supplierType?: TaxPartyType;
        notes?: string;
    } | null;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=delivery-partner.entity.d.ts.map