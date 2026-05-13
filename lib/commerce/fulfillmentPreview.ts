import type {
  CheckoutFulfillmentSummary,
  FulfillmentGroupPreview,
  FulfillmentPipeline,
  UnifiedCartLine,
} from "@/types/commerce";

const KITCHEN_ETA = "About 15 minutes when we’re open.";
const RETAIL_ETA = "Often ready in 2–3 business days.";

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
      title: "Today’s picks",
      subtitle: "Pickup from the café.",
      etaHint: KITCHEN_ETA,
      pickupEligible,
      shippingEligible: false,
      lineIds,
    };
  }

  return {
    pipeline,
    title: "From the shop",
    subtitle: "Gifts & goods from our shelves.",
    etaHint: RETAIL_ETA,
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
  /** Kept minimal — cart surfaces avoid multi-lane explanations. */
  const messages: string[] = [];
  if (isMixed) {
    messages.push("Food and gifts sometimes finish on different days — we’ll keep you posted.");
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
