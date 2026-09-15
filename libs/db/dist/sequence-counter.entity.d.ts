/**
 * Shared shape for the `(key, seq)` counter tables that mint human-readable public IDs.
 *
 * Three services keep one — auth (`ORC-<year>`), onboarding (`ORV-<year>`) and order
 * (`CC-FO-<date>`) — and each had declared the same two columns independently. `nextSequenceValue`
 * already unified the *statement*; this unifies the *shape*, so a change to one (a widened `seq`,
 * a collation, an index) cannot silently apply to only one of the three.
 *
 * It stays an abstract base rather than a single shared table because schema-per-service is a
 * hard boundary here: no service declares an entity in another service's schema, and a shared
 * counter table would be the first thing to break that. Each service therefore still owns its
 * own physical table, in its own schema, and only the definition is common.
 *
 * Not applicable to dispatch's `RiderIdentifierSequence`, whose key is genuinely different — a
 * composite `(cityCode, approvalYear)` rather than a single opaque string. Forcing it into this
 * shape would mean encoding two meaningful fields into one, which is how a key stops being
 * queryable.
 */
export declare abstract class SequenceCounter {
    /** Opaque scope of the counter — whatever combination resets the sequence. */
    key: string;
    /**
     * Last value handed out. Incremented by `nextSequenceValue` in a single atomic UPSERT;
     * never derived with `COUNT() + 1`, which races and reuses numbers after a deletion.
     */
    seq: number;
}
//# sourceMappingURL=sequence-counter.entity.d.ts.map