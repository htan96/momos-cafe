import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mapProductCacheRows } from "@/lib/merch/mapProductCacheToMerch";
import { merchCatalog } from "@/lib/merch/mockCatalog";
import {
  merchCollectionsForFilterStrip,
  merchStoreCollectionsFromSyncStats,
} from "@/lib/merch/merchCollectionsFromStats";
import { MERCH_FALLBACK_COLLECTIONS } from "@/lib/merch/collections";

/**
 * Public read-model for `/shop` — backed by Square-synced ProductCache when available.
 */
export async function GET() {
  const syncHint = await prisma.catalogSyncState.findUnique({ where: { id: "singleton" } });

  const rows = await prisma.productCache.findMany({
    where: { isAvailable: true },
    include: { variants: true },
    orderBy: { title: "asc" },
  });

  const collections = merchStoreCollectionsFromSyncStats(
    syncHint?.lastSyncStats,
    syncHint?.storeCategorySquareId ?? null
  );

  const slugForSquareId = new Map<string, string>();
  for (const c of collections) {
    slugForSquareId.set(c.squareId, c.slug);
  }

  const mapCtx = {
    collectionSlugForCategorySquareId: (squareId: string) => slugForSquareId.get(squareId),
  };

  const filterCollections = merchCollectionsForFilterStrip(collections);

  if (rows.length === 0) {
    const allowMock =
      process.env.PRODUCTS_STORE_FALLBACK_MOCK === "1" || process.env.NODE_ENV !== "production";
    if (allowMock) {
      return NextResponse.json({
        source: "mock_catalog_fallback",
        products: merchCatalog,
        collections: MERCH_FALLBACK_COLLECTIONS,
        filterCollections: MERCH_FALLBACK_COLLECTIONS,
        featuredCollections: MERCH_FALLBACK_COLLECTIONS.slice(0, 6),
        storeRootSquareId: null as string | null,
        catalogSync: syncHint,
      });
    }
    return NextResponse.json({
      source: "product_cache",
      products: [],
      collections,
      filterCollections,
      featuredCollections: filterCollections.slice(0, 6),
      storeRootSquareId: syncHint?.storeCategorySquareId ?? null,
      catalogSync: syncHint,
      note: "Store catalog cache empty — run POST /api/square/catalog/sync (authenticated).",
    });
  }

  return NextResponse.json({
    source: "product_cache",
    products: mapProductCacheRows(rows, mapCtx),
    collections,
    filterCollections,
    featuredCollections: filterCollections.slice(0, 6),
    storeRootSquareId: syncHint?.storeCategorySquareId ?? null,
    catalogSync: syncHint,
  });
}
