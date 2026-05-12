import type { MerchStoreCollection } from "@/types/merchCatalog";

export interface PersistedMerchCategoryRow {
  squareId: string;
  slug: string;
  name: string;
  parentSquareId: string | null;
  ancestryLeafFirst: string[];
  ordinal: number;
  depth: number;
  accent: MerchStoreCollection["accent"];
}

function isPersistedRow(x: unknown): x is PersistedMerchCategoryRow {
  if (!x || typeof x !== "object") return false;
  const r = x as PersistedMerchCategoryRow;
  return (
    typeof r.squareId === "string" &&
    typeof r.slug === "string" &&
    typeof r.name === "string" &&
    typeof r.depth === "number"
  );
}

/** Resolve `MerchStoreCollection` rows from CatalogSyncState.lastSyncStats (written by Store sync). */
export function merchStoreCollectionsFromSyncStats(
  lastSyncStats: unknown,
  storeRootSquareId: string | null
): MerchStoreCollection[] {
  if (!lastSyncStats || typeof lastSyncStats !== "object") return [];
  const raw = (lastSyncStats as { merchStoreCategories?: unknown }).merchStoreCategories;
  if (!Array.isArray(raw)) return [];

  const rows = raw.filter(isPersistedRow);
  const metaBySq = new Map(rows.map((r) => [r.squareId, r]));

  const out: MerchStoreCollection[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    const parent =
      r.parentSquareId != null ? metaBySq.get(r.parentSquareId) ?? null : null;

    let tagline = "Synced from Square Store";
    if (storeRootSquareId && r.parentSquareId === storeRootSquareId) {
      tagline = "Top-level shelf at Momo’s";
    } else if (parent?.name) {
      tagline = `Under ${parent.name}`;
    }

    out.push({
      slug: r.slug,
      squareId: r.squareId,
      title: r.name,
      tagline,
      parentSquareId: r.parentSquareId,
      depth: r.depth,
      accent: r.accent,
      sortOrder: i,
    });
  }

  return out;
}

/** Chips + featured carousel: prefer Store-root children (`depth===1`). */
export function merchCollectionsForFilterStrip(rows: MerchStoreCollection[]): MerchStoreCollection[] {
  if (rows.length === 0) return [];
  let strip = rows.filter((c) => c.depth === 1);
  if (strip.length === 0) {
    const minDepth = Math.min(...rows.map((c) => c.depth));
    strip = rows.filter((c) => c.depth === minDepth);
  }
  return [...strip].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
}
