/**
 * Category blurbs aligned with the printed menu layout (docs/menu reference).
 * Keys use Square-facing category titles; lookup is case-insensitive.
 */

export const MENU_CATEGORY_DESCRIPTIONS_STORAGE_KEY = "menuCategoryDescriptions";

/** Default copy — wording from fixed print menu / docs/menu layout subtitles. */
export const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  "Breakfast Plates":
    "Served with 2 eggs, country potatoes and your choice of toast or pancakes. Substitute 2 slices of French toast for $5.",
  "Griddle Favorites": "Served with butter and warm maple syrup.",
  Omelets:
    "Served with country potatoes and your choice of toast or pancakes.",
  "Breakfast Burritos":
    "Wrapped in a warm flour tortilla with eggs, cheese, and country potatoes.",
  "Lunch Favorites":
    "Served with your choice of fries, potato salad, or coleslaw.",
  Burgers:
    "Served on toasted sesame buns with mayo, lettuce, tomato, onion, and a dill pickle on the side.",
  Salads: "Served with garlic bread on the side.",
  "Mexican Specialties":
    "Fajitas and quesadillas served with rice, black or refried beans, guacamole, sour cream, and salsa.",
  Wings: "Six piece wings served with fries and house ranch.",
};

function normKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

const defaultsByNorm = new Map<string, string>();
for (const [k, v] of Object.entries(CATEGORY_DESCRIPTIONS)) {
  defaultsByNorm.set(normKey(k), v);
}

export function defaultCategoryDescriptionForName(categoryName: string): string {
  const raw = categoryName.trim();
  if (!raw) return "";
  if (Object.prototype.hasOwnProperty.call(CATEGORY_DESCRIPTIONS, raw)) {
    return CATEGORY_DESCRIPTIONS[raw] ?? "";
  }
  return defaultsByNorm.get(normKey(raw)) ?? "";
}

export function effectiveCategoryDescription(
  categoryName: string,
  overrides: Record<string, string>
): string {
  if (Object.prototype.hasOwnProperty.call(overrides, categoryName)) {
    return overrides[categoryName];
  }
  return defaultCategoryDescriptionForName(categoryName);
}

export function loadMenuCategoryDescriptionOverrides(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(
      MENU_CATEGORY_DESCRIPTIONS_STORAGE_KEY
    );
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string") out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveMenuCategoryDescriptionOverrides(
  overrides: Record<string, string>
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      MENU_CATEGORY_DESCRIPTIONS_STORAGE_KEY,
      JSON.stringify(overrides)
    );
  } catch {
    /* ignore */
  }
}
