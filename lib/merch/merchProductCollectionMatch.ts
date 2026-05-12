import type { MerchProduct, MerchCollectionId } from "@/types/merch";
import type { MerchStoreCollection } from "@/types/merchCatalog";

/**
 * Matches `MerchProduct` leaf / ancestry against one Store-backed collection chip.
 */
export function merchProductMatchesCollection(
  product: MerchProduct,
  collection: MerchStoreCollection,
  slugForSquareId: Map<string, string>
): boolean {
  if (product.collectionId === collection.slug) return true;
  const ancestry = product.squareCategoryAncestryLeafFirst;
  if (!ancestry?.length) return false;
  for (const sqId of ancestry) {
    if (sqId === collection.squareId) return true;
    if (slugForSquareId.get(sqId) === collection.slug) return true;
  }
  return false;
}

export type MerchFilterId = MerchCollectionId | "all";
