import type {
  CheckoutFulfillmentSummary,
  FulfillmentGroupPreview,
  FulfillmentPipeline,
  UnifiedCartLine,
} from "@/types/commerce";

const KITCHEN_ETA = "Food ready in ~15 minutes for pickup.";
const RETAIL_ETA =
  "Shop items (like hoodies) are usually ready for pickup in 2–3 business days.";
const SHIPPING_STUB = "Shipping for merch is rolling out soon.";

export function partitionByFulfillmentPipeline(lines: UnifiedCartLine[]): {
  kitchen: UnifiedCartLine[];
  retail: UnifiedCartLine[];
} {
  const kitchen: UnifiedCartLine[] = [];
  const retail: UnifiedCartLine[] = [];
  for (const line of lines) {
    if (line.kind === "food") kitchen.push(line);
    else retail.push(line);
  }
  return { kitchen, retail };
}

function groupPreview(
  pipeline: FulfillmentPipeline,
  lineIds: string[],
  lines: UnifiedCartLine[]
): FulfillmentGroupPreview {
  const inGroup = lines.filter((l) => lineIds.includes(l.lineId));
  const pickupEligible = inGroup.some((l) =>
    l.kind === "food" ? true : l.pickupEligible
  );
  const shippingEligible = inGroup.some((l) => l.kind === "merch" && l.shippingEligible);

  if (pipeline === "KITCHEN") {
    return {
      pipeline,
      title: "Kitchen pickup",
      subtitle: "Cooked to order — same-day window.",
      etaHint: KITCHEN_ETA,
      pickupEligible,
      shippingEligible: false,
      lineIds,
    };
  }

  return {
    pipeline,
    title: "Retail & gifts",
    subtitle: "Merch prep runs separately from the kitchen line.",
    etaHint: RETAIL_ETA + (shippingEligible ? ` ${SHIPPING_STUB}` : ""),
    pickupEligible,
    shippingEligible,
    lineIds,
  };
}

export function buildFulfillmentSummary(lines: UnifiedCartLine[]): CheckoutFulfillmentSummary {
  const { kitchen, retail } = partitionByFulfillmentPipeline(lines);
  const groups: FulfillmentGroupPreview[] = [];

  if (kitchen.length > 0) {
    groups.push(
      groupPreview(
        "KITCHEN",
        kitchen.map((l) => l.lineId),
        lines
      )
    );
  }
  if (retail.length > 0) {
    groups.push(
      groupPreview(
        "RETAIL",
        retail.map((l) => l.lineId),
        lines
      )
    );
  }

  const isMixed = kitchen.length > 0 && retail.length > 0;
  const messages: string[] = [];
  if (isMixed) {
    messages.push(
      "Your cart mixes food and merch — we'll coordinate pickup timing separately for each group."
    );
  }
  if (retail.some((l) => l.shippingEligible)) {
    messages.push(SHIPPING_STUB);
  }

  return { isMixed, groups, messages };
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
