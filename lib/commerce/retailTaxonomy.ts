/**
 * Single source of truth for Momo's retail /shop taxonomy.
 *
 * Square often lacks structured tags; we derive membership from:
 * - Optional `storeCategoryNamesLeafFirst` in ProductCache JSON (sync writes category labels).
 * - Keyword rules on title + description (pragmatic fallbacks).
 * - Ops overrides by Square catalog item id (`SQUARE_CATALOG_ITEM_COLLECTION_OVERRIDES`).
 *
 * Filter pills and featured bands use stable string ids (slugs) below — safe for analytics / ops tooling.
 */

import type { MerchProduct, MerchCollectionId, RetailFacet } from "@/types/merch";
import type { MerchStoreCollection } from "@/types/merchCatalog";

/** Stable collection ids — use these in analytics, flags, and ops filters. */
export const RETAIL_COLLECTION_IDS = {
  apparel: "apparel",
  hoodies: "hoodies",
  tees: "tees",
  hats: "hats",
  drinkware: "drinkware",
  accessories: "accessories",
  stickers: "stickers",
  limited_drops: "limited_drops",
  vallejo: "vallejo",
  bay_area: "bay_area",
  momos_core: "momos_core",
  gift_cards: "gift_cards",
} as const satisfies Record<string, MerchCollectionId>;

export type RetailCollectionIdKey = keyof typeof RETAIL_COLLECTION_IDS;

type NavDef = {
  id: MerchCollectionId;
  title: string;
  tagline: string;
  accent: MerchStoreCollection["accent"];
  /** Lower = more “primary” when picking `MerchProduct.collectionId`. */
  primaryRank: number;
  /** Listed on filter rail when inventory exists. */
  navigable: boolean;
  /** Shown in featured carousel when non-empty (subset uses `RETAIL_FEATURED_IDS`). */
  featureEligible: boolean;
  categorySegmentPatterns?: RegExp[];
  textKeywords?: string[];
};

const NAV_DEFS: NavDef[] = [
  {
    id: RETAIL_COLLECTION_IDS.hoodies,
    title: "Hoodies",
    tagline: "Midweight & cozy",
    accent: "charcoal",
    primaryRank: 20,
    navigable: true,
    featureEligible: true,
    categorySegmentPatterns: [/hoodie/i, /pullover/i, /crew\s*neck\s*fleece/i, /fleece\s*hood/i],
    textKeywords: ["hoodie", "pullover", "zip hoodie", "fleece hood"],
  },
  {
    id: RETAIL_COLLECTION_IDS.tees,
    title: "Tees",
    tagline: "Graphic & everyday tees",
    accent: "teal",
    primaryRank: 21,
    navigable: true,
    featureEligible: true,
    categorySegmentPatterns: [/\btee\b/i, /t-?shirt/i, /\bshirt\b/i],
    textKeywords: [" t-shirt", " tee", "graphic tee", "pocket tee"],
  },
  {
    id: RETAIL_COLLECTION_IDS.hats,
    title: "Hats",
    tagline: "Caps & beanies",
    accent: "gold",
    primaryRank: 22,
    navigable: true,
    featureEligible: true,
    categorySegmentPatterns: [/hat/i, /cap/i, /beanie/i, /snapback/i, /dad\s*cap/i],
    textKeywords: ["beanie", "snapback", "trucker hat", "baseball cap"],
  },
  {
    id: RETAIL_COLLECTION_IDS.drinkware,
    title: "Drinkware",
    tagline: "Mugs & cups",
    accent: "red",
    primaryRank: 23,
    navigable: true,
    featureEligible: true,
    categorySegmentPatterns: [/mug/i, /cup/i, /tumbler/i, /bottle/i, /drinkware/i],
    textKeywords: ["coffee mug", "ceramic mug", "travel mug", "water bottle"],
  },
  {
    id: RETAIL_COLLECTION_IDS.accessories,
    title: "Accessories",
    tagline: "Totes, pins & extras",
    accent: "teal",
    primaryRank: 24,
    navigable: true,
    featureEligible: true,
    categorySegmentPatterns: [/accessor/i, /tote/i, /keychain/i, /pin\b/i, /wallet/i, /strap/i],
    textKeywords: ["market tote", "canvas tote", "enamel pin", "lanyard"],
  },
  {
    id: RETAIL_COLLECTION_IDS.stickers,
    title: "Stickers",
    tagline: "Slaps & decals",
    accent: "charcoal",
    primaryRank: 25,
    navigable: true,
    featureEligible: true,
    categorySegmentPatterns: [/sticker/i, /decal/i, /slaps?/i],
    textKeywords: ["vinyl sticker", "bumper sticker"],
  },
  {
    id: RETAIL_COLLECTION_IDS.apparel,
    title: "Apparel",
    tagline: "Layers, tops & wardrobe",
    accent: "teal",
    primaryRank: 40,
    navigable: true,
    featureEligible: true,
    categorySegmentPatterns: [/apparel/i, /wear/i, /sweat/i, /fleece/i],
    textKeywords: ["crewneck", "sweatshirt", "jogger", "socks apparel"],
  },
  {
    id: RETAIL_COLLECTION_IDS.limited_drops,
    title: "Limited drops",
    tagline: "Small batches & collabs",
    accent: "red",
    primaryRank: 50,
    navigable: true,
    featureEligible: true,
    categorySegmentPatterns: [/limited/i, /\bdrop\b/i, /exclusive/i, /collab/i],
    textKeywords: ["limited edition", "small batch", "one run", "exclusive"],
  },
  {
    id: RETAIL_COLLECTION_IDS.vallejo,
    title: "Vallejo",
    tagline: "Hometown picks",
    accent: "gold",
    primaryRank: 60,
    navigable: true,
    featureEligible: true,
    categorySegmentPatterns: [/vallejo/i],
    textKeywords: ["vallejo", "solano county", "downtown vallejo"],
  },
  {
    id: RETAIL_COLLECTION_IDS.bay_area,
    title: "Bay Area",
    tagline: "Regional love letters",
    accent: "charcoal",
    primaryRank: 61,
    navigable: true,
    featureEligible: true,
    categorySegmentPatterns: [/bay\s*area/i, /east\s*bay/i, /north\s*bay/i],
    textKeywords: [
      "bay area",
      "east bay",
      "oakland",
      "berkeley",
      "carquinez",
      "solano",
      "707",
      "norcal",
    ],
  },
  {
    id: RETAIL_COLLECTION_IDS.momos_core,
    title: "Momo's core",
    tagline: "House favorites & classics",
    accent: "teal",
    primaryRank: 90,
    navigable: true,
    featureEligible: true,
    categorySegmentPatterns: [/momo'?s\s*core/i, /\bcore\b/i],
    textKeywords: ["momo's crew", "signature logo", "house favorite"],
  },
  {
    id: RETAIL_COLLECTION_IDS.gift_cards,
    title: "Gift cards",
    tagline: "Load any amount",
    accent: "gold",
    primaryRank: 10,
    navigable: true,
    featureEligible: true,
    categorySegmentPatterns: [/gift\s*card/i],
    textKeywords: ["gift card", "egift", "e-gift"],
  },
];

/** Explicit Square catalog item id → extra collections (additive). Ops / merchandising hook. */
export const SQUARE_CATALOG_ITEM_COLLECTION_OVERRIDES: Partial<
  Record<string, MerchCollectionId[]>
> = {
  // Example: "ABCDEF123": [RETAIL_COLLECTION_IDS.limited_drops],
};

/** Featured carousel prefers this order; skips ids with no inventory. */
export const RETAIL_FEATURED_IDS: MerchCollectionId[] = [
  RETAIL_COLLECTION_IDS.limited_drops,
  RETAIL_COLLECTION_IDS.apparel,
  RETAIL_COLLECTION_IDS.hoodies,
  RETAIL_COLLECTION_IDS.tees,
  RETAIL_COLLECTION_IDS.hats,
  RETAIL_COLLECTION_IDS.drinkware,
  RETAIL_COLLECTION_IDS.momos_core,
];

const APPAREL_CHILDREN: MerchCollectionId[] = [
  RETAIL_COLLECTION_IDS.hoodies,
  RETAIL_COLLECTION_IDS.tees,
  RETAIL_COLLECTION_IDS.hats,
];

const DEF_BY_ID = new Map(NAV_DEFS.map((d) => [d.id, d]));

function normalizeText(p: MerchProduct): string {
  return `${p.name}\n${p.subtitle ?? ""}\n${p.description ?? ""}`.toLowerCase();
}

function tagsText(merchTags?: string[]): string {
  if (!merchTags?.length) return "";
  return merchTags.join(" ").toLowerCase();
}

function segmentsMatch(segments: string[], re: RegExp): boolean {
  return segments.some((s) => s.length > 0 && re.test(s));
}

function matchesDef(
  def: NavDef,
  haystack: string,
  categorySegments: string[],
  merchTagsHaystack: string
): boolean {
  const textHay = `${haystack} ${merchTagsHaystack}`.trim();
  if (def.textKeywords?.some((k) => textHay.includes(k.toLowerCase()))) return true;
  if (def.categorySegmentPatterns?.some((re) => segmentsMatch(categorySegments, re))) return true;
  return false;
}

function expandApparel(matches: Set<MerchCollectionId>): void {
  if (APPAREL_CHILDREN.some((id) => matches.has(id))) {
    matches.add(RETAIL_COLLECTION_IDS.apparel);
  }
}

/** Strip “shirt” false positives: tee keywords shouldn't tag hoodies as tees-only incorrectly — handled by ordering; hoodies match first. */

export function computeRetailFacet(
  product: MerchProduct,
  ctx?: { categoryPathNamesLeafFirst?: string[]; taxonomyTags?: string[] }
): RetailFacet {
  const squareId = product.squareCatalogItemId;
  const override = squareId ? SQUARE_CATALOG_ITEM_COLLECTION_OVERRIDES[squareId] : undefined;

  const categorySegments = (ctx?.categoryPathNamesLeafFirst ?? []).map((s) => s.trim()).filter(Boolean);
  const haystack = normalizeText(product);
  const merchTagsHaystack = tagsText(ctx?.taxonomyTags);

  const matches = new Set<MerchCollectionId>();

  if (override?.length) {
    for (const id of override) matches.add(id);
  }

  if (product.fulfillment.slug === "gift_card") {
    matches.add(RETAIL_COLLECTION_IDS.gift_cards);
  }

  for (const def of NAV_DEFS) {
    if (def.id === RETAIL_COLLECTION_IDS.gift_cards && product.fulfillment.slug === "gift_card") {
      continue;
    }
    if (matchesDef(def, haystack, categorySegments, merchTagsHaystack)) {
      matches.add(def.id);
    }
  }

  expandApparel(matches);

  const isGift = product.fulfillment.slug === "gift_card";
  if (!isGift && matches.size === 0) {
    matches.add(RETAIL_COLLECTION_IDS.momos_core);
  }

  const collectionIds = [...matches].sort((a, b) => {
    const da = DEF_BY_ID.get(a)?.primaryRank ?? 99;
    const db = DEF_BY_ID.get(b)?.primaryRank ?? 99;
    if (da !== db) return da - db;
    return a.localeCompare(b);
  });

  const productTypes = collectionIds.filter((id) =>
    (
      [
        RETAIL_COLLECTION_IDS.apparel,
        RETAIL_COLLECTION_IDS.hoodies,
        RETAIL_COLLECTION_IDS.tees,
        RETAIL_COLLECTION_IDS.hats,
        RETAIL_COLLECTION_IDS.drinkware,
        RETAIL_COLLECTION_IDS.accessories,
        RETAIL_COLLECTION_IDS.stickers,
        RETAIL_COLLECTION_IDS.gift_cards,
      ] as MerchCollectionId[]
    ).includes(id)
  );

  const regionKeys = [RETAIL_COLLECTION_IDS.vallejo, RETAIL_COLLECTION_IDS.bay_area] as MerchCollectionId[];
  const regions = collectionIds.filter((id) => regionKeys.includes(id));

  const campaignKeys = [RETAIL_COLLECTION_IDS.limited_drops, RETAIL_COLLECTION_IDS.momos_core] as MerchCollectionId[];
  const campaigns = collectionIds.filter((id) => campaignKeys.includes(id));

  return {
    collectionIds,
    productTypes,
    regions,
    campaigns,
    fulfillmentSlug: product.fulfillment.slug,
  };
}

export function pickPrimaryRetailCollectionId(collectionIds: MerchCollectionId[]): MerchCollectionId {
  if (collectionIds.length === 0) return RETAIL_COLLECTION_IDS.momos_core;
  let best = collectionIds[0]!;
  let bestRank = DEF_BY_ID.get(best)?.primaryRank ?? 999;
  for (const id of collectionIds) {
    const r = DEF_BY_ID.get(id)?.primaryRank ?? 999;
    if (r < bestRank) {
      bestRank = r;
      best = id;
    }
  }
  return best;
}

/** Ops / analytics — stable ordered ids (deduped). */
export function getProductCollectionIds(product: MerchProduct): MerchCollectionId[] {
  if (product.retailCollectionIds?.length) {
    return [...product.retailCollectionIds];
  }
  const facet = product.retailFacet;
  if (facet?.collectionIds?.length) {
    return [...facet.collectionIds];
  }
  const fallback = [product.collectionId, ...(product.featuredCollectionIds ?? [])];
  return [...new Set(fallback)];
}

export function merchProductMatchesRetailCollection(
  product: MerchProduct,
  collectionSlug: MerchCollectionId
): boolean {
  return getProductCollectionIds(product).includes(collectionSlug);
}

function toMerchStoreCollection(def: NavDef, sortOrder: number): MerchStoreCollection {
  return {
    slug: def.id,
    squareId: `taxonomy:${def.id}`,
    title: def.title,
    tagline: def.tagline,
    parentSquareId: null,
    depth: 1,
    accent: def.accent,
    sortOrder,
  };
}

/** All navigable definitions as store rows (for empty-state / mock seed labels). */
export function retailNavAllMerchStoreCollections(): MerchStoreCollection[] {
  return NAV_DEFS.filter((d) => d.navigable).map((d, i) => toMerchStoreCollection(d, i));
}

function countByCollection(products: MerchProduct[]): Map<MerchCollectionId, number> {
  const m = new Map<MerchCollectionId, number>();
  for (const p of products) {
    for (const id of getProductCollectionIds(p)) {
      m.set(id, (m.get(id) ?? 0) + 1);
    }
  }
  return m;
}

/** Filter pills: non-empty navigable collections only, taxonomy sort order. */
export function retailFilterMerchStoreCollections(products: MerchProduct[]): MerchStoreCollection[] {
  const counts = countByCollection(products);
  return NAV_DEFS.filter((d) => d.navigable && (counts.get(d.id) ?? 0) > 0).map((d, i) =>
    toMerchStoreCollection(d, i)
  );
}

/** Featured bands — follows `RETAIL_FEATURED_IDS`, skips empty. */
export function retailFeaturedMerchStoreCollections(products: MerchProduct[]): MerchStoreCollection[] {
  const counts = countByCollection(products);
  const out: MerchStoreCollection[] = [];
  let order = 0;
  for (const id of RETAIL_FEATURED_IDS) {
    const def = DEF_BY_ID.get(id);
    if (!def?.featureEligible || !def.navigable) continue;
    if ((counts.get(id) ?? 0) === 0) continue;
    out.push(toMerchStoreCollection(def, order));
    order++;
  }
  /* If curated list is empty, fall back to first populated navigable chips */
  if (out.length === 0) {
    return retailFilterMerchStoreCollections(products).slice(0, 6);
  }
  return out.slice(0, 6);
}

export function attachRetailTaxonomyToProduct(
  product: MerchProduct,
  ctx?: { categoryPathNamesLeafFirst?: string[]; taxonomyTags?: string[] }
): MerchProduct {
  const retailFacet = computeRetailFacet(product, ctx);
  const retailCollectionIds = retailFacet.collectionIds;
  const collectionId = pickPrimaryRetailCollectionId(retailCollectionIds);
  return {
    ...product,
    retailFacet,
    retailCollectionIds,
    collectionId,
    featuredCollectionIds: retailCollectionIds,
  };
}
