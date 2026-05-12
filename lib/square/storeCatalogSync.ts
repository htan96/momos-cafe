/**
 * Production Square Catalog sync — **only** ITEMs in Square category named exactly `Store`.
 * Restaurant/menu catalogs stay untouched by design.
 */

import type { Prisma } from "@prisma/client";
import type { SquareClient } from "square";
import { prisma } from "@/lib/prisma";
import { requireProductionSquareClient } from "@/lib/square/squareProductionClient";

export const STORE_CATEGORY_NAME = "Store";

export interface StoreCatalogSyncResult {
  storeCategorySquareId: string;
  itemsUpserted: number;
  variantsUpserted: number;
  imageObjectsResolved: number;
  inventoryVariantsChecked: number;
  warnings: string[];
}

function catName(obj: { categoryData?: { name?: string }; category_data?: { name?: string } }) {
  return obj.categoryData?.name ?? obj.category_data?.name ?? "";
}

function itemCategories(item: Record<string, unknown>): string[] {
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

function itemDesc(item: { itemData?: { description?: string }; item_data?: { description?: string } }) {
  return item.itemData?.description ?? item.item_data?.description ?? "";
}

function itemImages(item: {
  itemData?: { imageIds?: string[]; image_ids?: string[] };
  item_data?: { imageIds?: string[]; image_ids?: string[] };
}): string[] {
  const d = item.itemData ?? item.item_data;
  const ids = d?.imageIds ?? d?.image_ids ?? [];
  return ids.filter(Boolean);
}

function itemVariations(item: {
  itemData?: { variations?: unknown[] };
  item_data?: { variations?: unknown[] };
}): unknown[] {
  const d = item.itemData ?? item.item_data;
  return d?.variations ?? [];
}

function variationMoney(variation: Record<string, unknown>): number | null {
  const v = variation.itemVariationData ?? variation.item_variation_data;
  if (!v || typeof v !== "object") return null;
  const vp = v as Record<string, unknown>;
  const m = vp.priceMoney ?? vp.price_money;
  if (!m || typeof m !== "object") return null;
  const raw = (m as { amount?: bigint | number | string }).amount;
  if (raw === undefined || raw === null) return null;
  const n = typeof raw === "bigint" ? Number(raw) : Number(raw);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function variationSku(variation: Record<string, unknown>): string | null {
  const v = variation.itemVariationData ?? variation.item_variation_data;
  if (!v || typeof v !== "object") return null;
  const sku = (v as { sku?: string }).sku;
  return sku ?? null;
}

function variationName(variation: Record<string, unknown>): string {
  const v = variation.itemVariationData ?? variation.item_variation_data;
  if (!v || typeof v !== "object") return "";
  return String((v as { name?: string }).name ?? "");
}

async function resolveStoreCategorySquareId(client: SquareClient): Promise<string | null> {
  const pager = await client.catalog.list({ types: "CATEGORY" });
  for await (const obj of pager) {
    const o = obj as { type?: string; id?: string };
    if (o.type !== "CATEGORY" || !o.id) continue;
    if (catName(obj as never).trim() === STORE_CATEGORY_NAME) return o.id;
  }
  return null;
}

/** Collect Square ITEM ids linked to the Store category via SearchCatalogItems */
async function collectStoreItemIds(client: SquareClient, storeCategoryId: string): Promise<string[]> {
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
    if (cursor) await sleep(160);
  } while (cursor);
  return [...new Set(ids)];
}

async function batchGetCatalogObjects(client: SquareClient, ids: string[]): Promise<unknown[]> {
  const uniq = [...new Set(ids)].filter(Boolean);
  const out: unknown[] = [];
  for (let i = 0; i < uniq.length; i += 100) {
    const chunk = uniq.slice(i, i + 100);
    const res = await client.catalog.batchGet({
      objectIds: chunk,
      includeRelatedObjects: true,
    });
    const objs = res.objects ?? (res as { catalogObjects?: unknown[] }).catalogObjects ?? [];
    const related =
      res.relatedObjects ?? (res as { related_objects?: unknown[] }).related_objects ?? [];
    out.push(...objs, ...related);
    await sleep(120);
  }
  return out;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function extractImageUrl(imgObj: {
  imageData?: { url?: string };
  image_data?: { url?: string };
}): string | null {
  return imgObj.imageData?.url ?? imgObj.image_data?.url ?? null;
}

async function resolveImageUrls(client: SquareClient, imageIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const uniq = [...new Set(imageIds)].filter(Boolean);
  if (uniq.length === 0) return map;
  const objs = await batchGetCatalogObjects(client, uniq);
  for (const raw of objs) {
    const o = raw as { id?: string; type?: string };
    if (o.type !== "IMAGE" || !o.id) continue;
    const url = extractImageUrl(raw as never);
    if (url) map.set(o.id, url);
  }
  return map;
}

async function batchInventoryCounts(
  client: SquareClient,
  catalogObjectIds: string[],
  locationId: string
): Promise<Map<string, number>> {
  const sums = new Map<string, number>();
  const uniq = [...new Set(catalogObjectIds)].filter(Boolean);
  for (let i = 0; i < uniq.length; i += 100) {
    const chunk = uniq.slice(i, i + 100);
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
      sums.set(id, (sums.get(id) ?? 0) + q);
    }
    await sleep(120);
  }
  return sums;
}

function slugify(title: string, suffix: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return `${base || "item"}-${suffix.slice(0, 8)}`;
}

export async function runProductionStoreCatalogSync(): Promise<StoreCatalogSyncResult> {
  const client = requireProductionSquareClient();
  const locationId = process.env.SQUARE_LOCATION_ID?.trim() || undefined;
  const warnings: string[] = [];

  const storeCategorySquareId = await resolveStoreCategorySquareId(client);
  if (!storeCategorySquareId) {
    throw new Error(`Square catalog has no CATEGORY named "${STORE_CATEGORY_NAME}".`);
  }

  const storeItemIds = await collectStoreItemIds(client, storeCategorySquareId);
  if (storeItemIds.length === 0) {
    warnings.push("search_items_returned_zero_rows_for_store_category");
  }

  const batchObjects = await batchGetCatalogObjects(client, storeItemIds);
  const itemById = new Map<string, Record<string, unknown>>();
  for (const raw of batchObjects) {
    const o = raw as { type?: string; id?: string };
    if (o.type !== "ITEM" || !o.id) continue;
    itemById.set(o.id, raw as Record<string, unknown>);
  }

  const storeItems = storeItemIds
    .map((id) => itemById.get(id))
    .filter((obj): obj is Record<string, unknown> => !!obj)
    .filter((obj) => itemCategories(obj).includes(storeCategorySquareId));

  const imageIds: string[] = [];
  const variationIds: string[] = [];

  for (const payload of storeItems) {
    imageIds.push(...itemImages(payload as never));
    for (const vRaw of itemVariations(payload as never)) {
      const v = vRaw as { id?: string; type?: string };
      if (v.id && v.type === "ITEM_VARIATION") variationIds.push(v.id);
    }
  }

  const uniqueImages = [...new Set(imageIds)];
  const imageUrls = await resolveImageUrls(client, uniqueImages);

  const inventoryByVariation =
    locationId && variationIds.length > 0
      ? await batchInventoryCounts(client, variationIds, locationId)
      : new Map<string, number>();

  const distinctVariationIds = [...new Set(variationIds)];
  const inventoryRowsChecked = locationId ? distinctVariationIds.length : 0;

  let itemsUpserted = 0;
  let variantsUpserted = 0;

  for (const payload of storeItems) {
    const itemId = (payload as { id?: string }).id;
    if (!itemId) {
      warnings.push("batch_item_missing_id");
      continue;
    }

    const title =
      (payload as { itemData?: { name?: string } }).itemData?.name ??
      (payload as { item_data?: { name?: string } }).item_data?.name ??
      "Untitled";
    const description = itemDesc(payload as never);
    const imgList = itemImages(payload as never);
    const primaryImageUrl = imgList.length ? imageUrls.get(imgList[0]!) ?? null : null;

    const variations = itemVariations(payload as never);
    const itemJson = payload as Prisma.InputJsonValue;

    const product = await prisma.productCache.upsert({
      where: { squareCatalogItemId: itemId },
      create: {
        squareCatalogItemId: itemId,
        squareCategoryId: storeCategorySquareId,
        slug: slugify(title, itemId),
        title,
        description,
        primaryImageUrl,
        isAvailable: true,
        data: itemJson,
      },
      update: {
        squareCategoryId: storeCategorySquareId,
        slug: slugify(title, itemId),
        title,
        description,
        primaryImageUrl,
        isAvailable: true,
        data: itemJson,
        syncedAt: new Date(),
      },
    });

    itemsUpserted += 1;

    const seenVariationIds: string[] = [];
    for (const vRaw of variations) {
      const v = vRaw as { id?: string; type?: string };
      if (!v.id || v.type !== "ITEM_VARIATION") continue;
      seenVariationIds.push(v.id);
      const priceCents = variationMoney(vRaw as Record<string, unknown>);
      let qty: number | null = null;
      if (locationId && inventoryByVariation.has(v.id)) {
        qty = inventoryByVariation.get(v.id)!;
      } else if (locationId) {
        qty = null;
      }

      await prisma.productVariantCache.upsert({
        where: { squareVariationId: v.id },
        create: {
          productCacheId: product.id,
          squareVariationId: v.id,
          sku: variationSku(vRaw as Record<string, unknown>),
          priceCents,
          quantityOnHand: qty,
          inventoryUpdatedAt: qty !== null ? new Date() : null,
          data: vRaw as Prisma.InputJsonValue,
        },
        update: {
          productCacheId: product.id,
          sku: variationSku(vRaw as Record<string, unknown>),
          priceCents,
          quantityOnHand: qty,
          inventoryUpdatedAt: qty !== null ? new Date() : null,
          data: vRaw as Prisma.InputJsonValue,
          syncedAt: new Date(),
        },
      });
      variantsUpserted += 1;

      if (!variationName(vRaw as Record<string, unknown>)) {
        warnings.push(`variation_missing_name:${v.id}`);
      }
    }

    await prisma.productVariantCache.deleteMany({
      where: {
        productCacheId: product.id,
        ...(seenVariationIds.length > 0 ? { squareVariationId: { notIn: seenVariationIds } } : {}),
      },
    });
  }

  await prisma.catalogSyncState.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      storeCategorySquareId,
      lastFullSyncAt: new Date(),
      lastSyncStats: {
        itemsUpserted,
        variantsUpserted,
        inventoryVariantsChecked: inventoryRowsChecked,
        warningsCount: warnings.length,
      } as Prisma.InputJsonValue,
    },
    update: {
      storeCategorySquareId,
      lastFullSyncAt: new Date(),
      lastSyncStats: {
        itemsUpserted,
        variantsUpserted,
        inventoryVariantsChecked: inventoryRowsChecked,
        warningsCount: warnings.length,
      } as Prisma.InputJsonValue,
    },
  });

  return {
    storeCategorySquareId,
    itemsUpserted,
    variantsUpserted,
    imageObjectsResolved: imageUrls.size,
    inventoryVariantsChecked: inventoryRowsChecked,
    warnings,
  };
}
