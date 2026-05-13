import type { MerchStoreCollection } from "@/types/merchCatalog";
import { merchCatalog } from "@/lib/merch/mockCatalog";
import {
  retailFilterMerchStoreCollections,
  retailFeaturedMerchStoreCollections,
  retailNavAllMerchStoreCollections,
} from "@/lib/commerce/retailTaxonomy";

/** Non-empty filter chips for the offline mock assortment — taxonomy-backed, mirrors `/api/products/store`. */
export function merchFallbackFilterCollections(): MerchStoreCollection[] {
  return retailFilterMerchStoreCollections(merchCatalog);
}

export function merchFallbackFeaturedCollections(): MerchStoreCollection[] {
  return retailFeaturedMerchStoreCollections(merchCatalog);
}

export function merchFallbackSlugMap(): Map<string, string> {
  return new Map(merchFallbackFilterCollections().map((c) => [c.squareId, c.slug]));
}

/** Full navigable set (including empty inventory) — useful for slug → label lookup in tools. */
export function merchAllNavCollectionTemplates(): MerchStoreCollection[] {
  return retailNavAllMerchStoreCollections();
}

export function merchCollectionSlugToCollection(
  slug: string | undefined | null,
  fallback: MerchStoreCollection[]
): MerchStoreCollection | undefined {
  if (!slug) return undefined;
  return fallback.find((c) => c.slug === slug);
}
