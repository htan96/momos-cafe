import { describe, expect, it } from "vitest";
import { cartHasBlockingIssues, validateUnifiedCart } from "@/lib/commerce/cartValidation";
import type { UnifiedFoodLine, UnifiedMerchLine } from "@/types/commerce";

const baseFood: UnifiedFoodLine = {
  kind: "food",
  lineId: "f1",
  id: "ITEM",
  variationId: "VAR",
  name: "Burrito",
  price: 10,
  quantity: 1,
  fulfillmentPipeline: "KITCHEN",
  pickupEligible: true,
  shippingEligible: false,
};

const baseMerch: UnifiedMerchLine = {
  kind: "merch",
  lineId: "m1",
  productId: "p",
  squareVariationId: "SV",
  name: "Tee",
  quantity: 1,
  unitPrice: 20,
  variantSummary: "M",
  fulfillmentSlug: "standard_pickup",
  fulfillmentPipeline: "RETAIL",
  pickupEligible: true,
  shippingEligible: true,
};

describe("cartValidation", () => {
  it("flags duplicate line ids as blocking", () => {
    const issues = validateUnifiedCart([baseFood, { ...baseFood, lineId: "f1" }]);
    expect(cartHasBlockingIssues(issues)).toBe(true);
    expect(issues.some((i) => i.code === "DUPLICATE_LINE_ID")).toBe(true);
  });

  it("warns when food variation id missing", () => {
    const issues = validateUnifiedCart([{ ...baseFood, variationId: undefined }]);
    expect(cartHasBlockingIssues(issues)).toBe(false);
    expect(issues.some((i) => i.code === "FOOD_MISSING_VARIATION_ID")).toBe(true);
  });

  it("errors when gift card marked shipping eligible", () => {
    const bad: UnifiedMerchLine = {
      ...baseMerch,
      lineId: "g1",
      fulfillmentSlug: "gift_card",
      shippingEligible: true,
    };
    const issues = validateUnifiedCart([bad]);
    expect(cartHasBlockingIssues(issues)).toBe(true);
    expect(issues.some((i) => i.code === "GIFT_CARD_SHIPPING_CONFLICT")).toBe(true);
  });
});
