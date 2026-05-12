import type { UnifiedCartLine, UnifiedFoodLine, UnifiedMerchLine } from "@/types/commerce";

export type FilteredCartForKitchen = {
  eligibleLines: UnifiedCartLine[];
  /** Kitchen / pickup lines removed because food ordering is not live for this attempt. */
  removedFoodLines: UnifiedFoodLine[];
  /**
   * Optional machine-facing tags (e.g. analytics). `notices` for shoppers are built in
   * `validateCartEligibility`.
   */
  notices: string[];
  /** Merch lines kept in `eligibleLines` (excludes gift cards). */
  keptMerchLineCount: number;
  /** Gift-card merch lines kept in `eligibleLines`. */
  keptGiftCardLineCount: number;
};

function classifyKeptMerch(lines: UnifiedCartLine[]): {
  merch: number;
  giftCards: number;
} {
  let merch = 0;
  let giftCards = 0;
  for (const line of lines) {
    if (line.kind !== "merch") continue;
    const m = line as UnifiedMerchLine;
    if (m.fulfillmentSlug === "gift_card") giftCards += 1;
    else merch += 1;
  }
  return { merch, giftCards };
}

/**
 * Returns cart lines with kitchen food removed when `kitchenAcceptsFood` is false.
 * Merch (including gift cards) always stays — `kind === "food"` is the kitchen line type.
 */
export function filterUnavailableFoodItems(
  lines: UnifiedCartLine[],
  kitchenAcceptsFood: boolean
): FilteredCartForKitchen {
  if (kitchenAcceptsFood) {
    const { merch, giftCards } = classifyKeptMerch(lines);
    return {
      eligibleLines: lines,
      removedFoodLines: [],
      notices: [],
      keptMerchLineCount: merch,
      keptGiftCardLineCount: giftCards,
    };
  }

  const removedFood: UnifiedFoodLine[] = [];
  const eligibleLines: UnifiedCartLine[] = [];
  for (const line of lines) {
    if (line.kind === "food") {
      removedFood.push(line);
    } else {
      eligibleLines.push(line);
    }
  }
  const { merch, giftCards } = classifyKeptMerch(eligibleLines);
  return {
    eligibleLines,
    removedFoodLines: removedFood,
    notices: [],
    keptMerchLineCount: merch,
    keptGiftCardLineCount: giftCards,
  };
}
