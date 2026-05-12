/**
 * Re-export canonical unified cart line shapes (`kind: "food" | "merch"`).
 * Prefer importing from `@/types/commerce`; this path remains for older imports.
 */
export type {
  UnifiedCartLine,
  UnifiedFoodLine,
  UnifiedMerchLine,
  CheckoutFulfillmentSummary,
  FulfillmentGroupPreview,
  FulfillmentPipeline,
} from "./commerce";
