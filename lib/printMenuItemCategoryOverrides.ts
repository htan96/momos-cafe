import type { MenuCategory, MenuItem } from "@/types/menu";

/**
 * Print-only: Square sometimes lists an item under the wrong category.
 * Keys: item name (any common spelling). Values: target category name as in /api/menu.
 */
export const ITEM_CATEGORY_OVERRIDES: Record<string, string> = {
  "Joe's Special": "Breakfast Plates",
  "Joes Special": "Breakfast Plates",
  "JOE'S SPECIAL": "Breakfast Plates",
  "Country Fried Steak": "Breakfast Plates",
  "Chicken Fried Steak": "Breakfast Plates",
};

function normalizeKey(name: string): string {
  return String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/\u2019/g, "'")
    .replace(/\s+/g, " ");
}

const overridesByItemKey = new Map<string, string>();
for (const [itemName, categoryName] of Object.entries(ITEM_CATEGORY_OVERRIDES)) {
  overridesByItemKey.set(normalizeKey(itemName), categoryName);
}

/** Target print category title for an item; falls back to `sourceCategoryName`. */
export function printTargetCategoryName(
  itemName: string,
  sourceCategoryName: string
): string {
  const hit = overridesByItemKey.get(normalizeKey(itemName));
  return hit ?? sourceCategoryName;
}

/**
 * Re-buckets menu items so overridden items appear under the named category
 * (matched case-insensitively to an existing category from the API).
 */
export function applyPrintItemCategoryOverrides(
  categories: MenuCategory[]
): MenuCategory[] {
  if (!Array.isArray(categories) || categories.length === 0) return categories;

  const clone: MenuCategory[] = categories.map((c) => ({
    ...c,
    menuitems: [...(c.menuitems ?? [])],
  }));

  const buckets: MenuItem[][] = clone.map(() => []);

  clone.forEach((cat, sourceIdx) => {
    for (const item of cat.menuitems ?? []) {
      const targetTitle = printTargetCategoryName(item.name, cat.name);
      let destIdx = clone.findIndex(
        (c) => normalizeKey(c.name) === normalizeKey(targetTitle)
      );
      if (destIdx < 0) destIdx = sourceIdx;
      buckets[destIdx].push(item);
    }
  });

  return clone.map((c, i) => ({ ...c, menuitems: buckets[i] }));
}
