/**
 * Shop catalog DTOs — normalized for `/api/products/store` + `/shop` (not raw Square).
 */

export type MerchCollectionAccent = "teal" | "gold" | "red" | "charcoal";

/** One row in the Store subtree (Square CATEGORY), used for filters + featured bands. */
export interface MerchStoreCollection {
  /** Stable filter id for UI + `MerchProduct.collectionId` */
  slug: string;
  squareId: string;
  title: string;
  tagline: string;
  parentSquareId: string | null;
  depth: number;
  accent: MerchCollectionAccent;
  sortOrder: number;
}
