/**
 * Dynamic pickup time estimation based on cart size.
 * Base prep + extra time per item.
 */

const BASE_PREP_MINUTES = 15;
const MINUTES_PER_ITEM = 2;

/**
 * Returns estimated prep time in minutes based on number of cart items.
 */
export function getEstimatedPrepMinutes(itemCount: number): number {
  const extraTime = itemCount * MINUTES_PER_ITEM;
  return BASE_PREP_MINUTES + extraTime;
}

/**
 * Returns the estimated pickup time as a Date.
 */
export function getEstimatedPickupTime(itemCount: number): Date {
  const prepMinutes = getEstimatedPrepMinutes(itemCount);
  const now = new Date();
  return new Date(now.getTime() + prepMinutes * 60 * 1000);
}

/**
 * Formats a Date as "2:45 PM" for display.
 */
export function formatPickupTime(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, "0")} ${suffix}`;
}
