/** Generic POS/webhook bridge connection; external adapters can build on this contract. */
export declare class VendorPosConnection {
    id: string;
    vendorId: string;
    provider: string;
    externalStoreId: string | null;
    tokenHash: string;
    active: boolean;
    lastReceivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=vendor-pos-connection.entity.d.ts.map