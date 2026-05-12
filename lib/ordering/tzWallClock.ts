import { DateTime } from "luxon";

import type { DayKey } from "@/lib/adminSettings.model";

export type ZonedWallFields = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  dayKey: DayKey;
};

/** Luxon weekdays: Monday=1 … Sunday=7 */
export const weekdayNumberToDayKey: Record<number, DayKey> = {
  7: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

export function dtInZone(instant: Date, timeZone: string): DateTime {
  return DateTime.fromJSDate(instant, { zone: "utc" }).setZone(timeZone);
}

/** Calendar + wall clock for this instant in `timeZone`. */
export function getZonedWallFields(instant: Date, timeZone: string): ZonedWallFields {
  const z = dtInZone(instant, timeZone);
  return {
    year: z.year,
    month: z.month,
    day: z.day,
    hour: z.hour,
    minute: z.minute,
    dayKey: weekdayNumberToDayKey[z.weekday] ?? "monday",
  };
}

/** Start of next calendar day (midnight) after `from`, in `timeZone`. */
export function advanceCalendarDayInZone(from: Date, timeZone: string): Date {
  const z = dtInZone(from, timeZone).startOf("day").plus({ days: 1 });
  return z.toUTC().toJSDate();
}

/** Midnight of the same zoned calendar date as `instant`. */
export function startOfZonedDay(instant: Date, timeZone: string): Date {
  return dtInZone(instant, timeZone).startOf("day").toUTC().toJSDate();
}

/**
 * UTC instant equal to `HH:mm` on the zoned calendar date of `referenceInstant`.
 */
export function wallClockOnSameZonedDay(referenceInstant: Date, timeZone: string, hourHHmm: string): Date {
  const { hour, minute } = parseHm(hourHHmm);
  const z = dtInZone(referenceInstant, timeZone);
  return DateTime.fromObject(
    { year: z.year, month: z.month, day: z.day, hour, minute },
    { zone: timeZone }
  )
    .toUTC()
    .toJSDate();
}

/** UTC instant equal to `{year,month,day} + HH:mm` in zone. */
export function wallClockOnCalendarDay(
  year: number,
  month: number,
  day: number,
  hourHHmm: string,
  timeZone: string
): Date {
  const { hour, minute } = parseHm(hourHHmm);
  return DateTime.fromObject({ year, month, day, hour, minute }, { zone: timeZone }).toUTC().toJSDate();
}

export function parseHm(hhmm: string): { hour: number; minute: number } {
  const [hs, ms] = hhmm.split(":");
  const h = Number(hs);
  const m = ms === undefined ? 0 : Number(ms);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return { hour: 0, minute: 0 };
  return { hour: Math.max(0, Math.min(23, Math.floor(h))), minute: Math.max(0, Math.min(59, Math.floor(m))) };
}

export function zonedMinutesSinceMidnight(instant: Date, timeZone: string): number {
  const z = dtInZone(instant, timeZone);
  return z.hour * 60 + z.minute;
}

export function addMinutesUtc(instant: Date, minutes: number): Date {
  return new Date(instant.getTime() + minutes * 60 * 1000);
}

export function compareDateAsc(a: Date, b: Date): number {
  return a.getTime() - b.getTime();
}

export function luxonWeekdayNumberToDayKey(weekday: number): DayKey {
  return weekdayNumberToDayKey[weekday] ?? "monday";
}
