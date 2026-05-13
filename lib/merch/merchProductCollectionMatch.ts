import type { MerchProduct, MerchCollectionId } from "@/types/merch";
import type { MerchStoreCollection } from "@/types/merchCatalog";
import { merchProductMatchesRetailCollection } from "@/lib/commerce/retailTaxonomy";

/**
 * Matches `MerchProduct` against a filter chip — retail taxonomy ids first, then legacy Square tree slugs.
 */
export function merchProductMatchesCollection(
  product: MerchProduct,
  collection: MerchStoreCollection,
  slugForSquareId: Map<string, string>
): boolean {
  if (merchProductMatchesRetailCollection(product, collection.slug as MerchCollectionId)) return true;
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
