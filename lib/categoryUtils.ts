import type { CategoryType, MenuCategory } from "@/types/menu";

/**
 * Infer category type from name. Used when mapping Square data.
 * Keeps UI flexible — no hardcoded category names in components.
 */
export function inferCategoryType(name: string): CategoryType {
  const n = name.toLowerCase();

  if (n.includes("featured") || n.includes("today") || n.includes("special")) return "featured";
  if (n.includes("breakfast")) return "breakfast";
  if (n.includes("lunch")) return "lunch";
  if (n.includes("drink") || n.includes("juice") || n.includes("coffee") || n.includes("tea") || n.includes("beverage")) return "drinks";
  if (n.includes("side")) return "sides";

  return "main";
}

/** Display order for category types. Unlisted types sort after these. */
export const CATEGORY_ORDER: CategoryType[] = [
  "featured",
  "breakfast",
  "main",
  "lunch",
  "sides",
  "drinks",
  "special",
];

function typeOrder(type: CategoryType): number {
  const i = CATEGORY_ORDER.indexOf(type);
  return i >= 0 ? i : CATEGORY_ORDER.length;
}

/** Sort categories by type, then by display_order, then by name. */
export function sortCategories(categories: MenuCategory[]): MenuCategory[] {
  return [...categories].sort((a, b) => {
    const typeA = a.type ?? "main";
    const typeB = b.type ?? "main";
    const orderA = typeOrder(typeA);
    const orderB = typeOrder(typeB);
    if (orderA !== orderB) return orderA - orderB;
    if (a.display_order !== b.display_order) return a.display_order - b.display_order;
    return a.name.localeCompare(b.name);
  });
}
