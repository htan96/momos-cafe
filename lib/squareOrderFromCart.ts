import type { CartItem } from "@/types/ordering";
import type { UnifiedMerchLine } from "@/types/commerce";

/** Matches app/api/order TAX_RATE (9.25%) — applied at ORDER scope on Square order. */
export const SQUARE_ORDER_TAX_PERCENT_STRING = "9.25";

/** Max future time for `expiresAt` on pickup (Square allows up to 7 days). */
const MAX_EXPIRES_FROM_NOW_MS = 7 * 24 * 60 * 60 * 1000;

function clampExpiresAt(pickupAt: Date): string {
  const cap = new Date(Date.now() + MAX_EXPIRES_FROM_NOW_MS);
  const dayAfterPickup = new Date(pickupAt.getTime() + 24 * 60 * 60 * 1000);
  let chosen = dayAfterPickup.getTime() > cap.getTime() ? cap : dayAfterPickup;
  if (chosen.getTime() <= pickupAt.getTime()) {
    chosen = new Date(pickupAt.getTime() + 60 * 60 * 1000);
  }
  if (chosen.getTime() > cap.getTime()) chosen = cap;
  return chosen.toISOString();
}

/**
 * True when every line has a Square ITEM_VARIATION id (Orders API catalog line items).
 */
export function cartHasSquareCatalogBinding(cart: CartItem[]): boolean {
  return (
    cart.length > 0 &&
    cart.every((i) => typeof i.variationId === "string" && i.variationId.length > 0)
  );
}

export type SquarePickupFulfillmentInput = {
  /** RFC3339 — shown as scheduled pickup in Square */
  pickupAtIso: string;
  scheduleType: "SCHEDULED" | "ASAP";
  recipientDisplayName: string;
  recipientPhone: string;
  recipientEmail?: string;
  /** Shown in Square POS / dashboard for this pickup */
  pickupNote?: string;
};

/**
 * Build `orders.create` body: catalog line items + ORDER-level sales tax + pickup fulfillment.
 *
 * - **Modifiers:** Square may show "Modifier 1" if `name` is omitted on line-item modifiers; we send
 *   `name` from the cart (catalog option label) alongside `catalogObjectId`.
 * - **Fulfillment:** Without `fulfillments`, pickup time does not appear; Square may also treat the
 *   order differently when payment attaches. We set `expiresAt` so payments don’t auto-complete
 *   the pickup the same way as when it’s unset (per Square pickup details docs).
 */
export function buildSquareCreateOrderRequest(params: {
  locationId: string;
  cart: CartItem[];
  idempotencyKey: string;
  referenceId?: string;
  pickup?: SquarePickupFulfillmentInput;
}): {
  idempotencyKey: string;
  order: {
    locationId: string;
    referenceId?: string;
    lineItems: Array<{
      catalogObjectId: string;
      quantity: string;
      modifiers?: Array<{ catalogObjectId: string; name?: string }>;
    }>;
    taxes: Array<{
      uid: string;
      name: string;
      percentage: string;
      scope: "ORDER";
    }>;
    fulfillments?: Array<{
      type: "PICKUP";
      state: "PROPOSED";
      pickupDetails: {
        scheduleType: "SCHEDULED" | "ASAP";
        pickupAt: string;
        expiresAt: string;
        recipient: {
          displayName: string;
          phoneNumber: string;
          emailAddress?: string;
        };
        note?: string;
      };
    }>;
  };
} {
  const lineItems = params.cart.map((item) => {
    const line: {
      catalogObjectId: string;
      quantity: string;
      modifiers?: Array<{ catalogObjectId: string; name?: string }>;
    } = {
      catalogObjectId: item.variationId as string,
      quantity: String(Math.max(1, Math.floor(item.quantity || 1))),
    };
    const mods = item.modifiers?.filter((m) => m.id) ?? [];
    if (mods.length > 0) {
      line.modifiers = mods.map((m) => {
        const entry: { catalogObjectId: string; name?: string } = {
          catalogObjectId: m.id,
        };
        const label = m.name?.trim();
        if (label) entry.name = label.slice(0, 255);
        return entry;
      });
    }
    return line;
  });

  const orderBase: {
    locationId: string;
    referenceId?: string;
    lineItems: typeof lineItems;
    taxes: Array<{
      uid: string;
      name: string;
      percentage: string;
      scope: "ORDER";
    }>;
    fulfillments?: Array<{
      type: "PICKUP";
      state: "PROPOSED";
      pickupDetails: {
        scheduleType: "SCHEDULED" | "ASAP";
        pickupAt: string;
        expiresAt: string;
        recipient: {
          displayName: string;
          phoneNumber: string;
          emailAddress?: string;
        };
        note?: string;
      };
    }>;
  } = {
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
  };

  if (params.pickup) {
    const pickupAtDate = new Date(params.pickup.pickupAtIso);
    const pickupAt =
      Number.isNaN(pickupAtDate.getTime()) ? new Date().toISOString() : pickupAtDate.toISOString();
    const phone = params.pickup.recipientPhone.replace(/\s/g, "").slice(0, 17);
    orderBase.fulfillments = [
      {
        type: "PICKUP",
        state: "PROPOSED",
        pickupDetails: {
          scheduleType: params.pickup.scheduleType,
          pickupAt,
          expiresAt: clampExpiresAt(new Date(pickupAt)),
          recipient: {
            displayName: params.pickup.recipientDisplayName.slice(0, 255),
            phoneNumber: phone,
            ...(params.pickup.recipientEmail?.trim()
              ? { emailAddress: params.pickup.recipientEmail.trim().slice(0, 255) }
              : {}),
          },
          ...(params.pickup.pickupNote?.trim()
            ? { note: params.pickup.pickupNote.trim().slice(0, 500) }
            : {}),
        },
      },
    ];
  }

  return {
    idempotencyKey: params.idempotencyKey,
    order: orderBase,
  };
}

export function squareMoneyAmountToCents(amount: unknown): number {
  if (amount == null) return 0;
  if (typeof amount === "bigint") return Number(amount);
  if (typeof amount === "number" && Number.isFinite(amount)) return Math.round(amount);
  if (typeof amount === "string" && amount !== "") return Number(amount);
  return 0;
}

/** Square `OrderLineItem` fragments — catalog-backed or ad hoc for missing variation ids. */
export type SquareOrderLineItemFragment =
  | {
      catalogObjectId: string;
      quantity: string;
      modifiers?: Array<{ catalogObjectId: string; name?: string }>;
    }
  | {
      name: string;
      quantity: string;
      basePriceMoney: { amount: bigint; currency: "USD" };
    };

export function merchLinesToSquareLineItems(lines: UnifiedMerchLine[]): SquareOrderLineItemFragment[] {
  return lines.map((line) => {
    const qty = String(Math.max(1, Math.floor(line.quantity || 1)));
    const vid = line.squareVariationId?.trim();
    if (vid) {
      return { catalogObjectId: vid, quantity: qty };
    }
    return {
      name: line.name.slice(0, 255),
      quantity: qty,
      basePriceMoney: {
        amount: BigInt(Math.round(line.unitPrice * 100)),
        currency: "USD",
      },
    };
  });
}

function foodCartToSquareLineItems(cart: CartItem[]): SquareOrderLineItemFragment[] {
  return cart.map((item) => {
    const line: SquareOrderLineItemFragment =
      typeof item.variationId === "string" && item.variationId.length > 0
        ? {
            catalogObjectId: item.variationId,
            quantity: String(Math.max(1, Math.floor(item.quantity || 1))),
          }
        : {
            name: item.name.slice(0, 255),
            quantity: String(Math.max(1, Math.floor(item.quantity || 1))),
            basePriceMoney: {
              amount: BigInt(
                Math.round(
                  (item.price +
                    (item.modifiers?.reduce((s, m) => s + (Number(m.price) || 0), 0) ?? 0)) *
                    100
                )
              ),
              currency: "USD",
            },
          };
    if (typeof item.variationId === "string" && item.variationId.length > 0) {
      const mods = item.modifiers?.filter((m) => m.id) ?? [];
      if (mods.length > 0) {
        (line as { modifiers?: Array<{ catalogObjectId: string; name?: string }> }).modifiers =
          mods.map((m) => {
            const entry: { catalogObjectId: string; name?: string } = {
              catalogObjectId: m.id,
            };
            const label = m.name?.trim();
            if (label) entry.name = label.slice(0, 255);
            return entry;
          });
      }
    }
    return line;
  });
}

/**
 * Single Square `orders.create` / `orders.calculate` payload for kitchen lines + shop lines.
 *
 * Square’s Orders API only accepts **one** fulfillment per create. We keep **pickup** here so
 * food stays schedulable; ship-to-home handling and rates use Square `orders.calculate` with a
 * `SHIPMENT` fulfillment during quote preview. At pay time, shipping is included as an explicit
 * `TOTAL_PHASE` service charge so the customer still completes **one** Square payment.
 */
export function buildUnifiedSquareCreateOrderRequest(params: {
  locationId: string;
  foodCart: CartItem[];
  merchLines: UnifiedMerchLine[];
  idempotencyKey: string;
  referenceId?: string;
  pickup?: SquarePickupFulfillmentInput;
  shippingServiceCharge?: { cents: number; name?: string };
}): {
  idempotencyKey: string;
  order: {
    locationId: string;
    referenceId?: string;
    lineItems: SquareOrderLineItemFragment[];
    taxes: Array<{
      uid: string;
      name: string;
      percentage: string;
      scope: "ORDER";
    }>;
    serviceCharges?: Array<{
      uid: string;
      name: string;
      amountMoney: { amount: bigint; currency: "USD" };
      calculationPhase: "TOTAL_PHASE";
    }>;
    fulfillments?: Array<{
      type: "PICKUP";
      state: "PROPOSED";
      pickupDetails: {
        scheduleType: "SCHEDULED" | "ASAP";
        pickupAt: string;
        expiresAt: string;
        recipient: {
          displayName: string;
          phoneNumber: string;
          emailAddress?: string;
        };
        note?: string;
      };
    }>;
  };
} {
  const foodItems = foodCartToSquareLineItems(params.foodCart);
  const merchItems = merchLinesToSquareLineItems(params.merchLines);
  const lineItems = [...foodItems, ...merchItems];

  const orderBase: {
    locationId: string;
    referenceId?: string;
    lineItems: SquareOrderLineItemFragment[];
    taxes: Array<{
      uid: string;
      name: string;
      percentage: string;
      scope: "ORDER";
    }>;
    serviceCharges?: Array<{
      uid: string;
      name: string;
      amountMoney: { amount: bigint; currency: "USD" };
      calculationPhase: "TOTAL_PHASE";
    }>;
    fulfillments?: Array<{
      type: "PICKUP";
      state: "PROPOSED";
      pickupDetails: {
        scheduleType: "SCHEDULED" | "ASAP";
        pickupAt: string;
        expiresAt: string;
        recipient: {
          displayName: string;
          phoneNumber: string;
          emailAddress?: string;
        };
        note?: string;
      };
    }>;
  } = {
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
  };

  const ship = params.shippingServiceCharge;
  if (ship && ship.cents > 0) {
    orderBase.serviceCharges = [
      {
        uid: "momos-shipping",
        name: ship.name?.trim() || "Shipping",
        amountMoney: { amount: BigInt(ship.cents), currency: "USD" },
        calculationPhase: "TOTAL_PHASE",
      },
    ];
  }

  if (params.pickup) {
    const pickupAtDate = new Date(params.pickup.pickupAtIso);
    const pickupAt =
      Number.isNaN(pickupAtDate.getTime()) ? new Date().toISOString() : pickupAtDate.toISOString();
    const phone = params.pickup.recipientPhone.replace(/\s/g, "").slice(0, 17);
    orderBase.fulfillments = [
      {
        type: "PICKUP",
        state: "PROPOSED",
        pickupDetails: {
          scheduleType: params.pickup.scheduleType,
          pickupAt,
          expiresAt: clampExpiresAt(new Date(pickupAt)),
          recipient: {
            displayName: params.pickup.recipientDisplayName.slice(0, 255),
            phoneNumber: phone,
            ...(params.pickup.recipientEmail?.trim()
              ? { emailAddress: params.pickup.recipientEmail.trim().slice(0, 255) }
              : {}),
          },
          ...(params.pickup.pickupNote?.trim()
            ? { note: params.pickup.pickupNote.trim().slice(0, 500) }
            : {}),
        },
      },
    ];
  }

  return {
    idempotencyKey: params.idempotencyKey,
    order: orderBase,
  };
}
