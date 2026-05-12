import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mapProductCacheRows } from "@/lib/merch/mapProductCacheToMerch";
import { merchCatalog } from "@/lib/merch/mockCatalog";

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

  if (rows.length === 0) {
    const allowMock =
      process.env.PRODUCTS_STORE_FALLBACK_MOCK === "1" || process.env.NODE_ENV !== "production";
    if (allowMock) {
      return NextResponse.json({
        source: "mock_catalog_fallback",
        products: merchCatalog,
        catalogSync: syncHint,
      });
    }
    return NextResponse.json({
      source: "product_cache",
      products: [],
      catalogSync: syncHint,
      note: "Store catalog cache empty — run POST /api/square/catalog/sync (authenticated).",
    });
  }

  return NextResponse.json({
    source: "product_cache",
    products: mapProductCacheRows(rows),
    catalogSync: syncHint,
  });
}
