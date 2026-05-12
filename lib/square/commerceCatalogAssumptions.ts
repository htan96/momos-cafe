/**
 * Documented assumptions for Square × unified commerce — no secrets returned from APIs.
 */
export interface CatalogCommerceAssumption {
  topic: string;
  assumption: string;
  validationHint: string;
}

export const SQUARE_COMMERCE_ASSUMPTIONS: CatalogCommerceAssumption[] = [
  {
    topic: "Catalog identifiers",
    assumption:
      "Food POS charges rely on Catalog OBJECT IDs — ITEM_VARIATION lines preferred over naked ITEM ids.",
    validationHint:
      "Call GET /api/square/verify with Sandbox credentials; keep NEXT_PUBLIC_SQUARE_* aligned with server env.",
  },
  {
    topic: "Merch variants",
    assumption:
      "Each merch PDP resolves to one ITEM_VARIATION id mirrored into unified cart lines for taxable totals.",
    validationHint:
      "When catalog sync lands, ProductVariantCache.squareVariationId must match storefront picker output.",
  },
  {
    topic: "Inventory truth",
    assumption:
      "Square Inventory counts are authoritative once synced — storefront mocks remain optimistic until wired.",
    validationHint:
      "Populate CartInventoryLookup maps server-side before calling validateUnifiedCart with inventory.",
  },
  {
    topic: "Pricing",
    assumption:
      "Kitchen totals mirror POS rounding rules via `/api/order`; commerce_orders snapshots cents independently.",
    validationHint:
      "Cross-check commerce draft totals vs Square Orders calculate during reconciliation QA.",
  },
];
