import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";

import type { WeeklyHours } from "@/lib/adminSettings.model";
import { DEFAULT_ORDERING_RULES, type OrderingRules } from "@/lib/adminSettings.model";
import { getKitchenAvailability } from "@/lib/ordering/getKitchenAvailability";
import { validateCartEligibility } from "@/lib/ordering/validateCartEligibility";
import type { UnifiedCartLine, UnifiedFoodLine, UnifiedMerchLine } from "@/types/commerce";

const TZ = "America/Los_Angeles";

function zonedUtc(y: number, m: number, d: number, h: number, min = 0) {
  return DateTime.fromObject({ year: y, month: m, day: d, hour: h, minute: min }, { zone: TZ }).toUTC().toJSDate();
}

const openWeek: WeeklyHours = {
  sunday: { open: "08:00", close: "16:00", closed: false },
  monday: { open: "08:00", close: "16:00", closed: false },
  tuesday: { open: "08:00", close: "16:00", closed: false },
  wednesday: { open: "08:00", close: "16:00", closed: false },
  thursday: { open: "08:00", close: "16:00", closed: false },
  friday: { open: "08:00", close: "16:00", closed: false },
  saturday: { open: "08:00", close: "16:00", closed: false },
};

function foodLine(qty = 1): UnifiedFoodLine {
  return {
    kind: "food",
    lineId: "f1",
    id: "catalog-item",
    name: "Momo plate",
    price: 12,
    quantity: qty,
    fulfillmentPipeline: "KITCHEN",
    pickupEligible: true,
    shippingEligible: false,
  };
}

function merchLine(overrides: Partial<UnifiedMerchLine> = {}): UnifiedMerchLine {
  return {
    kind: "merch",
    lineId: "m1",
    productId: "p1",
    name: "Tee",
    quantity: 1,
    unitPrice: 24,
    variantSummary: "M",
    fulfillmentSlug: "standard_pickup",
    fulfillmentPipeline: "RETAIL",
    pickupEligible: true,
    shippingEligible: true,
    ...overrides,
  };
}

describe("getKitchenAvailability", () => {
  it("allows food ordering mid-window when prep and cutoff still permit same-day pickup", () => {
    const now = zonedUtc(2026, 5, 12, 10, 0);
    const k = getKitchenAvailability(now, openWeek, DEFAULT_ORDERING_RULES, 1, {
      isOrderingOpen: true,
    });
    expect(k.foodOrderingLive).toBe(true);
  });

  it("blocks food ordering after same-day last-order cutoff", () => {
    const now = zonedUtc(2026, 5, 12, 15, 45);
    const k = getKitchenAvailability(now, openWeek, DEFAULT_ORDERING_RULES, 1, {
      isOrderingOpen: true,
    });
    expect(k.foodOrderingLive).toBe(false);
  });

  it("honors orderingRules openingTime/closingTime override for kitchen gate", () => {
    const now = zonedUtc(2026, 5, 12, 14, 0);
    const rules: OrderingRules = {
      ...DEFAULT_ORDERING_RULES,
      openingTime: "08:00",
      closingTime: "12:00",
    };
    const k = getKitchenAvailability(now, openWeek, rules, 1, { isOrderingOpen: true });
    expect(k.foodOrderingLive).toBe(false);
  });

  it("is false when Ops turns off accepting online orders", () => {
    const now = zonedUtc(2026, 5, 12, 10, 0);
    const k = getKitchenAvailability(now, openWeek, DEFAULT_ORDERING_RULES, 2, {
      isOrderingOpen: false,
    });
    expect(k.foodOrderingLive).toBe(false);
  });
});

describe("validateCartEligibility", () => {
  it("keeps only merch when kitchen is closed (food + merch bag)", () => {
    const now = zonedUtc(2026, 5, 12, 15, 45);
    const lines: UnifiedCartLine[] = [foodLine(), merchLine()];
    const e = validateCartEligibility({
      nowUtc: now,
      lines,
      weeklyHours: openWeek,
      orderingRulesPartial: DEFAULT_ORDERING_RULES,
      isOrderingOpen: true,
    });
    expect(e.eligibleLines).toHaveLength(1);
    expect(e.eligibleLines[0]!.kind).toBe("merch");
    expect(e.removedFoodLines).toHaveLength(1);
    expect(e.notices.some((n) => /Merchandise/i.test(n))).toBe(true);
  });

  it("uses gift-card-specific copy when only gift lines remain with food", () => {
    const now = zonedUtc(2026, 5, 12, 15, 45);
    const lines: UnifiedCartLine[] = [
      foodLine(),
      merchLine({ fulfillmentSlug: "gift_card", shippingEligible: false }),
    ];
    const e = validateCartEligibility({
      nowUtc: now,
      lines,
      weeklyHours: openWeek,
      orderingRulesPartial: DEFAULT_ORDERING_RULES,
      isOrderingOpen: true,
    });
    expect(e.notices.some((n) => /gift card/i.test(n))).toBe(true);
  });
});
