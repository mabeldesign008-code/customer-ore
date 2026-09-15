/** Operating-hours evaluation. */

import { HolidayHours, WeeklyHours } from './entities';

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export function isOpenNow(hours: WeeklyHours | null, now: Date = new Date(), holidays: HolidayHours | null = null): boolean {
  const dateKey = now.toISOString().slice(0, 10);
  const holiday = holidays?.[dateKey];
  if (holiday?.closed) return false;
  if (holiday && holiday.open && holiday.close) {
    return isWithinSlot(holiday.open, holiday.close, now);
  }
  if (!hours) return true; // null = 24/7
  const day = DAYS[now.getUTCDay()]; // local Ghana = UTC+0
  const slots = hours[day];
  if (!slots || slots.length === 0) return false;
  return slots.some((s) => isWithinSlot(s.open, s.close, now));
}

function isWithinSlot(openValue: string, closeValue: string, now: Date): boolean {
  const [oh, om] = openValue.split(':').map(Number);
  const [ch, cm] = closeValue.split(':').map(Number);
  if (![oh, om, ch, cm].every(Number.isFinite)) return false;
  const mins = now.getUTCHours() * 60 + now.getUTCMinutes();
  const open = oh * 60 + om;
  const close = ch * 60 + cm;
  return mins >= open && mins < close;
}

export function nextOpenLabel(hours: WeeklyHours | null, now: Date = new Date(), holidays: HolidayHours | null = null): string {
  if (!hours && !holidays) return 'Open 24/7';
  if (isOpenNow(hours, now, holidays)) return 'Open now';
  return 'Closed';
}
