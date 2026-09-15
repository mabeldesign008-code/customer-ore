import { Injectable, Logger } from '@nestjs/common';

/**
 * SLA policy for support tickets.
 *
 * The target is time to FIRST HUMAN RESPONSE, not time to resolution — that is the number
 * a customer actually experiences, and it is the one a rep can influence in the moment.
 * Resolution targets depend on the problem and are tracked but not alerted on.
 *
 * Everything is env-overridable so targets can be tightened without a deploy.
 */

export type Priority = 'low' | 'normal' | 'high' | 'urgent';

export const PRIORITIES: Priority[] = ['low', 'normal', 'high', 'urgent'];

function envMin(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Minutes to first human response, by priority. */
export function firstResponseTargetMinutes(priority: string): number {
  switch (priority) {
    case 'urgent':
      return envMin('SLA_URGENT_MINUTES', 15);
    case 'high':
      return envMin('SLA_HIGH_MINUTES', 60);
    case 'low':
      return envMin('SLA_LOW_MINUTES', 480);
    default:
      return envMin('SLA_NORMAL_MINUTES', 180);
  }
}

/** Escalation reasons that must never wait for the normal queue. */
const URGENT_REASONS = new Set([
  'fraud',
  'account_compromise',
  'chargeback',
  'legal',
  'data_deletion',
]);

export function priorityForReason(reason: string | null | undefined): Priority {
  if (!reason) return 'normal';
  if (URGENT_REASONS.has(reason)) return 'urgent';
  if (reason === 'refund_request' || reason === 'payment_failed') return 'high';
  if (reason === 'complaint' || reason === 'rider_conduct') return 'high';
  return 'normal';
}

/**
 * Office hours, in Ghana time (UTC+0 all year — Ghana does not observe DST, so this is
 * a plain offset rather than a timezone database lookup).
 *
 * Outside these hours the customer gets an honest "we'll reply by X" rather than silence,
 * and the SLA clock starts at the next opening instead of penalising the team overnight.
 */
export interface OfficeHours {
  openHour: number;
  closeHour: number;
  daysOpen: number[]; // 0 = Sunday
  tzOffsetMinutes: number;
}

export function officeHours(): OfficeHours {
  const openHour = Number.parseInt(process.env.SUPPORT_OPEN_HOUR || '8', 10);
  const closeHour = Number.parseInt(process.env.SUPPORT_CLOSE_HOUR || '20', 10);
  const days = (process.env.SUPPORT_OPEN_DAYS || '1,2,3,4,5,6')
    .split(',')
    .map((d) => Number.parseInt(d.trim(), 10))
    .filter((d) => Number.isFinite(d) && d >= 0 && d <= 6);
  return {
    openHour: Number.isFinite(openHour) ? openHour : 8,
    closeHour: Number.isFinite(closeHour) ? closeHour : 20,
    daysOpen: days.length ? days : [1, 2, 3, 4, 5, 6],
    tzOffsetMinutes: Number.parseInt(process.env.SUPPORT_TZ_OFFSET_MINUTES || '0', 10) || 0,
  };
}

export function localParts(at: Date, offsetMinutes: number): { hour: number; day: number } {
  const shifted = new Date(at.getTime() + offsetMinutes * 60_000);
  return { hour: shifted.getUTCHours(), day: shifted.getUTCDay() };
}

export function isOpenNow(at: Date = new Date()): boolean {
  const oh = officeHours();
  const { hour, day } = localParts(at, oh.tzOffsetMinutes);
  if (!oh.daysOpen.includes(day)) return false;
  return hour >= oh.openHour && hour < oh.closeHour;
}

/** The next moment the office is open. Used for both the SLA clock and the auto-reply. */
export function nextOpening(from: Date = new Date()): Date {
  const oh = officeHours();
  const cursor = new Date(from.getTime() + oh.tzOffsetMinutes * 60_000);
  for (let i = 0; i < 14; i += 1) {
    const day = cursor.getUTCDay();
    const hour = cursor.getUTCHours();
    if (oh.daysOpen.includes(day)) {
      if (hour < oh.openHour) {
        cursor.setUTCHours(oh.openHour, 0, 0, 0);
        return new Date(cursor.getTime() - oh.tzOffsetMinutes * 60_000);
      }
      if (hour < oh.closeHour) return new Date(from.getTime()); // already open
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    cursor.setUTCHours(oh.openHour, 0, 0, 0);
  }
  return new Date(from.getTime() + 24 * 60 * 60_000);
}

/**
 * When the SLA for this ticket expires.
 *
 * If a ticket arrives out of hours the clock starts at the next opening. Counting
 * overnight minutes as a breach would make every evening conversation look like a failure
 * and would train the team to ignore the alert.
 */
export function slaDueAt(createdAt: Date, priority: string): Date {
  const start = isOpenNow(createdAt) ? createdAt : nextOpening(createdAt);
  return new Date(start.getTime() + firstResponseTargetMinutes(priority) * 60_000);
}

@Injectable()
export class SlaService {
  private readonly logger = new Logger(SlaService.name);

  due(createdAt: Date, priority: string): Date {
    return slaDueAt(createdAt, priority);
  }

  isBreached(thread: { slaDueAt: Date | null; firstResponseAt: Date | null; status: string }): boolean {
    if (!thread.slaDueAt) return false;
    if (thread.firstResponseAt) return thread.firstResponseAt > thread.slaDueAt;
    if (thread.status === 'RESOLVED' || thread.status === 'CLOSED') return false;
    return Date.now() > thread.slaDueAt.getTime();
  }

  /** "We'll reply by 09:00" — honest, and it sets an expectation we can then meet. */
  outOfHoursMessage(at: Date = new Date()): string | null {
    if (isOpenNow(at)) return null;
    const opens = nextOpening(at);
    const oh = officeHours();
    const { hour } = localParts(opens, oh.tzOffsetMinutes);
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
      localParts(opens, oh.tzOffsetMinutes).day
    ];
    const today = localParts(at, oh.tzOffsetMinutes).day === localParts(opens, oh.tzOffsetMinutes).day;
    return (
      `Our team is offline right now. We open ${today ? 'at' : `on ${dayName} at`} ` +
      `${String(hour).padStart(2, '0')}:00 and will reply to you then. ` +
      `If this is an emergency about money or a safety issue, say "urgent" and we will prioritise it.`
    );
  }
}
