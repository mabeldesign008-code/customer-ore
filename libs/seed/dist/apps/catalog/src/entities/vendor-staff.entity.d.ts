export type VendorStaffRole = 'MANAGER' | 'ORDER_OPERATOR' | 'CATALOG_EDITOR' | 'FINANCE_VIEWER';
/** Staff access is attached to the existing Vendor auth role and scoped to one Vendor. */
export declare class VendorStaff {
    id: string;
    vendorId: string;
    userId: string;
    displayName: string;
    phone: string | null;
    staffRole: VendorStaffRole;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=vendor-staff.entity.d.ts.map