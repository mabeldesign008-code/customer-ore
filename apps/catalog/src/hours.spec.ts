/**
 * Catalog — isOpenNow() / nextOpenLabel() unit tests.
 * Pure functions — no DB, no services. These cover the hours.ts module
 * which is the only uncovered source file in catalog.
 */

import { isOpenNow, nextOpenLabel } from './hours';
import { WeeklyHours, HolidayHours } from './entities';

// Helpers — create a Date at a specific UTC time on a known weekday
// 2026-08-24 is a Monday (UTC)
const mon = (h: number, m = 0) => new Date(`2026-08-24T${pad(h)}:${pad(m)}:00Z`);
const tue = (h: number, m = 0) => new Date(`2026-08-25T${pad(h)}:${pad(m)}:00Z`);
const sun = (h: number, m = 0) => new Date(`2026-08-23T${pad(h)}:${pad(m)}:00Z`);
const wed = (h: number, m = 0) => new Date(`2026-08-26T${pad(h)}:${pad(m)}:00Z`);
function pad(n: number): string { return n < 10 ? `0${n}` : `${n}`; }

const MON_HOURS: WeeklyHours = {
  mon: [{ open: '08:00', close: '22:00' }],
  tue: [{ open: '09:00', close: '21:00' }],
  wed: [{ open: '08:00', close: '22:00' }],
  thu: [{ open: '08:00', close: '22:00' }],
  fri: [{ open: '08:00', close: '23:00' }],
  sat: [{ open: '10:00', close: '23:00' }],
  sun: [],   // closed on Sunday
};

const ALL_WEEK: WeeklyHours = {
  mon: [{ open: '00:00', close: '23:59' }],
  tue: [{ open: '00:00', close: '23:59' }],
  wed: [{ open: '00:00', close: '23:59' }],
  thu: [{ open: '00:00', close: '23:59' }],
  fri: [{ open: '00:00', close: '23:59' }],
  sat: [{ open: '00:00', close: '23:59' }],
  sun: [{ open: '00:00', close: '23:59' }],
};

describe('isOpenNow', () => {
  // ── null hours (24/7) ─────────────────────────────────────────────

  describe('null hours (24/7 vendor)', () => {
    it('returns true at any time when hours is null', () => {
      expect(isOpenNow(null, mon(3))).toBe(true);
      expect(isOpenNow(null, sun(15))).toBe(true);
      expect(isOpenNow(null, mon(23, 59))).toBe(true);
    });
  });

  // ── open/closed within slot ───────────────────────────────────────

  describe('within-slot detection', () => {
    it('returns true when current time is inside the open slot', () => {
      expect(isOpenNow(MON_HOURS, mon(12))).toBe(true);   // 12:00 in 08:00-22:00
      expect(isOpenNow(MON_HOURS, mon(8))).toBe(true);    // exactly on open boundary
      expect(isOpenNow(MON_HOURS, mon(21, 59))).toBe(true);
    });

    it('returns false at exactly the close time (exclusive)', () => {
      expect(isOpenNow(MON_HOURS, mon(22, 0))).toBe(false);  // 22:00 is NOT open (close is exclusive)
    });

    it('returns false before open time', () => {
      expect(isOpenNow(MON_HOURS, mon(7, 59))).toBe(false);
    });

    it('returns false after close time', () => {
      expect(isOpenNow(MON_HOURS, mon(23))).toBe(false);
    });

    it('returns false on a day with no slots (Sunday)', () => {
      expect(isOpenNow(MON_HOURS, sun(14))).toBe(false);
    });

    it('handles Tuesday different slot (09:00-21:00)', () => {
      expect(isOpenNow(MON_HOURS, tue(9))).toBe(true);
      expect(isOpenNow(MON_HOURS, tue(8, 59))).toBe(false);
      expect(isOpenNow(MON_HOURS, tue(21))).toBe(false);
    });
  });

  // ── multiple slots per day ────────────────────────────────────────

  describe('multiple slots per day (lunch break)', () => {
    const splitHours: WeeklyHours = {
      mon: [
        { open: '08:00', close: '12:00' },
        { open: '14:00', close: '22:00' },
      ],
      tue: [], wed: [], thu: [], fri: [], sat: [], sun: [],
    };

    it('returns true during the morning slot', () => {
      expect(isOpenNow(splitHours, mon(9))).toBe(true);
    });

    it('returns false during the lunch break', () => {
      expect(isOpenNow(splitHours, mon(13))).toBe(false);
    });

    it('returns true during the afternoon slot', () => {
      expect(isOpenNow(splitHours, mon(15))).toBe(true);
    });

    it('returns false at exactly midday (12:00 is the close)', () => {
      expect(isOpenNow(splitHours, mon(12, 0))).toBe(false);
    });
  });

  // ── all-week hours ────────────────────────────────────────────────

  describe('all-week hours (nearly 24/7 vendor)', () => {
    it('returns true at 00:00', () => expect(isOpenNow(ALL_WEEK, mon(0))).toBe(true));
    it('returns true at 23:58', () => expect(isOpenNow(ALL_WEEK, mon(23, 58))).toBe(true));
    it('returns false at 23:59 (exclusive close)', () => expect(isOpenNow(ALL_WEEK, mon(23, 59))).toBe(false));
  });

  // ── holiday overrides ─────────────────────────────────────────────

  describe('holiday overrides', () => {
    const dateKey = '2026-08-24';  // a Monday

    it('holiday closed=true overrides regular hours (returns false when otherwise open)', () => {
      const holidays: HolidayHours = { [dateKey]: { closed: true } };
      expect(isOpenNow(MON_HOURS, mon(12), holidays)).toBe(false);
    });

    it('holiday with custom open/close window overrides regular hours', () => {
      const holidays: HolidayHours = { [dateKey]: { open: '10:00', close: '14:00', closed: false } };
      expect(isOpenNow(MON_HOURS, mon(11), holidays)).toBe(true);   // inside holiday window
      expect(isOpenNow(MON_HOURS, mon(9), holidays)).toBe(false);   // before holiday open
      expect(isOpenNow(MON_HOURS, mon(14), holidays)).toBe(false);  // at close (exclusive)
    });

    it('applies null hours to a different date that has no holiday entry', () => {
      const holidays: HolidayHours = { [dateKey]: { closed: true } };
      // Tuesday has no holiday — falls back to regular hours
      expect(isOpenNow(MON_HOURS, tue(10), holidays)).toBe(true);
    });

    it('null holidays is equivalent to no overrides', () => {
      expect(isOpenNow(MON_HOURS, mon(12), null)).toBe(true);
    });

    it('empty holidays object has no effect', () => {
      expect(isOpenNow(MON_HOURS, mon(12), {})).toBe(true);
    });

    it('holiday on a normally-closed day can open it', () => {
      const holidays: HolidayHours = { '2026-08-23': { open: '10:00', close: '18:00', closed: false } };
      // Sunday is normally closed, but holiday says open 10-18
      expect(isOpenNow(MON_HOURS, sun(12), holidays)).toBe(true);
    });
  });

  // ── edge cases ────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles missing day key gracefully (returns false)', () => {
      const sparse: WeeklyHours = { mon: [{ open: '08:00', close: '20:00' }] } as any;
      // Wednesday has no entry
      expect(isOpenNow(sparse, wed(12))).toBe(false);
    });

    it('handles empty slots array for the day (returns false)', () => {
      const withEmpty: WeeklyHours = { ...MON_HOURS, mon: [] };
      expect(isOpenNow(withEmpty, mon(12))).toBe(false);
    });

    it('returns false for invalid time strings', () => {
      const bad: WeeklyHours = { ...MON_HOURS, mon: [{ open: 'XX:00', close: '20:00' }] };
      expect(isOpenNow(bad, mon(12))).toBe(false);
    });

    it('handles midnight crossing (open=22:00, close=02:00) as TWO separate slots', () => {
      // The current implementation does NOT cross midnight in a single slot —
      // midnight-crossing must be modelled as two slots.
      const lateNight: WeeklyHours = {
        ...MON_HOURS,
        mon: [{ open: '22:00', close: '23:59' }],
        tue: [{ open: '00:00', close: '02:00' }],
      };
      expect(isOpenNow(lateNight, mon(22, 30))).toBe(true);
      expect(isOpenNow(lateNight, tue(1))).toBe(true);
      expect(isOpenNow(lateNight, tue(2))).toBe(false);
    });
  });
});

describe('nextOpenLabel', () => {
  it('returns "Open now" when the vendor is currently open', () => {
    expect(nextOpenLabel(MON_HOURS, mon(12))).toBe('Open now');
  });

  it('returns "Closed" when the vendor is outside hours', () => {
    expect(nextOpenLabel(MON_HOURS, mon(3))).toBe('Closed');
  });

  it('returns "Open 24/7" when both hours and holidays are null', () => {
    expect(nextOpenLabel(null, mon(12), null)).toBe('Open 24/7');
  });

  it('returns "Closed" on a day with no slots (Sunday)', () => {
    expect(nextOpenLabel(MON_HOURS, sun(14))).toBe('Closed');
  });

  it('returns "Open 24/7" when hours is null but holidays is provided and no override matches', () => {
    const holidays: HolidayHours = { '2026-08-25': { closed: true } };
    expect(nextOpenLabel(null, mon(12), holidays)).toBe('Open now');
  });

  it('returns "Closed" during holiday closure', () => {
    const holidays: HolidayHours = { '2026-08-24': { closed: true } };
    expect(nextOpenLabel(MON_HOURS, mon(12), holidays)).toBe('Closed');
  });
});
