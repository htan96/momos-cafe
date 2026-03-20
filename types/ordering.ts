/**
 * Ordering flow types — cart, modifiers, checkout.
 * Ready for Square integration.
 *
 * SQUARE ORDERS API COMPATIBILITY:
 * - CartItem.id: Currently catalog ITEM id. Square needs variationId (catalog_object_id) for line items.
 * - CartItem.price: In dollars. Square expects amount in cents.
 * - modifiers: Have id (required for Square). Structure is compatible.
 * - TODO: Add variationId when mapping from Square catalog (item variations).
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
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  modifiers?: SelectedModifier[];
}

export function getCartItemTotal(item: CartItem): number {
  const modTotal = item.modifiers?.reduce((s, m) => s + m.price, 0) ?? 0;
  return (item.price + modTotal) * item.quantity;
}

export function getCartItemKey(item: CartItem): string {
  const modKey = item.modifiers?.map((m) => m.id).sort().join(",") ?? "";
  return `${item.id}:${modKey}`;
}
