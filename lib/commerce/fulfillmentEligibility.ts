import type { UnifiedCartLine } from "@/types/commerce";
import { partitionByFulfillmentPipeline } from "@/lib/commerce/fulfillmentPreview";

export interface FulfillmentEligibilitySummary {
  /** Any retail line can ship */
  anyRetailShippingEligible: boolean;
  /** Any retail line allows pickup */
  anyRetailPickupEligible: boolean;
  /** Food always pickup-first for now */
  kitchenPickupOnly: true;
  /** Mixed pickup vs ship eligibility inside retail bundle */
  shippingFulfillmentConflict: boolean;
  hints: string[];
}

export function summarizeFulfillmentEligibility(lines: UnifiedCartLine[]): FulfillmentEligibilitySummary {
  const { kitchen, retail } = partitionByFulfillmentPipeline(lines);
  const anyRetailShippingEligible = retail.some((l) => l.shippingEligible);
  const anyRetailPickupEligible = retail.some((l) => l.pickupEligible);
  const pickupOnlyRetail = retail.some((l) => !l.shippingEligible);
  const shippingFulfillmentConflict =
    retail.length > 1 && anyRetailShippingEligible && pickupOnlyRetail;

  const hints: string[] = [];
  if (kitchen.length && retail.length) {
    hints.push("Food and merch use separate pickup timing.");
  }
  if (anyRetailShippingEligible && anyRetailPickupEligible) {
    hints.push("Some shop items can ship; others are pickup-only — checkout will split fulfillment.");
  }
  if (!anyRetailShippingEligible && retail.length > 0) {
    hints.push("Current cart is pickup-only for shop items.");
  }

  return {
    anyRetailShippingEligible,
    anyRetailPickupEligible,
    kitchenPickupOnly: true,
    shippingFulfillmentConflict,
    hints,
  };
}
