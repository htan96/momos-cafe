import { DateTime } from "luxon";

import type { OrderingRules, WeeklyHours } from "@/lib/adminSettings.model";
import { resolveOrderingRules } from "@/lib/adminSettings.model";
import { dtInZone, luxonWeekdayNumberToDayKey, parseHm, compareDateAsc } from "@/lib/ordering/tzWallClock";

export type GeneratedPickupSlot = {
  pickupAtUtc: Date;
};

/**
 * Discrete pickup slots aligned to `{pickupIntervalMinutes}` from opening on each qualifying day,
 * capped by `closingTime` (same calendar-day window as Ops hours).
 *
 * Starts at the earliest slot whose instant is ≥ `earliestPickupUtc`; empty if none within horizon.
 *
 * TODO(holidays/blackouts): filter slots against an expanded closed-date list alongside `weeklyHours`.
 */
export function generatePickupWindows(params: {
  nowUtc: Date;
  earliestPickupUtc: Date;
  weeklyHours: WeeklyHours;
  orderingRulesPartial?: Partial<OrderingRules>;
  /** When set, caps how many calendar days ahead are enumerated (legacy same-day = 0). */
  maxFutureDaysOverride?: number;
  /** Cap count for UI safety */
  limit?: number;
}): GeneratedPickupSlot[] {
  const rules = resolveOrderingRules(params.orderingRulesPartial);
  const weeklyHours = params.weeklyHours;
  const tz = rules.restaurantTimeZone;
  const limit = params.limit ?? 80;
  const interval = rules.pickupIntervalMinutes;
  const out: GeneratedPickupSlot[] = [];
  const startDay = dtInZone(params.nowUtc, tz).startOf("day");
  const earliest = DateTime.fromJSDate(params.earliestPickupUtc, { zone: "utc" }).setZone(tz);
  const horizon =
    params.maxFutureDaysOverride !== undefined
      ? Math.min(params.maxFutureDaysOverride, rules.maxFutureOrderDays)
      : rules.maxFutureOrderDays;

  for (let i = 0; i <= horizon && out.length < limit; i++) {
    const dayAnchor = startDay.plus({ days: i });
    const dh = weeklyHours[luxonWeekdayNumberToDayKey(dayAnchor.weekday)];
    if (!dh || dh.closed) continue;

    const oh = parseHm(dh.open);
    const ch = parseHm(dh.close);
    let openDt = DateTime.fromObject(
      {
        year: dayAnchor.year,
        month: dayAnchor.month,
        day: dayAnchor.day,
        hour: oh.hour,
        minute: oh.minute,
      },
      { zone: tz }
    );
    const closeDt = DateTime.fromObject(
      {
        year: dayAnchor.year,
        month: dayAnchor.month,
        day: dayAnchor.day,
        hour: ch.hour,
        minute: ch.minute,
      },
      { zone: tz }
    );
    if (closeDt <= openDt) continue;

    const cutoffDt = closeDt.minus({ minutes: rules.lastOrderCutoffMinutes });
    const nowLocal = dtInZone(params.nowUtc, tz);
    /* Skip same-calendar-day fulfillment after ordering cutoff passes. */
    if (dayAnchor.equals(nowLocal.startOf("day")) && nowLocal >= cutoffDt) continue;

    let slot = openDt;
    while (slot < closeDt && out.length < limit) {
      if (slot >= earliest) {
        out.push({ pickupAtUtc: slot.toUTC().toJSDate() });
      }
      slot = slot.plus({ minutes: interval });
    }
  }

  out.sort((a, b) => compareDateAsc(a.pickupAtUtc, b.pickupAtUtc));
  return out.slice(0, limit);
}
