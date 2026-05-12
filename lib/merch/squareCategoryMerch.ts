/**
 * Pure helpers — Square Store category ancestry for merch collections (no Catalog client here).
 */

export interface CategoryNodeMeta {
  name: string;
  ordinal: number;
  parentId: string | null;
}

/** Hash tail for slug disambiguation (stable across runs). */
function shortSquareTail(squareId: string): string {
  return squareId.replace(/#/g, "").slice(-6).toLowerCase();
}

export function slugPart(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42);
}

export function merchCollectionSlug(name: string, squareId: string, usedSlugs?: Set<string>): string {
  const base = slugPart(name) || "category";
  const tail = shortSquareTail(squareId);
  let slug = `${base}-${tail}`;
  if (usedSlugs) {
    let n = 0;
    while (usedSlugs.has(slug)) {
      n += 1;
      slug = `${base}-${tail}-${n}`;
    }
    usedSlugs.add(slug);
  }
  return slug;
}

/** Child categories grouped by parent (includes root parents `null`). */
export function categoryChildrenFromParentMap(
  parentByCategoryId: Map<string, string | null>
): Map<string | null, string[]> {
  const children = new Map<string | null, string[]>();
  for (const id of parentByCategoryId.keys()) {
    const p = parentByCategoryId.get(id) ?? null;
    const arr = children.get(p) ?? [];
    arr.push(id);
    children.set(p, arr);
  }
  return children;
}

export function descendantCategoryIds(
  rootId: string,
  parentByCategoryId: Map<string, string | null>
): Set<string> {
  const kids = categoryChildrenFromParentMap(parentByCategoryId);
  const out = new Set<string>();
  const stack = [rootId];
  while (stack.length) {
    const cur = stack.pop()!;
    if (out.has(cur)) continue;
    out.add(cur);
    const subs = kids.get(cur) ?? [];
    for (const c of subs) stack.push(c);
  }
  return out;
}

/** Distance from Store root downward; root depth 0, immediate child depth 1, etc. Returns -1 if not under root. */
export function depthUnderStoreRoot(
  categoryId: string,
  storeRootId: string,
  parentByCategoryId: Map<string, string | null>
): number {
  let d = 0;
  let cur: string | null | undefined = categoryId;
  const seen = new Set<string>();
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    if (cur === storeRootId) return d;
    cur = parentByCategoryId.get(cur) ?? null;
    d++;
  }
  return -1;
}

/**
 * Prefer the deepest Square category on the item that falls under Store; tie-break deterministic.
 * Items only tagged with Store resolve to `storeRootId`.
 */
export function pickLeafSquareCategoryForStoreItem(
  itemCategoryIds: string[],
  storeRootId: string,
  parentByCategoryId: Map<string, string | null>
): string {
  let bestId = storeRootId;
  let bestDepth = -1;
  const sorted = [...new Set(itemCategoryIds)].sort();

  for (const cid of sorted) {
    const d = depthUnderStoreRoot(cid, storeRootId, parentByCategoryId);
    if (d < 0) continue;
    if (d > bestDepth || (d === bestDepth && cid.localeCompare(bestId) < 0)) {
      bestDepth = d;
      bestId = cid;
    }
  }
  return bestId;
}

/** Leaf first (walk upward) through parent links until `storeRootId` or the tree ends. */
export function ancestrySquareIdsLeafFirst(
  leafId: string,
  storeRootId: string,
  parentByCategoryId: Map<string, string | null>
): string[] {
  const out: string[] = [];
  let cur: string | null | undefined = leafId;
  const seen = new Set<string>();

  while (cur && !seen.has(cur)) {
    seen.add(cur);
    out.push(cur);
    if (cur === storeRootId) break;
    cur = parentByCategoryId.get(cur) ?? null;
  }
  return out;
}

export interface MerchStoreCategoryRow {
  squareId: string;
  slug: string;
  name: string;
  parentSquareId: string | null;
  ancestryLeafFirst?: string[];
  ordinal: number;
  depth: number;
  accent: "teal" | "gold" | "red" | "charcoal";
}

const ACCENTS: MerchStoreCategoryRow["accent"][] = ["teal", "gold", "red", "charcoal"];

export function buildMerchStoreCategoryRows(
  storeRootId: string,
  parentByCategoryId: Map<string, string | null>,
  metaById: Map<string, CategoryNodeMeta>
): MerchStoreCategoryRow[] {
  const subtree = descendantCategoryIds(storeRootId, parentByCategoryId);
  const used = new Set<string>();
  const rows: MerchStoreCategoryRow[] = [];

  const visit = (id: string, depth: number) => {
    if (!subtree.has(id) || id === storeRootId) return;
    const m = metaById.get(id);
    const name = m?.name ?? id;
    const slug = merchCollectionSlug(name, id, used);
    const parentId = parentByCategoryId.get(id) ?? null;
    const ancestry = ancestrySquareIdsLeafFirst(id, storeRootId, parentByCategoryId);
    rows.push({
      squareId: id,
      slug,
      name,
      parentSquareId: parentId,
      ancestryLeafFirst: ancestry,
      ordinal: m?.ordinal ?? 0,
      depth,
      accent: ACCENTS[rows.length % ACCENTS.length]!,
    });
    const kids = [...(categoryChildrenFromParentMap(parentByCategoryId).get(id) ?? [])].filter((c) =>
      subtree.has(c)
    );
    kids.sort((a, b) => {
      const oa = metaById.get(a)?.ordinal ?? 0;
      const ob = metaById.get(b)?.ordinal ?? 0;
      if (oa !== ob) return oa - ob;
      return (metaById.get(a)?.name ?? a).localeCompare(metaById.get(b)?.name ?? b);
    });
    for (const c of kids) visit(c, depth + 1);
  };

  const rootKids = [...(categoryChildrenFromParentMap(parentByCategoryId).get(storeRootId) ?? [])].filter((c) =>
    subtree.has(c)
  );
  rootKids.sort((a, b) => {
    const oa = metaById.get(a)?.ordinal ?? 0;
    const ob = metaById.get(b)?.ordinal ?? 0;
    if (oa !== ob) return oa - ob;
    return (metaById.get(a)?.name ?? a).localeCompare(metaById.get(b)?.name ?? b);
  });
  for (const c of rootKids) visit(c, 1);

  return rows;
}
