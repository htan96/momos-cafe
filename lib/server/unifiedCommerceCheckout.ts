/**
 * Unified commerce checkout ties legacy `POST /api/order` + Square charge to draft `CommerceOrder`
 * shells for webhook reconcile. Disabled via `UNIFIED_COMMERCE_CHECKOUT=0|false|off`.
 */
export function isUnifiedCommerceCheckoutEnabled(): boolean {
  const v = process.env.UNIFIED_COMMERCE_CHECKOUT?.trim().toLowerCase();
  return v !== "0" && v !== "false" && v !== "off";
}
