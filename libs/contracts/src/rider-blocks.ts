/** Rider scheduled-dash windows. Optional — going online without a block still works. */

export const RIDER_BLOCK_MIN_MIN = 30;
export const RIDER_BLOCK_MAX_MIN = 480;
export const RIDER_BLOCK_MAX_DAYS_AHEAD = 7;
export const RIDER_BLOCK_MAX_OPEN = 14;
export const RIDER_BLOCK_GRACE_MIN = 30;

export type RiderBlockStatus = 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface RiderBlockWindow {
  startsAt: Date;
  endsAt: Date;
}

export interface RiderBlockDecision {
  ok: boolean;
  reason?: 'invalid_times' | 'too_short' | 'too_long' | 'in_past' | 'too_far' | 'overlap' | 'too_many';
}

export function parseRiderBlockTimes(startsAt: string, endsAt: string): { startsAt: Date; endsAt: Date } | null {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  if (end.getTime() <= start.getTime()) return null;
  return { startsAt: start, endsAt: end };
}

export function riderBlockDurationMin(window: RiderBlockWindow): number {
  return Math.round((window.endsAt.getTime() - window.startsAt.getTime()) / 60_000);
}

export function riderBlocksOverlap(a: RiderBlockWindow, b: RiderBlockWindow): boolean {
  return a.startsAt.getTime() < b.endsAt.getTime() && b.startsAt.getTime() < a.endsAt.getTime();
}

export function coveringRiderBlock<T extends RiderBlockWindow>(blocks: T[], now: Date): T | null {
  return blocks.find((block) => block.startsAt.getTime() <= now.getTime() && block.endsAt.getTime() > now.getTime()) ?? null;
}

/** Drop a still-SCHEDULED window if the rider never started within the grace period. */
export function shouldDropUnstartedBlock(block: { startsAt: Date; status: string }, now: Date, graceMin = RIDER_BLOCK_GRACE_MIN): boolean {
  if (block.status !== 'SCHEDULED') return false;
  return now.getTime() > block.startsAt.getTime() + graceMin * 60_000;
}

export function evaluateRiderBlock(opts: {
  startsAt: Date;
  endsAt: Date;
  now: Date;
  existing: RiderBlockWindow[];
  minMin?: number;
  maxMin?: number;
  maxDaysAhead?: number;
  maxOpen?: number;
}): RiderBlockDecision {
  const minMin = opts.minMin ?? RIDER_BLOCK_MIN_MIN;
  const maxMin = opts.maxMin ?? RIDER_BLOCK_MAX_MIN;
  const maxDaysAhead = opts.maxDaysAhead ?? RIDER_BLOCK_MAX_DAYS_AHEAD;
  const maxOpen = opts.maxOpen ?? RIDER_BLOCK_MAX_OPEN;
  const window = { startsAt: opts.startsAt, endsAt: opts.endsAt };
  if (window.endsAt.getTime() <= window.startsAt.getTime()) return { ok: false, reason: 'invalid_times' };
  const duration = riderBlockDurationMin(window);
  if (duration < minMin) return { ok: false, reason: 'too_short' };
  if (duration > maxMin) return { ok: false, reason: 'too_long' };
  // 60s slack so "start now" from a slightly stale client clock is accepted.
  if (window.startsAt.getTime() < opts.now.getTime() - 60_000) return { ok: false, reason: 'in_past' };
  if (window.startsAt.getTime() > opts.now.getTime() + maxDaysAhead * 86_400_000) return { ok: false, reason: 'too_far' };
  if (opts.existing.length >= maxOpen) return { ok: false, reason: 'too_many' };
  if (opts.existing.some((row) => riderBlocksOverlap(window, row))) return { ok: false, reason: 'overlap' };
  return { ok: true };
}
