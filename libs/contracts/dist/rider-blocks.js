"use strict";
/** Rider scheduled-dash windows. Optional — going online without a block still works. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RIDER_BLOCK_GRACE_MIN = exports.RIDER_BLOCK_MAX_OPEN = exports.RIDER_BLOCK_MAX_DAYS_AHEAD = exports.RIDER_BLOCK_MAX_MIN = exports.RIDER_BLOCK_MIN_MIN = void 0;
exports.parseRiderBlockTimes = parseRiderBlockTimes;
exports.riderBlockDurationMin = riderBlockDurationMin;
exports.riderBlocksOverlap = riderBlocksOverlap;
exports.coveringRiderBlock = coveringRiderBlock;
exports.shouldDropUnstartedBlock = shouldDropUnstartedBlock;
exports.evaluateRiderBlock = evaluateRiderBlock;
exports.RIDER_BLOCK_MIN_MIN = 30;
exports.RIDER_BLOCK_MAX_MIN = 480;
exports.RIDER_BLOCK_MAX_DAYS_AHEAD = 7;
exports.RIDER_BLOCK_MAX_OPEN = 14;
exports.RIDER_BLOCK_GRACE_MIN = 30;
function parseRiderBlockTimes(startsAt, endsAt) {
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
        return null;
    if (end.getTime() <= start.getTime())
        return null;
    return { startsAt: start, endsAt: end };
}
function riderBlockDurationMin(window) {
    return Math.round((window.endsAt.getTime() - window.startsAt.getTime()) / 60_000);
}
function riderBlocksOverlap(a, b) {
    return a.startsAt.getTime() < b.endsAt.getTime() && b.startsAt.getTime() < a.endsAt.getTime();
}
function coveringRiderBlock(blocks, now) {
    return blocks.find((block) => block.startsAt.getTime() <= now.getTime() && block.endsAt.getTime() > now.getTime()) ?? null;
}
/** Drop a still-SCHEDULED window if the rider never started within the grace period. */
function shouldDropUnstartedBlock(block, now, graceMin = exports.RIDER_BLOCK_GRACE_MIN) {
    if (block.status !== 'SCHEDULED')
        return false;
    return now.getTime() > block.startsAt.getTime() + graceMin * 60_000;
}
function evaluateRiderBlock(opts) {
    const minMin = opts.minMin ?? exports.RIDER_BLOCK_MIN_MIN;
    const maxMin = opts.maxMin ?? exports.RIDER_BLOCK_MAX_MIN;
    const maxDaysAhead = opts.maxDaysAhead ?? exports.RIDER_BLOCK_MAX_DAYS_AHEAD;
    const maxOpen = opts.maxOpen ?? exports.RIDER_BLOCK_MAX_OPEN;
    const window = { startsAt: opts.startsAt, endsAt: opts.endsAt };
    if (window.endsAt.getTime() <= window.startsAt.getTime())
        return { ok: false, reason: 'invalid_times' };
    const duration = riderBlockDurationMin(window);
    if (duration < minMin)
        return { ok: false, reason: 'too_short' };
    if (duration > maxMin)
        return { ok: false, reason: 'too_long' };
    // 60s slack so "start now" from a slightly stale client clock is accepted.
    if (window.startsAt.getTime() < opts.now.getTime() - 60_000)
        return { ok: false, reason: 'in_past' };
    if (window.startsAt.getTime() > opts.now.getTime() + maxDaysAhead * 86_400_000)
        return { ok: false, reason: 'too_far' };
    if (opts.existing.length >= maxOpen)
        return { ok: false, reason: 'too_many' };
    if (opts.existing.some((row) => riderBlocksOverlap(window, row)))
        return { ok: false, reason: 'overlap' };
    return { ok: true };
}
//# sourceMappingURL=rider-blocks.js.map