/** Fleet partner legal profile. Fleet-linked riders inherit settlement/tax treatment from here. */
export declare class FleetPartner {
    id: string;
    name: string;
    contractType: string;
    residentStatus: string;
    settlementMethod: string;
    status: string;
    taxProfileJson: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=fleet-partner.entity.d.ts.map