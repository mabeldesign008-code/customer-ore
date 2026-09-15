/**
 * Database-owned counter for public Rider identifiers.
 *
 * The primary key is exactly the spec scope: one atomic sequence per
 * `(city_code, approval_year)`. Application code must increment this table with a
 * single UPSERT/RETURNING statement; it must never use COUNT()+1.
 */
export declare class RiderIdentifierSequence {
    cityCode: string;
    approvalYear: number;
    seq: number;
}
/** Immutable audit trail for Rider ID creation, correction and historical lookup. */
export declare class RiderIdentifierAudit {
    id: string;
    /** Internal dispatch Rider UUID. Never the public Rider ID. */
    riderId: string;
    eventType: 'CREATED' | 'CORRECTED' | 'LEGACY_PUBLIC_ID_RETIRED';
    /** New/current public Rider ID for this event. */
    identifier: string;
    /** Original/previous public Rider ID when an audited correction occurs. */
    previousIdentifier: string | null;
    cityId: string | null;
    cityCode: string | null;
    approvalYear: number | null;
    sequenceNumber: number | null;
    previousCityId: string | null;
    previousCityCode: string | null;
    previousApprovalYear: number | null;
    previousSequenceNumber: number | null;
    reason: string;
    actorId: string;
    actorRole: string | null;
    /** Ticket/checker reference authorising a correction or source approval. */
    approvalReference: string | null;
    metadataJson: Record<string, unknown> | null;
    createdAt: Date;
}
//# sourceMappingURL=rider-identifier.entity.d.ts.map