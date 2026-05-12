import type { OrderingRules, WeeklyHours } from "@/lib/adminSettings.model";
import { resolveOrderingRules } from "@/lib/adminSettings.model";
import { getStoreAvailabilityState } from "@/lib/ordering/getStoreAvailabilityState";

/** True inside [close − lastOrderCutoff, close) on an operating calendar day — calm “last call” window. */
export function isWithinLastCallWindow(
  instantUtc: Date,
  weeklyHours: WeeklyHours,
  orderingRulesPartial?: Partial<OrderingRules>
): boolean {
  const rules = resolveOrderingRules(orderingRulesPartial);
  const st = getStoreAvailabilityState(instantUtc, weeklyHours, rules);
  if (!st.closesAtUtc || st.isClosedDay || !st.isWithinOperatingHours) return false;
  const cutoffMs = st.closesAtUtc.getTime() - rules.lastOrderCutoffMinutes * 60 * 1000;
  const t = instantUtc.getTime();
  return t >= cutoffMs && t < st.closesAtUtc.getTime();
}
