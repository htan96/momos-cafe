import type { ProductCache, ProductVariantCache } from "@prisma/client";
import type {
  MerchFulfillmentSlug,
  MerchInventoryState,
  MerchProduct,
  MerchProductColor,
  MerchVariantOption,
} from "@/types/merch";
import { fulfillmentForSlug } from "@/lib/merch/fulfillment";
import { unwrapProductCachePayload } from "@/lib/merch/productCacheEnvelope";
import { attachRetailTaxonomyToProduct } from "@/lib/commerce/retailTaxonomy";

const FALLBACK_KEYS = ["teal", "cream", "gold", "charcoal", "red"] as const;

function hashPickStable(str: string): (typeof FALLBACK_KEYS)[number] {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return FALLBACK_KEYS[h % FALLBACK_KEYS.length]!;
}

/** Gift cards from Square Catalog `productType`; never title keywords. */
function fulfillmentSlugFromSquareItem(squareItem: Record<string, unknown>): MerchFulfillmentSlug {
  const id = (squareItem.itemData ?? squareItem.item_data) as Record<string, unknown> | undefined;
  const ptRaw = id?.productType ?? id?.product_type;
  const pt = typeof ptRaw === "string" ? ptRaw.toUpperCase() : "";
  if (pt === "GIFT_CARD") return "gift_card";
  return "standard_pickup";
}

export interface MapMerchProductsContext {
  /** Maps leaf / interior Square category id → collection slug persisted at sync (`merchStoreCategories`). */
  collectionSlugForCategorySquareId: (squareCategoryId: string) => string | undefined;
  /** Square category id → display name from last sync (fallback when JSON lacks `storeCategoryNamesLeafFirst`). */
  categoryNameForSquareId?: (squareCategoryId: string) => string | undefined;
}

function splitVariantLabel(label: string): { size?: string; color?: string } {
  const parts = label
    .split(/\s*[/|·]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2) return { size: parts[0], color: parts.slice(1).join(" · ") };
  return {};
}

function slugPart(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function centsToUsdMajor(cents: number | null): number | null {
  if (cents === null || cents === undefined) return null;
  return Math.round(cents) / 100;
}

function aggregateInventory(variants: ProductVariantCache[]): MerchInventoryState {
  const qtys = variants
    .map((v) => v.quantityOnHand)
    .filter((x): x is number => typeof x === "number" && Number.isFinite(x));
  if (qtys.length === 0) return "in_stock";
  const sum = qtys.reduce((a, b) => a + b, 0);
  if (sum <= 0) return "out_of_stock";
  if (sum < 5) return "low_stock";
  return "in_stock";
}

function fallbackSlugForSquareId(id: string): string {
  const tail = id.replace(/#/g, "").slice(-8).toLowerCase();
  return `category-${slugPart(tail) || tail || "misc"}`;
}

export function mapProductCacheToMerchProduct(
  row: ProductCache & { variants: ProductVariantCache[] },
  ctx?: MapMerchProductsContext
): MerchProduct {
  const { squareItem, merch } = unwrapProductCachePayload(row.data);
  const fulfillmentSlug = fulfillmentSlugFromSquareItem(squareItem);
  const fulfillment = fulfillmentForSlug(fulfillmentSlug);

  const leafFromMeta = merch?.leafCategorySquareId;
  const ancestry = merch?.ancestrySquareIdsLeafFirst;
  const columnLeaf = row.squareCategoryId ?? undefined;
  const leafSquareId = leafFromMeta ?? columnLeaf ?? "";

  const collectionId =
    (leafSquareId && ctx?.collectionSlugForCategorySquareId(leafSquareId)) ||
    (leafSquareId ? fallbackSlugForSquareId(leafSquareId) : "uncategorized");

  const variantOptions: MerchVariantOption[] = [...row.variants]
    .sort((a, b) => {
      const an = String((a.data as { itemVariationData?: { name?: string } })?.itemVariationData?.name ?? "");
      const bn = String((b.data as { itemVariationData?: { name?: string } })?.itemVariationData?.name ?? "");
      return an.localeCompare(bn);
    })
    .map((v) => {
      const nm =
        (v.data as { itemVariationData?: { name?: string } })?.itemVariationData?.name?.trim() ||
        v.sku?.trim() ||
        "Standard";
      const usd = centsToUsdMajor(v.priceCents);
      return {
        squareVariationId: v.squareVariationId,
        label: nm,
        priceUsd: usd ?? 0,
      };
    });

  const pricedOptions = variantOptions.filter((o) => o.priceUsd > 0);
  const priceFloor =
    pricedOptions.length > 0 ? Math.min(...pricedOptions.map((o) => o.priceUsd)) : 0;

  const sizes = new Set<string>();
  const colors = new Map<string, MerchProductColor>();
  for (const opt of variantOptions) {
    const { size, color } = splitVariantLabel(opt.label);
    if (size) sizes.add(size);
    if (color) {
      const id = slugPart(color) || "color";
      colors.set(id, { id, label: color });
    }
  }

  const inventory = aggregateInventory(row.variants);

  const buttonLabel: MerchProduct["buttonLabel"] =
    fulfillmentSlug === "gift_card"
      ? "Add to bag"
      : variantOptions.length > 1
        ? "Choose options"
        : "Add to bag";

  let amountOptions: number[] | undefined;
  if (fulfillmentSlug === "gift_card") {
    const amounts = [...new Set(variantOptions.map((v) => v.priceUsd))]
      .filter((x) => x > 0)
      .sort((a, b) => a - b);
    if (amounts.length) amountOptions = amounts;
  }

  const productId = row.slug?.trim() || row.squareCatalogItemId;

  const pathFromEnvelope = merch?.storeCategoryNamesLeafFirst?.filter(Boolean);
  const anc = ancestry ?? (columnLeaf ? [columnLeaf] : leafSquareId ? [leafSquareId] : undefined);
  const pathFromSq =
    anc
      ?.map((id) => ctx?.categoryNameForSquareId?.(id) ?? "")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  const categoryPathNamesLeafFirst =
    pathFromEnvelope?.length ? pathFromEnvelope : pathFromSq.length ? pathFromSq : undefined;

  const base: MerchProduct = {
    id: productId,
    squareCatalogItemId: row.squareCatalogItemId,
    variantOptions: variantOptions.length ? variantOptions : undefined,
    name: row.title,
    description: row.description ?? "",
    squareLeafCategoryId: leafSquareId || undefined,
    squareCategoryAncestryLeafFirst: anc,
    collectionId,
    featuredCollectionIds: [collectionId],
    price: priceFloor,
    image: row.primaryImageUrl ?? undefined,
    imageFallbackKey: row.primaryImageUrl ? undefined : hashPickStable(row.squareCatalogItemId),
    inventory,
    fulfillment,
    sizes: sizes.size > 0 ? [...sizes].sort() : undefined,
    colors: colors.size > 0 ? [...colors.values()] : undefined,
    amountOptions,
    buttonLabel,
  };

  return attachRetailTaxonomyToProduct(base, {
    categoryPathNamesLeafFirst,
    taxonomyTags: merch?.taxonomyTags,
  });
}

export function mapProductCacheRows(
  rows: Array<ProductCache & { variants: ProductVariantCache[] }>,
  ctx?: MapMerchProductsContext
): MerchProduct[] {
  return rows.filter((r) => r.isAvailable).map((r) => mapProductCacheToMerchProduct(r, ctx));
}
