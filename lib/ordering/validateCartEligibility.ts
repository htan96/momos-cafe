import type { AdminSettings, OrderingRules, WeeklyHours } from "@/lib/adminSettings.model";
import type { UnifiedCartLine, UnifiedFoodLine } from "@/types/commerce";
import type { CartEligibilityResult } from "@/lib/ordering/cartEligibilityTypes";
import { filterUnavailableFoodItems } from "@/lib/ordering/filterUnavailableFoodItems";
import { getKitchenAvailability } from "@/lib/ordering/getKitchenAvailability";
import { getNextFoodOrderingWindow } from "@/lib/ordering/getNextFoodOrderingWindow";

function totalFoodQty(lines: UnifiedCartLine[]): number {
  let n = 0;
  for (const l of lines) {
    if (l.kind === "food") n += l.quantity;
  }
  return n;
}

function collectFoodLines(lines: UnifiedCartLine[]): UnifiedFoodLine[] {
  const out: UnifiedFoodLine[] = [];
  for (const l of lines) {
    if (l.kind === "food") out.push(l);
  }
  return out;
}

/**
 * Determines which unified lines may be paid for in this checkout attempt.
 * Food/kitchen lines require an active same-day ordering window; merch and gift cards do not.
 */
export function validateCartEligibility(params: {
  nowUtc: Date;
  lines: UnifiedCartLine[];
  weeklyHours: WeeklyHours;
  orderingRulesPartial?: Partial<OrderingRules>;
  /** Admin kill-switch for kitchen; does not block merch-only checkout. */
  isOrderingOpen: boolean;
}): CartEligibilityResult {
  const foodQty = totalFoodQty(params.lines);
  const foodLines = collectFoodLines(params.lines);

  if (foodQty === 0) {
    return {
      eligibleLines: params.lines,
      removedFoodLines: [],
      notices: [],
      kitchenAcceptsFoodNow: true,
      nextFoodOrderingSummary: null,
    };
  }

  const { foodOrderingLive } = getKitchenAvailability(
    params.nowUtc,
    params.weeklyHours,
    params.orderingRulesPartial,
    foodQty,
    { isOrderingOpen: params.isOrderingOpen }
  );

  if (foodOrderingLive) {
    return {
      eligibleLines: params.lines,
      removedFoodLines: [],
      notices: [],
      kitchenAcceptsFoodNow: true,
      nextFoodOrderingSummary: null,
    };
  }

  const { kept, removedFood } = filterUnavailableFoodItems(
    params.lines,
    false
  );

  const nextWin = getNextFoodOrderingWindow(
    params.nowUtc,
    params.weeklyHours,
    params.orderingRulesPartial
  );

  const notices: string[] = [];
  const nextSummary = nextWin?.headline ?? null;

  if (foodLines.length > 0 && kept.length > 0) {
    notices.push(
      "Our kitchen is currently closed for food ordering. Merchandise and gifts in your bag are still available to purchase — we’ve set this checkout to shop items only."
    );
  } else if (foodLines.length > 0 && kept.length === 0) {
    notices.push(
      nextSummary
        ? `${nextSummary} You can leave items in your bag for when the kitchen opens.`
        : "Food ordering isn’t available in this window. You can browse anytime and return when the kitchen is open."
    );
  }

  return {
    eligibleLines: kept,
    removedFoodLines: removedFood,
    notices,
    kitchenAcceptsFoodNow: false,
    nextFoodOrderingSummary: nextSummary,
  };
}

/** Convenience: pull fields from persisted admin JSON. */
export function validateCartEligibilityFromAdminSettings(
  nowUtc: Date,
  lines: UnifiedCartLine[],
  settings: AdminSettings
): CartEligibilityResult {
  return validateCartEligibility({
    nowUtc,
    lines,
    weeklyHours: settings.weeklyHours,
    orderingRulesPartial: settings.orderingRules,
    isOrderingOpen: settings.isOrderingOpen,
  });
}

export type { CartEligibilityResult } from "@/lib/ordering/cartEligibilityTypes";
