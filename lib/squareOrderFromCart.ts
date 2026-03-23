import type { CartItem } from "@/types/ordering";

/** Matches app/api/order TAX_RATE (9.25%) — applied at ORDER scope on Square order. */
export const SQUARE_ORDER_TAX_PERCENT_STRING = "9.25";

/**
 * True when every line has a Square ITEM_VARIATION id (Orders API catalog line items).
 */
export function cartHasSquareCatalogBinding(cart: CartItem[]): boolean {
  return (
    cart.length > 0 &&
    cart.every((i) => typeof i.variationId === "string" && i.variationId.length > 0)
  );
}

/**
 * Build `orders.create` body: catalog line items + ORDER-level sales tax.
 * Amounts are computed by Square from catalog; do not send basePriceMoney here.
 */
export function buildSquareCreateOrderRequest(params: {
  locationId: string;
  cart: CartItem[];
  idempotencyKey: string;
  referenceId?: string;
}): {
  idempotencyKey: string;
  order: {
    locationId: string;
    referenceId?: string;
    lineItems: Array<{
      catalogObjectId: string;
      quantity: string;
      modifiers?: Array<{ catalogObjectId: string }>;
    }>;
    taxes: Array<{
      uid: string;
      name: string;
      percentage: string;
      scope: "ORDER";
    }>;
  };
} {
  const lineItems = params.cart.map((item) => {
    const line: {
      catalogObjectId: string;
      quantity: string;
      modifiers?: Array<{ catalogObjectId: string }>;
    } = {
      catalogObjectId: item.variationId as string,
      quantity: String(Math.max(1, Math.floor(item.quantity || 1))),
    };
    const mods = item.modifiers?.filter((m) => m.id) ?? [];
    if (mods.length > 0) {
      line.modifiers = mods.map((m) => ({ catalogObjectId: m.id }));
    }
    return line;
  });

  return {
    idempotencyKey: params.idempotencyKey,
    order: {
      locationId: params.locationId,
      ...(params.referenceId ? { referenceId: params.referenceId } : {}),
      lineItems,
      taxes: [
        {
          uid: "web-order-sales-tax",
          name: "Sales tax",
          percentage: SQUARE_ORDER_TAX_PERCENT_STRING,
          scope: "ORDER",
        },
      ],
    },
  };
}

export function squareMoneyAmountToCents(amount: unknown): number {
  if (amount == null) return 0;
  if (typeof amount === "bigint") return Number(amount);
  if (typeof amount === "number" && Number.isFinite(amount)) return Math.round(amount);
  if (typeof amount === "string" && amount !== "") return Number(amount);
  return 0;
}
