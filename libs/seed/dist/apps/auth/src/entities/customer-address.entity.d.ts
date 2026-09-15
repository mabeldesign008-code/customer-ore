import { DeliveryAddressDto } from '@ore/contracts';
export declare class CustomerSavedAddress {
    id: string;
    customerId: string;
    label: string;
    addressJson: DeliveryAddressDto;
    isDefault: boolean;
    active: boolean;
    createdBy: string | null;
    updatedBy: string | null;
    createdAt: Date;
    updatedAt: Date;
}
export declare class CustomerAddressAudit {
    id: string;
    customerId: string;
    addressId: string | null;
    action: 'CREATED' | 'UPDATED' | 'DEACTIVATED' | 'SUPPORT_CORRECTION' | 'DEFAULT_CHANGED';
    actorId: string;
    actorRole: string;
    beforeJson: DeliveryAddressDto | null;
    afterJson: DeliveryAddressDto | null;
    reason: string | null;
    createdAt: Date;
}
//# sourceMappingURL=customer-address.entity.d.ts.map