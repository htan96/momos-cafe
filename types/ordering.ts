/**
 * Ordering flow types — cart, modifiers, checkout.
 *
 * SQUARE ORDERS API:
 * - `CartItem.id`: Catalog ITEM id (display / legacy).
 * - `CartItem.variationId`: ITEM_VARIATION id — when every line has this, `/api/order` uses Orders API + linked payment.
 * - `CartItem.price`: Base line price in dollars (before modifiers); totals add modifier prices in `getCartItemTotal`.
 * - `SelectedModifier.id`: Square MODIFIER catalog object id from menu mapping.
 */

export interface ModifierOption {
  id: string;
  name: string;
  price: number;
  sublabel?: string;
}

export interface ModifierGroup {
  id: string;
  name: string;
  type: "radio" | "checkbox";
  required: boolean;
  minSel?: number;
  maxSel?: number;
  options: ModifierOption[];
}

export interface SelectedModifier {
  id: string;
  name: string;
  price: number;
  /** Square Catalog MODIFIER_LIST id (group) — helps audits; optional on legacy carts. */
  modifierListId?: string;
}

export interface CartItem {
  /** Square Catalog ITEM id (legacy / display). */
  id: string;
  /** Square ITEM_VARIATION catalog object id — when set, checkout uses Orders API. */
  variationId?: string;
  name: string;
  price: number;
  quantity: number;
  /** Selected options; `id` must be Square MODIFIER catalog object id when using Orders API. */
  modifiers?: SelectedModifier[];
  /** Mirrors `UnifiedFoodLine.savedForLater`; omitted for legacy rows / merch compatibility. */
  savedForLater?: boolean;
}

export function getCartItemTotal(item: CartItem): number {
  const modTotal = item.modifiers?.reduce((s, m) => s + m.price, 0) ?? 0;
  return (item.price + modTotal) * item.quantity;
}

export function getCartItemKey(item: CartItem): string {
  const modKey = item.modifiers?.map((m) => m.id).sort().join(",") ?? "";
  const lineId = item.variationId ?? item.id;
  const sfl = item.savedForLater === true ? ":sfl" : "";
  return `${lineId}:${modKey}${sfl}`;
}
