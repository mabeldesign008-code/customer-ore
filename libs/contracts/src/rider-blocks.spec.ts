import {
  coveringRiderBlock,
  evaluateRiderBlock,
  parseRiderBlockTimes,
  riderBlocksOverlap,
  shouldDropUnstartedBlock,
} from './rider-blocks';

const now = new Date('2026-08-19T10:00:00.000Z');

describe('rider blocks', () => {
  it('rejects inverted or unparseable times', () => {
    expect(parseRiderBlockTimes('nope', '2026-08-19T12:00:00.000Z')).toBeNull();
    expect(parseRiderBlockTimes('2026-08-19T12:00:00.000Z', '2026-08-19T11:00:00.000Z')).toBeNull();
  });

  it('accepts a 4-hour window later today', () => {
    const window = parseRiderBlockTimes('2026-08-19T14:00:00.000Z', '2026-08-19T18:00:00.000Z')!;
    expect(evaluateRiderBlock({ ...window, now, existing: [] })).toEqual({ ok: true });
  });

  it('rejects a window shorter than 30 minutes or longer than 8 hours', () => {
    expect(evaluateRiderBlock({
      startsAt: new Date('2026-08-19T14:00:00.000Z'),
      endsAt: new Date('2026-08-19T14:20:00.000Z'),
      now,
      existing: [],
    }).reason).toBe('too_short');
    expect(evaluateRiderBlock({
      startsAt: new Date('2026-08-19T14:00:00.000Z'),
      endsAt: new Date('2026-08-19T23:00:00.000Z'),
      now,
      existing: [],
    }).reason).toBe('too_long');
  });

  it('rejects a start more than 7 days ahead or already in the past', () => {
    expect(evaluateRiderBlock({
      startsAt: new Date('2026-08-27T10:00:00.000Z'),
      endsAt: new Date('2026-08-27T14:00:00.000Z'),
      now,
      existing: [],
    }).reason).toBe('too_far');
    expect(evaluateRiderBlock({
      startsAt: new Date('2026-08-19T08:00:00.000Z'),
      endsAt: new Date('2026-08-19T12:00:00.000Z'),
      now,
      existing: [],
    }).reason).toBe('in_past');
  });

  it('treats touching windows as compatible and overlapping windows as a conflict', () => {
    const existing = [{ startsAt: new Date('2026-08-19T14:00:00.000Z'), endsAt: new Date('2026-08-19T16:00:00.000Z') }];
    expect(riderBlocksOverlap(existing[0], { startsAt: new Date('2026-08-19T16:00:00.000Z'), endsAt: new Date('2026-08-19T18:00:00.000Z') })).toBe(false);
    expect(evaluateRiderBlock({
      startsAt: new Date('2026-08-19T15:00:00.000Z'),
      endsAt: new Date('2026-08-19T17:00:00.000Z'),
      now,
      existing,
    }).reason).toBe('overlap');
  });

  it('finds the covering window and drops an unstarted block after the grace period', () => {
    const blocks = [
      { startsAt: new Date('2026-08-19T08:00:00.000Z'), endsAt: new Date('2026-08-19T09:00:00.000Z') },
      { startsAt: new Date('2026-08-19T09:30:00.000Z'), endsAt: new Date('2026-08-19T12:00:00.000Z') },
    ];
    expect(coveringRiderBlock(blocks, now)?.startsAt.toISOString()).toBe('2026-08-19T09:30:00.000Z');
    expect(shouldDropUnstartedBlock({ startsAt: new Date('2026-08-19T09:00:00.000Z'), status: 'SCHEDULED' }, now, 30)).toBe(true);
    expect(shouldDropUnstartedBlock({ startsAt: new Date('2026-08-19T09:45:00.000Z'), status: 'SCHEDULED' }, now, 30)).toBe(false);
    expect(shouldDropUnstartedBlock({ startsAt: new Date('2026-08-19T09:00:00.000Z'), status: 'ACTIVE' }, now, 30)).toBe(false);
  });
});
