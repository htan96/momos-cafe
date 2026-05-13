/**
 * Storefront / merch commerce types — Square Catalog–ready shapes.
 * Food ordering remains on `types/ordering` until unified checkout merges both.
 */

export type { MerchStoreCollection } from "@/types/merchCatalog";
/**
 * Primary collection key for product cards + filters — slug from Square category name + id tail
 * (see `/api/products/store` `collections[].slug`).
 */
export type MerchCollectionId = string;

export type MerchInventoryState = "in_stock" | "low_stock" | "out_of_stock";

/** Fulfillment copy — merch ≠ food pickup timing */
export type MerchFulfillmentSlug =
  | "standard_pickup" // 2–3 biz days, made to order
  | "gift_card"; // digital / instant differentiator later

/**
 * Computed merchandising facets — product type, geo, campaign, etc. can overlap.
 * Populated by `lib/commerce/retailTaxonomy` for `/shop`.
 */
export interface RetailFacet {
  collectionIds: MerchCollectionId[];
  productTypes: MerchCollectionId[];
  regions: MerchCollectionId[];
  campaigns: MerchCollectionId[];
  fulfillmentSlug?: MerchFulfillmentSlug;
}

export interface MerchFulfillmentMeta {
  slug: MerchFulfillmentSlug;
  /** Short badge on cards */
  badgeLabel: string;
  /** One line under title on PDP */
  headline: string;
  /** Longer explainer for PDP / trust section */
  detail: string;
  pickupEligible: boolean;
  shippingEligible: boolean;
}

export interface MerchProductColor {
  id: string;
  label: string;
  hex?: string;
}

/** Square-backed variation row for cart + unified checkout (PCI stays on Square). */
export interface MerchVariantOption {
  squareVariationId: string;
  /** Human label shown in sheet / cart summary */
  label: string;
  /** Display unit price in USD (major units) */
  priceUsd: number;
}

/**
 * Full merchandising product — maps cleanly to Square ITEM + ITEM_VARIATION later.
 */
export interface MerchProduct {
  id: string;
  /** Square Catalog ITEM id when synced */
  squareCatalogItemId?: string;
  /** Populated from ProductVariantCache — drives `squareVariationId` on cart lines */
  variantOptions?: MerchVariantOption[];
  name: string;
  subtitle?: string;
  description: string;
  /** Primary Square Store category (leaf or deepest under Store) — DTO only. */
  squareLeafCategoryId?: string;
  /** Leaf → … → Store root — used to match parent collection filters. */
  squareCategoryAncestryLeafFirst?: string[];
  /** Primary filter tab / collection slug */
  collectionId: MerchCollectionId;
  /** Additional slugs for ribbons (optional) */
  featuredCollectionIds?: MerchCollectionId[];
  /** Retail taxonomy membership (multi-collection filters, ops / analytics). */
  retailCollectionIds?: MerchCollectionId[];
  retailFacet?: RetailFacet;
  price: number;
  compareAtPrice?: number;
  priceLabel?: string;
  image?: string;
  /** Gradient key when no image */
  imageFallbackKey?: "teal" | "cream" | "gold" | "charcoal" | "red";
  badges?: string[];
  inventory: MerchInventoryState;
  fulfillment: MerchFulfillmentMeta;
  sizes?: string[];
  colors?: MerchProductColor[];
  /** Gift-style denomination options */
  amountOptions?: number[];
  /** Primary CTA pattern */
  buttonLabel?: "Add to bag" | "Choose options" | "Buy now";
}

/** Cart line — future merge with food cart uses discriminated union on `type: "merch"`. */
export interface MerchCartLine {
  type: "merch";
  lineId: string;
  productId: string;
  squareVariationId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  variantSummary: string;
  image?: string;
  fulfillmentSlug: MerchFulfillmentSlug;
}

export function merchCartLineKey(productId: string, variantSummary: string): string {
  return `${productId}::${variantSummary}`;
}
