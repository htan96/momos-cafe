import { describe, expect, it } from "vitest";
import { buildFulfillmentSummary, partitionByFulfillmentPipeline } from "@/lib/commerce/fulfillmentPreview";
import type { UnifiedFoodLine, UnifiedMerchLine } from "@/types/commerce";

function food(partial: Partial<UnifiedFoodLine> & Pick<UnifiedFoodLine, "lineId" | "name">): UnifiedFoodLine {
  return {
    kind: "food",
    id: partial.id ?? "SQ_ITEM_BURRITO",
    variationId: partial.variationId ?? "SQ_VAR_BURRITO",
    price: partial.price ?? 12,
    quantity: partial.quantity ?? 1,
    modifiers: partial.modifiers,
    fulfillmentPipeline: "KITCHEN",
    pickupEligible: true,
    shippingEligible: false,
    ...partial,
  };
}

function merch(partial: Partial<UnifiedMerchLine> & Pick<UnifiedMerchLine, "lineId" | "name">): UnifiedMerchLine {
  return {
    kind: "merch",
    productId: partial.productId ?? "hoodie",
    quantity: partial.quantity ?? 1,
    unitPrice: partial.unitPrice ?? 48,
    variantSummary: partial.variantSummary ?? "M / Natural",
    fulfillmentSlug: partial.fulfillmentSlug ?? "standard_pickup",
    fulfillmentPipeline: "RETAIL",
    pickupEligible: partial.pickupEligible ?? true,
    shippingEligible: partial.shippingEligible ?? true,
    ...partial,
  };
}

describe("fulfillment grouping", () => {
  it("splits burrito + coffee + hoodie into kitchen and retail groups", () => {
    const lines = [
      food({ lineId: "a", name: "Breakfast Burrito" }),
      food({ lineId: "b", name: "Coffee" }),
      merch({ lineId: "c", name: "Bridge Hoodie" }),
    ];
    const { kitchen, retail } = partitionByFulfillmentPipeline(lines);
    expect(kitchen).toHaveLength(2);
    expect(retail).toHaveLength(1);

    const summary = buildFulfillmentSummary(lines);
    expect(summary.isMixed).toBe(true);
    expect(summary.groups).toHaveLength(2);
    expect(summary.groups.map((g) => g.pipeline)).toEqual(["KITCHEN", "RETAIL"]);
    expect(summary.groups[0].lineIds.sort()).toEqual(["a", "b"]);
    expect(summary.groups[1].lineIds).toEqual(["c"]);
  });

  it("single pipeline carts emit one group", () => {
    const lines = [food({ lineId: "x", name: "Toast" })];
    const summary = buildFulfillmentSummary(lines);
    expect(summary.isMixed).toBe(false);
    expect(summary.groups).toHaveLength(1);
    expect(summary.groups[0].pipeline).toBe("KITCHEN");
  });
});
