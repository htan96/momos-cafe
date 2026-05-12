import type { OrderingRules, WeeklyHours } from "@/lib/adminSettings.model";
import { getNextAvailablePickupTime } from "@/lib/ordering/getNextAvailablePickupTime";

export type KitchenAvailability = {
  /** Food can be purchased for pickup within the current active kitchen window (same calendar day only). */
  foodOrderingLive: boolean;
  /** Total food item quantity used for prep / slot calculation. */
  foodItemCount: number;
};

/**
 * Kitchen food ordering is live only when Ops accepts online orders and a same-calendar-day pickup
 * instant exists under posted hours, last-order cutoff, and minimum prep lead (plus item-based prep).
 * Merch and gift-card lines ignore this gate.
 */
export function getKitchenAvailability(
  nowUtc: Date,
  weeklyHours: WeeklyHours,
  orderingRulesPartial: Partial<OrderingRules> | undefined,
  foodItemCount: number,
  opts?: { isOrderingOpen?: boolean }
): KitchenAvailability {
  const isOpen =
    opts?.isOrderingOpen === undefined ? true : opts.isOrderingOpen;
  if (!isOpen || foodItemCount <= 0) {
    return { foodOrderingLive: false, foodItemCount };
  }

  const slot = getNextAvailablePickupTime(
    nowUtc,
    weeklyHours,
    orderingRulesPartial,
    foodItemCount,
    { maxFutureDaysOverride: 0 }
  );

  return {
    foodOrderingLive: slot !== null,
    foodItemCount,
  };
}
