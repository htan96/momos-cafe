/** Bounded JSON walk — links an outbox row to a commerce order without heavy payload introspection. */
const MAX_KEYS_PER_OBJECT = 48;
const MAX_NODES = 96;
const MAX_DEPTH = 7;

const ORDER_KEY_HINTS = new Set([
  "commerceorderid",
  "commerce_order_id",
  "orderid",
  "order_id",
]);

function normUuid(s: string): string {
  return s.trim().toLowerCase();
}

function valueMatchesOrder(v: unknown, orderId: string): boolean {
  if (typeof v !== "string") return false;
  return normUuid(v) === normUuid(orderId);
}

/**
 * Returns true when `payload` likely references `commerceOrderId` (flat or shallow nested).
 */
export function notificationPayloadLinksCommerceOrder(payload: unknown, commerceOrderId: string): boolean {
  const target = normUuid(commerceOrderId);
  if (!target) return false;

  let nodes = 0;

  function walk(node: unknown, depth: number): boolean {
    if (nodes++ > MAX_NODES) return false;
    if (depth > MAX_DEPTH) return false;
    if (node === null || node === undefined) return false;

    if (typeof node === "string") {
      return normUuid(node) === target;
    }

    if (Array.isArray(node)) {
      for (const el of node) {
        if (walk(el, depth + 1)) return true;
        if (nodes > MAX_NODES) return false;
      }
      return false;
    }

    if (typeof node !== "object") return false;

    const o = node as Record<string, unknown>;
    let k = 0;
    for (const [key, val] of Object.entries(o)) {
      if (k++ > MAX_KEYS_PER_OBJECT) break;
      const kl = key.toLowerCase();
      if (ORDER_KEY_HINTS.has(kl) && valueMatchesOrder(val, target)) return true;
      if (kl === "entities" && val && typeof val === "object" && !Array.isArray(val)) {
        const ent = val as Record<string, unknown>;
        for (const ek of ["commerceOrderId", "orderId"] as const) {
          const ev = ent[ek];
          if (valueMatchesOrder(ev, target)) return true;
        }
      }
      if (val && (typeof val === "object" || Array.isArray(val))) {
        if (walk(val, depth + 1)) return true;
      }
      if (nodes > MAX_NODES) return false;
    }
    return false;
  }

  return walk(payload, 0);
}
