import { describe, expect, it } from "vitest";
import {
  validateFulfillmentTransition,
  validateOrderStatusTransition,
} from "@/lib/commerce/orderLifecycle";

describe("orderLifecycle transitions", () => {
  it("allows kitchen pending → kitchen_preparing", () => {
    expect(validateFulfillmentTransition("KITCHEN", "pending", "kitchen_preparing").ok).toBe(true);
  });

  it("blocks kitchen pending → shipped", () => {
    const r = validateFulfillmentTransition("KITCHEN", "pending", "shipped");
    expect(r.ok).toBe(false);
  });

  it("allows retail ready_for_pickup → shipped", () => {
    expect(validateFulfillmentTransition("RETAIL", "ready_for_pickup", "shipped").ok).toBe(true);
  });

  it("allows order draft → pending_payment", () => {
    expect(validateOrderStatusTransition("draft", "pending_payment").ok).toBe(true);
  });

  it("blocks draft → paid", () => {
    expect(validateOrderStatusTransition("draft", "paid").ok).toBe(false);
  });
});
