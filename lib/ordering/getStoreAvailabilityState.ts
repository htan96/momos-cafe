import type { DayKey, OrderingRules, WeeklyHours } from "@/lib/adminSettings.model";
import {
  resolveOrderingRules,
  resolveWeeklyHoursForOrdering,
} from "@/lib/adminSettings.model";
import {
  getZonedWallFields,
  wallClockOnSameZonedDay,
  zonedMinutesSinceMidnight,
} from "@/lib/ordering/tzWallClock";
import { hmToMinutesSafe } from "@/lib/ordering/timeMinutes";

/** TODO(holidays): extend with blackout dates — closed overrides from Ops or ICS import. */

export type StoreAvailabilityState = {
  timeZone: string;
  calendarDayKey: DayKey;
  isClosedDay: boolean;
  isWithinOperatingHours: boolean;
  pastSameDayOrderCutoff: boolean;
  closesAtUtc: Date | null;
  closeHmToday: string | null;
};

/**
 * Operational picture for storefront messaging and scheduling.
 * Assumes `close` is after `open` on the same calendar day (matches Ops time inputs).
 */
export function getStoreAvailabilityState(
  instantUtc: Date,
  weeklyHours: WeeklyHours,
  orderingRulesPartial?: Partial<OrderingRules>
): StoreAvailabilityState {
  const rules = resolveOrderingRules(orderingRulesPartial);
  const tz = rules.restaurantTimeZone;
  const z = getZonedWallFields(instantUtc, tz);
  const dayKey = z.dayKey;

  const effectiveHours = resolveWeeklyHoursForOrdering(weeklyHours, orderingRulesPartial);
  const dayHours = effectiveHours[dayKey];
  const closed = !dayHours || dayHours.closed;
  if (closed) {
    return {
      timeZone: tz,
      calendarDayKey: dayKey,
      isClosedDay: true,
      isWithinOperatingHours: false,
      pastSameDayOrderCutoff: true,
      closesAtUtc: null,
      closeHmToday: null,
    };
  }

  const openMin = hmToMinutesSafe(dayHours.open);
  const closeMin = hmToMinutesSafe(dayHours.close);
  const nowMin = zonedMinutesSinceMidnight(instantUtc, tz);

  let isWithinOperatingHours = false;
  if (closeMin > openMin) {
    isWithinOperatingHours = nowMin >= openMin && nowMin < closeMin;
  }

  const closeInstant = wallClockOnSameZonedDay(instantUtc, tz, dayHours.close);
  const cutoffInstant = new Date(closeInstant.getTime() - rules.lastOrderCutoffMinutes * 60 * 1000);
  const pastSameDayOrderCutoff = instantUtc.getTime() >= cutoffInstant.getTime();

  return {
    timeZone: tz,
    calendarDayKey: dayKey,
    isClosedDay: false,
    isWithinOperatingHours,
    pastSameDayOrderCutoff,
    closesAtUtc: closeInstant,
    closeHmToday: dayHours.close,
  };
}
