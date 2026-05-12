import type { CartItem } from "@/types/ordering";
import type { MerchCartLine } from "@/types/merch";
import type { UnifiedCartLine, UnifiedFoodLine, UnifiedMerchLine } from "@/types/commerce";
import { getCartItemKey } from "@/types/ordering";
import { merchCartLineKey } from "@/types/merch";

const LEGACY_FOOD = "momos_cart";
const LEGACY_MERCH = "momos_merch_cart_v1";

function foodLineKeyFromUnified(line: UnifiedFoodLine): string {
  return getCartItemKey({
    id: line.id,
    variationId: line.variationId,
    name: line.name,
    price: line.price,
    quantity: 1,
    modifiers: line.modifiers,
  });
}

/**
 * One-time read of legacy localStorage keys; merges duplicates and clears legacy keys.
 * Called once when hydrating unified cart (client only).
 */
export function migrateLegacyCartsToUnified(): UnifiedCartLine[] | null {
  if (typeof window === "undefined") return null;
  try {
    const lines: UnifiedCartLine[] = [];

    const foodRaw = localStorage.getItem(LEGACY_FOOD);
    if (foodRaw) {
      const parsed = JSON.parse(foodRaw) as CartItem[];
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (!item?.quantity) continue;
          lines.push({
            kind: "food",
            lineId: crypto.randomUUID(),
            id: item.id,
            variationId: item.variationId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            modifiers: item.modifiers,
            fulfillmentPipeline: "KITCHEN",
            pickupEligible: true,
            shippingEligible: false,
          });
        }
      }
    }

    const merchRaw = localStorage.getItem(LEGACY_MERCH);
    if (merchRaw) {
      const parsed = JSON.parse(merchRaw) as MerchCartLine[];
      if (Array.isArray(parsed)) {
        for (const row of parsed.filter((l) => l?.type === "merch")) {
          lines.push({
            kind: "merch",
            lineId: row.lineId ?? crypto.randomUUID(),
            productId: row.productId,
            squareVariationId: row.squareVariationId,
            name: row.name,
            quantity: row.quantity,
            unitPrice: row.unitPrice,
            variantSummary: row.variantSummary,
            image: row.image,
            fulfillmentSlug: row.fulfillmentSlug,
            fulfillmentPipeline: "RETAIL",
            pickupEligible: true,
            shippingEligible: row.fulfillmentSlug !== "gift_card",
          });
        }
      }
    }

    if (lines.length === 0) return null;

    const merged: UnifiedCartLine[] = [];
    for (const line of lines) {
      if (line.kind === "food") {
        const key = foodLineKeyFromUnified(line);
        const existing = merged.find(
          (m): m is UnifiedFoodLine =>
            m.kind === "food" && foodLineKeyFromUnified(m) === key
        );
        if (existing) {
          existing.quantity += line.quantity;
          continue;
        }
      } else {
        const key = merchCartLineKey(line.productId, line.variantSummary);
        const existing = merged.find(
          (m): m is UnifiedMerchLine =>
            m.kind === "merch" && merchCartLineKey(m.productId, m.variantSummary) === key
        );
        if (existing) {
          existing.quantity += line.quantity;
          continue;
        }
      }
      merged.push(line);
    }

    localStorage.removeItem(LEGACY_FOOD);
    localStorage.removeItem(LEGACY_MERCH);
    return merged;
  } catch {
    return null;
  }
}
