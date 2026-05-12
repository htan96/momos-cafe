import { SquareClient, SquareEnvironment } from "square";
import type Square from "square";
import type { UnifiedMerchLine } from "@/types/commerce";
import {
  merchLinesToSquareLineItems,
  SQUARE_ORDER_TAX_PERCENT_STRING,
  squareMoneyAmountToCents,
} from "@/lib/squareOrderFromCart";

export type ShippingQuoteAddress = {
  street: string;
  city: string;
  state: string;
  postalCode: string;
};

export type ShippingQuoteOption = {
  /** Stable id for the UI — Square service charge uid when present */
  uid: string;
  name: string;
  amountCents: number;
};

function createSquareClient(): SquareClient | null {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN?.trim();
  if (!accessToken) return null;
  const isProduction = process.env.SQUARE_ENVIRONMENT === "production";
  return new SquareClient({
    token: accessToken,
    environment: isProduction ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
  });
}

function unwrapCalculatedOrder(result: unknown): Square.Order | undefined {
  if (!result || typeof result !== "object") return undefined;
  const r = result as Record<string, unknown>;
  const nested =
    (r.order as Square.Order | undefined) ??
    ((r.body as Record<string, unknown> | undefined)?.order as Square.Order | undefined) ??
    ((r.result as Record<string, unknown> | undefined)?.order as Square.Order | undefined);
  return nested;
}

/**
 * Preview ship-to-home pricing via **OrdersApi.calculateOrder** (`POST /v2/orders/calculate`)
 * with a `SHIPMENT` fulfillment and catalog or ad hoc line items for ship-eligible merch.
 *
 * Returned options come from Square-calculated `serviceCharges` on the order (for example
 * seller-configured delivery charges). When Square returns none, the caller should treat
 * shipping as unquoted and prompt the guest to try again or contact the shop.
 */
export async function fetchSquareShippingQuotes(params: {
  locationId: string;
  merchShippableLines: UnifiedMerchLine[];
  address: ShippingQuoteAddress;
  contact: { name: string; phone: string; email?: string };
}): Promise<{ options: ShippingQuoteOption[]; detail?: string }> {
  const client = createSquareClient();
  if (!client) {
    return { options: [], detail: "unavailable" };
  }

  if (params.merchShippableLines.length === 0) {
    return { options: [] };
  }

  const lineItems = merchLinesToSquareLineItems(params.merchShippableLines);
  const order = {
    locationId: params.locationId,
    lineItems,
    taxes: [
      {
        uid: "web-order-sales-tax",
        name: "Sales tax",
        percentage: SQUARE_ORDER_TAX_PERCENT_STRING,
        scope: "ORDER" as const,
      },
    ],
    fulfillments: [
      {
        type: "SHIPMENT" as const,
        state: "PROPOSED" as const,
        shipmentDetails: {
          recipient: {
            displayName: params.contact.name.trim().slice(0, 255),
            phoneNumber: params.contact.phone.replace(/\s/g, "").slice(0, 17),
            ...(params.contact.email?.trim()
              ? { emailAddress: params.contact.email.trim().slice(0, 255) }
              : {}),
            address: {
              addressLine1: params.address.street.trim().slice(0, 255),
              locality: params.address.city.trim().slice(0, 255),
              administrativeDistrictLevel1: params.address.state.trim().slice(0, 255),
              postalCode: params.address.postalCode.replace(/\D/g, "").slice(0, 12),
              country: "US",
            },
          },
        },
      },
    ],
  };

  try {
    const resp = await client.orders.calculate({
      order: order as Square.Order,
    });
    const calculated = unwrapCalculatedOrder(resp);
    if (!calculated) {
      return { options: [], detail: "no_order" };
    }

    const charges = calculated.serviceCharges ?? [];
    const options: ShippingQuoteOption[] = [];
    for (const sc of charges) {
      const cents = squareMoneyAmountToCents(sc.appliedMoney?.amount ?? sc.totalMoney?.amount);
      if (cents <= 0) continue;
      const name =
        (typeof sc.name === "string" && sc.name.trim().length > 0
          ? sc.name.trim()
          : "Delivery") ?? "Delivery";
      const uid =
        typeof sc.uid === "string" && sc.uid.length > 0 ? sc.uid : `charge-${options.length}`;
      options.push({ uid, name, amountCents: cents });
    }

    return { options };
  } catch (e) {
    console.error("[squareShippingQuote]", e);
    return { options: [], detail: "square_error" };
  }
}
