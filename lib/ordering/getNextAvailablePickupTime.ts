import { DateTime } from "luxon";

import type { OrderingRules, WeeklyHours } from "@/lib/adminSettings.model";
import { resolveOrderingRules } from "@/lib/adminSettings.model";
import { getEstimatedPrepMinutes } from "@/lib/pickupTime";
import { dtInZone, luxonWeekdayNumberToDayKey, parseHm } from "@/lib/ordering/tzWallClock";

/** Earliest UTC instant aligned to pickup slots (kitchen lead + store hours + same-day cutoff). */
export function getNextAvailablePickupTime(
  nowUtc: Date,
  weeklyHours: WeeklyHours,
  orderingRulesPartial: Partial<OrderingRules> | undefined,
  foodItemCount: number,
  caps?: { maxFutureDaysOverride?: number }
): Date | null {
  const rules = resolveOrderingRules(orderingRulesPartial);
  const tz = rules.restaurantTimeZone;
  const prepMin =
    foodItemCount > 0 ? getEstimatedPrepMinutes(foodItemCount) : 0;
  const leadMin = Math.max(rules.minimumPrepLeadMinutes, prepMin);

  const earliestUtc = DateTime.fromJSDate(nowUtc, { zone: "utc" }).plus({
    minutes: leadMin,
  });

  const startDay = dtInZone(nowUtc, tz).startOf("day");
  const interval = rules.pickupIntervalMinutes;
  const horizon =
    caps?.maxFutureDaysOverride !== undefined
      ? Math.min(caps.maxFutureDaysOverride, rules.maxFutureOrderDays)
      : rules.maxFutureOrderDays;

  for (let i = 0; i <= horizon; i++) {
    const dayAnchor = startDay.plus({ days: i });
    const dh = weeklyHours[luxonWeekdayNumberToDayKey(dayAnchor.weekday)];
    if (!dh || dh.closed) continue;

    const oh = parseHm(dh.open);
    const ch = parseHm(dh.close);

    const openDt = DateTime.fromObject(
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
    const nowLocal = dtInZone(nowUtc, tz);

    /** After last-order cutoff, same calendar day is no longer available for fulfillment. */
    if (dayAnchor.equals(nowLocal.startOf("day")) && nowLocal >= cutoffDt) continue;

    const earliestLocal = earliestUtc.setZone(tz);
    let baseline =
      earliestLocal > openDt ? earliestLocal : openDt;
    if (baseline >= closeDt) continue;

    let diffMin = baseline.diff(openDt, "minutes").minutes;
    let k = Math.ceil(diffMin / interval);
    let slot =
      diffMin <= 0
        ? openDt
        : openDt.plus({ minutes: k * interval });
    while (slot < baseline) {
      slot = slot.plus({ minutes: interval });
    }

    while (slot >= openDt && slot < closeDt) {
      if (slot >= baseline) {
        return slot.toUTC().toJSDate();
      }
      slot = slot.plus({ minutes: interval });
    }
  }

  return null;
}
