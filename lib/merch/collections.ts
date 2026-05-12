import type { StoreCollectionId } from "@/types/merch";

export interface StoreCollection {
  id: StoreCollectionId;
  /** Square CATEGORY id — populate when Catalog sync is live */
  squareCategoryId?: string;
  title: string;
  tagline: string;
  /** Tailwind accent for featured cards */
  accent: "teal" | "gold" | "red" | "charcoal";
}

/** Canonical tabs / filters — order matches suggested UX */
export const STORE_COLLECTIONS: StoreCollection[] = [
  {
    id: "apparel",
    title: "Apparel",
    tagline: "Tees & everyday layers",
    accent: "teal",
  },
  {
    id: "hoodies",
    title: "Hoodies",
    tagline: "Midweight & cozy",
    accent: "charcoal",
  },
  {
    id: "hats",
    title: "Hats",
    tagline: "Caps & beanies",
    accent: "gold",
  },
  {
    id: "drinkware",
    title: "Drinkware",
    tagline: "Mugs & cups",
    accent: "red",
  },
  {
    id: "accessories",
    title: "Accessories",
    tagline: "Totes & extras",
    accent: "teal",
  },
  {
    id: "gift_cards",
    title: "Gift Cards",
    tagline: "Load any amount",
    accent: "gold",
  },
];

/** Hero “featured shop” ribbons — subset for horizontal scroll */
export const FEATURED_COLLECTION_IDS: StoreCollectionId[] = [
  "apparel",
  "hoodies",
  "drinkware",
  "gift_cards",
];

export function collectionById(id: StoreCollectionId): StoreCollection | undefined {
  return STORE_COLLECTIONS.find((c) => c.id === id);
}
