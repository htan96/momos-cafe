import type { AdminSettings, OrderingRules, WeeklyHours } from "@/lib/adminSettings.model";
import type { UnifiedCartLine, UnifiedFoodLine, UnifiedMerchLine } from "@/types/commerce";
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

/** Premium shopper-facing copy when shop lines remain but kitchen food was dropped. */
function noticeWhenFoodRemovedShopRemains(keptMerchLineCount: number, keptGiftCardLineCount: number): string {
  if (keptMerchLineCount > 0 && keptGiftCardLineCount > 0) {
    return "Our kitchen is currently closed for food ordering. Merchandise and gift cards in your bag are still available — this checkout is for those shop items only.";
  }
  if (keptGiftCardLineCount > 0) {
    return "Our kitchen is currently closed for food ordering. Gift cards in your bag are still available — this checkout is for shop purchases only.";
  }
  return "Our kitchen is currently closed for food ordering. Merchandise in your bag is still available — this checkout is for shop items only.";
}

/**
 * Determines which unified lines may be paid for in this checkout attempt.
 * Food lines (`kind === "food"`, kitchen / pickup) require an active same-day ordering window;
 * merch lines (`kind === "merch"`) and gift cards (`fulfillmentSlug === "gift_card"`) do not.
 */
export function validateCartEligibility(params: {
  nowUtc: Date;
  lines: UnifiedCartLine[];
  weeklyHours: WeeklyHours;
  orderingRulesPartial?: Partial<OrderingRules>;
  /** Ops pause for kitchen; does not block merch-only checkout. */
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
    const merchLines: UnifiedMerchLine[] = [];
    for (const l of params.lines) {
      if (l.kind === "merch") merchLines.push(l);
    }

    const savedFoodLines = foodLines.filter((f) => f.savedForLater === true);
    const payableFoodLines = foodLines.filter((f) => !f.savedForLater);
    const eligibleLines: UnifiedCartLine[] = [...payableFoodLines, ...merchLines];
    const notices: string[] = [];

    const lineSavedCopy = "This item is currently unavailable but has been saved for later.";

    if (savedFoodLines.length > 0) {
      if (payableFoodLines.length === 0 && merchLines.length > 0) {
        notices.push(
          `${lineSavedCopy} Shop lines in your bag are still payable on this checkout — kitchen picks remain saved for later.`
        );
      } else if (payableFoodLines.length > 0 && savedFoodLines.length === 1) {
        notices.push(lineSavedCopy);
      } else if (payableFoodLines.length > 0 && savedFoodLines.length > 1) {
        notices.push(
          "Several café selections are set aside until they’re pickup-eligible again — review them under Saved for later."
        );
      }
    }

    return {
      eligibleLines,
      removedFoodLines: savedFoodLines,
      notices,
      kitchenAcceptsFoodNow: true,
      nextFoodOrderingSummary: null,
    };
  }

  const filtered = filterUnavailableFoodItems(params.lines, false);

  const nextWin = getNextFoodOrderingWindow(
    params.nowUtc,
    params.weeklyHours,
    params.orderingRulesPartial
  );

  const notices: string[] = [...filtered.notices];
  const nextSummary = nextWin?.headline ?? null;

  if (foodLines.length > 0 && filtered.eligibleLines.length > 0) {
    notices.push(
      noticeWhenFoodRemovedShopRemains(
        filtered.keptMerchLineCount,
        filtered.keptGiftCardLineCount
      )
    );
  } else if (foodLines.length > 0 && filtered.eligibleLines.length === 0) {
    notices.push(
      nextSummary
        ? `${nextSummary} Your selections will stay in your bag for when the kitchen opens.`
        : "Food ordering isn’t available in this window. You can browse anytime and return when the kitchen is open."
    );
  }

  return {
    eligibleLines: filtered.eligibleLines,
    removedFoodLines: filtered.removedFoodLines,
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
