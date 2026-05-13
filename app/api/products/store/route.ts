import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mapProductCacheRows } from "@/lib/merch/mapProductCacheToMerch";
import { merchCatalog } from "@/lib/merch/mockCatalog";
import {
  merchFallbackFeaturedCollections,
  merchFallbackFilterCollections,
} from "@/lib/merch/collections";
import { merchStoreCollectionsFromSyncStats } from "@/lib/merch/merchCollectionsFromStats";
import {
  retailFeaturedMerchStoreCollections,
  retailFilterMerchStoreCollections,
} from "@/lib/commerce/retailTaxonomy";

/**
 * Public read-model for `/shop` — backed by Square-synced ProductCache when available.
 * Filter + featured bands derive from `lib/commerce/retailTaxonomy` and current inventory (non-empty pills only).
 */
export async function GET() {
  const syncHint = await prisma.catalogSyncState.findUnique({ where: { id: "singleton" } });

  const rows = await prisma.productCache.findMany({
    where: { isAvailable: true },
    include: { variants: true },
    orderBy: { title: "asc" },
  });

  const syncCollections = merchStoreCollectionsFromSyncStats(
    syncHint?.lastSyncStats,
    syncHint?.storeCategorySquareId ?? null
  );

  const nameByCatId = new Map(syncCollections.map((c) => [c.squareId, c.title]));

  const mapCtx = {
    collectionSlugForCategorySquareId: (squareId: string) =>
      syncCollections.find((c) => c.squareId === squareId)?.slug,
    categoryNameForSquareId: (squareId: string) => nameByCatId.get(squareId),
  };

  if (rows.length === 0) {
    const allowMock =
      process.env.PRODUCTS_STORE_FALLBACK_MOCK === "1" || process.env.NODE_ENV !== "production";
    if (allowMock) {
      const fc = merchFallbackFilterCollections();
      return NextResponse.json({
        source: "mock_catalog_fallback",
        products: merchCatalog,
        collections: fc,
        filterCollections: fc,
        featuredCollections: merchFallbackFeaturedCollections(),
        storeRootSquareId: null as string | null,
        catalogSync: syncHint,
      });
    }
    return NextResponse.json({
      source: "product_cache",
      products: [],
      collections: [],
      filterCollections: [],
      featuredCollections: [],
      storeRootSquareId: syncHint?.storeCategorySquareId ?? null,
      catalogSync: syncHint,
      note: "Store catalog cache empty — run POST /api/square/catalog/sync (authenticated).",
    });
  }

  const products = mapProductCacheRows(rows, mapCtx);
  const filterCollections = retailFilterMerchStoreCollections(products);
  const featuredCollections = retailFeaturedMerchStoreCollections(products);

  return NextResponse.json({
    source: "product_cache",
    products,
    collections: filterCollections,
    filterCollections,
    featuredCollections,
    storeRootSquareId: syncHint?.storeCategorySquareId ?? null,
    catalogSync: syncHint,
  });
}
