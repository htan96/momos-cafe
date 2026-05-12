import type { UnifiedCartLine, UnifiedFoodLine } from "@/types/commerce";

/** Result of splitting a unified bag for checkout under active-kitchen-window rules. */
export type CartEligibilityResult = {
  eligibleLines: UnifiedCartLine[];
  removedFoodLines: UnifiedFoodLine[];
  notices: string[];
  /** True when at least one same-calendar-day pickup slot exists for the cart’s food quantity. */
  kitchenAcceptsFoodNow: boolean;
  /** Human-readable “resumes …” line when food is off-window (from weekly hours). */
  nextFoodOrderingSummary: string | null;
};
