import type { UnifiedCartLine, UnifiedFoodLine } from "@/types/commerce";

/**
 * Returns cart lines with kitchen food removed when `kitchenAcceptsFood` is false.
 * Merch (including gift cards) always stays.
 */
export function filterUnavailableFoodItems(
  lines: UnifiedCartLine[],
  kitchenAcceptsFood: boolean
): { kept: UnifiedCartLine[]; removedFood: UnifiedFoodLine[] } {
  if (kitchenAcceptsFood) {
    return {
      kept: lines,
      removedFood: [],
    };
  }

  const removedFood: UnifiedFoodLine[] = [];
  const kept: UnifiedCartLine[] = [];
  for (const line of lines) {
    if (line.kind === "food") {
      removedFood.push(line);
    } else {
      kept.push(line);
    }
  }
  return { kept, removedFood };
}
