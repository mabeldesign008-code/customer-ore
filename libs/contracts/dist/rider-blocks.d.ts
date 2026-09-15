/** Rider scheduled-dash windows. Optional — going online without a block still works. */
export declare const RIDER_BLOCK_MIN_MIN = 30;
export declare const RIDER_BLOCK_MAX_MIN = 480;
export declare const RIDER_BLOCK_MAX_DAYS_AHEAD = 7;
export declare const RIDER_BLOCK_MAX_OPEN = 14;
export declare const RIDER_BLOCK_GRACE_MIN = 30;
export type RiderBlockStatus = 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export interface RiderBlockWindow {
    startsAt: Date;
    endsAt: Date;
}
export interface RiderBlockDecision {
    ok: boolean;
    reason?: 'invalid_times' | 'too_short' | 'too_long' | 'in_past' | 'too_far' | 'overlap' | 'too_many';
}
export declare function parseRiderBlockTimes(startsAt: string, endsAt: string): {
    startsAt: Date;
    endsAt: Date;
} | null;
export declare function riderBlockDurationMin(window: RiderBlockWindow): number;
export declare function riderBlocksOverlap(a: RiderBlockWindow, b: RiderBlockWindow): boolean;
export declare function coveringRiderBlock<T extends RiderBlockWindow>(blocks: T[], now: Date): T | null;
/** Drop a still-SCHEDULED window if the rider never started within the grace period. */
export declare function shouldDropUnstartedBlock(block: {
    startsAt: Date;
    status: string;
}, now: Date, graceMin?: number): boolean;
export declare function evaluateRiderBlock(opts: {
    startsAt: Date;
    endsAt: Date;
    now: Date;
    existing: RiderBlockWindow[];
    minMin?: number;
    maxMin?: number;
    maxDaysAhead?: number;
    maxOpen?: number;
}): RiderBlockDecision;
//# sourceMappingURL=rider-blocks.d.ts.map