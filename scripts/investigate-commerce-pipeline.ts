/**
 * One-off: live Square + ProductCache verification (run with network).
 * Usage: cd momos && set -a && . ./.env && set +a && npx tsx scripts/investigate-commerce-pipeline.ts
 */
import { prisma } from "../lib/prisma";
import { createSquareClientFromEnv } from "../lib/square/catalogDiscovery";
import {
  analyzeCatalogSnapshot,
  buildCatalogSnapshot,
  buildCommerceGraph,
} from "../lib/square/catalogDiscovery";
import { STORE_CATEGORY_NAME } from "../lib/square/storeCatalogSync";
import type { SquareClient } from "square";

function readParentCategoryId(obj: Record<string, unknown>): string | null {
  const cd = (obj.categoryData ?? obj.category_data) as Record<string, unknown> | undefined;
  if (!cd) return null;
  const p = (cd.parentCategory ?? cd.parent_category) as Record<string, unknown> | undefined;
  if (!p) return null;
  const id = (p.id ?? p.catalog_object_id) as string | undefined;
  return typeof id === "string" && id.length > 0 ? id : null;
}

function itemCategoriesFromRaw(item: Record<string, unknown>): string[] {
  const d = item.itemData ?? item.item_data;
  if (!d || typeof d !== "object") return [];
  const rec = d as {
    categories?: { id?: string }[];
    categoryIds?: string[];
    category_ids?: string[];
  };
  const fromObjs = rec.categories?.map((c) => c.id).filter((x): x is string => !!x) ?? [];
  if (fromObjs.length) return fromObjs;
  const ids = rec.categoryIds ?? rec.category_ids;
  return (ids ?? []).filter(Boolean);
}

async function loadCategoryParentMap(client: SquareClient): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  const pager = await client.catalog.list({ types: "CATEGORY" });
  for await (const obj of pager) {
    const o = obj as { type?: string; id?: string };
    if (o.type !== "CATEGORY" || !o.id) continue;
    map.set(o.id, readParentCategoryId(obj as unknown as Record<string, unknown>));
  }
  return map;
}

function categoryHasAncestor(
  categoryId: string,
  ancestorId: string,
  categoryParentById: Map<string, string | null>
): boolean {
  let cur: string | null | undefined = categoryId;
  const seen = new Set<string>();
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    if (cur === ancestorId) return true;
    cur = categoryParentById.get(cur) ?? null;
  }
  return false;
}

function itemLinkedUnderStore(
  item: Record<string, unknown>,
  storeId: string,
  parents: Map<string, string | null>
): boolean {
  for (const cid of itemCategoriesFromRaw(item)) {
    if (categoryHasAncestor(cid, storeId, parents)) return true;
  }
  return false;
}

async function resolveStoreCategoryId(client: SquareClient): Promise<string | null> {
  const pager = await client.catalog.list({ types: "CATEGORY" });
  for await (const obj of pager) {
    const o = obj as { type?: string; id?: string };
    if (o.type !== "CATEGORY" || !o.id) continue;
    const nm = (obj as { categoryData?: { name?: string } }).categoryData?.name?.trim();
    if (nm === STORE_CATEGORY_NAME) return o.id;
  }
  return null;
}

async function collectSearchItemIds(client: SquareClient, storeCategoryId: string): Promise<string[]> {
  const ids: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await client.catalog.searchItems({
      categoryIds: [storeCategoryId],
      limit: 100,
      cursor,
    });
    const items = page.items ?? [];
    for (const row of items) {
      const itemId =
        (row as { id?: string }).id ??
        (row as { catalogItem?: { id?: string } }).catalogItem?.id ??
        (row as { itemData?: { itemId?: string } }).itemData?.itemId;
      if (!itemId) continue;
      ids.push(itemId);
    }
    cursor = page.cursor ?? undefined;
  } while (cursor);
  return [...new Set(ids)];
}

async function main() {
  const client = createSquareClientFromEnv();
  console.log("--- Phase 1: discovery snapshot ---");
  const snapshot = await buildCatalogSnapshot(client);
  const report = await analyzeCatalogSnapshot(snapshot, client, { includeInventory: false });
  const graph = buildCommerceGraph(snapshot, report);

  const storeCats = [...snapshot.byId.values()].filter(
    (s) => s.type === "CATEGORY" && (s.categoryName?.trim() === STORE_CATEGORY_NAME)
  );
  console.log(JSON.stringify({
    reportHead: {
      itemsTotal: report.items?.totalItems,
      categories: report.countsByType?.["CATEGORY"],
      modifiers: report.modifiers,
    },
    storeCategoryCandidates: storeCats.map((c) => ({ id: c.id, name: c.categoryName })),
    graphCounts: {
      items: graph.items?.length,
      shopDomain: graph.items?.filter((i) => i.storefrontDomain === "shop").length,
      menuDomain: graph.items?.filter((i) => i.storefrontDomain === "menu").length,
      ambiguousDomain: graph.items?.filter((i) => i.storefrontDomain === "ambiguous").length,
    },
  }, null, 2));

  const storeId = await resolveStoreCategoryId(client);
  const parents = await loadCategoryParentMap(client);
  const searchIds = storeId ? await collectSearchItemIds(client, storeId) : [];
  const shopGraphIds = graph.items
    .filter((i) => i.storefrontDomain === "shop")
    .map((i) => i.squareItemId);
  const searchSet = new Set(searchIds);
  const inShopGraphNotSearch = shopGraphIds.filter((id) => !searchSet.has(id));

  let itemListStoreTreeCount = 0;
  if (storeId) {
    const pagerItems = await client.catalog.list({ types: "ITEM" });
    for await (const raw of pagerItems) {
      const o = raw as { type?: string; id?: string };
      if (o.type !== "ITEM" || !o.id) continue;
      if (itemLinkedUnderStore(raw as unknown as Record<string, unknown>, storeId, parents)) {
        itemListStoreTreeCount++;
      }
    }
  }

  console.log("\n--- Store sync filter audit ---");
  console.log(
    JSON.stringify(
      {
        storeCategoryId: storeId,
        searchItemsCount: searchIds.length,
        shopItemsByDiscoveryGraph: shopGraphIds.length,
        itemIdsShopInGraphButMissingFromSearch: inShopGraphNotSearch,
        itemsInStoreTreeViaCatalogListAndAncestry: itemListStoreTreeCount,
        listAncestryMatchesGraphShopCount: itemListStoreTreeCount === shopGraphIds.length,
      },
      null,
      2
    )
  );

  if (!storeId || searchIds.length === 0) {
    console.log("(skip batch compare: no store id or zero search results)");
  } else {
    const batch: unknown[] = [];
    for (let i = 0; i < searchIds.length; i += 100) {
      const chunk = searchIds.slice(i, i + 100);
      const res = await client.catalog.batchGet({
        objectIds: chunk,
        includeRelatedObjects: false,
      });
      batch.push(...(res.objects ?? []));
    }
    let direct = 0;
    let ancestry = 0;
    let neither = 0;
    const samples: unknown[] = [];
    for (const raw of batch) {
      const obj = raw as { type?: string; id?: string };
      if (obj.type !== "ITEM" || !obj.id) continue;
      const cats = itemCategoriesFromRaw(raw as Record<string, unknown>);
      const hasDirect = cats.includes(storeId);
      const hasAnc = itemLinkedUnderStore(raw as Record<string, unknown>, storeId, parents);
      if (hasDirect) direct++;
      if (hasAnc) ancestry++;
      if (!hasAnc) neither++;
      if (samples.length < 8 && !hasDirect && hasAnc) {
        samples.push({
          id: obj.id,
          name: (raw as { itemData?: { name?: string } }).itemData?.name,
          categoryIdsOnItem: cats,
        });
      }
    }
    console.log(JSON.stringify({
      itemsBatchFetched: batch.filter((x) => (x as { type?: string }).type === "ITEM").length,
      itemsWithStoreIdDirectlyOnItem: direct,
      itemsLinkedByAncestry: ancestry,
      itemsNotLinkedByAncestry: neither,
      sampleNestedOnly: samples,
    }, null, 2));
  }

  console.log("\n--- Phase 5: ProductCache (DB) ---");
  try {
    const [pc, pvc, syncState] = await Promise.all([
      prisma.productCache.count(),
      prisma.productVariantCache.count(),
      prisma.catalogSyncState.findUnique({ where: { id: "singleton" } }),
    ]);
    console.log(JSON.stringify({ productCacheRows: pc, productVariantCacheRows: pvc, catalogSyncState: syncState }, null, 2));
  } catch (e) {
    console.log(JSON.stringify({ dbError: String(e) }, null, 2));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
