export declare class RiderIncident {
    id: string;
    riderId: string;
    orderId: string | null;
    type: string;
    note: string | null;
    lat: number | null;
    lng: number | null;
    status: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    attribution: string;
    excludedFromPerformance: boolean;
    exclusionReason: string | null;
    performanceImpact: boolean;
    reviewerId: string | null;
    reviewedAt: Date | null;
    outcome: string | null;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=rider-incident.entity.d.ts.map