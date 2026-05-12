import type { UnifiedCartLine } from "@/types/commerce";

export type CartValidationSeverity = "error" | "warning";

export interface CartValidationIssue {
  code: string;
  severity: CartValidationSeverity;
  message: string;
  lineId?: string;
}

/** Inventory placeholder — wire ProductCache / Square later */
export type InventoryKnownState = "unknown" | "in_stock" | "low_stock" | "out_of_stock";

export interface CartInventoryLookup {
  foodVariationId?: string;
  merchProductId?: string;
  merchVariationId?: string;
  state: InventoryKnownState;
}

/**
 * Semantic validation on already-parsed lines (integrity + Square readiness hints).
 */
export function validateUnifiedCart(
  lines: UnifiedCartLine[],
  inventory?: Map<string, CartInventoryLookup>
): CartValidationIssue[] {
  const issues: CartValidationIssue[] = [];
  const seenLineIds = new Set<string>();

  for (const line of lines) {
    if (seenLineIds.has(line.lineId)) {
      issues.push({
        code: "DUPLICATE_LINE_ID",
        severity: "error",
        message: "Duplicate lineId breaks fulfillment grouping and payments.",
        lineId: line.lineId,
      });
    }
    seenLineIds.add(line.lineId);

    if (line.kind === "food") {
      if (!line.variationId?.trim()) {
        issues.push({
          code: "FOOD_MISSING_VARIATION_ID",
          severity: "warning",
          message:
            "Missing Square ITEM_VARIATION id — checkout may fall back to legacy pricing paths.",
          lineId: line.lineId,
        });
      }
      const invKey = line.variationId ?? line.id;
      const inv = inventory?.get(`food:${invKey}`);
      if (inv?.state === "out_of_stock") {
        issues.push({
          code: "FOOD_OUT_OF_STOCK",
          severity: "error",
          message: "Item appears unavailable — remove or adjust before checkout.",
          lineId: line.lineId,
        });
      }
    } else {
      if (!line.squareVariationId?.trim()) {
        issues.push({
          code: "MERCH_MISSING_VARIATION_ID",
          severity: "warning",
          message:
            "Missing Square variation id — reconcile before charging card on unified checkout.",
          lineId: line.lineId,
        });
      }
      if (line.fulfillmentSlug === "gift_card" && line.shippingEligible) {
        issues.push({
          code: "GIFT_CARD_SHIPPING_CONFLICT",
          severity: "error",
          message: "Gift cards are not shippable in current rules.",
          lineId: line.lineId,
        });
      }
      const invKey = `merch:${line.squareVariationId ?? line.productId}`;
      const inv = inventory?.get(invKey);
      if (inv?.state === "out_of_stock") {
        issues.push({
          code: "MERCH_OUT_OF_STOCK",
          severity: "error",
          message: "Merch SKU unavailable — remove or pick another variant.",
          lineId: line.lineId,
        });
      }
    }
  }

  return issues;
}

export function cartHasBlockingIssues(issues: CartValidationIssue[]): boolean {
  return issues.some((i) => i.severity === "error");
}
