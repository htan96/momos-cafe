import { SquareClient, SquareEnvironment } from "square";
import type { MenuCategory, MenuItem as MenuItemType } from "@/types/menu";
import type { ModifierGroup } from "@/types/ordering";
import { inferCategoryType, sortCategories } from "@/lib/categoryUtils";
import { STORE_CATEGORY_NAME } from "@/lib/square/storeCatalogSync";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Match Square category name to the retail `Store` root (same identifier as store catalog sync). */
function categoryNameMatchesStoreMenu(name: string): boolean {
  const t = name.trim();
  return t === STORE_CATEGORY_NAME || t.toLowerCase() === STORE_CATEGORY_NAME.toLowerCase();
}

function readParentCategoryIdMenu(catObj: Record<string, unknown>): string | null {
  const cd = (catObj.categoryData ?? catObj.category_data) as Record<string, unknown> | undefined;
  if (!cd) return null;
  const p = (cd.parentCategory ?? cd.parent_category) as Record<string, unknown> | undefined;
  if (!p) return null;
  const id = (p.id ?? p.catalog_object_id) as string | undefined;
  return typeof id === "string" && id.length > 0 ? id : null;
}

/** Walk ancestors — true if this category id is the Store root or nested under it. */
function categoryIsUnderStoreBranch(
  categoryId: string,
  storeNamedCategoryIds: Set<string>,
  parentByCategoryId: Map<string, string | null>
): boolean {
  let cur: string | null | undefined = categoryId;
  const seen = new Set<string>();
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    if (storeNamedCategoryIds.has(cur)) return true;
    cur = parentByCategoryId.get(cur) ?? null;
  }
  return false;
}

function itemCategoryIdsFromMenuItemData(itemData: Record<string, unknown>): string[] {
  const cats = itemData.categories as Array<{ id?: string }> | undefined;
  const fromObjs = (cats ?? []).map((c) => c.id).filter((x): x is string => !!x);
  if (fromObjs.length) return [...new Set(fromObjs)];
  const single = itemData.categoryId ?? itemData.category_id;
  const extra = (itemData.categoryIds ?? itemData.category_ids) as string[] | undefined;
  const combo = [
    ...(typeof single === "string" && single.length > 0 ? [single] : []),
    ...((extra ?? []).filter((x) => typeof x === "string" && x.length > 0)),
  ];
  return [...new Set(combo)];
}

/**
 * Pick a menu bucket from Square categories on the item, excluding the Store branch.
 * If every linked category is under Store (merch), the item is omitted from the food menu.
 */
function pickMenuCategoryId(
  itemData: Record<string, unknown>,
  storeNamedCategoryIds: Set<string>,
  parentByCategoryId: Map<string, string | null>
): string | null {
  const ids = itemCategoryIdsFromMenuItemData(itemData);
  if (ids.length === 0) return "uncategorized";
  for (const id of ids) {
    if (!categoryIsUnderStoreBranch(id, storeNamedCategoryIds, parentByCategoryId)) {
      return id;
    }
  }
  return null;
}

function catalogImageObjectUrl(obj: Record<string, unknown>): string | undefined {
  const d = (obj.imageData ?? obj.image_data) as Record<string, unknown> | undefined;
  const url = d?.url;
  return typeof url === "string" && url.length > 0 ? url : undefined;
}

/** Set `DEBUG_MENU_MODIFIERS=1` to log modifier list IDs through Square → menu mapping. */
const DEBUG_MENU_MODIFIERS = process.env.DEBUG_MENU_MODIFIERS === "1";

/**
 * When `MENU_MODIFIER_VALIDATION=1`: require batchGet per item (no list fallback), log batch vs list,
 * emit violation warnings, and log group construction. For investigation only.
 */
const MENU_MODIFIER_VALIDATION = process.env.MENU_MODIFIER_VALIDATION === "1";

function safeJsonClone<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_, v) => (typeof v === "bigint" ? v.toString() : v))
  ) as T;
}

/** Returned when `GET /api/menu?debugItemId=<Square ITEM id>` is used. */
export type MenuModifierItemDebug = {
  itemId: string;
  /** Which `itemData` drove `listInfo` for groups (or `unavailable` if item skipped before build). */
  itemDataSource: "batch" | "list_fallback" | "unavailable";
  batchModifierListInfo: unknown;
  listCatalogModifierListInfo: unknown;
  /** modifierListId / modifier_list_id values from the same `itemData` used to build `listInfo`. */
  attachedModifierListIdsFromItemDataUsed: string[];
  finalModifierGroups: Array<{
    id: string;
    name: string;
    type: string;
    optionIds: string[];
  }>;
  /** Same as `finalModifierGroups.map(g => g.id)` — for quick diff vs `attachedModifierListIdsFromItemDataUsed`. */
  finalModifierListIds: string[];
  /**
   * If non-empty, a group was emitted without a matching listInfo row — should be impossible with current logic.
   * Used to prove Case B (code bug) vs empty (Case A: every group id came from listInfo).
   */
  groupsNotBackedByListInfo: string[];
  /**
   * List ids present on item `modifierListInfo` but absent from final output (unknown list, empty options, etc.).
   */
  listInfoListIdsWithoutGroup: string[];
  groupCount: number;
  listInfoCount: number;
  /** True when `MENU_MODIFIER_VALIDATION=1` and item was skipped (no batch row). */
  skippedNoBatch?: boolean;
  notFound?: boolean;
  skippedArchived?: boolean;
};

export type GetMenuFromSquareResult = {
  categories: MenuCategory[];
  /** Populated when `options.debugItemId` matches a processed ITEM catalog id. */
  debugItemComparison?: MenuModifierItemDebug;
};

function modifierListIdsFromListInfo(
  listInfo: Array<{ modifierListId?: string; modifier_list_id?: string }>
): string[] {
  return listInfo
    .map((i) => i.modifierListId ?? i.modifier_list_id)
    .filter((x): x is string => typeof x === "string" && x.length > 0);
}

type VariationLike = {
  type?: string;
  id?: string;
  catalogObjectId?: string;
  catalog_object_id?: string;
  itemVariationData?: {
    priceMoney?: { amount?: string };
    price_money?: { amount?: string };
    imageIds?: string[];
    image_ids?: string[];
    itemId?: string;
    item_id?: string;
  };
  item_variation_data?: {
    price_money?: { amount?: string };
    image_ids?: string[];
    item_id?: string;
  };
};

/**
 * Square catalog may return a full ITEM_VARIATION (with `id`) or a thin reference
 * (`catalogObjectId` / `catalog_object_id` only).
 */
function variationIdFromEmbeddedVariation(v: unknown): string | null {
  if (!v || typeof v !== "object") return null;
  const o = v as VariationLike;
  if (typeof o.id === "string" && o.id.length > 0) return o.id;
  if (typeof o.catalogObjectId === "string" && o.catalogObjectId.length > 0) {
    return o.catalogObjectId;
  }
  if (typeof o.catalog_object_id === "string" && o.catalog_object_id.length > 0) {
    return o.catalog_object_id;
  }
  return null;
}

function priceAndImagesFromVariationData(
  ivd: VariationLike["itemVariationData"] | VariationLike["item_variation_data"] | undefined
): { priceMoney?: { amount?: string }; imageIds?: string[] } {
  if (!ivd || typeof ivd !== "object") return {};
  const priceMoney =
    (ivd as { priceMoney?: { amount?: string } }).priceMoney ??
    (ivd as { price_money?: { amount?: string } }).price_money;
  const imageIds =
    (ivd as { imageIds?: string[] }).imageIds ??
    (ivd as { image_ids?: string[] }).image_ids;
  return {
    ...(priceMoney ? { priceMoney } : {}),
    ...(imageIds?.length ? { imageIds } : {}),
  };
}

function variationDataFromEmbedded(v: unknown): { priceMoney?: { amount?: string }; imageIds?: string[] } {
  if (!v || typeof v !== "object") return {};
  const o = v as VariationLike;
  const raw = o.itemVariationData ?? o.item_variation_data;
  return priceAndImagesFromVariationData(raw);
}

function enrichVariationFromAllObjects(
  variationId: string,
  allObjects: Array<{ type: string; id: string; [key: string]: unknown }>
): { priceMoney?: { amount?: string }; imageIds?: string[] } {
  const o = allObjects.find((x) => x.id === variationId && x.type === "ITEM_VARIATION");
  if (!o) return {};
  const raw =
    (o as VariationLike).itemVariationData ?? (o as VariationLike).item_variation_data;
  return priceAndImagesFromVariationData(raw);
}

/**
 * First variation id + pricing for an ITEM: embedded `variations[]`, then catalog scan by parent item id.
 */
function resolveMenuItemVariation(
  itemCatalogId: string,
  variations: unknown[] | undefined,
  allObjects: Array<{ type: string; id: string; [key: string]: unknown }>
): { variationId: string | null; variationData: { priceMoney?: { amount?: string }; imageIds?: string[] } } {
  const first = variations?.[0];
  let variationId = variationIdFromEmbeddedVariation(first);
  let variationData = variationDataFromEmbedded(first);

  if (variationId && Object.keys(variationData).length === 0) {
    variationData = enrichVariationFromAllObjects(variationId, allObjects);
  }

  if (!variationId) {
    for (const o of allObjects) {
      if (o.type !== "ITEM_VARIATION") continue;
      const raw =
        (o as VariationLike).itemVariationData ?? (o as VariationLike).item_variation_data;
      const parentId =
        (raw as { itemId?: string; item_id?: string } | undefined)?.itemId ??
        (raw as { item_id?: string } | undefined)?.item_id;
      if (parentId === itemCatalogId && typeof o.id === "string" && o.id.length > 0) {
        variationId = o.id;
        variationData = priceAndImagesFromVariationData(raw);
        break;
      }
    }
  }

  return { variationId, variationData };
}

export async function getMenuFromSquare(options?: {
  debugItemId?: string;
}): Promise<GetMenuFromSquareResult> {
  const token = process.env.SQUARE_ACCESS_TOKEN;

  if (!token) {
    throw new Error("SQUARE_ACCESS_TOKEN is required");
  }

  const environment =
    process.env.SQUARE_ENVIRONMENT === "production"
      ? SquareEnvironment.Production
      : SquareEnvironment.Sandbox;

  const client = new SquareClient({
    token,
    environment,
  });

  const imageMap = new Map<string, string>();
  const categoriesMap = new Map<
    string,
    { id: string; name: string; slug: string; ordinal: number }
  >();
  /** Parent links for CATEGORY objects (Square `parentCategory` / `parent_category`). */
  const categoryParentById = new Map<string, string | null>();
  /** CATEGORY ids whose name is the retail `Store` root (case-insensitive). */
  const storeNamedCategoryIds = new Set<string>();
  const itemsByCategory = new Map<string, MenuItemType[]>();
  const modifierMap = new Map<string, { name: string; price: number; modifierListId: string }>();
  const modifierListMap = new Map<
    string,
    { name: string; selectionType: string; min: number; max: number; modifierIds: string[] }
  >();

  const types = "ITEM,CATEGORY,ITEM_VARIATION,IMAGE,MODIFIER_LIST,MODIFIER";
  const catalogPage = await client.catalog.list({ types });

  // Use SDK's built-in iteration (works at runtime; types may be incomplete)
  const allObjects: Array<{ type: string; id: string; [key: string]: unknown }> = [];
  const iterable = catalogPage as AsyncIterable<{ type?: string; id?: string; isDeleted?: boolean; [key: string]: unknown }>;
  for await (const obj of iterable) {
    if (obj.isDeleted || !obj.id) continue;
    allObjects.push(obj as { type: string; id: string; [key: string]: unknown });
  }

  // Build modifier maps, category metadata, Store-branch index, and image URLs
  for (const obj of allObjects) {
    if (obj.type === "IMAGE") {
      const url = catalogImageObjectUrl(obj as Record<string, unknown>);
      if (url) imageMap.set(obj.id, url);
    }

    if (obj.type === "MODIFIER") {
      const md = (obj as { modifierData?: { name?: string; priceMoney?: { amount?: string }; modifierListId?: string } }).modifierData;
      if (!md) continue;
      const priceCents = md.priceMoney?.amount ? Number(md.priceMoney.amount) : 0;
      modifierMap.set(obj.id, {
        name: md.name ?? "Option",
        price: priceCents / 100,
        modifierListId: md.modifierListId ?? "",
      });
    }

    if (obj.type === "MODIFIER_LIST") {
      const mld = (obj as { modifierListData?: { name?: string; selectionType?: string; minSelectedModifiers?: number; maxSelectedModifiers?: number; modifiers?: Array<{ id?: string }> } }).modifierListData;
      if (!mld) continue;
      const modifierIds = (mld.modifiers ?? [])
        .map((m) => m?.id)
        .filter(Boolean) as string[];
      modifierListMap.set(obj.id, {
        name: mld.name ?? "Options",
        selectionType: (mld as { selectionType?: string }).selectionType ?? "SINGLE",
        min: Number((mld as { minSelectedModifiers?: number }).minSelectedModifiers ?? 0) || 0,
        max: Number((mld as { maxSelectedModifiers?: number }).maxSelectedModifiers ?? 0) || 0,
        modifierIds,
      });
    }

    if (obj.type === "CATEGORY") {
      const raw = obj as Record<string, unknown>;
      categoryParentById.set(obj.id, readParentCategoryIdMenu(raw));
      const catBlock = (raw.categoryData ?? raw.category_data) as
        | { name?: string }
        | undefined;
      const nm = catBlock?.name;
      if (typeof nm === "string" && categoryNameMatchesStoreMenu(nm)) {
        storeNamedCategoryIds.add(obj.id);
      }
      if (!catBlock || typeof catBlock.name !== "string") continue;
      categoriesMap.set(obj.id, {
        id: obj.id,
        name: catBlock.name || "Uncategorized",
        slug: slugify(catBlock.name || ""),
        ordinal: Number((raw.ordinal as number | undefined) ?? 999),
      });
    }
  }

  // Batch retrieve items with include_related_objects to get modifier_list_info
  const itemIds = allObjects.filter((o) => o.type === "ITEM").map((o) => o.id);
  const itemDataMap = new Map<
    string,
    { itemData: Record<string, unknown>; menuCategoryId: string | null }
  >();

  let debugItemComparison: MenuModifierItemDebug | undefined;

  for (let i = 0; i < itemIds.length; i += 100) {
    const chunk = itemIds.slice(i, i + 100);
    try {
      const batch = await client.catalog.batchGet({
        objectIds: chunk,
        includeRelatedObjects: true,
      });
      const objects = (batch as { objects?: Array<{ id: string; type: string; itemData?: Record<string, unknown> }> }).objects ?? [];
      const related = (batch as { relatedObjects?: Array<{ id: string; type: string; modifierListData?: Record<string, unknown>; modifierData?: Record<string, unknown> }> }).relatedObjects ?? [];

      // Merge related MODIFIER_LIST, MODIFIER, and IMAGE into our maps (URLs may only appear here).
      for (const ro of related) {
        if (ro.type === "IMAGE") {
          const rraw = ro as Record<string, unknown>;
          const url = catalogImageObjectUrl(rraw);
          if (url && ro.id) imageMap.set(ro.id, url);
        }
        if (ro.type === "MODIFIER" && ro.modifierData) {
          const md = ro.modifierData as { name?: string; priceMoney?: { amount?: string }; modifierListId?: string };
          const priceCents = md.priceMoney?.amount ? Number(md.priceMoney.amount) : 0;
          modifierMap.set(ro.id, {
            name: md.name ?? "Option",
            price: priceCents / 100,
            modifierListId: md.modifierListId ?? "",
          });
        }
        if (ro.type === "MODIFIER_LIST" && ro.modifierListData) {
          const mld = ro.modifierListData as { name?: string; selectionType?: string; modifiers?: Array<{ id?: string }> };
          const modifierIds = (mld.modifiers ?? []).map((m) => m?.id).filter(Boolean) as string[];
          if (DEBUG_MENU_MODIFIERS) {
            const uniq = new Set(modifierIds);
            console.log(
              "[menu-modifiers] batch related MODIFIER_LIST",
              ro.id,
              "name:",
              mld.name,
              "modifierIds:",
              modifierIds,
              "uniqueCount:",
              uniq.size,
              "rawLength:",
              modifierIds.length
            );
          }
          modifierListMap.set(ro.id, {
            name: mld.name ?? "Options",
            selectionType: mld.selectionType ?? "SINGLE",
            min: 0,
            max: 0,
            modifierIds,
          });
        }
      }

      for (const o of objects) {
        if (o.type !== "ITEM" || !o.itemData) continue;
        const idata = o.itemData as Record<string, unknown>;
        const menuCategoryId = pickMenuCategoryId(
          idata,
          storeNamedCategoryIds,
          categoryParentById
        );
        itemDataMap.set(o.id, { itemData: idata, menuCategoryId });
      }
    } catch (e) {
      console.warn("Square batchGet failed, falling back to list data:", e);
    }
  }

  // Process items — source of truth for modifiers: batch itemData when present
  for (const obj of allObjects) {
    if (obj.type !== "ITEM") continue;
    const batchEntry = itemDataMap.get(obj.id);
    const listCatalogItemData = (obj as { itemData?: Record<string, unknown> }).itemData;

    if (MENU_MODIFIER_VALIDATION) {
      if (!batchEntry) {
        console.error("[modifier-validation] NO BATCH DATA — skipping item (no silent list fallback)", obj.id);
        if (options?.debugItemId === obj.id) {
          const listRaw =
            listCatalogItemData?.["modifierListInfo"] ??
            listCatalogItemData?.["modifier_list_info"];
          const listArr = Array.isArray(listRaw)
            ? (listRaw as Array<{ modifierListId?: string; modifier_list_id?: string }>)
            : [];
          debugItemComparison = {
            itemId: obj.id,
            itemDataSource: "unavailable",
            batchModifierListInfo: null,
            listCatalogModifierListInfo: safeJsonClone(listRaw ?? null),
            attachedModifierListIdsFromItemDataUsed: modifierListIdsFromListInfo(listArr),
            finalModifierGroups: [],
            finalModifierListIds: [],
            groupsNotBackedByListInfo: [],
            listInfoListIdsWithoutGroup: modifierListIdsFromListInfo(listArr),
            groupCount: 0,
            listInfoCount: listArr.length,
            skippedNoBatch: true,
          };
        }
        continue;
      }
    } else if (!batchEntry) {
      console.warn("USING FALLBACK LIST DATA", obj.id);
    }

    const itemData = batchEntry
      ? batchEntry.itemData
      : listCatalogItemData;
    if (!itemData) continue;

    const menuCategoryIdResolved =
      batchEntry?.menuCategoryId ??
      (listCatalogItemData
        ? pickMenuCategoryId(
            listCatalogItemData as Record<string, unknown>,
            storeNamedCategoryIds,
            categoryParentById
          )
        : null);

    /** Omit merch-only items: every Square category link sits under the `Store` branch. */
    if (menuCategoryIdResolved === null) {
      continue;
    }
    const categoryId = menuCategoryIdResolved;

    if (MENU_MODIFIER_VALIDATION && batchEntry) {
      const batchMl =
        batchEntry.itemData["modifierListInfo"] ?? batchEntry.itemData["modifier_list_info"];
      const listMl =
        listCatalogItemData?.["modifierListInfo"] ?? listCatalogItemData?.["modifier_list_info"];
      console.log("BATCH ITEM:", obj.id, batchMl);
      console.log("LIST ITEM:", obj.id, listMl);
      const batchLen = Array.isArray(batchMl) ? batchMl.length : 0;
      const listLen = Array.isArray(listMl) ? listMl.length : 0;
      if (batchLen !== listLen) {
        console.warn("MISMATCH LIST vs BATCH", {
          itemId: obj.id,
          listCount: listLen,
          batchCount: batchLen,
        });
      }
    }

    if ((itemData as { isArchived?: boolean }).isArchived) {
      if (options?.debugItemId === obj.id) {
        const batchMl =
          batchEntry?.itemData?.["modifierListInfo"] ??
          batchEntry?.itemData?.["modifier_list_info"] ??
          null;
        const listMl =
          listCatalogItemData?.["modifierListInfo"] ??
          listCatalogItemData?.["modifier_list_info"] ??
          null;
        const rawArchived = itemData as Record<string, unknown>;
        const archivedListInfo = (rawArchived.modifierListInfo ??
          rawArchived.modifier_list_info ??
          []) as Array<{ modifierListId?: string; modifier_list_id?: string }>;
        const attachedArchived = modifierListIdsFromListInfo(
          Array.isArray(archivedListInfo) ? archivedListInfo : []
        );
        debugItemComparison = {
          itemId: obj.id,
          itemDataSource: batchEntry ? "batch" : "list_fallback",
          batchModifierListInfo: batchEntry ? safeJsonClone(batchMl) : null,
          listCatalogModifierListInfo: safeJsonClone(listMl),
          attachedModifierListIdsFromItemDataUsed: attachedArchived,
          finalModifierGroups: [],
          finalModifierListIds: [],
          groupsNotBackedByListInfo: [],
          listInfoListIdsWithoutGroup: attachedArchived,
          groupCount: 0,
          listInfoCount: attachedArchived.length,
          skippedArchived: true,
        };
      }
      continue;
    }

    if (!categoriesMap.has(categoryId)) {
      categoriesMap.set(categoryId, {
        id: categoryId,
        name: "Other",
        slug: "other",
        ordinal: 999,
      });
    }

    const itemDataTyped = itemData as {
      name?: string;
      description?: string;
      descriptionPlaintext?: string;
      imageIds?: string[];
      image_ids?: string[];
      variations?: unknown[];
    };
    const { variationId, variationData } = resolveMenuItemVariation(
      obj.id,
      itemDataTyped.variations,
      allObjects
    );

    const priceMoney = variationData?.priceMoney;
    const amountCents = priceMoney?.amount
      ? Number(priceMoney.amount) / 100
      : 0;

    const imageIds =
      itemDataTyped.imageIds ??
      itemDataTyped.image_ids ??
      variationData?.imageIds ??
      [];
    const imageUrl = imageIds[0]
      ? imageMap.get(imageIds[0])
      : undefined;

    const modifierGroups: ModifierGroup[] = [];
    const rawItemData = itemData as Record<string, unknown>;
    /**
     * Modifier groups MUST come only from this array (Square `modifier_list_info` / `modifierListInfo`).
     * `modifierListMap` / `relatedObjects` are lookup tables only — never iterated to attach lists to items.
     */
    const listInfo = (rawItemData.modifierListInfo ?? rawItemData.modifier_list_info ?? []) as Array<{
        modifierListId?: string;
        modifier_list_id?: string;
        minSelectedModifiers?: number;
        min_selected_modifiers?: number;
        maxSelectedModifiers?: number;
        max_selected_modifiers?: number;
      }>;
    const listInfoCount = listInfo.length;
    if (MENU_MODIFIER_VALIDATION && listInfo.length > 0) {
      const ids = listInfo
        .map((i) => i.modifierListId ?? i.modifier_list_id)
        .filter((x): x is string => typeof x === "string" && x.length > 0);
      const seen = new Set<string>();
      for (const id of ids) {
        if (seen.has(id)) {
          console.warn("DUPLICATE MODIFIER LIST IDS", obj.id, { duplicateId: id });
        }
        seen.add(id);
      }
    }
    if (DEBUG_MENU_MODIFIERS && listInfo.length > 0) {
      const listIdsFromSquare = listInfo.map((i) => i.modifierListId ?? i.modifier_list_id ?? null);
      const seen = new Set<string>();
      const duplicateListRefs = listIdsFromSquare.filter((id) => {
        if (!id || typeof id !== "string") return false;
        if (seen.has(id)) return true;
        seen.add(id);
        return false;
      });
      console.log(
        "[menu-modifiers] ITEM",
        obj.id,
        itemDataTyped.name ?? "",
        "modifierListInfo.length:",
        listInfo.length,
        "listIds:",
        listIdsFromSquare,
        "duplicateListIdRefs:",
        duplicateListRefs
      );
    }
    for (const info of listInfo) {
      const listId = info.modifierListId ?? info.modifier_list_id;
      if (!listId || !modifierListMap.has(listId)) continue;
      const list = modifierListMap.get(listId)!;
      const modifierIdsRaw = list.modifierIds;
      if (MENU_MODIFIER_VALIDATION) {
        console.log("GROUP BUILD:", {
          itemId: obj.id,
          listId,
          modifierIds: modifierIdsRaw,
          uniqueCount: new Set(modifierIdsRaw).size,
        });
      }
      if (DEBUG_MENU_MODIFIERS) {
        const uniqMods = new Set(modifierIdsRaw);
        console.log(
          "[menu-modifiers]   list",
          listId,
          list.name,
          "modifierIds from map:",
          modifierIdsRaw,
          "uniqueModifierIds:",
          uniqMods.size
        );
      }
      const options = list.modifierIds
        .map((mid) => {
          const m = modifierMap.get(mid);
          return m ? { id: mid, name: m.name, price: m.price } : null;
        })
        .filter(Boolean) as { id: string; name: string; price: number }[];
      if (DEBUG_MENU_MODIFIERS && options.length > 0) {
        console.log(
          "[menu-modifiers]   resolved options:",
          options.map((o) => o.id)
        );
      }
      if (options.length === 0) continue;
      const minSel = info.minSelectedModifiers ?? info.min_selected_modifiers ?? list.min;
      const maxSel = info.maxSelectedModifiers ?? info.max_selected_modifiers ?? list.max;
      modifierGroups.push({
        id: listId,
        name: list.name,
        type: list.selectionType === "MULTIPLE" ? "checkbox" : "radio",
        required: minSel > 0,
        minSel: minSel > 0 ? minSel : undefined,
        maxSel: maxSel > 0 ? maxSel : undefined,
        options,
      });
    }

    if (MENU_MODIFIER_VALIDATION) {
      console.log("FINAL GROUPS:", obj.id, modifierGroups.map((g) => g.id));
      if (listInfoCount !== modifierGroups.length) {
        console.warn("[modifier-validation] listInfo.length !== modifierGroups.length", {
          itemId: obj.id,
          listInfoCount,
          modifierGroupsLength: modifierGroups.length,
          note: "Groups with zero resolved options are omitted",
        });
      }
    }

    if (options?.debugItemId === obj.id) {
      const batchMl =
        batchEntry?.itemData?.["modifierListInfo"] ??
        batchEntry?.itemData?.["modifier_list_info"] ??
        null;
      const listMl =
        listCatalogItemData?.["modifierListInfo"] ??
        listCatalogItemData?.["modifier_list_info"] ??
        null;
      const attachedModifierListIdsFromItemDataUsed =
        modifierListIdsFromListInfo(listInfo);
      const finalModifierListIds = modifierGroups.map((g) => g.id);
      const attachedSet = new Set(attachedModifierListIdsFromItemDataUsed);
      const finalSet = new Set(finalModifierListIds);
      const groupsNotBackedByListInfo = finalModifierListIds.filter(
        (id) => !attachedSet.has(id)
      );
      const listInfoListIdsWithoutGroup =
        attachedModifierListIdsFromItemDataUsed.filter((id) => !finalSet.has(id));
      if (groupsNotBackedByListInfo.length > 0) {
        console.error(
          "[modifier-trace] INVARIANT BROKEN: output group id(s) not in itemData.modifierListInfo for source itemData",
          { itemId: obj.id, groupsNotBackedByListInfo }
        );
      }
      debugItemComparison = {
        itemId: obj.id,
        itemDataSource: batchEntry ? "batch" : "list_fallback",
        batchModifierListInfo: batchEntry ? safeJsonClone(batchMl) : null,
        listCatalogModifierListInfo: safeJsonClone(listMl),
        attachedModifierListIdsFromItemDataUsed,
        finalModifierGroups: modifierGroups.map((g) => ({
          id: g.id,
          name: g.name,
          type: g.type,
          optionIds: g.options.map((o) => o.id),
        })),
        finalModifierListIds,
        groupsNotBackedByListInfo,
        listInfoListIdsWithoutGroup,
        groupCount: modifierGroups.length,
        listInfoCount,
        skippedNoBatch: MENU_MODIFIER_VALIDATION && !batchEntry,
      };
    }

    const menuItem: MenuItemType = {
      id: obj.id,
      variationId,
      name: itemDataTyped.name ?? "Untitled",
      description: (itemDataTyped.description ?? itemDataTyped.descriptionPlaintext ?? null) as string | null,
      price: amountCents > 0 ? amountCents : null,
      image_url: imageUrl ?? null,
      is_active: true,
      modifierGroups: modifierGroups.length > 0 ? modifierGroups : undefined,
    };

    const existing = itemsByCategory.get(categoryId) ?? [];
    existing.push(menuItem);
    itemsByCategory.set(categoryId, existing);
  }

  const categories: MenuCategory[] = Array.from(categoriesMap.entries())
    .filter(([id]) => id !== "uncategorized" || itemsByCategory.has(id))
    .map(([id, cat]) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: null,
      display_order: cat.ordinal,
      menuitems: (itemsByCategory.get(id) ?? []).sort(
        (a, b) => a.name.localeCompare(b.name)
      ),
      type: inferCategoryType(cat.name),
    }))
    .filter((c) => c.menuitems.length > 0);

  const sorted = sortCategories(categories);

  if (options?.debugItemId && !debugItemComparison) {
    debugItemComparison = {
      itemId: options.debugItemId,
      itemDataSource: "unavailable",
      batchModifierListInfo: null,
      listCatalogModifierListInfo: null,
      attachedModifierListIdsFromItemDataUsed: [],
      finalModifierGroups: [],
      finalModifierListIds: [],
      groupsNotBackedByListInfo: [],
      listInfoListIdsWithoutGroup: [],
      groupCount: 0,
      listInfoCount: 0,
      notFound: true,
    };
  }

  return {
    categories: sorted,
    ...(debugItemComparison ? { debugItemComparison } : {}),
  };
}
