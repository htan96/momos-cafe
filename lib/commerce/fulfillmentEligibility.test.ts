import { describe, expect, it } from "vitest";
import { summarizeFulfillmentEligibility } from "@/lib/commerce/fulfillmentEligibility";
import type { UnifiedFoodLine, UnifiedMerchLine } from "@/types/commerce";

describe("fulfillmentEligibility", () => {
  it("detects mixed pickup vs ship retail conflicts", () => {
    const kitchen: UnifiedFoodLine = {
      kind: "food",
      lineId: "f",
      id: "i",
      variationId: "v",
      name: "Coffee",
      price: 3,
      quantity: 1,
      fulfillmentPipeline: "KITCHEN",
      pickupEligible: true,
      shippingEligible: false,
    };
    const ship: UnifiedMerchLine = {
      kind: "merch",
      lineId: "s",
      productId: "tee",
      name: "Tee",
      quantity: 1,
      unitPrice: 20,
      variantSummary: "S",
      fulfillmentSlug: "standard_pickup",
      fulfillmentPipeline: "RETAIL",
      pickupEligible: true,
      shippingEligible: true,
    };
    const pickupOnly: UnifiedMerchLine = {
      ...ship,
      lineId: "p",
      shippingEligible: false,
    };
    const summary = summarizeFulfillmentEligibility([kitchen, ship, pickupOnly]);
    expect(summary.shippingFulfillmentConflict).toBe(true);
  });
});
