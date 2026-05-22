/** Best-effort human identifiers from `CommerceOrder.metadata` JSON. */
export function readOrderConsoleMetadataStrings(meta: unknown): {
  orderLabel?: string;
  checkoutAttemptId?: string;
  legacyCafeOrderId?: string;
} {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return {};
  const m = meta as Record<string, unknown>;
  const orderLabel =
    pickString(m, ["orderNumber", "displayOrderId", "humanOrderId", "displayId", "orderRef"]) ??
    nestedString(m.correlation, ["orderNumber", "displayOrderId"]);
  const checkoutAttemptId = pickString(m, ["checkoutAttemptId", "checkout_attempt_id"]);
  const legacyCafeOrderId =
    pickString(m, ["cafeOrderId", "legacyCafeOrderId", "legacy_cafe_order_id"]) ??
    nestedString(m.correlation, ["cafeOrderId"]);

  return { orderLabel, checkoutAttemptId, legacyCafeOrderId };
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function nestedString(correlation: unknown, keys: string[]): string | undefined {
  if (!correlation || typeof correlation !== "object" || Array.isArray(correlation)) return undefined;
  return pickString(correlation as Record<string, unknown>, keys);
}
