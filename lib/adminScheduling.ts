import type { AdminSettings } from "@/lib/adminSettings.model";
import {
  resolveOrderingRules,
  formatTimeForDisplay,
} from "@/lib/adminSettings.model";
import { getStoreAvailabilityState } from "@/lib/ordering/getStoreAvailabilityState";
import { getZonedWallFields } from "@/lib/ordering/tzWallClock";

export type OrderingStatus = {
  /**
   * Legacy field — storefront browsing/cart always allowed; do not use to disable the menu.
   * @deprecated Use informational banners only.
   */
  canAccept: boolean;
  closedMessage?: string;
  scheduleNote?: string;
};

export function getTodayKeyInRestaurantTz(settings: AdminSettings) {
  const tz = resolveOrderingRules(settings.orderingRules).restaurantTimeZone;
  return getZonedWallFields(new Date(), tz).dayKey;
}

export function getIsOpenToday(settings: AdminSettings): boolean {
  const today = getTodayKeyInRestaurantTz(settings);
  return !settings.weeklyHours[today]?.closed;
}

/**
 * Soft banners only — never a hard “store closed” wall for browsing or cart.
 * Food checkout is gated separately at checkout using active kitchen windows.
 */
export function getOrderingStatus(settings: AdminSettings): OrderingStatus {
  const rules = resolveOrderingRules(settings.orderingRules);
  const st = getStoreAvailabilityState(
    new Date(),
    settings.weeklyHours,
    settings.orderingRules
  );

  if (!settings.isOrderingOpen) {
    return {
      canAccept: true,
      scheduleNote:
        "Kitchen online ordering is paused — you can still explore the menu, shop, and check out merchandise.",
    };
  }

  if (st.isClosedDay) {
    return {
      canAccept: true,
      scheduleNote:
        "We’re closed today on the posted schedule — browse anytime; food checkout follows the next open window.",
    };
  }

  if (!st.isWithinOperatingHours) {
    const openHm = settings.weeklyHours[st.calendarDayKey]?.open;
    if (openHm && !settings.weeklyHours[st.calendarDayKey]?.closed) {
      return {
        canAccept: true,
        scheduleNote: `We open at ${formatTimeForDisplay(openHm)} — your bag stays ready.`,
      };
    }
  }

  if (st.pastSameDayOrderCutoff) {
    return {
      canAccept: true,
      scheduleNote:
        "Today’s online kitchen cutoff has passed — shop checkout stays open; food returns on the next window.",
    };
  }

  return {
    canAccept: true,
    scheduleNote: `Pickup today honors ${rules.minimumPrepLeadMinutes}+ min lead · ${rules.pickupIntervalMinutes}-minute slots.`,
  };
}

export function buildScheduleBanner(settings: AdminSettings): { note?: string } {
  const { scheduleNote } = getOrderingStatus(settings);
  return { note: scheduleNote };
}

export function kitchenCheckoutBlocked(settings: AdminSettings): boolean {
  return !settings.isOrderingOpen;
}

/**
 * @deprecated Same-day food gating is enforced in `validateCartEligibility` / API — not here.
 */
export function foodPaymentBlockedOutsideLegacyWindow(
  settings: AdminSettings
): boolean {
  void settings;
  return false;
}
