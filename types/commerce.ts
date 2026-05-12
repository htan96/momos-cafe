/**
 * Unified commerce types — restaurant + merch + gifts in one cart surface.
 * Square stays authoritative for catalog/payment; this layer orchestrates UX + persistence.
 */

import type { SelectedModifier } from "@/types/ordering";
import type { MerchFulfillmentSlug } from "@/types/merch";

export type FulfillmentPipeline = "KITCHEN" | "RETAIL";

export interface UnifiedFoodLine {
  kind: "food";
  lineId: string;
  /** Square Catalog ITEM id */
  id: string;
  variationId?: string;
  name: string;
  price: number;
  quantity: number;
  modifiers?: SelectedModifier[];
  fulfillmentPipeline: "KITCHEN";
  pickupEligible: true;
  shippingEligible: false;
}

export interface UnifiedMerchLine {
  kind: "merch";
  lineId: string;
  productId: string;
  squareVariationId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  variantSummary: string;
  image?: string;
  fulfillmentSlug: MerchFulfillmentSlug;
  fulfillmentPipeline: "RETAIL";
  pickupEligible: boolean;
  shippingEligible: boolean;
}

/** Gift cards ride as merch lines with `fulfillmentSlug` distinguishing behavior */
export type UnifiedCartLine = UnifiedFoodLine | UnifiedMerchLine;

export interface FulfillmentGroupPreview {
  pipeline: FulfillmentPipeline;
  title: string;
  subtitle: string;
  etaHint: string;
  pickupEligible: boolean;
  shippingEligible: boolean;
  lineIds: string[];
}

export interface CheckoutFulfillmentSummary {
  isMixed: boolean;
  groups: FulfillmentGroupPreview[];
  messages: string[];
}
