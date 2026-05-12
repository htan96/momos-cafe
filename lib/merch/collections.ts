import type { MerchStoreCollection } from "@/types/merchCatalog";

/**
 * Fallback collections when `/api/products/store` serves mock catalog offline — slugs MUST match `mockCatalog[].collectionId`.
 */
export const MERCH_FALLBACK_COLLECTIONS: MerchStoreCollection[] = [
  {
    slug: "apparel",
    squareId: "mock-apparel",
    title: "Apparel",
    tagline: "Tees & everyday layers",
    parentSquareId: null,
    depth: 1,
    accent: "teal",
    sortOrder: 0,
  },
  {
    slug: "hoodies",
    squareId: "mock-hoodies",
    title: "Hoodies",
    tagline: "Midweight & cozy",
    parentSquareId: null,
    depth: 1,
    accent: "charcoal",
    sortOrder: 1,
  },
  {
    slug: "hats",
    squareId: "mock-hats",
    title: "Hats",
    tagline: "Caps & beanies",
    parentSquareId: null,
    depth: 1,
    accent: "gold",
    sortOrder: 2,
  },
  {
    slug: "drinkware",
    squareId: "mock-drinkware",
    title: "Drinkware",
    tagline: "Mugs & cups",
    parentSquareId: null,
    depth: 1,
    accent: "red",
    sortOrder: 3,
  },
  {
    slug: "accessories",
    squareId: "mock-accessories",
    title: "Accessories",
    tagline: "Totes & extras",
    parentSquareId: null,
    depth: 1,
    accent: "teal",
    sortOrder: 4,
  },
  {
    slug: "gift_cards",
    squareId: "mock-gift-cards",
    title: "Gift Cards",
    tagline: "Load any amount",
    parentSquareId: null,
    depth: 1,
    accent: "gold",
    sortOrder: 5,
  },
];

export function merchCollectionSlugToCollection(
  slug: string | undefined | null,
  fallback: MerchStoreCollection[]
): MerchStoreCollection | undefined {
  if (!slug) return undefined;
  return fallback.find((c) => c.slug === slug);
}
