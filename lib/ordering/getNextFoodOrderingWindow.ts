import { DateTime } from "luxon";

import type { OrderingRules, WeeklyHours } from "@/lib/adminSettings.model";
import { formatTimeForDisplay } from "@/lib/adminSettings.model";
import { getStoreAvailabilityState } from "@/lib/ordering/getStoreAvailabilityState";
import {
  dtInZone,
  luxonWeekdayNumberToDayKey,
  parseHm,
  zonedMinutesSinceMidnight,
} from "@/lib/ordering/tzWallClock";
import { hmToMinutesSafe } from "@/lib/ordering/timeMinutes";

export type NextFoodOrderingWindow = {
  /** UTC instant of the next wall-clock opening (from weekly hours). */
  opensAtUtc: Date;
  /** Example: "Food ordering resumes tomorrow at 8:00 AM." */
  headline: string;
};

/**
 * Next time the kitchen “opens” for messaging, based on weekly posted open times — not pickup slots.
 * Used when same-day food ordering is unavailable.
 */
export function getNextFoodOrderingWindow(
  nowUtc: Date,
  weeklyHours: WeeklyHours,
  orderingRulesPartial: Partial<OrderingRules> | undefined
): NextFoodOrderingWindow | null {
  const st = getStoreAvailabilityState(
    nowUtc,
    weeklyHours,
    orderingRulesPartial
  );
  const tz = st.timeZone;
  const todayKey = st.calendarDayKey;
  const todayHours = weeklyHours[todayKey];
  const nowLocal = dtInZone(nowUtc, tz);
  const nowMin = zonedMinutesSinceMidnight(nowUtc, tz);

  if (!st.isClosedDay && todayHours && !todayHours.closed) {
    const openMin = hmToMinutesSafe(todayHours.open);
    const closeMin = hmToMinutesSafe(todayHours.close);

    if (closeMin > openMin && nowMin < openMin) {
      const opensAtUtc = DateTime.fromObject(
        {
          year: nowLocal.year,
          month: nowLocal.month,
          day: nowLocal.day,
          ...parseHm(todayHours.open),
        },
        { zone: tz }
      )
        .toUTC()
        .toJSDate();
      return {
        opensAtUtc,
        headline: `Food ordering resumes today at ${formatTimeForDisplay(todayHours.open)}.`,
      };
    }
  }

  for (let add = 1; add <= 14; add++) {
    const probe = nowLocal.plus({ days: add }).startOf("day");
    const dk = luxonWeekdayNumberToDayKey(probe.weekday);
    const dh = weeklyHours[dk];
    if (!dh || dh.closed) continue;
    const opensAtUtc = DateTime.fromObject(
      {
        year: probe.year,
        month: probe.month,
        day: probe.day,
        ...parseHm(dh.open),
      },
      { zone: tz }
    )
      .toUTC()
      .toJSDate();

    const label = formatTimeForDisplay(dh.open);
    const dow = probe.toFormat("cccc");
    const relative =
      add === 1
        ? "tomorrow"
        : `${dow}`;

    const headline =
      add === 1
        ? `Food ordering resumes tomorrow at ${label}.`
        : `Food ordering resumes ${relative} at ${label}.`;

    return { opensAtUtc, headline };
  }

  return null;
}
