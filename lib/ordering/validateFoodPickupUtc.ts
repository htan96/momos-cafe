import type { OrderingRules, WeeklyHours } from "@/lib/adminSettings.model";
import { resolveOrderingRules } from "@/lib/adminSettings.model";
import { generatePickupWindows } from "@/lib/ordering/generatePickupWindows";
import { getNextAvailablePickupTime } from "@/lib/ordering/getNextAvailablePickupTime";

const SLOT_MATCH_MS = 60 * 1000;

/** Same-calendar-day kitchen windows only — no future-dated food pickup booking. */
function effectiveFutureDayCapForFood(_r: OrderingRules): number {
  return 0;
}

/** True when `picked` aligns to generated slots (+/- `tolMs` for skew). */
export function pickupInstantMatchesSlots(
  nowUtc: Date,
  pickedUtc: Date,
  weeklyHours: WeeklyHours,
  partialRules: Partial<OrderingRules> | undefined,
  foodItemCount: number,
  tolMs = SLOT_MATCH_MS
): boolean {
  const merged = resolveOrderingRules(partialRules);
  const dayCap = effectiveFutureDayCapForFood(merged);

  const earliest = getNextAvailablePickupTime(
    nowUtc,
    weeklyHours,
    partialRules,
    foodItemCount,
    { maxFutureDaysOverride: dayCap }
  );
  if (!earliest) return false;

  const pickedMs = pickedUtc.getTime();
  if (pickedMs + tolMs < earliest.getTime()) return false;

  const windows = generatePickupWindows({
    nowUtc,
    earliestPickupUtc: earliest,
    weeklyHours,
    orderingRulesPartial: partialRules,
    maxFutureDaysOverride: dayCap,
    limit: 250,
  });
  const lastWindow = windows[windows.length - 1]?.pickupAtUtc;
  const latestMs =
    lastWindow?.getTime() ??
    earliest.getTime() + (merged.maxFutureOrderDays + 1) * 24 * 60 * 60 * 1000;
  if (pickedMs > latestMs + tolMs) return false;

  return windows.some((w) => Math.abs(w.pickupAtUtc.getTime() - pickedMs) <= tolMs);
}

export function sanitizeScheduledPickupIso(iso?: string | null): Date | null {
  if (!iso || typeof iso !== "string") return null;
  const d = new Date(iso.trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Validates customer pickup versus the same Ops rules enforced on the server,
 * within same-day kitchen windows only (no multi-day scheduled food pickup).
 *
 * Prefers canonical earliest when missing / invalid rather than rejecting checkout before payment capture.
 */
export function computeValidatedKitchenPickupUtc(params: {
  nowUtc: Date;
  scheduledForIso?: string | null;
  weeklyHours: WeeklyHours;
  orderingRulesPartial?: Partial<OrderingRules>;
  foodItemCount: number;
}): { pickupUtc: Date; usedClientSelection: boolean } {
  const merged = resolveOrderingRules(params.orderingRulesPartial);
  const dayCap = effectiveFutureDayCapForFood(merged);

  const canonicalEarliest = getNextAvailablePickupTime(
    params.nowUtc,
    params.weeklyHours,
    params.orderingRulesPartial,
    params.foodItemCount,
    { maxFutureDaysOverride: dayCap }
  );

  if (!canonicalEarliest) {
    return { pickupUtc: params.nowUtc, usedClientSelection: false };
  }

  const parsed = sanitizeScheduledPickupIso(params.scheduledForIso);
  if (
    parsed &&
    pickupInstantMatchesSlots(
      params.nowUtc,
      parsed,
      params.weeklyHours,
      params.orderingRulesPartial,
      params.foodItemCount
    )
  ) {
    return { pickupUtc: parsed, usedClientSelection: true };
  }

  return { pickupUtc: canonicalEarliest, usedClientSelection: false };
}

export function getCanonicalEarliestKitchenPickupUtc(
  nowUtc: Date,
  weeklyHours: WeeklyHours,
  partialRules: Partial<OrderingRules> | undefined,
  foodItemCount: number
): Date | null {
  const merged = resolveOrderingRules(partialRules);
  const dayCap = effectiveFutureDayCapForFood(merged);
  return getNextAvailablePickupTime(nowUtc, weeklyHours, partialRules, foodItemCount, {
    maxFutureDaysOverride: dayCap,
  });
}
