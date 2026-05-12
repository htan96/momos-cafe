import { describe, expect, it } from "vitest";
import { parseUnifiedCartLines } from "@/lib/commerce/parseUnifiedCartLines";

describe("parseUnifiedCartLines", () => {
  it("returns issue when payload not array", () => {
    const { lines, issues } = parseUnifiedCartLines({});
    expect(lines).toHaveLength(0);
    expect(issues[0]?.code).toBe("LINES_NOT_ARRAY");
  });

  it("accepts valid mixed payload", () => {
    const payload = [
      {
        kind: "food",
        lineId: "1",
        id: "CAT",
        variationId: "VAR",
        name: "Burrito",
        price: 10,
        quantity: 2,
        fulfillmentPipeline: "KITCHEN",
        pickupEligible: true,
        shippingEligible: false,
      },
      {
        kind: "merch",
        lineId: "2",
        productId: "hoodie",
        name: "Hoodie",
        quantity: 1,
        unitPrice: 40,
        variantSummary: "M",
        fulfillmentSlug: "standard_pickup",
        fulfillmentPipeline: "RETAIL",
        pickupEligible: true,
        shippingEligible: true,
      },
    ];
    const { lines, issues } = parseUnifiedCartLines(payload);
    expect(issues).toHaveLength(0);
    expect(lines).toHaveLength(2);
  });
});
