import { SquareClient, SquareEnvironment } from "square";
import type { MenuCategory, MenuItem as MenuItemType } from "@/types/menu";
import type { ModifierGroup } from "@/types/ordering";
import { inferCategoryType, sortCategories } from "@/lib/categoryUtils";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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

export async function getMenuFromSquare(): Promise<MenuCategory[]> {
  const token = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;

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

  // Build modifier maps from MODIFIER and MODIFIER_LIST
  for (const obj of allObjects) {
    if (obj.type === "IMAGE") {
      const imgUrl = (obj as unknown as { imageData?: { url?: string } }).imageData?.url;
      if (imgUrl) imageMap.set(obj.id, imgUrl);
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
      const catData = (obj as unknown as { categoryData?: { name?: string }; ordinal?: number }).categoryData;
      if (!catData) continue;
      categoriesMap.set(obj.id, {
        id: obj.id,
        name: catData.name ?? "Uncategorized",
        slug: slugify(catData.name ?? ""),
        ordinal: Number((obj as unknown as { ordinal?: number }).ordinal ?? 999),
      });
    }
  }

  // Batch retrieve items with include_related_objects to get modifier_list_info
  const itemIds = allObjects.filter((o) => o.type === "ITEM").map((o) => o.id);
  const itemDataMap = new Map<string, { itemData: Record<string, unknown>; categoryId: string }>();

  for (let i = 0; i < itemIds.length; i += 100) {
    const chunk = itemIds.slice(i, i + 100);
    try {
      const batch = await client.catalog.batchGet({
        objectIds: chunk,
        includeRelatedObjects: true,
      });
      const objects = (batch as { objects?: Array<{ id: string; type: string; itemData?: Record<string, unknown> }> }).objects ?? [];
      const related = (batch as { relatedObjects?: Array<{ id: string; type: string; modifierListData?: Record<string, unknown>; modifierData?: Record<string, unknown> }> }).relatedObjects ?? [];

      // Merge related MODIFIER_LIST and MODIFIER into our maps (in case list didn't return them)
      for (const ro of related) {
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
        const itemData = o.itemData as { categoryId?: string; categories?: Array<{ id: string }> };
        const categoryId = itemData.categoryId ?? itemData.categories?.[0]?.id ?? "uncategorized";
        itemDataMap.set(o.id, { itemData: o.itemData, categoryId });
      }
    } catch (e) {
      console.warn("Square batchGet failed, falling back to list data:", e);
    }
  }

  // Process items - use batch data if available, else list data
  for (const obj of allObjects) {
    if (obj.type !== "ITEM") continue;
    const batchEntry = itemDataMap.get(obj.id);
    const itemData = batchEntry
      ? batchEntry.itemData
      : (obj as { itemData?: Record<string, unknown> }).itemData;
    const categoryId = batchEntry?.categoryId ?? (obj as { itemData?: { categoryId?: string; categories?: Array<{ id: string }> } }).itemData?.categoryId ?? (obj as { itemData?: { categoryId?: string; categories?: Array<{ id: string }> } }).itemData?.categories?.[0]?.id ?? "uncategorized";

    if (!itemData) continue;
    if ((itemData as { isArchived?: boolean }).isArchived) continue;

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
      itemDataTyped.imageIds ?? variationData?.imageIds ?? [];
    const imageUrl = imageIds[0]
      ? imageMap.get(imageIds[0])
      : undefined;

    const modifierGroups: ModifierGroup[] = [];
    const rawItemData = itemData as Record<string, unknown>;
    const listInfo = (rawItemData.modifierListInfo ?? rawItemData.modifier_list_info ?? []) as Array<{
        modifierListId?: string;
        modifier_list_id?: string;
        minSelectedModifiers?: number;
        min_selected_modifiers?: number;
        maxSelectedModifiers?: number;
        max_selected_modifiers?: number;
      }>;
    for (const info of listInfo) {
      const listId = info.modifierListId ?? info.modifier_list_id;
      if (!listId || !modifierListMap.has(listId)) continue;
      const list = modifierListMap.get(listId)!;
      const options = list.modifierIds
        .map((mid) => {
          const m = modifierMap.get(mid);
          return m ? { id: mid, name: m.name, price: m.price } : null;
        })
        .filter(Boolean) as { id: string; name: string; price: number }[];
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

  return sortCategories(categories);
}
