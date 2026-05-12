import type { ProductCache, ProductVariantCache } from "@prisma/client";
import type {
  MerchFulfillmentSlug,
  MerchInventoryState,
  MerchProduct,
  MerchProductColor,
  MerchVariantOption,
  StoreCollectionId,
} from "@/types/merch";
import { fulfillmentForSlug } from "@/lib/merch/fulfillment";

const FALLBACK_KEYS = ["teal", "cream", "gold", "charcoal", "red"] as const;

function hashPickStable(str: string): (typeof FALLBACK_KEYS)[number] {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return FALLBACK_KEYS[h % FALLBACK_KEYS.length]!;
}

function inferCollection(title: string, description: string): StoreCollectionId {
  const blob = `${title} ${description}`.toLowerCase();
  if (/gift\s*card|e-?gift/.test(blob)) return "gift_cards";
  if (/hoodie|pullover|crewneck|sweatshirt|fleece/.test(blob)) return "hoodies";
  if (/hat|cap|beanie|snapback|dad\s*hat/.test(blob)) return "hats";
  if (/mug|cup|drinkware|tumbler|bottle/.test(blob)) return "drinkware";
  if (/tote|pin|keychain|sticker|socks|wallet|belt|accessories/.test(blob)) return "accessories";
  if (/tee|t-?shirt|shirt|top|apparel|crew|tank|polo/.test(blob)) return "apparel";
  return "apparel";
}

function inferFulfillmentSlug(title: string, description: string): MerchFulfillmentSlug {
  const blob = `${title} ${description}`.toLowerCase();
  return /gift\s*card|e-?gift/.test(blob) ? "gift_card" : "standard_pickup";
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

export function mapProductCacheToMerchProduct(row: ProductCache & { variants: ProductVariantCache[] }): MerchProduct {
  const collectionId = inferCollection(row.title, row.description ?? "");
  const fulfillmentSlug = inferFulfillmentSlug(row.title, row.description ?? "");
  const fulfillment = fulfillmentForSlug(fulfillmentSlug);

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

  return {
    id: productId,
    squareCatalogItemId: row.squareCatalogItemId,
    variantOptions: variantOptions.length ? variantOptions : undefined,
    name: row.title,
    description: row.description ?? "",
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
}

export function mapProductCacheRows(
  rows: Array<ProductCache & { variants: ProductVariantCache[] }>
): MerchProduct[] {
  return rows.filter((r) => r.isAvailable).map(mapProductCacheToMerchProduct);
}
