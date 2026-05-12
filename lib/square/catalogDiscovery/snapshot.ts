import { SquareClient, SquareEnvironment } from "square";
import type { CatalogObjectSummary, CatalogModifierListInfoEntry } from "./types";

const LIST_TYPES =
  "ITEM,CATEGORY,ITEM_VARIATION,IMAGE,MODIFIER_LIST,MODIFIER";

function readCategoryName(obj: Record<string, unknown>): string | undefined {
  const cd = (obj.categoryData ?? obj.category_data) as Record<string, unknown> | undefined;
  if (!cd) return undefined;
  return typeof cd.name === "string" ? cd.name : undefined;
}

function readParentCategoryId(obj: Record<string, unknown>): string | null {
  const cd = (obj.categoryData ?? obj.category_data) as Record<string, unknown> | undefined;
  if (!cd) return null;
  const p = (cd.parentCategory ?? cd.parent_category) as Record<string, unknown> | undefined;
  if (!p) return null;
  const id = (p.id ?? p.catalog_object_id) as string | undefined;
  return typeof id === "string" && id.length > 0 ? id : null;
}

function readItemName(obj: Record<string, unknown>): string | undefined {
  const id = (obj.itemData ?? obj.item_data) as Record<string, unknown> | undefined;
  if (!id) return undefined;
  return typeof id.name === "string" ? id.name : undefined;
}

function readProductType(obj: Record<string, unknown>): string | undefined {
  const id = (obj.itemData ?? obj.item_data) as Record<string, unknown> | undefined;
  if (!id) return undefined;
  const pt = id.productType ?? id.product_type;
  return typeof pt === "string" ? pt : undefined;
}

function readItemCategoryIds(obj: Record<string, unknown>): string[] {
  const id = (obj.itemData ?? obj.item_data) as Record<string, unknown> | undefined;
  if (!id) return [];
  const cats = id.categories as Array<{ id?: string }> | undefined;
  const fromObjs = (cats ?? []).map((c) => c.id).filter((x): x is string => !!x);
  if (fromObjs.length) return [...new Set(fromObjs)];
  const raw = (id.categoryIds ?? id.category_ids) as string[] | undefined;
  return [...new Set((raw ?? []).filter(Boolean))];
}

function readVariations(obj: Record<string, unknown>): unknown[] {
  const id = (obj.itemData ?? obj.item_data) as Record<string, unknown> | undefined;
  return (id?.variations as unknown[]) ?? [];
}

function readImageIds(obj: Record<string, unknown>): string[] {
  const id = (obj.itemData ?? obj.item_data) as Record<string, unknown> | undefined;
  if (!id) return [];
  const ids = (id.imageIds ?? id.image_ids) as string[] | undefined;
  return [...new Set((ids ?? []).filter(Boolean))];
}

function readModifierListInfo(
  obj: Record<string, unknown>
): CatalogModifierListInfoEntry[] {
  const id = (obj.itemData ?? obj.item_data) as Record<string, unknown> | undefined;
  if (!id) return [];
  const raw = id.modifierListInfo ?? id.modifier_list_info;
  if (!Array.isArray(raw)) return [];
  const out: CatalogModifierListInfoEntry[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const listId = (r.modifierListId ?? r.modifier_list_id) as string | undefined;
    if (!listId) continue;
    out.push({
      modifierListId: listId,
      enabled: typeof r.enabled === "boolean" ? r.enabled : undefined,
      minSelectedModifiers: Number(r.minSelectedModifiers ?? r.min_selected_modifiers) || undefined,
      maxSelectedModifiers: Number(r.maxSelectedModifiers ?? r.max_selected_modifiers) || undefined,
    });
  }
  return out;
}

function readVariationFields(
  obj: Record<string, unknown>,
  fallbackItemId?: string
): Pick<
  CatalogObjectSummary,
  "variationName" | "parentItemId" | "sku" | "priceAmount"
> {
  const vd = (obj.itemVariationData ?? obj.item_variation_data) as
    | Record<string, unknown>
    | undefined;
  if (!vd) {
    return { parentItemId: fallbackItemId };
  }
  const pm = (vd.priceMoney ?? vd.price_money) as { amount?: bigint | string } | undefined;
  const amount = pm?.amount;
  const priceAmount =
    amount === undefined || amount === null
      ? undefined
      : typeof amount === "bigint"
        ? amount.toString()
        : String(amount);
  const parent = (vd.itemId ?? vd.item_id) as string | undefined;
  return {
    variationName: typeof vd.name === "string" ? vd.name : undefined,
    parentItemId: parent ?? fallbackItemId,
    sku: typeof vd.sku === "string" ? vd.sku : undefined,
    priceAmount,
  };
}

function readImageUrl(obj: Record<string, unknown>): string | undefined {
  const d = (obj.imageData ?? obj.image_data) as Record<string, unknown> | undefined;
  return typeof d?.url === "string" ? d.url : undefined;
}

function readModifierListFields(obj: Record<string, unknown>): Pick<
  CatalogObjectSummary,
  "modifierListName" | "modifierChildIds" | "selectionType" | "minSelected" | "maxSelected"
> {
  const md = (obj.modifierListData ?? obj.modifier_list_data) as
    | Record<string, unknown>
    | undefined;
  if (!md) return { modifierChildIds: [] };
  const mods = (md.modifiers as Array<{ id?: string }> | undefined) ?? [];
  const modifierChildIds = mods.map((m) => m.id).filter((x): x is string => !!x);
  return {
    modifierListName: typeof md.name === "string" ? md.name : undefined,
    modifierChildIds,
    selectionType:
      typeof md.selectionType === "string"
        ? md.selectionType
        : typeof md.selection_type === "string"
          ? md.selection_type
          : undefined,
    minSelected:
      Number(md.minSelectedModifiers ?? md.min_selected_modifiers ?? 0) || 0,
    maxSelected:
      Number(md.maxSelectedModifiers ?? md.max_selected_modifiers ?? 0) || 0,
  };
}

function readModifierFields(obj: Record<string, unknown>): Pick<
  CatalogObjectSummary,
  "modifierName" | "modifierListId" | "modifierPriceAmount"
> {
  const md = (obj.modifierData ?? obj.modifier_data) as Record<string, unknown> | undefined;
  if (!md) return {};
  const pm = (md.priceMoney ?? md.price_money) as { amount?: bigint | string } | undefined;
  const amount = pm?.amount;
  const modifierPriceAmount =
    amount === undefined || amount === null
      ? undefined
      : typeof amount === "bigint"
        ? amount.toString()
        : String(amount);
  const listId = (md.modifierListId ?? md.modifier_list_id) as string | undefined;
  return {
    modifierName: typeof md.name === "string" ? md.name : undefined,
    modifierListId: listId,
    modifierPriceAmount,
  };
}

function summarizeObject(obj: Record<string, unknown>): CatalogObjectSummary {
  const id = typeof obj.id === "string" ? obj.id : "";
  const type = typeof obj.type === "string" ? obj.type : "UNKNOWN";
  const base: CatalogObjectSummary = {
    id,
    type,
    isDeleted: obj.isDeleted === true || obj.is_deleted === true,
    ordinal: Number(obj.ordinal ?? 0) || 0,
    categoryIds: [],
    variationIds: [],
    imageIds: [],
    modifierListInfoEntries: [],
    modifierChildIds: [],
  };

  if (type === "CATEGORY") {
    return {
      ...base,
      categoryName: readCategoryName(obj),
      parentCategoryId: readParentCategoryId(obj),
    };
  }

  if (type === "ITEM") {
    const vars = readVariations(obj);
    const variationIds: string[] = [];
    for (const v of vars) {
      if (!v || typeof v !== "object") continue;
      const o = v as Record<string, unknown>;
      const vid = (o.id ?? o.catalogObjectId ?? o.catalog_object_id) as string | undefined;
      if (vid) variationIds.push(vid);
    }
    return {
      ...base,
      itemName: readItemName(obj),
      productType: readProductType(obj),
      categoryIds: readItemCategoryIds(obj),
      variationIds: [...new Set(variationIds)],
      imageIds: readImageIds(obj),
      modifierListInfoEntries: readModifierListInfo(obj),
    };
  }

  if (type === "ITEM_VARIATION") {
    return {
      ...base,
      ...readVariationFields(obj),
    };
  }

  if (type === "IMAGE") {
    return {
      ...base,
      imageUrl: readImageUrl(obj),
    };
  }

  if (type === "MODIFIER_LIST") {
    return {
      ...base,
      ...readModifierListFields(obj),
    };
  }

  if (type === "MODIFIER") {
    return {
      ...base,
      ...readModifierFields(obj),
    };
  }

  return base;
}

export interface CatalogSnapshot {
  /** All objects from catalog.list (non-deleted only in map by default — we keep deleted flag on summary) */
  byId: Map<string, CatalogObjectSummary>;
  listOrderIds: string[];
  environment: string;
}

function mergeSummary(
  prev: CatalogObjectSummary,
  next: CatalogObjectSummary
): CatalogObjectSummary {
  if (prev.id !== next.id || prev.type !== next.type) return next;
  if (prev.type === "ITEM") {
    return {
      ...prev,
      ...next,
      modifierListInfoEntries:
        next.modifierListInfoEntries.length >= prev.modifierListInfoEntries.length
          ? next.modifierListInfoEntries
          : prev.modifierListInfoEntries,
      categoryIds: next.categoryIds.length ? next.categoryIds : prev.categoryIds,
      variationIds: next.variationIds.length ? next.variationIds : prev.variationIds,
      imageIds: next.imageIds.length ? next.imageIds : prev.imageIds,
    };
  }
  return { ...prev, ...next };
}

export async function buildCatalogSnapshot(client: SquareClient): Promise<CatalogSnapshot> {
  const byId = new Map<string, CatalogObjectSummary>();
  const listOrderIds: string[] = [];

  const page = await client.catalog.list({ types: LIST_TYPES });
  const iterable = page as AsyncIterable<Record<string, unknown>>;
  for await (const obj of iterable) {
    if (!obj || typeof obj !== "object") continue;
    const id = obj.id as string | undefined;
    if (!id) continue;
    const sum = summarizeObject(obj as Record<string, unknown>);
    byId.set(id, sum);
    listOrderIds.push(id);
  }

  const itemIds = [...byId.values()].filter((s) => s.type === "ITEM").map((s) => s.id);

  for (let i = 0; i < itemIds.length; i += 100) {
    const chunk = itemIds.slice(i, i + 100);
    try {
      const batch = await client.catalog.batchGet({
        objectIds: chunk,
        includeRelatedObjects: true,
      });
      const objects =
        (batch as { objects?: Array<Record<string, unknown>> }).objects ?? [];
      const related =
        (batch as { relatedObjects?: Array<Record<string, unknown>> }).relatedObjects ??
        (batch as { related_objects?: Array<Record<string, unknown>> }).related_objects ??
        [];

      for (const raw of [...objects, ...related]) {
        if (!raw?.id || !raw.type) continue;
        const sum = summarizeObject(raw as Record<string, unknown>);
        const prev = byId.get(sum.id);
        byId.set(sum.id, prev ? mergeSummary(prev, sum) : sum);
      }
    } catch (e) {
      console.warn("[catalog-discovery] batchGet chunk failed", e);
    }
  }

  const env =
    process.env.SQUARE_ENVIRONMENT === "production" ? "production" : "sandbox";

  return { byId, listOrderIds, environment: env };
}

export function createSquareClientFromEnv(): SquareClient {
  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) throw new Error("SQUARE_ACCESS_TOKEN is required");
  const environment =
    process.env.SQUARE_ENVIRONMENT === "production"
      ? SquareEnvironment.Production
      : SquareEnvironment.Sandbox;
  return new SquareClient({ token, environment });
}
