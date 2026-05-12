import type { SquareClient } from "square";
import { STORE_CATEGORY_NAME } from "@/lib/square/storeCatalogSync";
import type {
  CatalogAnalysisReport,
  CategoryTreeNode,
  CommerceGraph,
  ItemInspection,
  NormalizedCategoryRef,
  NormalizedItemNode,
  NormalizedModifierListRef,
} from "./types";
import type { CatalogSnapshot } from "./snapshot";

function getCategoryAncestry(
  categoryId: string,
  byId: CatalogSnapshot["byId"]
): { ids: string[]; names: string[] } {
  const ids: string[] = [];
  const names: string[] = [];
  let cur: string | null = categoryId;
  const seen = new Set<string>();
  while ( cur && !seen.has(cur)) {
    seen.add(cur);
    ids.push(cur);
    const s = byId.get(cur);
    names.push(s?.categoryName ?? "?");
    const parent = s?.parentCategoryId ?? null;
    cur = parent;
  }
  return { ids, names };
}

export function buildCategoryTree(byId: CatalogSnapshot["byId"]): CategoryTreeNode[] {
  const cats = [...byId.values()].filter((s) => s.type === "CATEGORY");
  const byCatId = new Map<string, CategoryTreeNode>();

  for (const c of cats) {
    const { ids: ancIds, names: ancNames } = getCategoryAncestry(c.id, byId);
    byCatId.set(c.id, {
      id: c.id,
      name: c.categoryName ?? c.id,
      ordinal: c.ordinal ?? 0,
      parentId: c.parentCategoryId ?? null,
      children: [],
      depth: ancIds.length - 1,
      ancestryIds: ancIds,
      ancestryNames: ancNames,
    });
  }

  for (const node of byCatId.values()) {
    if (node.parentId && byCatId.has(node.parentId)) {
      byCatId.get(node.parentId)!.children.push(node);
    }
  }

  const roots = [...byCatId.values()].filter(
    (n) => !n.parentId || !byCatId.has(n.parentId)
  );
  for (const r of roots) {
    sortTree(r);
  }
  return roots.sort((a, b) => a.ordinal - b.ordinal || a.name.localeCompare(b.name));
}

function sortTree(node: CategoryTreeNode) {
  node.children.sort((a, b) => a.ordinal - b.ordinal || a.name.localeCompare(b.name));
  for (const c of node.children) sortTree(c);
}

function itemUnderStoreCategory(
  categoryIds: string[],
  storeIds: Set<string>,
  byId: CatalogSnapshot["byId"]
): boolean {
  for (const cid of categoryIds) {
    if (storeIds.has(cid)) return true;
    const { ids } = getCategoryAncestry(cid, byId);
    for (const a of ids) {
      if (storeIds.has(a)) return true;
    }
  }
  return false;
}

function inferStorefrontDomain(
  item: ItemInspection,
  underStore: boolean
): { domain: "menu" | "shop" | "ambiguous"; confidence: "low" | "medium" | "high"; reasons: string[] } {
  const reasons: string[] = [];
  if (underStore) {
    reasons.push("Linked (directly or by ancestry) to Square category named Store");
    return { domain: "shop", confidence: "high", reasons };
  }
  if (item.categoryIds.length === 0) {
    reasons.push("No category_ids on ITEM — cannot classify from hierarchy");
    return { domain: "ambiguous", confidence: "low", reasons };
  }
  reasons.push("Categories present but none under Store root → treated as menu-facing POS catalog");
  return { domain: "menu", confidence: "medium", reasons };
}

export function inspectItem(id: string, byId: CatalogSnapshot["byId"]): ItemInspection | null {
  const s = byId.get(id);
  if (!s || s.type !== "ITEM") return null;

  const categoryNames = s.categoryIds.map((cid) => byId.get(cid)?.categoryName ?? cid);
  const categoryAncestryRows = s.categoryIds.map((cid) => {
    const { names } = getCategoryAncestry(cid, byId);
    return { categoryId: cid, names };
  });

  const variations = s.variationIds
    .map((vid) => {
      const v = byId.get(vid);
      if (!v || v.type !== "ITEM_VARIATION") return null;
      return {
        id: vid,
        name: v.variationName,
        sku: v.sku,
        priceAmount: v.priceAmount,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const modifierListIdsFromItem = s.modifierListInfoEntries.map((e) => e.modifierListId);
  const modifierListResolution = modifierListIdsFromItem.map((listId) => {
    const list = byId.get(listId);
    if (!list || list.type !== "MODIFIER_LIST") {
      return {
        listId,
        resolved: false,
        listName: undefined as string | undefined,
        modifierOptionIds: [] as string[],
        brokenOptionRefs: [] as string[],
      };
    }
    const brokenOptionRefs = list.modifierChildIds.filter((mid) => {
      const m = byId.get(mid);
      return !m || m.type !== "MODIFIER";
    });
    return {
      listId,
      resolved: true,
      listName: list.modifierListName,
      modifierOptionIds: list.modifierChildIds,
      brokenOptionRefs,
    };
  });

  return {
    id: s.id,
    name: s.itemName ?? s.id,
    productType: s.productType,
    categoryIds: s.categoryIds,
    categoryNames,
    categoryAncestry: categoryAncestryRows,
    isDeleted: s.isDeleted,
    variationCount: variations.length,
    variations,
    modifierListIdsFromItem,
    modifierListResolution,
    imageIds: s.imageIds,
  };
}

async function optionalInventoryStats(
  client: SquareClient,
  byId: CatalogSnapshot["byId"]
): Promise<CatalogAnalysisReport["inventory"] | undefined> {
  const locationId = process.env.SQUARE_LOCATION_ID?.trim();
  if (!locationId) return undefined;

  const variationIds = [...byId.values()]
    .filter((s) => s.type === "ITEM_VARIATION")
    .map((s) => s.id);

  let inStockPositive = 0;
  let zeroOrMissing = 0;
  const counts = new Map<string, number>();

  for (let i = 0; i < variationIds.length; i += 100) {
    const chunk = variationIds.slice(i, i + 100);
    try {
      const pager = await client.inventory.batchGetCounts({
        catalogObjectIds: chunk,
        locationIds: [locationId],
      });
      for await (const row of pager) {
        const id = row.catalogObjectId;
        if (!id) continue;
        if (row.state && row.state !== "IN_STOCK") continue;
        const rawQ = row.quantity;
        if (rawQ === undefined || rawQ === null) continue;
        const q = Number(rawQ);
        if (!Number.isFinite(q)) continue;
        counts.set(id, (counts.get(id) ?? 0) + q);
      }
    } catch {
      /* inventory optional */
    }
  }

  for (const vid of variationIds) {
    const q = counts.get(vid) ?? 0;
    if (q > 0) inStockPositive += 1;
    else zeroOrMissing += 1;
  }

  return {
    locationId,
    variationsChecked: variationIds.length,
    inStockPositive,
    zeroOrMissing,
  };
}

export async function analyzeCatalogSnapshot(
  snapshot: CatalogSnapshot,
  client: SquareClient,
  options: { includeInventory?: boolean } = {}
): Promise<CatalogAnalysisReport> {
  const { byId } = snapshot;
  const countsByType: Record<string, number> = {};
  for (const s of byId.values()) {
    countsByType[s.type] = (countsByType[s.type] ?? 0) + 1;
  }

  const categoryTree = buildCategoryTree(byId);
  const exactStoreNames = [...byId.values()].filter(
    (s) =>
      s.type === "CATEGORY" &&
      (s.categoryName?.trim() === STORE_CATEGORY_NAME ||
        s.categoryName?.trim().toLowerCase() === STORE_CATEGORY_NAME.toLowerCase())
  );
  const storeCategoryIds = new Set(exactStoreNames.map((s) => s.id));

  const items = [...byId.values()].filter((s) => s.type === "ITEM");
  const itemsWithNoCategory: string[] = [];
  const itemsWithMultipleCategories: Array<{ id: string; categoryIds: string[] }> =
    [];

  for (const it of items) {
    if (it.categoryIds.length === 0) itemsWithNoCategory.push(it.id);
    if (it.categoryIds.length > 1) {
      itemsWithMultipleCategories.push({ id: it.id, categoryIds: [...it.categoryIds] });
    }
  }

  const listIdsPresent = new Set(
    [...byId.values()].filter((s) => s.type === "MODIFIER_LIST").map((s) => s.id)
  );
  const modifierIdsPresent = new Set(
    [...byId.values()].filter((s) => s.type === "MODIFIER").map((s) => s.id)
  );

  const referencedListIds = new Set<string>();
  const missingModifierListsReferencedByItems = new Set<string>();
  const itemsWithBrokenModifierOptionRefs: Array<{
    itemId: string;
    listId: string;
    missingIds: string[];
  }> = [];

  for (const it of items) {
    for (const e of it.modifierListInfoEntries) {
      referencedListIds.add(e.modifierListId);
      if (!listIdsPresent.has(e.modifierListId)) {
        missingModifierListsReferencedByItems.add(e.modifierListId);
      }
    }
    const inspection = inspectItem(it.id, byId);
    if (!inspection) continue;
    for (const res of inspection.modifierListResolution) {
      if (res.resolved && res.brokenOptionRefs.length > 0) {
        itemsWithBrokenModifierOptionRefs.push({
          itemId: it.id,
          listId: res.listId,
          missingIds: res.brokenOptionRefs,
        });
      }
    }
  }

  const orphanModifiers = [...byId.values()]
    .filter((s) => s.type === "MODIFIER")
    .filter((s) => {
      const lid = s.modifierListId;
      if (!lid) return true;
      return !listIdsPresent.has(lid);
    })
    .map((s) => s.id);

  const storefrontClassificationSample: CatalogAnalysisReport["storefrontClassificationSample"] =
    [];
  for (const it of items.slice(0, 80)) {
    const inspection = inspectItem(it.id, byId);
    if (!inspection) continue;
    const under = itemUnderStoreCategory(it.categoryIds, storeCategoryIds, byId);
    const { domain, confidence, reasons } = inferStorefrontDomain(inspection, under);
    storefrontClassificationSample.push({
      itemId: it.id,
      name: inspection.name,
      inferredDomain: domain,
      confidence,
      reasons,
    });
  }

  const inventory = options.includeInventory
    ? await optionalInventoryStats(client, byId)
    : undefined;

  return {
    generatedAt: new Date().toISOString(),
    environment: snapshot.environment,
    countsByType,
    categoryTree,
    storeCategorySignals: {
      exactNameMatchCategoryIds: [...storeCategoryIds],
      note:
        'Categories whose name equals "' +
        STORE_CATEGORY_NAME +
        '" (case-insensitive match included for detection). Descendants inherit Store ancestry in analysis.',
    },
    items: {
      totalItems: items.length,
      itemsWithNoCategory,
      itemsWithMultipleCategories,
    },
    modifiers: {
      modifierLists: listIdsPresent.size,
      modifiers: modifierIdsPresent.size,
      orphanModifiers,
      missingModifierListsReferencedByItems: [...missingModifierListsReferencedByItems],
      itemsWithBrokenModifierOptionRefs,
    },
    inventory,
    storefrontClassificationSample,
  };
}

export function buildCommerceGraph(
  snapshot: CatalogSnapshot,
  report: CatalogAnalysisReport
): CommerceGraph {
  const { byId } = snapshot;

  const categories: NormalizedCategoryRef[] = [...byId.values()]
    .filter((s) => s.type === "CATEGORY")
    .map((s) => {
      const { ids } = getCategoryAncestry(s.id, byId);
      return {
        squareId: s.id,
        name: s.categoryName ?? s.id,
        parentSquareId: s.parentCategoryId ?? null,
        ancestrySquareIds: ids,
      };
    });

  const modifierLists: NormalizedModifierListRef[] = [...byId.values()]
    .filter((s) => s.type === "MODIFIER_LIST")
    .map((s) => ({
      squareId: s.id,
      name: s.modifierListName ?? s.id,
      selectionType: s.selectionType ?? "UNKNOWN",
      minSelected: s.minSelected ?? 0,
      maxSelected: s.maxSelected ?? 0,
      optionModifierIds: [...s.modifierChildIds],
    }));

  const storeIds = new Set(report.storeCategorySignals.exactNameMatchCategoryIds);

  const items: NormalizedItemNode[] = [];
  for (const s of byId.values()) {
    if (s.type !== "ITEM") continue;
    const inspection = inspectItem(s.id, byId);
    if (!inspection) continue;
    const under = itemUnderStoreCategory(s.categoryIds, storeIds, byId);
    const { domain, reasons } = inferStorefrontDomain(inspection, under);
    const node: NormalizedItemNode = {
      squareItemId: s.id,
      name: s.itemName ?? s.id,
      categorySquareIds: [...s.categoryIds],
      variationSquareIds: [...s.variationIds],
      modifierListSquareIds: s.modifierListInfoEntries.map((e) => e.modifierListId),
      imageSquareIds: [...s.imageIds],
      storefrontDomain: domain,
      storefrontReasons: reasons,
    };
    if (s.productType !== undefined) {
      node.productType = s.productType;
    }
    items.push(node);
  }

  return {
    version: 1,
    categories,
    modifierLists,
    items,
  };
}

export function buildAllItemInspections(snapshot: CatalogSnapshot): ItemInspection[] {
  return [...snapshot.byId.values()]
    .filter((s) => s.type === "ITEM")
    .map((s) => inspectItem(s.id, snapshot.byId))
    .filter((x): x is ItemInspection => x !== null);
}
