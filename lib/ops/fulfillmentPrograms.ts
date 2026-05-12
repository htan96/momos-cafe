/**
 * Ops fulfillment **programs** (console tabs) — orthogonal to Prisma `FulfillmentGroup.pipeline`
 * (`KITCHEN` | `RETAIL`). We classify retail groups using line payloads (`shippingEligible` / `pickupEligible`).
 */
export const OPS_FULFILLMENT_PROGRAM = {
  PICKUP: "PICKUP",
  SHIP: "SHIP",
  CATERING: "CATERING",
} as const;

export type OpsFulfillmentProgram =
  (typeof OPS_FULFILLMENT_PROGRAM)[keyof typeof OPS_FULFILLMENT_PROGRAM];

export function classifyFulfillmentProgram(
  pipeline: string,
  items: { orderItem: { payload: unknown } }[]
): OpsFulfillmentProgram {
  if (pipeline === "KITCHEN") return OPS_FULFILLMENT_PROGRAM.PICKUP;

  let shipping = false;
  let pickup = false;
  for (const row of items) {
    const p = row.orderItem.payload as {
      shippingEligible?: boolean;
      pickupEligible?: boolean;
    } | null;
    if (p?.shippingEligible) shipping = true;
    if (p?.pickupEligible) pickup = true;
  }

  if (shipping && !pickup) return OPS_FULFILLMENT_PROGRAM.SHIP;
  if (pickup && !shipping) return OPS_FULFILLMENT_PROGRAM.PICKUP;
  /** Mixed cart — surface under shipping first so ops confirms carrier path. */
  if (shipping && pickup) return OPS_FULFILLMENT_PROGRAM.SHIP;
  return OPS_FULFILLMENT_PROGRAM.PICKUP;
}
