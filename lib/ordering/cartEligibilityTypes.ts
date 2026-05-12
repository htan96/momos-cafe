import type { UnifiedCartLine, UnifiedFoodLine } from "@/types/commerce";

/** Result of splitting a unified bag for checkout under active-kitchen-window rules. */
export type CartEligibilityResult = {
  /** Lines that may be paid for in this attempt (kitchen food only when `kitchenAcceptsFoodNow`). */
  eligibleLines: UnifiedCartLine[];
  /** `kind: "food"` lines withheld — merch / gift lines are never removed here. */
  removedFoodLines: UnifiedFoodLine[];
  notices: string[];
  /** True when same-calendar-day kitchen rules allow purchasing food at `now`. */
  kitchenAcceptsFoodNow: boolean;
  /** Human-readable “resumes …” line when food is off-window (from weekly hours). */
  nextFoodOrderingSummary: string | null;
};
