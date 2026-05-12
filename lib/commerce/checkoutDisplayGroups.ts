import type { UnifiedCartLine, UnifiedFoodLine, UnifiedMerchLine } from "@/types/commerce";

export interface CheckoutDisplayGroup {
  key: string;
  title: string;
  lines: UnifiedCartLine[];
}

/**
 * Storefront summary grouping — Kitchen, retail pickup, and ship-eligible retail buckets.
 */
export function buildCheckoutDisplayGroups(lines: UnifiedCartLine[]): CheckoutDisplayGroup[] {
  const food = lines.filter((l): l is UnifiedFoodLine => l.kind === "food");
  const merch = lines.filter((l): l is UnifiedMerchLine => l.kind === "merch");

  const groups: CheckoutDisplayGroup[] = [];
  if (food.length > 0) {
    groups.push({ key: "kitchen", title: "Café pickup (kitchen window)", lines: food });
  }

  const retailPickup = merch.filter((m) => !m.shippingEligible);
  const retailShip = merch.filter((m) => m.shippingEligible);

  if (retailPickup.length > 0) {
    groups.push({ key: "retail_pickup", title: "Shop · pickup alongside us", lines: retailPickup });
  }
  if (retailShip.length > 0) {
    groups.push({ key: "retail_ship", title: "Shop · ship to your door", lines: retailShip });
  }

  return groups;
}
